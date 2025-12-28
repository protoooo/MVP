// app/api/create-checkout-session/route.js - ONE-TIME PAYMENT VERSION (NO AUTH REQUIRED)
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// ✅ ONE-TIME PAYMENT - $149 per inspection report
// Recommended Stripe Price ID: price_inspection_report_1hr_149
// Set NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT in your .env file
const INSPECTION_REPORT_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_INSPECTION_REPORT
const INSPECTION_REPORT_PRICE = 14900 // $149.00 in cents (fallback if no Price ID)

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
    const { email } = body

    // Email is required for sending the access code
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    // ✅ Create Stripe checkout session for one-time payment (no authentication required)
    // Use Price ID if configured, otherwise use price_data for dynamic pricing
    const lineItems = INSPECTION_REPORT_PRICE_ID
      ? [
          {
            price: INSPECTION_REPORT_PRICE_ID,
            quantity: 1,
          },
        ]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Restaurant Health Inspection Report',
                description: 'Pre-inspection video analysis for Michigan food safety compliance (up to 1 hour)',
              },
              unit_amount: INSPECTION_REPORT_PRICE,
            },
            quantity: 1,
          },
        ]

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment', // Changed from 'subscription' to 'payment'
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
        reportPrice: '149',
      },
    })

    logger.audit('Checkout session created (one-time inspection report)', {
      sessionId: checkoutSession.id,
      email: email.substring(0, 3) + '***',
      amount: 149,
      ip,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Checkout error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Payment system error' }, { status: 500 })
  }
}
