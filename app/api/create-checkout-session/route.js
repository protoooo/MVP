import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    // 1. Verify User from Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get the Price ID from request
    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
    }

    // SECURITY FIX: Validate against environment variables (not hardcoded values)
    const VALID_PRICE_IDS = {
      [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
      [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'enterprise'
    }

    const planName = VALID_PRICE_IDS[priceId]

    if (!planName) {
      console.error('❌ Invalid price ID attempted:', priceId)
      return NextResponse.json({ 
        error: 'Invalid subscription plan selected' 
      }, { status: 400 })
    }

    // SECURITY: Verify price ID exists in Stripe (prevents stale/test IDs)
    try {
      await stripe.prices.retrieve(priceId)
    } catch (stripeError) {
      console.error('❌ Price ID not found in Stripe:', priceId)
      return NextResponse.json({ 
        error: 'Invalid subscription plan' 
      }, { status: 400 })
    }

    // 3. SECURITY FIX: Check for ANY existing subscriptions (including past_due/incomplete)
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, plan')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due', 'incomplete'])

    if (existingSubs && existingSubs.length > 0) {
      const activeSub = existingSubs[0]
      return NextResponse.json({ 
        error: `You already have ${activeSub.status === 'past_due' ? 'a past due' : 'an active'} ${activeSub.plan} subscription. Please manage it from your settings or contact support.`,
        existingSubscription: {
          plan: activeSub.plan,
          status: activeSub.status
        }
      }, { status: 400 })
    }

    // 4. SECURITY: Check Stripe directly for active subscriptions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.customer_id) {
      try {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: profile.customer_id,
          status: 'all',
          limit: 10
        })

        const activeStatuses = ['active', 'trialing', 'past_due', 'incomplete']
        const hasActiveStripeSubscription = stripeSubscriptions.data.some(sub => 
          activeStatuses.includes(sub.status)
        )

        if (hasActiveStripeSubscription) {
          console.error('⚠️ User has active Stripe subscription not in DB:', user.id)
          return NextResponse.json({ 
            error: 'An active subscription was found. Please contact support.' 
          }, { status: 400 })
        }
      } catch (stripeError) {
        console.error('Stripe customer check error:', stripeError)
        // Continue - if Stripe check fails, allow checkout
      }
    }

    // 5. SECURITY: Rate limit checkout attempts (prevent spam/abuse)
    const recentAttempts = await supabase
      .from('checkout_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (recentAttempts.data && recentAttempts.data.length >= 5) {
      return NextResponse.json({ 
        error: 'Too many checkout attempts. Please try again later.' 
      }, { status: 429 })
    }

    // Log checkout attempt
    await supabase.from('checkout_attempts').insert({
      user_id: user.id,
      price_id: priceId,
      created_at: new Date().toISOString()
    })

    // 6. SECURITY FIX: Cryptographically secure idempotency key
    const idempotencyKey = `checkout-${user.id}-${crypto.randomUUID()}`

    // 7. Create Stripe Checkout Session with enhanced security
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planName: planName,
          createdAt: new Date().toISOString()
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=cancelled`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        planName: planName
      },
      allow_promotion_codes: false,
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: false
      },
      idempotency_key: idempotencyKey
    })

    console.log('✅ Checkout session created:', {
      sessionId: session.id,
      userId: user.id,
      priceId: priceId,
      plan: planName,
      idempotencyKey: idempotencyKey.substring(0, 20) + '...'
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('❌ Stripe Checkout Error:', err)
    return NextResponse.json({ 
      error: err.message || 'Error creating checkout session. Please try again.' 
    }, { status: 500 })
  }
}
