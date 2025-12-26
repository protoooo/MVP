import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const DEVICE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY
const SUCCESS_URL = process.env.NEXT_PUBLIC_BASE_URL

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

export async function POST(request) {
  const ip = getClientIp(request)

  if (!DEVICE_PRICE_ID) {
    logger.error('Missing Stripe price id for device license')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!validateCSRF(request)) {
    logger.security('CSRF validation failed in device checkout', { ip })
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { quantity: rawQuantity, captchaToken } = body
  const quantity = Math.max(1, Math.min(500, parseInt(rawQuantity || '1', 10)))

  if (!captchaToken) {
    return NextResponse.json({ error: 'Security verification required.' }, { status: 403 })
  }

  const captchaResult = await verifyCaptcha(captchaToken, 'checkout', ip)
  if (!captchaResult.success) {
    logger.security('Captcha failed for checkout', { ip, score: captchaResult.score })
    return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 403 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {}
      },
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    logger.warn('Unauthenticated checkout attempt', { ip })
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: DEVICE_PRICE_ID,
          quantity,
        },
      ],
      subscription_data: {
        metadata: {
          userId: user.id,
          seatQuantity: quantity.toString(),
        },
      },
      metadata: {
        userId: user.id,
        seatQuantity: quantity.toString(),
        ip: ip || 'unknown',
        captchaScore: captchaResult.score?.toString() || 'unknown',
      },
      success_url: `${SUCCESS_URL}/?payment=success&seats=${quantity}`,
      cancel_url: `${SUCCESS_URL}/?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('Failed to create checkout session', { error: error.message })
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
