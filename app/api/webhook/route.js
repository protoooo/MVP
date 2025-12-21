// app/api/webhook/route.js - COMPLETE UPDATED VERSION
// Multi-location subscriptions + Quantity-based billing + Security + Email notifications

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

// ============================================================================
// SECURITY: Idempotency tracking to prevent duplicate webhook processing
// ============================================================================
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

// ============================================================================
// HELPER: Get user email via Supabase Admin API
// ============================================================================
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
// MULTI-LOCATION: Sync location count to Stripe subscription quantity
// ============================================================================
export async function syncLocationQuantityToStripe(userId) {
  try {
    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, location_count, is_multi_location')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError || !subscription) {
      logger.warn('No active subscription to update', { userId })
      return { success: false, error: 'No active subscription' }
    }

    // Get current quantity from Stripe
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

    const newQuantity = subscription.location_count || 1

    // Only update if quantity changed
    if (subscriptionItem.quantity === newQuantity) {
      logger.info('Quantity already matches', { 
        userId, 
        quantity: newQuantity 
      })
      return { success: true, quantity: newQuantity }
    }

    // Update quantity in Stripe
    await stripe.subscriptionItems.update(subscriptionItem.id, {
      quantity: newQuantity,
      proration_behavior: 'always_invoice'
    })

    logger.audit('Location quantity synced to Stripe', {
      userId,
      oldQuantity: subscriptionItem.quantity,
      newQuantity,
      subscriptionId: subscription.stripe_subscription_id
    })

    return { success: true, quantity: newQuantity }

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
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')
  
  if (!signature) {
    logger.security('Webhook missing Stripe signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    // ✅ SECURITY: Replay attack protection (reject events older than 60 seconds)
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

  // ✅ SECURITY: Idempotency check (prevent duplicate processing)
  if (await isEventProcessed(event.id)) {
    logger.info('Duplicate webhook event ignored', { eventId: event.id })
    return NextResponse.json({ received: true, duplicate: true })
  }

  logger.info('Processing webhook', { type: event.type, id: event.id })

  try {
    switch (event.type) {
      // ======================================================================
      // CHECKOUT COMPLETED - New subscription created
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
        const quantity = subscription.items.data[0].quantity || 1

        // Check if this is a multi-location subscription
        const isMultiLocation = session.metadata?.isMultiLocation === 'true' || quantity > 1
        const locationCount = parseInt(session.metadata?.locationCount || String(quantity))
        const purchaseType = session.metadata?.purchaseType // 'separate' or 'single'

        logger.info('New subscription created', { 
          userId, 
          subscriptionId,
          status: subscription.status,
          isMultiLocation,
          locationCount,
          purchaseType,
          quantity
        })

        // ✅ MULTI-LOCATION: If upgrading, cancel old subscription
        const oldSubscriptionId = session.metadata?.oldSubscriptionId
        if (oldSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(oldSubscriptionId)
            logger.audit('Old subscription cancelled for upgrade', {
              userId,
              oldSubscriptionId,
              newSubscriptionId: subscriptionId
            })
          } catch (err) {
            logger.error('Failed to cancel old subscription', { 
              error: err.message,
              oldSubscriptionId 
            })
          }
        }

        // Create subscription record
        const { error: subError } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          plan: isMultiLocation ? 'multi_location' : 'unlimited',
          price_id: priceId,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          location_count: locationCount,
          is_multi_location: isMultiLocation,
          metadata: {
            purchase_type: purchaseType,
            stripe_quantity: quantity
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'stripe_subscription_id' })

        if (subError) {
          logger.error('Failed to create subscription', { error: subError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // ✅ MULTI-LOCATION: Whitelist user if multi-location
        if (isMultiLocation && locationCount > 1) {
          try {
            const { error: whitelistError } = await supabase
              .from('location_whitelist')
              .upsert({
                user_id: userId,
                reason: `Multi-location subscription: ${locationCount} locations (${purchaseType})`,
                whitelisted_at: new Date().toISOString()
              }, { onConflict: 'user_id' })

            if (whitelistError) {
              logger.error('Failed to whitelist multi-location user', { 
                error: whitelistError.message,
                userId 
              })
            } else {
              logger.audit('User whitelisted for multi-location', { 
                userId,
                locationCount,
                purchaseType 
              })
            }
          } catch (err) {
            logger.error('Whitelist exception', { error: err.message })
          }
        }

        // ✅ EMAIL: Send welcome email (only for new subscriptions, not upgrades)
        if (!oldSubscriptionId) {
          const userEmail = await getUserEmail(userId)
          if (userEmail) {
            const userName = userEmail.split('@')[0]
            await emails.trialStarted(userEmail, userName)
            logger.info('Welcome email sent', { email: userEmail.substring(0, 3) + '***' })
          }
        }

        break
      }

      // ======================================================================
      // SUBSCRIPTION UPDATED - Handle status changes & quantity updates
      // ======================================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const quantity = subscription.items.data[0].quantity || 1
        const previousStatus = event.data.previous_attributes?.status
        const newStatus = subscription.status

        logger.info('Subscription updated', { 
          subscriptionId: subscription.id,
          oldStatus: previousStatus,
          newStatus: newStatus,
          quantity
        })

        // Get user_id from subscription record
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id, location_count')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        const userId = existingSub?.user_id

        // Update subscription record
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

        // ✅ MULTI-LOCATION: Update whitelist if quantity changed
        if (quantity > 1 && userId) {
          await supabase
            .from('location_whitelist')
            .upsert({
              user_id: userId,
              reason: `Multi-location subscription: ${quantity} locations`,
              whitelisted_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
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
      // SUBSCRIPTION DELETED - Handle cancellations
      // ======================================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        logger.info('Subscription deleted', {
          subscriptionId: subscription.id
        })

        // Update subscription status
        const { error: cancelError } = await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

        if (cancelError) {
          logger.error('Failed to cancel subscription', { error: cancelError.message })
        }

        // Get user info for email
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (sub?.user_id) {
          // Remove from whitelist
          await supabase
            .from('location_whitelist')
            .delete()
            .eq('user_id', sub.user_id)

          logger.audit('Subscription canceled', { 
            userId: sub.user_id,
            subscriptionId: subscription.id
          })

          // Send cancellation email
          const userEmail = await getUserEmail(sub.user_id)
          if (userEmail) {
            const userName = userEmail.split('@')[0]
            await emails.subscriptionCanceled(userEmail, userName)
          }
        }

        break
      }

      // ======================================================================
      // PAYMENT FAILED - Handle failed payments
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

          if (sub?.user_id) {
            // Update subscription status
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('stripe_subscription_id', invoice.subscription)

            logger.audit('Subscription marked past_due', { 
              userId: sub.user_id,
              attempts: invoice.attempt_count
            })

            // Send payment failed email
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
      // PAYMENT SUCCEEDED - Handle successful payments
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
        
        // If subscription was past_due, restore it
        if (sub && sub.status === 'past_due') {
          await supabase.from('subscriptions').update({
            status: 'active',
            updated_at: new Date().toISOString()
          }).eq('stripe_subscription_id', invoice.subscription)

          logger.audit('Subscription restored from past_due', { 
            userId: sub.user_id
          })

          // Send payment recovered email
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

    // ✅ SECURITY: Mark event as processed
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
