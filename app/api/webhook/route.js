// ============================================================================
// FILE 2: app/api/webhook/route.js - COMPLETE UPDATED VERSION
// Multi-location invite distribution + all existing functionality
// ============================================================================

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

// Idempotency tracking
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
        const isMultiLocation = session.metadata?.isMultiLocation === 'true'
        const locationCount = parseInt(session.metadata?.locationCount || '1')
        const pendingPurchaseId = session.metadata?.pendingPurchaseId

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

        logger.info('New subscription created', { 
          userId, 
          subscriptionId,
          status: subscription.status,
          isMultiLocation,
          locationCount,
          quantity
        })

        // ✅ UPDATED: Multi-location setup flow
        if (isMultiLocation && pendingPurchaseId) {
          try {
            logger.info('Processing multi-location purchase', { pendingPurchaseId })

            // Mark purchase as completed (ready for setup)
            const { error: updateError } = await supabase
              .from('pending_multi_location_purchases')
              .update({
                status: 'completed',
                stripe_subscription_id: subscriptionId,
                completed_at: new Date().toISOString()
              })
              .eq('id', pendingPurchaseId)

            if (updateError) {
              logger.error('Failed to update purchase status', { error: updateError.message })
            }

            // Store invite codes in active table (but don't send emails yet)
            const { data: pendingPurchase } = await supabase
              .from('pending_multi_location_purchases')
              .select('invite_codes')
              .eq('id', pendingPurchaseId)
              .single()

            if (pendingPurchase?.invite_codes) {
              const inviteCodes = pendingPurchase.invite_codes
              for (const inviteCode of inviteCodes) {
                const { error: insertError } = await supabase
                  .from('multi_location_invites')
                  .insert({
                    code: inviteCode.code,
                    buyer_user_id: userId,
                    location_number: inviteCode.location_number,
                    total_locations: locationCount,
                    stripe_subscription_id: subscriptionId,
                    used: false,
                    created_at: new Date().toISOString()
                  })

                if (insertError) {
                  logger.error('Failed to insert invite code', { 
                    error: insertError.message,
                    code: inviteCode.code 
                  })
                }
              }
            }

            // ✅ NEW: Send buyer to setup page instead of emailing links
            logger.audit('Multi-location purchase ready for setup', {
              userId,
              locationCount,
              subscriptionId,
              pendingPurchaseId
            })

            // Note: Buyer will be redirected to /dashboard/multi-location-setup
            // from the success_url in create-checkout-session

          } catch (multiLocationError) {
            logger.error('Multi-location setup failed', { 
              error: multiLocationError.message,
              userId,
              pendingPurchaseId 
            })
          }
        }

        // ✅ Upgrade: Cancel old subscription
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
            stripe_quantity: quantity,
            is_multi_location_buyer: isMultiLocation
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'stripe_subscription_id' })

        if (subError) {
          logger.error('Failed to create subscription', { error: subError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // ✅ Whitelist buyer for multi-location (they coordinate, but each location has own account)
        if (isMultiLocation && locationCount > 1) {
          try {
            const { error: whitelistError } = await supabase
              .from('location_whitelist')
              .upsert({
                user_id: userId,
                reason: `Multi-location buyer: ${locationCount} locations purchased`,
                whitelisted_at: new Date().toISOString()
              }, { onConflict: 'user_id' })

            if (whitelistError) {
              logger.error('Failed to whitelist multi-location buyer', { 
                error: whitelistError.message,
                userId 
              })
            } else {
              logger.audit('Buyer whitelisted for multi-location coordination', { 
                userId,
                locationCount 
              })
            }
          } catch (err) {
            logger.error('Whitelist exception', { error: err.message })
          }
        }

        // ✅ EMAIL: Send welcome email (only for single-location or if not upgrade)
        if (!oldSubscriptionId && !isMultiLocation) {
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
      // SUBSCRIPTION UPDATED
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

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id, location_count')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        const userId = existingSub?.user_id

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

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        
        if (sub?.user_id) {
          await supabase
            .from('location_whitelist')
            .delete()
            .eq('user_id', sub.user_id)

          logger.audit('Subscription canceled', { 
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

          if (sub?.user_id) {
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('stripe_subscription_id', invoice.subscription)

            logger.audit('Subscription marked past_due', { 
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
          await supabase.from('subscriptions').update({
            status: 'active',
            updated_at: new Date().toISOString()
          }).eq('stripe_subscription_id', invoice.subscription)

          logger.audit('Subscription restored from past_due', { 
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
