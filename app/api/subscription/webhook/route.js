import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PLAN_CONFIGS = {
  protocollm_image_200_monthly: { imageLimit: 200, planName: 'starter' },
  protocollm_image_500_monthly: { imageLimit: 500, planName: 'professional' },
  protocollm_image_1500_monthly: { imageLimit: 1500, planName: 'enterprise' }
}

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  console.log(`Received webhook event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        // Only handle subscription checkouts
        if (session.mode === 'subscription') {
          const userId = session.metadata.supabase_user_id
          const planName = session.metadata.plan_name
          const imageLimit = parseInt(session.metadata.image_limit)

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription)

          // Update user profile with subscription info
          await supabase
            .from('user_profiles')
            .upsert({
              id: userId,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              current_plan: planName,
              monthly_image_limit: imageLimit,
              images_used_this_period: 0,
              billing_cycle_start: new Date(subscription.current_period_start * 1000).toISOString(),
              billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString(),
              subscription_status: 'active'
            })

          console.log(`Subscription activated for user ${userId}, plan: ${planName}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          // Determine plan from price ID
          const priceId = subscription.items.data[0]?.price.lookup_key || subscription.items.data[0]?.price.id
          const planConfig = PLAN_CONFIGS[priceId]
          
          if (!planConfig) {
            console.error(`Unknown price ID: ${priceId}. Cannot determine plan config.`)
            // Don't silently fail - throw error so webhook retries or alerts
            throw new Error(`Unrecognized Stripe price ID: ${priceId}`)
          }

          await supabase
            .from('user_profiles')
            .update({
              stripe_subscription_id: subscription.id,
              current_plan: planConfig.planName,
              monthly_image_limit: planConfig.imageLimit,
              billing_cycle_start: new Date(subscription.current_period_start * 1000).toISOString(),
              billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString(),
              subscription_status: subscription.status
            })
            .eq('id', profile.id)

          console.log(`Subscription updated for user ${profile.id}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({
              current_plan: null,
              monthly_image_limit: 0,
              subscription_status: 'cancelled'
            })
            .eq('id', profile.id)

          console.log(`Subscription cancelled for user ${profile.id}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        // Reset usage count at the start of new billing period
        if (invoice.billing_reason === 'subscription_cycle') {
          const customerId = invoice.customer

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (profile) {
            // Get subscription to update billing cycle dates
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription)

            await supabase
              .from('user_profiles')
              .update({
                images_used_this_period: 0,
                billing_cycle_start: new Date(subscription.current_period_start * 1000).toISOString(),
                billing_cycle_end: new Date(subscription.current_period_end * 1000).toISOString()
              })
              .eq('id', profile.id)

            console.log(`Usage reset for user ${profile.id} - new billing cycle`)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'past_due'
            })
            .eq('id', profile.id)

          console.log(`Payment failed for user ${profile.id}`)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
