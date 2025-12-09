// app/api/stripe/create-checkout-session/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ✅ Support both private & NEXT_PUBLIC price IDs
const PRICE_MONTHLY =
  process.env.STRIPE_PRICE_ID_MONTHLY ||
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY

const PRICE_ANNUAL =
  process.env.STRIPE_PRICE_ID_ANNUAL ||
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL

const ALLOWED_PRICES = [PRICE_MONTHLY, PRICE_ANNUAL].filter(Boolean)

function validateCSRF() {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')
  const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL

  if (allowedOrigin) {
    if (origin && origin !== allowedOrigin) return false
    if (referer && !referer.startsWith(allowedOrigin)) return false
  }
  return true
}

export async function POST(request) {
  try {
    if (!validateCSRF()) {
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { priceId } = body

    // ✅ Validate priceId against our known price IDs
    if (!ALLOWED_PRICES.includes(priceId)) {
      console.error(
        `❌ Invalid priceId. Received: ${priceId}. Allowed:`,
        ALLOWED_PRICES
      )
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              /* ignore */
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Optional: simple rate-limit
    const { data: recentCheckouts } = await supabase
      .from('checkout_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())

    if (recentCheckouts && recentCheckouts.length >= 5) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please wait.' },
        { status: 429 }
      )
    }

    await supabase.from('checkout_attempts').insert({
      user_id: user.id,
      price_id: priceId,
      created_at: new Date().toISOString(),
    })

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id },
      },
      tax_id_collection: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled`,
      metadata: {
        userId: user.id,
        timestamp: Date.now().toString(),
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('❌ Checkout error:', error)
    return NextResponse.json(
      { error: 'Payment system error' },
      { status: 500 }
    )
  }
}
