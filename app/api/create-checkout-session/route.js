import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Force this route to never cache (Critical for Auth)
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const ALLOWED_PRICE_ID = 'price_1SZKB5DlSrKA3nbAxLhESpzV'

export async function POST(request) {
  try {
    // 1. Parse Body
    const body = await request.json()
    const { priceId } = body

    // 2. Validate Price ID
    if (priceId !== ALLOWED_PRICE_ID) {
      return NextResponse.json(
        { error: 'Invalid subscription plan selected.' },
        { status: 400 }
      )
    }

    // 3. Authenticate User (Using getUser for stricter security)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
             try {
               cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
             } catch {}
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to subscribe.' },
        { status: 401 }
      )
    }

    // 4. Create Stripe Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id },
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled`,
      metadata: { userId: user.id },
    })

    return NextResponse.json({ url: checkoutSession.url })

  } catch (error) {
    console.error('Stripe Checkout Error:', error)
    return NextResponse.json(
      { error: 'Unable to connect to payment processor.' },
      { status: 500 }
    )
  }
}
