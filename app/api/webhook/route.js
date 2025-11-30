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

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error(`❌ Webhook signature verification failed.`, err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  console.log(`🔔 Webhook received: ${event.type}`)

  try {
    switch (event.type) {
      // ===== NEW SUBSCRIPTION / TRIAL START =====
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata.userId
        const subscriptionId = session.subscription

        if (!userId) {
          console.error('❌ No userId in session metadata')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Fetch full subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id

        // Map price ID to plan name
        const planMap = {
          'price_1SY95aDlSrKA3nbAsgxE0Jon': 'starter',
          'price_1SY96QDlSrKA3nbACxe8QasT': 'pro',
          'price_1SY97KDlSrKA3nbAauq4tP8g': 'enterprise'
        }
        const planName = planMap[priceId] || 'pro'

        console.log(`✅ Subscription created for user ${userId}: ${planName}`)

        // Insert into subscriptions table
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer,
          plan: planName,
          status: subscription.status, // 'trialing' or 'active'
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        }, { onConflict: 'stripe_subscription_id' })

        // Update user profile
        await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true,
            subscription_id: subscriptionId,
            customer_id: session.customer,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        break
      }

      // ===== SUBSCRIPTION UPDATED (e.g., trial ended, plan changed) =====
      case 'customer.subscription.updated': {
        const subscription = event.data.object

        console.log(`🔄 Subscription updated: ${subscription.id}, status: ${subscription.status}`)

        await supabase.from('subscriptions').update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

        // If subscription became inactive, update profile
        if (!['active', 'trialing'].includes(subscription.status)) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (sub) {
            await supabase
              .from('user_profiles')
              .update({ is_subscribed: false, updated_at: new Date().toISOString() })
              .eq('id', sub.user_id)
          }
        }

        break
      }

      // ===== SUBSCRIPTION DELETED/CANCELED =====
      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        console.log(`🗑️ Subscription canceled: ${subscription.id}`)

        // Update status to 'canceled'
        await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

        // Disable access
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub) {
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

        console.log(`❌ Payment failed for subscription: ${subscriptionId}`)

        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscriptionId)

        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
