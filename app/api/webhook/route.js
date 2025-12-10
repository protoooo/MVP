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

// All prices map to 'business' plan now
const PRICE_TO_PLAN = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY]: 'business',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL]: 'business',
}

const processedEvents = new Set()

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
  
  if (!signature) {
    console.error('❌ Missing Stripe signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Idempotency check
  if (processedEvents.has(event.id)) {
    console.log(`⚠️ Duplicate event ignored: ${event.id}`)
    return NextResponse.json({ received: true })
  }
  processedEvents.add(event.id)
  setTimeout(() => processedEvents.delete(event.id), 3600000) // Clean up after 1hr

  console.log(`🔔 Processing webhook: ${event.type} [${event.id}]`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription

        if (!userId || !subscriptionId) {
          console.error('❌ Missing userId or subscriptionId in checkout.session.completed')
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        // Fetch full subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id
        const planName = PRICE_TO_PLAN[priceId] || 'business'

        console.log(`✅ Checkout completed: user=${userId}, plan=${planName}, sub=${subscriptionId}`)

        // Upsert subscription
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
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

        if (subError) {
          console.error('❌ Failed to upsert subscription:', subError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Update user profile
        await supabase.from('user_profiles').update({ is_subscribed: true }).eq('id', userId)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const priceId = subscription.items.data[0].price.id
        const planName = PRICE_TO_PLAN[priceId] || 'business'

        await supabase.from('subscriptions').update({
          status: subscription.status,
          plan: planName,
          price_id: priceId,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        console.log(`✅ Subscription updated: ${subscription.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        console.log(`✅ Subscription canceled: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.warn(`⚠️ Payment failed for subscription: ${invoice.subscription}`)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
