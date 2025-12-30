import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PLAN_CONFIGS = {
  starter: {
    priceId: process.env.STRIPE_PRICE_ID_200_MONTHLY || 'protocollm_image_200_monthly',
    imageLimit: 200,
    name: 'Starter - 200 images/month'
  },
  professional: {
    priceId: process.env.STRIPE_PRICE_ID_500_MONTHLY || 'protocollm_image_500_monthly',
    imageLimit: 500,
    name: 'Professional - 500 images/month'
  },
  enterprise: {
    priceId: process.env.STRIPE_PRICE_ID_1500_MONTHLY || 'protocollm_image_1500_monthly',
    imageLimit: 1500,
    name: 'Enterprise - 1,500 images/month'
  }
}

export async function POST(request) {
  try {
    const { plan } = await request.json()

    // Validate plan
    if (!plan || !PLAN_CONFIGS[plan]) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    // Get authenticated user from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const planConfig = PLAN_CONFIGS[plan]

    // Check if user already has a Stripe customer ID
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      customerId = customer.id

      // Update user profile with customer ID
      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          stripe_customer_id: customerId
        })
    }

    // Create Stripe checkout session for subscription
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upload?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?subscription=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        plan_name: plan,
        image_limit: planConfig.imageLimit
      },
    })

    console.log(`Created subscription checkout for user ${user.id}, plan: ${plan}`)

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })

  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
