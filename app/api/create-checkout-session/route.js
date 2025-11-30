import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

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

    // 2. Get the Price ID selected in the frontend
    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
    }

    // SECURITY FIX: Validate priceId against allowed values
    const VALID_PRICE_IDS = [
      'price_1SY95aDlSrKA3nbAsgxE0Jon', // starter
      'price_1SY96QDlSrKA3nbACxe8QasT', // pro
      'price_1SY97KDlSrKA3nbAauq4tP8g'  // enterprise
    ]

    if (!VALID_PRICE_IDS.includes(priceId)) {
      return NextResponse.json({ 
        error: 'Invalid price ID' 
      }, { status: 400 })
    }

    // 3. SECURITY FIX: Check for ANY existing subscriptions (including past_due)
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, plan')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])

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

    // 4. SECURITY: Check if user already has a Stripe customer ID with active subscriptions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.customer_id) {
      try {
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: profile.customer_id,
          status: 'active',
          limit: 1
        })

        if (stripeSubscriptions.data.length > 0) {
          console.log('⚠️ User has active Stripe subscription not in our DB')
          return NextResponse.json({ 
            error: 'An active subscription was found. Please contact support.' 
          }, { status: 400 })
        }
      } catch (stripeError) {
        console.error('Stripe customer check error:', stripeError)
        // Continue - if Stripe check fails, allow checkout
      }
    }

    // 5. Create Stripe Checkout Session with 30-day trial
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
        trial_period_days: 30,
        metadata: {
          userId: user.id,
          userEmail: user.email
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=cancelled`,
      customer_email: user.email,
      client_reference_id: user.id, // Additional user tracking
      metadata: {
        userId: user.id,
        userEmail: user.email
      },
      allow_promotion_codes: false, // Prevent promo code abuse unless you want it
    })

    console.log('✅ Checkout session created:', {
      sessionId: session.id,
      userId: user.id,
      priceId: priceId
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('❌ Stripe Checkout Error:', err)
    return NextResponse.json({ 
      error: err.message || 'Error creating checkout session. Please try again.' 
    }, { status: 500 })
  }
}
