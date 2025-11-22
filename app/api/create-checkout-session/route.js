import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 })
    }

    // Determine plan name from price ID
    const planName = priceId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA' ? 'enterprise' : 'pro'

    // Always use environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

    console.log('✅ Creating checkout session for:', session.user.email)
    console.log('✅ Plan:', planName)
    console.log('✅ Success URL:', `${baseUrl}/documents?session_id={CHECKOUT_SESSION_ID}`)

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/documents?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
        plan: planName,
      },
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          userId: session.user.id,
          plan: planName,
        },
      },
    })

    console.log('✅ Checkout session created:', checkoutSession.id)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('❌ Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
