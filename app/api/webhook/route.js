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

        // SECURITY FIX: Check if subscription already exists
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId)
          .single()

        if (existingSub) {
          console.log('⚠️ Subscription already exists, skipping:', subscriptionId)
          return NextResponse.json({ received: true })
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0].price.id

        const planMap = {
          'price_1SY95aDlSrKA3nbAsgxE0Jon': 'starter',
          'price_1SY96QDlSrKA3nbACxe8QasT': 'pro',
          'price_1SY97KDlSrKA3nbAauq4tP8g': 'enterprise'
        }
        const planName = planMap[priceId] || 'pro'

        console.log(`✅ Creating subscription for user ${userId}: ${planName}`)

        // Insert into subscriptions table
        const { error: subInsertError } = await supabase.from('subscriptions').insert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer,
          plan: planName,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        if (subInsertError) {
          console.error('❌ Failed to insert subscription:', subInsertError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Update user profile (legacy field for backward compatibility)
        await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true,
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

        console.log(`🔄 Subscription updated: ${subscription.id}, status: ${subscription.status}`)

        await supabase.from('subscriptions').update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

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

      // ===== SUBSCRIPTION DELETED =====
      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        console.log(`🗑️ Subscription canceled: ${subscription.id}`)

        await supabase.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        }).eq('stripe_subscription_id', subscription.id)

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

      // ===== MONTHLY PAYMENT SUCCESS - RESET USAGE =====
      case 'invoice.paid': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        // Only reset on recurring payments (not the first payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          console.log(`🔄 Monthly billing cycle - Resetting usage for subscription: ${subscriptionId}`)

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (sub) {
            await supabase
              .from('user_profiles')
              .update({
                requests_used: 0,
                images_used: 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.user_id)

            console.log(`✅ Usage reset for user: ${sub.user_id}`)
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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
