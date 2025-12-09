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

// ✅ Same price-ID logic as checkout
const PRICE_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY ||
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY

const PRICE_ANNUAL =
  process.env.STRIPE_PRICE_ID_ANNUAL ||
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

const processedEvents = new Set()
const MAX_EVENT_AGE_MS = 60 * 1000

function isEventProcessed(id) {
  return processedEvents.has(id)
}
function markEventProcessed(id) {
  processedEvents.add(id)
  setTimeout(() => processedEvents.delete(id), 60 * 60 * 1000)
}
function isEventTooOld(timestamp) {
  return Date.now() - timestamp * 1000 > MAX_EVENT_AGE_MS
}

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
    return NextResponse.json(
      { error: 'Invalid webhook source' },
      { status: 403 }
    )
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
          console.error('❌ Missing userId or subscriptionId')
          return NextResponse.json(
            { error: 'Missing data' },
            { status: 400 }
          )
        }

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        )
        const priceId = subscription.items.data[0].price.id

        // ✅ Map price -> plan name if you care
        let planName = 'protocollm'
        if (priceId === PRICE_MONTHLY) planName = 'protocollm_monthly'
        if (priceId === PRICE_ANNUAL) planName = 'protocollm_annual'

        const { error: subInsertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer,
            plan: planName,
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (!subInsertError) {
          await supabase
            .from('user_profiles')
            .update({ is_subscribed: true })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      default:
        // Ignore other events but still ack
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
