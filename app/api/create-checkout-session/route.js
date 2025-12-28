// app/api/create-checkout-session/route.js - ONE-TIME PAYMENT VERSION (NO AUTH REQUIRED)
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ✅ ONE-TIME PAYMENT TIERS
// BASIC: $49 for up to 200 photos
// PREMIUM: $99 for up to 500 photos
const PRICING = {
  BASIC: {
    price: 4900, // $49.00 in cents
    photoLimit: 200,
    name: 'Basic Plan - 200 Photos',
    description: 'Photo analysis for Michigan food safety compliance (up to 200 photos)',
  },
  PREMIUM: {
    price: 9900, // $99.00 in cents
    photoLimit: 500,
    name: 'Premium Plan - 500 Photos',
    description: 'Photo analysis for Michigan food safety compliance (up to 500 photos)',
  },
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

export async function POST(request) {
  const ip = getClientIp(request)

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('Missing STRIPE_SECRET_KEY')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // ✅ CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in checkout', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { email, tier } = body

    // Email is required for sending the access code
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    // Validate tier
    if (!tier || !PRICING[tier]) {
      return NextResponse.json({ error: 'Invalid pricing tier. Choose BASIC or PREMIUM.' }, { status: 400 })
    }

    const selectedTier = PRICING[tier]

    // ✅ Create Stripe checkout session for one-time payment (no authentication required)
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedTier.name,
            description: selectedTier.description,
          },
          unit_amount: selectedTier.price,
        },
        quantity: 1,
      },
    ]

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: lineItems,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled`,
      metadata: {
        userEmail: email,
        timestamp: Date.now().toString(),
        ipAddress: ip || 'unknown',
        productType: 'inspection_report',
        tier: tier,
        photoLimit: selectedTier.photoLimit.toString(),
        reportPrice: (selectedTier.price / 100).toString(),
      },
    })

    logger.audit('Checkout session created (one-time inspection report)', {
      sessionId: checkoutSession.id,
      email: email.substring(0, 3) + '***',
      tier,
      amount: selectedTier.price / 100,
      photoLimit: selectedTier.photoLimit,
      ip,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Checkout error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Payment system error' }, { status: 500 })
  }
}
