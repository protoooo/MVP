import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// SECURITY: Track processed events to prevent replay attacks
const processedEvents = new Set()

// SECURITY: Event timestamp validation (reject events older than 5 minutes)
const MAX_EVENT_AGE_MS = 5 * 60 * 1000

function isEventProcessed(eventId) {
  return processedEvents.has(eventId)
}

function markEventProcessed(eventId) {
  processedEvents.add(eventId)
  // Clean up old events after 1 hour to prevent memory leak
  setTimeout(() => processedEvents.delete(eventId), 60 * 60 * 1000)
}

function isEventTooOld(eventTimestamp) {
  const eventAge = Date.now() - (eventTimestamp * 1000)
  return eventAge > MAX_EVENT_AGE_MS
}

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event

  // SECURITY: Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error(`❌ Webhook signature verification failed:`, err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // SECURITY: Prevent replay attacks
  if (isEventProcessed(event.id)) {
    console.warn(`⚠️ Duplicate event detected: ${event.id}`)
    return NextResponse.json({ error: 'Event already processed' }, { status: 200 })
  }

  // SECURITY: Reject old events (prevents timing attacks)
  if (isEventTooOld(event.created)) {
    console.warn(`⚠️ Event too old: ${event.id}`)
    return NextResponse.json({ error: 'Event expired' }, { status: 400 })
  }

  console.log(`🔔 Processing webhook: ${event.type} [${event.id}]`)

  try {
    // Mark event as being processed (prevents concurrent processing)
    markEventProcessed(event.id)

    switch (event.type) {
      // ===== NEW SUBSCRIPTION / TRIAL START =====
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId || session.client_reference_id
        const subscriptionId = session.subscription

        if (!userId) {
          console.error('❌ No userId in session metadata')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        if (!subscriptionId) {
          console.error('❌ No subscriptionId in checkout session')
          return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })
        }

        // SECURITY: Check if subscription already exists (prevents duplicate creation)
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle()

        if (existingSub) {
          console.log('⚠️ Subscription already exists:', subscriptionId)
          return NextResponse.json({ received: true })
        }

        // SECURITY: Fetch subscription details directly from Stripe (don't trust webhook data alone)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        
        // SECURITY: Verify subscription belongs to correct customer
        if (subscription.customer !== session.customer) {
          console.error('❌ Customer mismatch detected!')
          return NextResponse.json({ error: 'Security violation' }, { status: 403 })
        }

        const priceId = subscription.items.data[0].price.id

        // SECURITY: Validate price ID against environment config
        const validPriceIds = {
          [process.env.STRIPE_STARTER_PRICE_ID]: 'starter',
          [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
          [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
        }

        const planName = validPriceIds[priceId] || 'pro'

        console.log(`✅ Creating subscription for user ${userId}:`, {
          plan: planName,
          status: subscription.status,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
        })

        // Insert into subscriptions table
        const { error: subInsertError } = await supabase.from('subscriptions').insert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer,
          plan: planName,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        if (subInsertError) {
          console.error('❌ Failed to insert subscription:', subInsertError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Update user profile (legacy field for backward compatibility ONLY)
        await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true, // LEGACY ONLY
            subscription_id: subscriptionId,
            customer_id: session.customer,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        console.log('✅ Subscription created successfully')
        break
      }

      // ===== SUBSCRIPTION UPDATED =====
      case 'customer.subscription.updated': {
        const subscription = event.data.object

        console.log(`🔄 Subscription updated:`, {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        })

        // SECURITY: Verify subscription exists before updating
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (!existingSub) {
          console.warn('⚠️ Subscription update for non-existent subscription:', subscription.id)
          return NextResponse.json({ received: true })
        }

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('❌ Failed to update subscription:', updateError)
        }

        // If subscription is no longer active/trialing, revoke access
        if (!['active', 'trialing'].includes(subscription.status)) {
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingSub.user_id)
        }

        break
      }

      // ===== SUBSCRIPTION DELETED =====
      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        console.log(`🗑️ Subscription canceled:`, subscription.id)

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscription.id)

          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.user_id)
        }

        break
      }

      // ===== PAYMENT FAILED =====
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        console.log(`❌ Payment failed for subscription:`, subscriptionId)

        if (subscriptionId) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (sub) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', subscriptionId)

            // REVOKE ACCESS immediately for past_due
            await supabase
              .from('user_profiles')
              .update({ 
                is_subscribed: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.user_id)
          }
        }

        break
      }

      // ===== MONTHLY PAYMENT SUCCESS - RESET USAGE =====
      case 'invoice.paid': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        // Only reset on recurring payments
        if (invoice.billing_reason === 'subscription_cycle') {
          console.log(`🔄 Monthly billing cycle - Resetting usage:`, subscriptionId)

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (sub) {
            // Reset usage counters
            await supabase
              .from('user_profiles')
              .update({
                requests_used: 0,
                images_used: 0,
                is_subscribed: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.user_id)

            // Ensure subscription is active
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', subscriptionId)

            console.log(`✅ Usage reset for user:`, sub.user_id)
          }
        }
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 })
  }
}
