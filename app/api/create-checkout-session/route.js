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

    // --- FIXED PLAN MAPPING ---
    let planName = 'pro' // Fallback

    if (priceId === 'price_1SWzz2DlSrKA3nbAR2I856jl') {
      planName = 'starter'
    } else if (priceId === 'price_1SVJvcDlSrKA3nbAlLcPCs52') {
      planName = 'pro'
    } else if (priceId === 'price_1SVJyRDlSrKA3nbAGhdEZzXA') {
      planName = 'enterprise'
    }
    // --------------------------

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

    console.log('✅ Creating checkout session for:', session.user.email)
    console.log('✅ Plan:', planName)

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

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('❌ Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
