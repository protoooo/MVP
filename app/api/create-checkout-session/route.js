import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}

export async function POST(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 })
    }

    // --- FIXED PLAN MAPPING WITH YOUR ACTUAL PRICE IDs ---
    let planName = 'pro' // Default fallback

    if (priceId === 'price_1SY95aDlSrKA3nbAsgxE0Jon') {
      planName = 'starter'
    } else if (priceId === 'price_1SY96QDlSrKA3nbACxe8QasT') {
      planName = 'pro'
    } else if (priceId === 'price_1SY97KDlSrKA3nbAauq4tP8g') {
      planName = 'enterprise'
    }
    // --------------------------------------------------

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
        plan: planName,
      },
      subscription_data: {
        trial_period_days: 30, // All plans get the trial
        metadata: {
          userId: session.user.id,
          plan: planName,
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('❌ Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
