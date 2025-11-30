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

    // 3. Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    if (existingSub) {
      return NextResponse.json({ 
        error: 'You already have an active subscription. Please manage it from your settings.' 
      }, { status: 400 })
    }

    // 4. Create Stripe Checkout Session with 30-day trial
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
        trial_period_days: 30, // CRITICAL: Add 30-day trial
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        userId: user.id, 
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Stripe Checkout Error:', err)
    return NextResponse.json({ error: err.message || 'Error creating session' }, { status: 500 })
  }
}
