import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ✅ SECURITY: Only allow your specific Price ID
const ALLOWED_PRICE_ID = 'price_1SZKB5DlSrKA3nbAxLhESpzV'

export async function POST(request) {
  try {
    // 1. Get the Price ID from the frontend
    const body = await request.json()
    const { priceId } = body

    // 2. Validate it matches your specific plan
    if (priceId !== ALLOWED_PRICE_ID) {
      console.error(`❌ Invalid Price ID Attempted: ${priceId}`)
      return NextResponse.json(
        { error: 'Invalid subscription plan selected.' },
        { status: 400 }
      )
    }

    // 3. Authenticate User
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to subscribe.' },
        { status: 401 }
      )
    }

    // 4. Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 7-Day Free Trial logic
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: session.user.id,
        },
      },
      // Redirect back to home page on success or cancel
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled`,
      metadata: {
        userId: session.user.id,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })

  } catch (error) {
    console.error('Stripe Checkout Error:', error)
    return NextResponse.json(
      { error: 'Unable to create checkout session.' },
      { status: 500 }
    )
  }
}
