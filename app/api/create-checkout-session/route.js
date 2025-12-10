import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Use actual Railway env var names
const BUSINESS_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const BUSINESS_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL
const ENTERPRISE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY
const ENTERPRISE_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL

const ALLOWED_PRICES = [
  BUSINESS_MONTHLY,
  BUSINESS_ANNUAL,
  ENTERPRISE_MONTHLY,
  ENTERPRISE_ANNUAL,
].filter(Boolean)

// CSRF validation
function validateCSRF() {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')
  const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL

  if (origin && origin !== allowedOrigin) return false
  if (referer && !referer.startsWith(allowedOrigin)) return false
  return true
}

export async function POST(request) {
  try {
    if (!validateCSRF()) {
      console.error('❌ CSRF validation failed')
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json()
    const { priceId } = body

    if (!priceId || !ALLOWED_PRICES.includes(priceId)) {
      console.error('❌ Invalid priceId:', priceId)
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
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
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication required')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit checkout attempts (prevent abuse)
    const { data: recent } = await supabase
      .from('checkout_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())

    if (recent && recent.length >= 5) {
      console.warn(`⚠️ Rate limit: ${user.email}`)
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please wait 1 minute.' },
        { status: 429 }
      )
    }

    // Log attempt
    await supabase.from('checkout_attempts').insert({
      user_id: user.id,
      price_id: priceId,
      created_at: new Date().toISOString(),
    })

    // CRITICAL FIX: Add trial support
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: { 
          userId: user.id,
          userEmail: user.email,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled`,
      metadata: { 
        userId: user.id,
        userEmail: user.email,
        timestamp: Date.now().toString(),
      },
    })

    console.log(`✅ Checkout session created: ${checkoutSession.id} for ${user.email}`)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('❌ Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Payment system error' },
      { status: 500 }
    )
  }
}
