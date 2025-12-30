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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

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
      processed_at: new Date().toISOString(),
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

    const eventAge = Date.now() - event.created * 1000
    if (eventAge > 60 * 1000) {
      logger.security('Webhook event too old', {
        eventId: event.id,
        ageMs: eventAge,
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
      case 'checkout.session.completed': {
        const session = event.data.object
        const sessionMetadata = session.metadata || {}
        const productType = sessionMetadata.productType

        // ============================================================================
        // ONE-TIME PAYMENT - Inspection Report Purchase
        // ============================================================================
        if (session.mode === 'payment' && productType === 'inspection_report') {
          const customerEmail = session.customer_email || session.customer_details?.email
          const paymentIntentId = session.payment_intent
          const amountTotal = session.amount_total // in cents
          const tier = sessionMetadata.tier || 'BASIC' // BASIC or PREMIUM
          const photoLimit = parseInt(sessionMetadata.photoLimit || '200', 10)

          if (!customerEmail) {
            logger.error('Missing customer email in one-time payment', {
              sessionId: session.id,
              paymentIntentId,
            })
            return NextResponse.json({ error: 'Missing customer email' }, { status: 400 })
          }

          logger.info('Processing one-time inspection report purchase', {
            email: customerEmail.substring(0, 3) + '***',
            amount: amountTotal / 100,
            tier,
            photoLimit,
            sessionId: session.id,
          })

          // Generate access code with tier prefix (BASIC-XXXXX or PREMIUM-XXXXX)
          let accessCode = null
          let codeGenerated = false
          let attempts = 0
          const maxAttempts = 10

          while (!codeGenerated && attempts < maxAttempts) {
            attempts++
            // Generate random 5-digit code and add tier prefix
            const randomDigits = Math.floor(10000 + Math.random() * 90000).toString()
            const codeWithPrefix = `${tier}-${randomDigits}`

            // Try to insert it (will fail if code already exists due to UNIQUE constraint)
            const { data: insertedCode, error: insertError } = await supabase
              .from('access_codes')
              .insert({
                code: codeWithPrefix,
                email: customerEmail,
                stripe_payment_intent_id: paymentIntentId,
                stripe_session_id: session.id,
                status: 'unused',
                created_at: new Date().toISOString(),
                is_admin: false,
                max_photos: photoLimit,
                total_photos_uploaded: 0,
                tier: tier,
              })
              .select()
              .single()

            if (!insertError && insertedCode) {
              accessCode = insertedCode
              codeGenerated = true
              logger.info('Access code generated', {
                code: codeWithPrefix,
                tier,
                photoLimit,
                email: customerEmail.substring(0, 3) + '***',
              })
            } else if (insertError?.code === '23505') {
              // Unique constraint violation - code already exists, try again
              logger.warn('Duplicate code generated, retrying', { attempt: attempts })
            } else {
              logger.error('Failed to insert access code', {
                error: insertError?.message,
                attempt: attempts,
              })
              throw new Error('Failed to generate access code')
            }
          }

          if (!codeGenerated || !accessCode) {
            logger.error('Could not generate unique access code after max attempts')
            return NextResponse.json({ error: 'Failed to generate access code' }, { status: 500 })
          }

          // Send purchase confirmation email with access code
          try {
            const customerName = session.customer_details?.name || customerEmail.split('@')[0]
            
            await emails.sendPurchaseConfirmation(
              customerEmail,
              customerName,
              accessCode.code,
              amountTotal / 100,
              tier,
              photoLimit
            )

            logger.audit('Purchase confirmation email sent', {
              email: customerEmail.substring(0, 3) + '***',
              code: accessCode.code,
              tier,
              photoLimit,
              amount: amountTotal / 100,
            })
          } catch (emailError) {
            logger.error('Failed to send purchase confirmation email', {
              error: emailError?.message,
              email: customerEmail.substring(0, 3) + '***',
            })
            // Don't fail the webhook - code is still created
          }

          await markEventProcessed(event.id, event.type)
          return NextResponse.json({ received: true, accessCode: accessCode.code })
        }

        // ============================================================================
        // SUBSCRIPTION MODE - Existing multi-location logic
        // ============================================================================
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription
        const customerId = session.customer
        let locationCount = parseInt(sessionMetadata.locationCount || '1', 10) || 1
        let devicesPerLocation = parseInt(sessionMetadata.devicesPerLocation || '1', 10) || 1
        let totalDevices =
          parseInt(sessionMetadata.totalDevices || `${locationCount * devicesPerLocation}`, 10) ||
          locationCount * devicesPerLocation
        let pricingTier =
          sessionMetadata.pricingTier ||
          (locationCount >= 20 ? 'enterprise' : locationCount >= 5 ? 'multi' : 'single')
        let basePricePerLocation = sessionMetadata.basePricePerLocation
        let deviceAddonPrice = sessionMetadata.deviceAddonPrice
        let pendingPurchaseId = sessionMetadata.pendingPurchaseId
        let isMultiLocation = sessionMetadata.isMultiLocation === 'true' || locationCount > 1

        if (!userId || !subscriptionId || !customerId) {
          logger.error('Missing required data in checkout', {
            userId,
            subscriptionId,
            customerId,
          })
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id
        const quantity = subscription.items.data[0].quantity || 1
        const subscriptionMetadata = subscription.metadata || {}

        locationCount =
          parseInt(subscriptionMetadata.locationCount || locationCount || '1', 10) || locationCount
        devicesPerLocation =
          parseInt(subscriptionMetadata.devicesPerLocation || devicesPerLocation || '1', 10) ||
          devicesPerLocation
        totalDevices =
          parseInt(subscriptionMetadata.totalDevices || `${locationCount * devicesPerLocation}`, 10) ||
          locationCount * devicesPerLocation
        pricingTier = subscriptionMetadata.pricingTier || pricingTier
        basePricePerLocation = subscriptionMetadata.basePricePerLocation || basePricePerLocation
        deviceAddonPrice = subscriptionMetadata.deviceAddonPrice || deviceAddonPrice
        pendingPurchaseId = pendingPurchaseId || subscriptionMetadata.pendingPurchaseId
        isMultiLocation =
          subscriptionMetadata.isMultiLocation === 'true' || isMultiLocation || locationCount > 1

        logger.info('New subscription created', {
          userId,
          subscriptionId,
          status: subscription.status,
          isMultiLocation,
          locationCount,
          quantity,
        })

        // Multi-location setup flow
        if (isMultiLocation && pendingPurchaseId) {
          try {
            logger.info('Processing multi-location purchase', { pendingPurchaseId })

            // Mark purchase as completed
            const { error: updateError } = await supabase
              .from('pending_multi_location_purchases')
              .update({
                status: 'completed',
                stripe_subscription_id: subscriptionId,
                completed_at: new Date().toISOString(),
              })
              .eq('id', pendingPurchaseId)

            if (updateError) {
              logger.error('Failed to update purchase status', { error: updateError.message })
            }

            // Store invite codes in active table
            const { data: pendingPurchase } = await supabase
              .from('pending_multi_location_purchases')
              .select('invite_codes, buyer_email')
              .eq('id', pendingPurchaseId)
              .single()

            if (pendingPurchase?.invite_codes) {
              const inviteCodes = pendingPurchase.invite_codes
              const buyerEmail = pendingPurchase.buyer_email
              const inviteLinks = []
              const signupBase = (process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.org').replace(/\/$/, '')

              for (const inviteCode of inviteCodes) {
                const baseInviteRecord = {
                  code: inviteCode.code,
                  buyer_user_id: userId,
                  buyer_email: buyerEmail,
                  location_number: inviteCode.location_number,
                  total_locations: locationCount,
                  stripe_subscription_id: subscriptionId,
                  used: false,
                  created_at: new Date().toISOString(),
                }

                let insertError = null

                const { error: primaryInsertError } = await supabase.from('multi_location_invites').insert(
                  inviteCode.device_number
                    ? { ...baseInviteRecord, device_number: inviteCode.device_number }
                    : baseInviteRecord
                )

                insertError = primaryInsertError

                if (insertError?.message?.toLowerCase().includes('device_number')) {
                  const { error: retryError } = await supabase.from('multi_location_invites').insert(baseInviteRecord)
                  insertError = retryError
                }

                if (insertError) {
                  logger.error('Failed to insert invite code', {
                    error: insertError.message,
                    code: inviteCode.code,
                  })
                }

                inviteLinks.push({
                  location: inviteCode.location_number || inviteLinks.length + 1,
                  device: inviteCode.device_number || 1,
                  url: `${signupBase}/signup?invite=${inviteCode.code}`,
                })
              }

              if (inviteLinks.length && buyerEmail) {
                const safeBasePrice = Number(basePricePerLocation || 0)
                const safeDevicePrice = Number(deviceAddonPrice || 0)
                const additionalDevices = Math.max(0, totalDevices - locationCount)
                const totalMonthly = locationCount * safeBasePrice + additionalDevices * safeDevicePrice
                const buyerName = buyerEmail.split('@')[0]

                await emails.multiLocationPurchaseComplete(
                  buyerEmail,
                  buyerName,
                  locationCount,
                  devicesPerLocation,
                  totalMonthly,
                  inviteLinks
                )
              }
            }

            logger.audit('Multi-location purchase ready for setup', {
              userId,
              locationCount,
              subscriptionId,
              pendingPurchaseId,
            })
          } catch (multiLocationError) {
            logger.error('Multi-location setup failed', {
              error: multiLocationError.message,
              userId,
              pendingPurchaseId,
            })
          }
        }

        // Upgrade: Cancel old subscription
        const oldSubscriptionId = session.metadata?.oldSubscriptionId
        if (oldSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(oldSubscriptionId)
            logger.audit('Old subscription cancelled for upgrade', {
              userId,
              oldSubscriptionId,
              newSubscriptionId: subscriptionId,
            })
          } catch (err) {
            logger.error('Failed to cancel old subscription', {
              error: err.message,
              oldSubscriptionId,
            })
          }
        }

        // Create subscription record
        const { error: subError } = await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan: isMultiLocation ? 'multi_location' : 'unlimited',
            price_id: priceId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            location_count: locationCount,
            is_multi_location: isMultiLocation,
            metadata: {
              stripe_quantity: quantity,
              is_multi_location_buyer: isMultiLocation,
              pricing_tier: pricingTier,
              devices_per_location: devicesPerLocation,
              base_price_per_location: basePricePerLocation ? Number(basePricePerLocation) : null,
              device_addon_price: deviceAddonPrice ? Number(deviceAddonPrice) : null,
              total_devices: totalDevices,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_subscription_id' }
        )

        if (subError) {
          logger.error('Failed to create subscription', { error: subError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Whitelist buyer for multi-location
        if (isMultiLocation && locationCount > 1) {
          try {
            const { error: whitelistError } = await supabase
              .from('location_whitelist')
              .upsert(
                {
                  user_id: userId,
                  reason: `Multi-location buyer: ${locationCount} locations purchased`,
                  whitelisted_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              )

            if (whitelistError) {
              logger.error('Failed to whitelist multi-location buyer', {
                error: whitelistError.message,
                userId,
              })
            } else {
              logger.audit('Buyer whitelisted for multi-location coordination', {
                userId,
                locationCount,
              })
            }
          } catch (err) {
            logger.error('Whitelist exception', { error: err.message })
          }
        }

        // Send welcome email (only for single-location or if not upgrade)
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

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const quantity = subscription.items.data[0].quantity || 1
        const previousStatus = event.data.previous_attributes?.status
        const newStatus = subscription.status
        const subscriptionMetadata = subscription.metadata || {}
        const resolvedLocationCount =
          parseInt(subscriptionMetadata.locationCount || quantity || '1', 10) || quantity
        const resolvedDevicesPerLocation =
          parseInt(subscriptionMetadata.devicesPerLocation || '1', 10) || 1
        const resolvedTotalDevices =
          parseInt(
            subscriptionMetadata.totalDevices || `${resolvedLocationCount * resolvedDevicesPerLocation}`,
            10
          ) || resolvedLocationCount * resolvedDevicesPerLocation
        const resolvedPricingTier =
          subscriptionMetadata.pricingTier ||
          (resolvedLocationCount >= 20 ? 'enterprise' : resolvedLocationCount >= 5 ? 'multi' : 'single')
        const resolvedBasePrice = subscriptionMetadata.basePricePerLocation
        const resolvedDevicePrice = subscriptionMetadata.deviceAddonPrice
        const isMultiLocation =
          subscriptionMetadata.isMultiLocation === 'true' || resolvedLocationCount > 1

        logger.info('Subscription updated', {
          subscriptionId: subscription.id,
          oldStatus: previousStatus,
          newStatus,
          quantity,
          locationCount: resolvedLocationCount,
          devicesPerLocation: resolvedDevicesPerLocation,
        })

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id, location_count')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        const userId = existingSub?.user_id

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: newStatus,
            price_id: priceId,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            location_count: resolvedLocationCount,
            is_multi_location: isMultiLocation,
            metadata: {
              stripe_quantity: quantity,
              is_multi_location_buyer: isMultiLocation,
              pricing_tier: resolvedPricingTier,
              devices_per_location: resolvedDevicesPerLocation,
              base_price_per_location: resolvedBasePrice ? Number(resolvedBasePrice) : null,
              device_addon_price: resolvedDevicePrice ? Number(resolvedDevicePrice) : null,
              total_devices: resolvedTotalDevices,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          logger.error('Failed to update subscription', { error: updateError.message })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (resolvedLocationCount > 1 && userId) {
          await supabase
            .from('location_whitelist')
            .upsert(
              {
                user_id: userId,
                reason: `Multi-location subscription: ${resolvedLocationCount} locations`,
                whitelisted_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            )
        }

        logger.audit('Subscription updated', {
          subscriptionId: subscription.id,
          oldStatus: previousStatus,
          newStatus,
          quantity,
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        logger.info('Subscription deleted', { subscriptionId: subscription.id })

        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (cancelError) {
          logger.error('Failed to cancel subscription', { error: cancelError.message })
        }

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub?.user_id) {
          await supabase.from('location_whitelist').delete().eq('user_id', sub.user_id)

          logger.audit('Subscription canceled', {
            userId: sub.user_id,
            subscriptionId: subscription.id,
          })

          const userEmail = await getUserEmail(sub.user_id)
          if (userEmail) {
            const userName = userEmail.split('@')[0]
            await emails.subscriptionCanceled(userEmail, userName)
          }
        }

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object

        logger.warn('Payment failed', {
          subscriptionId: invoice.subscription,
          attemptCount: invoice.attempt_count,
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
              attempts: invoice.attempt_count,
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

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object

        logger.audit('Payment succeeded', {
          subscriptionId: invoice.subscription,
          amount: invoice.amount_paid / 100,
        })

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id, status')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()

        if (sub && sub.status === 'past_due') {
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription)

          logger.audit('Subscription restored from past_due', { userId: sub.user_id })

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
      eventType: event.type,
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
