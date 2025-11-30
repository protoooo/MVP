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
        const userId = session.metadata?.userId || session.client_reference_id
        const subscriptionId = session.subscription

        if (!userId) {
          console.error('❌ No userId in session metadata or client_reference_id')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        if (!subscriptionId) {
          console.error('❌ No subscriptionId in checkout session')
          return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })
        }

        // SECURITY FIX: Use maybeSingle() to avoid errors
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle()

        if (existingSub) {
          console.log('⚠️ Subscription already exists, skipping:', {
            subscriptionId,
            existingStatus: existingSub.status
          })
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

        // Update user profile (legacy field for backward compatibility ONLY - not for auth)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true, // LEGACY ONLY - never check this for auth
            subscription_id: subscriptionId,
            customer_id: session.customer,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (profileError) {
          console.error('⚠️ Failed to update profile (non-critical):', profileError)
        }

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

        // If subscription is no longer active/trialing, update profile
        if (!['active', 'trialing'].includes(subscription.status)) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .maybeSingle()

          if (sub) {
            await supabase
              .from('user_profiles')
              .update({ 
                is_subscribed: false, // LEGACY FIELD
                updated_at: new Date().toISOString() 
              })
              .eq('id', sub.user_id)
          }
        }

        break
      }

      // ===== SUBSCRIPTION DELETED =====
      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        console.log(`🗑️ Subscription canceled:`, subscription.id)

        const { error: deleteError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)

        if (deleteError) {
          console.error('❌ Failed to mark subscription as canceled:', deleteError)
        }

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (sub) {
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: false, // LEGACY FIELD
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
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscriptionId)

          // SECURITY: Revoke access for past_due subscriptions
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (sub) {
            await supabase
              .from('user_profiles')
              .update({ 
                is_subscribed: false, // LEGACY FIELD
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

        // Only reset on recurring payments (not the first payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          console.log(`🔄 Monthly billing cycle - Resetting usage for subscription:`, subscriptionId)

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id, status')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (sub) {
            // Reset usage counters
            await supabase
              .from('user_profiles')
              .update({
                requests_used: 0,
                images_used: 0,
                is_subscribed: true, // LEGACY: Ensure it's set
                updated_at: new Date().toISOString()
              })
              .eq('id', sub.user_id)

            // Ensure subscription is marked active
            if (sub.status !== 'active') {
              await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  updated_at: new Date().toISOString()
                })
                .eq('stripe_subscription_id', subscriptionId)
            }

            console.log(`✅ Usage reset for user:`, sub.user_id)
          }
        }
        break
      }

      // ===== TRIAL WILL END (3 days before) =====
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object
        console.log(`⏰ Trial ending soon for subscription:`, subscription.id)
        
        // Optional: Send email notification to user
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle()

        if (sub) {
          // TODO: Implement email notification
          console.log(`📧 Should notify user ${sub.user_id} about trial ending`)
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
