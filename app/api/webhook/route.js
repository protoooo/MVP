// app/api/stripe/webhook/route.js
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

// Map Stripe price IDs → plans
const PRICE_CONFIG = {
  [process.env.STRIPE_PRICE_BUSINESS_MONTHLY]: { plan: 'business', billing: 'monthly' },
  [process.env.STRIPE_PRICE_BUSINESS_ANNUAL]: { plan: 'business', billing: 'annual' },
  [process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY]: { plan: 'enterprise', billing: 'monthly' },
  [process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL]: { plan: 'enterprise', billing: 'annual' },
}

// Usage presets
const PLAN_LIMITS = {
  business: {
    text_limit: 200,
    image_limit: 40,
  },
  enterprise: {
    text_limit: 1000,
    image_limit: 200,
  },
}

const processedEvents = new Set()
const MAX_EVENT_AGE_MS = 60 * 1000

function isEventProcessed(eventId) {
  return processedEvents.has(eventId)
}
function markEventProcessed(eventId) {
  processedEvents.add(eventId)
  setTimeout(() => processedEvents.delete(eventId), 60 * 60 * 1000)
}
function isEventTooOld(eventTimestamp) {
  return Date.now() - eventTimestamp * 1000 > MAX_EVENT_AGE_MS
}

// Validate webhook origin by requiring Stripe signature header
function validateWebhookOrigin() {
  const headersList = headers()
  const stripeSignature = headersList.get('stripe-signature')
  if (!stripeSignature) {
    console.error('❌ Missing Stripe signature header')
    return false
  }
  return true
}

export async function POST(req) {
  if (!validateWebhookOrigin()) {
    return NextResponse.json({ error: 'Invalid webhook source' }, { status: 403 })
  }

  const body = await req.text()
  const signature = headers().get('stripe-signature')
  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (isEventProcessed(event.id)) {
    console.log(`⚠️ Duplicate event ignored: ${event.id}`)
    return NextResponse.json({ received: true })
  }

  if (isEventTooOld(event.created)) {
    console.log(`⚠️ Stale event ignored: ${event.id}`)
    return NextResponse.json({ error: 'Event expired' }, { status: 400 })
  }

  console.log(`🔔 Processing webhook: ${event.type} [${event.id}]`)
  markEventProcessed(event.id)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId || session.client_reference_id
        const subscriptionId = session.subscription

        if (!userId || !subscriptionId) {
          console.error('❌ Missing userId or subscriptionId on checkout.session.completed')
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id
        const config = PRICE_CONFIG[priceId] || { plan: 'business', billing: 'monthly' }
        const limits = PLAN_LIMITS[config.plan] || PLAN_LIMITS.business

        const now = new Date()

        const { error: subUpsertError } = await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer,
            plan: config.plan,
            status: subscription.status,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            text_limit: limits.text_limit,
            image_limit: limits.image_limit,
            text_used: 0,
            image_used: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'stripe_subscription_id' }
        )

        if (subUpsertError) {
          console.error('❌ Failed to upsert subscription:', subUpsertError)
        } else {
          await supabase
            .from('user_profiles')
            .update({ is_subscribed: true })
            .eq('id', userId)
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const config = PRICE_CONFIG[priceId] || { plan: 'business', billing: 'monthly' }
        const limits = PLAN_LIMITS[config.plan] || PLAN_LIMITS.business

        const now = new Date()

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan: config.plan,
            status: subscription.status,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            // Reset usage when Stripe tells us sub has changed (new period, upgrade, etc.)
            text_limit: limits.text_limit,
            image_limit: limits.image_limit,
            text_used: 0,
            image_used: 0,
            updated_at: now.toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          console.error('❌ Failed to update subscription:', updateError)
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        const { error: deleteError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (deleteError) {
          console.error('❌ Failed to mark subscription canceled:', deleteError)
        }

        // Also drop is_subscribed flag
        if (subscription.metadata?.userId) {
          await supabase
            .from('user_profiles')
            .update({ is_subscribed: false })
            .eq('id', subscription.metadata.userId)
        }

        break
      }

      default: {
        // Other events can be ignored or logged
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
