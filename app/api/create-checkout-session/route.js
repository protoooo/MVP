import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Initialize Admin Supabase (to verify user securely)
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

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Redirects
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=cancelled`,
      customer_email: user.email,
      // CRITICAL: Pass User ID to metadata so Webhook can fulfill
      metadata: {
        userId: user.id, 
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Stripe Checkout Error:', err)
    return NextResponse.json({ error: 'Error creating session' }, { status: 500 })
  }
}
