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

  const { priceId } = await request.json()
  
  // Map price IDs to plan names - $49 Pro, $99 Enterprise
  const planMap = {
    'price_1SVJvcDlSrKA3nbAlLcPCs52': 'pro',
    'price_1SVJyRDlSrKA3nbAGhdEZzXA': 'enterprise'
  }

  const plan = planMap[priceId]
  
  if (!plan) {
    return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
  }

  // FIXED: Always use Railway URL
  const origin = process.env.NEXT_PUBLIC_BASE_URL || 'https://no-rap-production.up.railway.app'

  try {
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/documents?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      subscription_data: { 
        trial_period_days: 30,
        metadata: {
          userId: session.user.id,
          plan: plan
        }
      },
      metadata: { 
        userId: session.user.id,
        plan: plan
      },
      customer_email: session.user.email,
      allow_promotion_codes: true
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
