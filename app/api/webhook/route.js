import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Map price IDs to plan names
const PRICE_TO_PLAN = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'enterprise',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL]: 'enterprise',
}

// Database-backed idempotency
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

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
  
  if (!signature) {
    logger.security('Webhook missing Stripe signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  // Verify webhook signature
  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.security('Webhook signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Check idempotency
  if (await isEventProcessed(event.id)) {
    logger.info('Duplicate webhook event ignored', { eventId: event.id })
    return NextResponse.json({ received: true, duplicate: true })
  }

  logger.info('Processing webhook', { type: event.type, id: event.id })

  try {
    switch (event.type) {
      // ========================================================================
      // CHECKOUT COMPLETED - User finished checkout, subscription created
      // ========================================================================
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription

        if (!userId || !subscriptionId) {
          logger.error('Missing data in checkout.session.completed', { userId, subscriptionId })
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        // Fetch full subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id
        const planName = PRICE_TO_PLAN[priceId] || 'business'

        logger.info('Checkout completed', { 
          userId, 
          plan: planName, 
          subscriptionId,
          status: subscription.status,
          trialEnd: subscription.trial_end
        })

        // Upsert subscription to database
        const { error: subError } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer,
          plan: planName,
          price_id: priceId,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

        if (subError) {
          logger.error('Failed to upsert subscription', { error: subError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Update user profile
        await supabase.from('user_profiles').update({ 
          is_subscribed: true,
          updated_at: new Date().toISOString()
        }).eq('id', userId)

        logger.audit('Subscription created', { 
          userId, 
          plan: planName, 
          subscriptionId,
          status: subscription.status
        })

        // TODO: Send welcome email
        // await emails.trialStarted(session.customer_email, userName)

        break
      }

      // ========================================================================
      // SUBSCRIPTION UPDATED - Status changes (trialing → active, active → past_due, etc.)
      // ========================================================================
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const planName = PRICE_TO_PLAN[priceId] || 'business'
        const previousStatus = event.data.previous_attributes?.status
        const newStatus = subscription.status

        logger.info('Subscription updated', { 
          subscriptionId: subscription.id,
          oldStatus: previousStatus,
          newStatus: newStatus,
          plan: planName,
          trialEnd: subscription.trial_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        })

        // Update subscription in database
        const { error: updateError } = await supabase.from('subscriptions').update({
          status: newStatus,
          plan: planName,
          price_id: priceId,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          logger.error('Failed to update subscription', { error: updateError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Update user profile based on subscription status
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (sub) {
          // User has access if status is 'active' or 'trialing'
          const isActive = ['active', 'trialing'].includes(newStatus)
          
          await supabase.from('user_profiles').update({ 
            is_subscribed: isActive,
            updated_at: new Date().toISOString()
          }).eq('id', sub.user_id)

          logger.info('User profile updated', { 
            userId: sub.user_id, 
            isSubscribed: isActive,
            status: newStatus
          })

          // Log important status transitions
          if (previousStatus === 'trialing' && newStatus === 'active') {
            logger.audit('Trial converted to paid', { 
              userId: sub.user_id,
              subscriptionId: subscription.id 
            })
          }

          if (previousStatus === 'active' && newStatus === 'past_due') {
            logger.audit('Subscription past due - access blocked', { 
              userId: sub.user_id,
              subscriptionId: subscription.id 
            })
            // TODO: Send email notification
            // await emails.paymentFailed(userEmail, userName)
          }
        }

        logger.audit('Subscription status updated', { 
          subscriptionId: subscription.id, 
          oldStatus: previousStatus,
          newStatus: newStatus,
          plan: planName
        })
        break
      }

      // ========================================================================
      // SUBSCRIPTION DELETED - User canceled or subscription ended
      // ========================================================================
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        logger.info('Subscription deleted', {
          subscriptionId: subscription.id,
          canceledAt: subscription.canceled_at,
          endedAt: subscription.ended_at
        })

        // Mark as canceled in database
        const { error: cancelError } = await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        if (cancelError) {
          logger.error('Failed to cancel subscription', { error: cancelError.message })
        }

        // Update user profile - remove access
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (sub) {
          await supabase.from('user_profiles').update({ 
            is_subscribed: false,
            updated_at: new Date().toISOString()
          }).eq('id', sub.user_id)

          logger.audit('User access revoked - subscription canceled', { 
            userId: sub.user_id,
            subscriptionId: subscription.id
          })
        }

        // TODO: Send cancellation confirmation email
        // await emails.subscriptionCanceled(userEmail, userName)

        break
      }

      // ========================================================================
      // PAYMENT FAILED - Card declined, insufficient funds, etc.
      // ========================================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        
        logger.warn('Payment failed', { 
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
          amountDue: invoice.amount_due / 100,
          nextPaymentAttempt: invoice.next_payment_attempt
        })

        // Stripe automatically retries up to 3 times
        // After 3 attempts, block access
        if (invoice.attempt_count >= 3) {
          logger.warn('Payment failed after 3 attempts - blocking access', {
            subscriptionId: invoice.subscription,
            attemptCount: invoice.attempt_count
          })

          // Update subscription status to past_due
          const { error: statusError } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription)

          if (statusError) {
            logger.error('Failed to update subscription to past_due', { 
              error: statusError.message 
            })
          }

          // Block user access
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single()
          
          if (sub) {
            await supabase.from('user_profiles').update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            }).eq('id', sub.user_id)

            logger.audit('User access blocked - payment failed after 3 attempts', { 
              userId: sub.user_id,
              subscriptionId: invoice.subscription,
              attempts: invoice.attempt_count
            })

            // TODO: Send urgent payment failure email
            // await emails.paymentFailed(userEmail, userName)
          }
        } else {
          // First or second attempt - log but don't block access yet
          logger.info('Payment failed - Stripe will retry', {
            subscriptionId: invoice.subscription,
            attemptCount: invoice.attempt_count,
            nextAttempt: invoice.next_payment_attempt 
              ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
              : 'unknown'
          })
        }

        break
      }

      // ========================================================================
      // PAYMENT SUCCEEDED - Successful charge
      // ========================================================================
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        logger.audit('Payment succeeded', {
          subscriptionId: invoice.subscription,
          amount: invoice.amount_paid / 100,
          billingReason: invoice.billing_reason,
          currency: invoice.currency
        })

        // If this was a recovery payment after past_due, restore access
        if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_update') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id, status')
            .eq('stripe_subscription_id', invoice.subscription)
            .single()
          
          if (sub && sub.status === 'past_due') {
            // Restore subscription status to active
            await supabase.from('subscriptions').update({
              status: 'active',
              updated_at: new Date().toISOString(),
            }).eq('stripe_subscription_id', invoice.subscription)

            // Restore user access
            await supabase.from('user_profiles').update({ 
              is_subscribed: true,
              updated_at: new Date().toISOString()
            }).eq('id', sub.user_id)

            logger.audit('User access restored - payment succeeded after past_due', { 
              userId: sub.user_id,
              subscriptionId: invoice.subscription
            })

            // TODO: Send "payment successful, access restored" email
            // await emails.paymentSuccessful(userEmail, userName)
          }
        }

        break
      }

      // ========================================================================
      // DEFAULT - Log unhandled events
      // ========================================================================
      default:
        logger.info('Unhandled webhook event', { 
          type: event.type,
          id: event.id 
        })
    }

    // Mark event as processed
    await markEventProcessed(event.id, event.type)

    return NextResponse.json({ received: true })
    
  } catch (error) {
    logger.error('Webhook processing error', { 
      error: error.message,
      stack: error.stack,
      eventType: event.type,
      eventId: event.id
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
