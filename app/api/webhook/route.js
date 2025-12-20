// app/api/webhook/route.js - COMPLETE FILE with quantity-based billing
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { emails } from '@/lib/emails'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Track processed events
async function isEventProcessed(eventId) {
  const { data } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()
  
  return !!data
}

async function markEventProcessed(eventId, eventType) {
  await supabase
    .from('processed_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    })
    .onConflict('event_id')
}

async function getUserEmail(userId) {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    return data?.user?.email || null
  } catch (error) {
    logger.error('Failed to get user email', { error: error.message, userId })
    return null
  }
}

// ============================================================================
// SYNC LOCATION COUNT TO STRIPE (Exported for use in location APIs)
// ============================================================================
export async function syncLocationQuantityToStripe(userId) {
  try {
    // Count active locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id')
      .eq('owner_id', userId)
      .eq('is_active', true)

    if (locError) throw locError

    const activeLocationCount = locations?.length || 0

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single()

    if (subError || !subscription) {
      logger.warn('No active subscription to update', { userId })
      return { success: false, error: 'No active subscription' }
    }

    // Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    )

    const subscriptionItem = stripeSubscription.items.data[0]

    if (!subscriptionItem) {
      logger.error('No subscription item found', { 
        subscriptionId: subscription.stripe_subscription_id 
      })
      return { success: false, error: 'No subscription item' }
    }

    // Update quantity in Stripe
    await stripe.subscriptionItems.update(subscriptionItem.id, {
      quantity: Math.max(activeLocationCount, 1),
      proration_behavior: 'always_invoice'
    })

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        location_count: activeLocationCount,
        is_multi_location: activeLocationCount > 1,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id)

    logger.audit('Location quantity synced to Stripe', {
      userId,
      activeLocations: activeLocationCount,
      subscriptionId: subscription.stripe_subscription_id
    })

    return { success: true, quantity: activeLocationCount }

  } catch (error) {
    logger.error('Failed to sync location quantity', { 
      error: error.message, 
      userId 
    })
    return { success: false, error: error.message }
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================
export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
  
  if (!signature) {
    logger.security('Webhook missing Stripe signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    // Replay attack protection
    const eventAge = Date.now() - (event.created * 1000)
    if (eventAge > 60 * 1000) {
      logger.security('Webhook event too old', {
        eventId: event.id,
        ageMs: eventAge
      })
      return NextResponse.json({ error: 'Event too old' }, { status: 400 })
    }
    
  } catch (err) {
    logger.security('Webhook signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Check for duplicates
  if (await isEventProcessed(event.id)) {
    logger.info('Duplicate webhook event ignored', { eventId: event.id })
    return NextResponse.json({ received: true, duplicate: true })
  }

  logger.info('Processing webhook', { type: event.type, id: event.id })

  try {
    switch (event.type) {
      // ======================================================================
      // CHECKOUT COMPLETED
      // ======================================================================
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription
        const customerId = session.customer

        if (!userId || !subscriptionId || !customerId) {
          logger.error('Missing required data in checkout', { 
            userId, 
            subscriptionId,
            customerId 
          })
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        // Get subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id

        logger.info('New subscription created', { 
          userId, 
          subscriptionId,
          status: subscription.status
        })

        // Create subscription record
        const { error: subError } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan: 'business',
          price_id: priceId,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          location_count: 1,
          is_multi_location: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'stripe_subscription_id' })

        if (subError) {
          logger.error('Failed to create subscription', { error: subError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Create first location automatically
        try {
          const { error: locError } = await supabase.rpc('create_location', {
            p_owner_id: userId,
            p_name: 'Main Location',
            p_address: null
          })

          if (locError) {
            logger.error('Failed to create initial location', { error: locError.message })
          } else {
            logger.audit('Initial location created', { userId })
          }
        } catch (locException) {
          logger.error('Create location exception', { error: locException.message })
        }

        // Send welcome email
        const userEmail = await getUserEmail(userId)
        if (userEmail) {
          const userName = userEmail.split('@')[0]
          await emails.trialStarted(userEmail, userName)
          logger.info('Welcome email sent', { email: userEmail.substring(0, 3) + '***' })
        }

        break
      }

      // ======================================================================
      // SUBSCRIPTION UPDATED
      // ======================================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const previousStatus = event.data.previous_attributes?.status
        const newStatus = subscription.status
        const quantity = subscription.items.data[0].quantity || 1

        logger.info('Subscription updated', { 
          subscriptionId: subscription.id,
          oldStatus: previousStatus,
          newStatus: newStatus,
          quantity
        })

        const { error: updateError } = await supabase.from('subscriptions').update({
          status: newStatus,
          price_id: priceId,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          location_count: quantity,
          is_multi_location: quantity > 1,
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          logger.error('Failed to update subscription', { error: updateError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        logger.audit('Subscription updated', { 
          subscriptionId: subscription.id, 
          oldStatus: previousStatus,
          newStatus: newStatus,
          quantity
        })
        break
      }

      // ======================================================================
      // SUBSCRIPTION DELETED
      // ======================================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        logger.info('Subscription deleted', {
          subscriptionId: subscription.id
        })

        const { error: cancelError } = await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

        if (cancelError) {
          logger.error('Failed to cancel subscription', { error: cancelError.message })
        }

        // Disable all locations
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (sub) {
          await supabase
            .from('locations')
            .update({ is_active: false })
            .eq('owner_id', sub.user_id)

          logger.audit('All locations disabled - subscription canceled', { 
            userId: sub.user_id,
            subscriptionId: subscription.id
          })

          const userEmail = await getUserEmail(sub.user_id)
          if (userEmail) {
            const userName = userEmail.split('@')[0]
            await emails.subscriptionCanceled(userEmail, userName)
          }
        }

        break
      }

      // ======================================================================
      // PAYMENT FAILED
      // ======================================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        
        logger.warn('Payment failed', { 
          subscriptionId: invoice.subscription,
          attemptCount: invoice.attempt_count
        })

        if (invoice.attempt_count >= 3) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single()

          if (sub) {
            // Disable all locations
            await supabase
              .from('locations')
              .update({ is_active: false })
              .eq('owner_id', sub.user_id)

            // Update subscription status
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('stripe_subscription_id', invoice.subscription)

            logger.audit('All locations disabled - payment failed', { 
              userId: sub.user_id,
              attempts: invoice.attempt_count
            })

            const userEmail = await getUserEmail(sub.user_id)
            if (userEmail) {
              const userName = userEmail.split('@')[0]
              await emails.paymentFailed(userEmail, userName, invoice.attempt_count)
            }
          }
        }

        break
      }

      // ======================================================================
      // PAYMENT SUCCEEDED
      // ======================================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        logger.audit('Payment succeeded', {
          subscriptionId: invoice.subscription,
          amount: invoice.amount_paid / 100
        })

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id, status')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()
        
        if (sub && sub.status === 'past_due') {
          // Restore subscription
          await supabase.from('subscriptions').update({
            status: 'active',
            updated_at: new Date().toISOString()
          }).eq('stripe_subscription_id', invoice.subscription)

          // Re-enable all locations
          await supabase
            .from('locations')
            .update({ is_active: true })
            .eq('owner_id', sub.user_id)

          logger.audit('Locations restored - payment recovered', { 
            userId: sub.user_id
          })

          const userEmail = await getUserEmail(sub.user_id)
          if (userEmail) {
            const userName = userEmail.split('@')[0]
            await emails.paymentSucceeded(userEmail, userName)
          }
        }

        break
      }

      default:
        logger.info('Unhandled webhook event', { type: event.type })
    }

    // Mark event as processed
    await markEventProcessed(event.id, event.type)

    return NextResponse.json({ received: true })
    
  } catch (error) {
    logger.error('Webhook processing error', { 
      error: error.message,
      stack: error.stack,
      eventType: event.type
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
