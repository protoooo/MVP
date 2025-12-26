import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { ensureSeatInventory } from '@/lib/deviceSeats'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(req) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature || !webhookSecret) {
    logger.security('Webhook missing signature')
    return NextResponse.json({ error: 'No signature' }, { status: 401 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.security('Webhook signature verification failed', { error: err.message })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const subscriptionId = session.subscription
        const customerId = session.customer
        const userId = session.metadata?.userId || session.client_reference_id

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await handleSubscriptionUpdate({ subscription, userId, customerId })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.userId
        const customerId = subscription.customer
        await handleSubscriptionUpdate({ subscription, userId, customerId })
        break
      }
      default:
        logger.info('Webhook event ignored', { type: event.type })
    }
  } catch (error) {
    logger.error('Webhook handling failed', { error: error.message, type: event.type })
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleSubscriptionUpdate({ subscription, userId, customerId }) {
  if (!subscription) return

  const quantity = subscription.items?.data?.[0]?.quantity || 1
  const status = subscription.status
  const stripeSubscriptionId = subscription.id

  if (!userId) {
    logger.warn('Subscription missing user id metadata', { stripeSubscriptionId })
    return
  }

  await supabase
    .from('stripe_subscriptions')
    .upsert(
      {
        purchaser_user_id: userId,
        stripe_customer_id: customerId || subscription.customer,
        stripe_subscription_id: stripeSubscriptionId,
        quantity,
        status,
      },
      { onConflict: 'stripe_subscription_id' }
    )

  await ensureSeatInventory({ purchaserUserId: userId, quantity })
}
