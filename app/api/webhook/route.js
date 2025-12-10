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

// Store processed events in database instead of memory
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
    logger.error('[Webhook] Missing Stripe signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error('[Webhook] Signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Check if already processed (database-backed idempotency)
  if (await isEventProcessed(event.id)) {
    logger.info('[Webhook] Duplicate event ignored', { eventId: event.id })
    return NextResponse.json({ received: true })
  }

  logger.info('[Webhook] Processing event', { 
    type: event.type, 
    id: event.id 
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const subscriptionId = session.subscription

        if (!userId || !subscriptionId) {
          logger.error('[Webhook] Missing data in checkout.session.completed', {
            userId,
            subscriptionId
          })
          return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        // Fetch full subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id
        const planName = PRICE_TO_PLAN[priceId] || 'business'

        logger.info('[Webhook] Checkout completed', { 
          userId, 
          plan: planName, 
          subscriptionId,
          status: subscription.status
        })

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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

        if (subError) {
          logger.error('[Webhook] Failed to upsert subscription', { error: subError })
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Update user profile
        await supabase.from('user_profiles').update({ 
          is_subscribed: true,
          updated_at: new Date().toISOString()
        }).eq('id', userId)

        logger.info('[Webhook] ✅ Subscription created successfully')
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

        logger.info('[Webhook] Subscription updated', { subscriptionId: subscription.id })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', subscription.id)

        // Update user profile
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
        }

        logger.info('[Webhook] Subscription canceled', { subscriptionId: subscription.id })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        logger.warn('[Webhook] Payment failed', { 
          subscriptionId: invoice.subscription,
          customerId: invoice.customer
        })
        
        // TODO: Send email notification to user
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        logger.info('[Webhook] Payment succeeded', {
          subscriptionId: invoice.subscription,
          amount: invoice.amount_paid
        })
        break
      }
    }

    // Mark event as processed
    await markEventProcessed(event.id, event.type)

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('[Webhook] Processing error', { 
      error: error.message,
      eventType: event.type,
      eventId: event.id
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
