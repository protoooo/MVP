// app/api/webhook/route.js - FIXED (Idempotent profile creation)
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

const PRICE_TO_PLAN = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'enterprise',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL]: 'enterprise',
}

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
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    return authData?.user?.email || null
  } catch (error) {
    logger.error('Failed to get user email', { error: error.message, userId })
    return null
  }
}

async function getUserIdFromSubscription(subscriptionId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()
  
  return data?.user_id || null
}

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
  } catch (err) {
    logger.security('Webhook signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (await isEventProcessed(event.id)) {
    logger.info('Duplicate webhook event ignored', { eventId: event.id })
    return NextResponse.json({ received: true, duplicate: true })
  }

  logger.info('Processing webhook', { type: event.type, id: event.id })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription

        if (!userId || !subscriptionId) {
          logger.error('Missing data in checkout.session.completed', { userId, subscriptionId })
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        const isFakeId = String(subscriptionId).includes('fake') || 
                         String(subscriptionId).includes('test') || 
                         String(subscriptionId).includes('local') ||
                         String(subscriptionId).startsWith('cust_local')

        let subscription

        if (isFakeId) {
          logger.warn('Development mode: using mock subscription data', { subscriptionId })
          
          subscription = {
            id: subscriptionId,
            items: { 
              data: [{ 
                price: { 
                  id: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY || 'price_fake' 
                } 
              }] 
            },
            status: 'trialing',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
            trial_end: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000),
            cancel_at_period_end: false,
          }
        } else {
          subscription = await stripe.subscriptions.retrieve(subscriptionId)
        }

        const priceId = subscription.items.data[0].price.id
        const planName = PRICE_TO_PLAN[priceId] || 'business'

        logger.info('Checkout completed', { 
          userId, 
          plan: planName, 
          subscriptionId,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          isFakeId
        })

        // ✅ FIXED: Create profile using UPSERT (safe from duplicates)
        const now = new Date().toISOString()
        
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              id: userId,
              stripe_customer_id: session.customer, // ✅ Add customer ID
              accepted_terms: true,
              accepted_privacy: true,
              terms_accepted_at: now,
              privacy_accepted_at: now,
              is_subscribed: true,
              created_at: now,
              updated_at: now
            },
            { 
              onConflict: 'id',
              ignoreDuplicates: false 
            }
          )

        if (profileError) {
          logger.error('Failed to upsert user profile', { 
            error: profileError.message,
            userId 
          })
          // Don't fail the webhook - profile might already exist
        }

        // ✅ Create subscription record
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

        logger.audit('Subscription created', { 
          userId, 
          plan: planName, 
          subscriptionId,
          status: subscription.status
        })

        // Send welcome email
        const userEmail = await getUserEmail(userId)
        if (userEmail) {
          const userName = userEmail.split('@')[0]
          await emails.trialStarted(userEmail, userName)
          logger.info('Welcome email sent', { email: userEmail.substring(0, 3) + '***' })
        }

        break
      }

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

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (sub) {
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
        }

        logger.audit('Subscription status updated', { 
          subscriptionId: subscription.id, 
          oldStatus: previousStatus,
          newStatus: newStatus,
          plan: planName
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        logger.info('Subscription deleted', {
          subscriptionId: subscription.id,
          canceledAt: subscription.canceled_at,
          endedAt: subscription.ended_at
        })

        const { error: cancelError } = await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        if (cancelError) {
          logger.error('Failed to cancel subscription', { error: cancelError.message })
        }

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

          const userEmail = await getUserEmail(sub.user_id)
          if (userEmail) {
            const userName = userEmail.split('@')[0]
            await emails.subscriptionCanceled(userEmail, userName)
            logger.info('Cancellation email sent', { email: userEmail.substring(0, 3) + '***' })
          }
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        
        logger.warn('Payment failed', { 
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
          amountDue: invoice.amount_due / 100,
          nextPaymentAttempt: invoice.next_payment_attempt
        })

        if (invoice.attempt_count >= 3) {
          logger.warn('Payment failed after 3 attempts - blocking access', {
            subscriptionId: invoice.subscription,
            attemptCount: invoice.attempt_count
          })

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

          const userId = await getUserIdFromSubscription(invoice.subscription)
          
          if (userId) {
            await supabase.from('user_profiles').update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            }).eq('id', userId)

            logger.audit('User access blocked - payment failed after 3 attempts', { 
              userId,
              subscriptionId: invoice.subscription,
              attempts: invoice.attempt_count
            })

            const userEmail = await getUserEmail(userId)
            if (userEmail) {
              const userName = userEmail.split('@')[0]
              await emails.paymentFailed(userEmail, userName, invoice.attempt_count)
              logger.info('Payment failed email sent', { 
                email: userEmail.substring(0, 3) + '***',
                attemptCount: invoice.attempt_count 
              })
            }
          }
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        logger.audit('Payment succeeded', {
          subscriptionId: invoice.subscription,
          amount: invoice.amount_paid / 100,
          billingReason: invoice.billing_reason,
          currency: invoice.currency
        })

        if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_update') {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id, status')
            .eq('stripe_subscription_id', invoice.subscription)
            .single()
          
          if (sub && sub.status === 'past_due') {
            await supabase.from('subscriptions').update({
              status: 'active',
              updated_at: new Date().toISOString(),
            }).eq('stripe_subscription_id', invoice.subscription)

            await supabase.from('user_profiles').update({ 
              is_subscribed: true,
              updated_at: new Date().toISOString()
            }).eq('id', sub.user_id)

            logger.audit('User access restored - payment succeeded after past_due', { 
              userId: sub.user_id,
              subscriptionId: invoice.subscription
            })

            const userEmail = await getUserEmail(sub.user_id)
            if (userEmail) {
              const userName = userEmail.split('@')[0]
              await emails.paymentSucceeded(userEmail, userName)
              logger.info('Payment success email sent', { 
                email: userEmail.substring(0, 3) + '***' 
              })
            }
          }
        }

        break
      }

      default:
        logger.info('Unhandled webhook event', { 
          type: event.type,
          id: event.id 
        })
    }

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
