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
    // 1. Get User from Supabase Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Get Price ID from body
    const { priceId } = await req.json()

    // 3. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}?payment=cancelled`,
      customer_email: user.email,
      metadata: {
        userId: user.id, // CRITICAL: This links payment to Supabase user
      },
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Stripe Error:', err)
    return NextResponse.json({ error: 'Error creating session' }, { status: 500 })
  }
}
