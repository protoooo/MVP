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

// Your Stripe price IDs
const BUSINESS_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const BUSINESS_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL
const ENTERPRISE_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY
const ENTERPRISE_ANNUAL = process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ANNUAL

const ALLOWED_PRICES = [BUSINESS_MONTHLY, BUSINESS_ANNUAL, ENTERPRISE_MONTHLY, ENTERPRISE_ANNUAL].filter(Boolean)

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7).trim() || null
}

export async function POST(request) {
  const ip = getClientIp(request)

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('Missing STRIPE_SECRET_KEY')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in checkout', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { priceId, captchaToken } = body

    if (!priceId || !ALLOWED_PRICES.includes(priceId)) {
      logger.security('Invalid price ID attempted', { priceId, ip })
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    if (!captchaToken) {
      logger.security('Missing captcha token in checkout', { ip, priceId })
      return NextResponse.json(
        { error: 'Security verification required. Please try again.', code: 'CAPTCHA_MISSING' },
        { status: 403 }
      )
    }

    // Verify CAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken, 'checkout', ip)

    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for checkout', {
        ip,
        error: captchaResult.error,
        score: captchaResult.score,
        priceId,
      })

      return NextResponse.json(
        { error: 'Security verification failed. Please try again.', code: 'CAPTCHA_FAILED' },
        { status: 403 }
      )
    }

    logger.info('Checkout CAPTCHA verified', { ip, score: captchaResult.score, priceId })

    // Supabase server client (cookie-based) + ALSO support Bearer token fallback
    const cookieStore = cookies()
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

    const bearer = getBearerToken(request)
    const {
      data: { user },
      error: authError,
    } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthenticated checkout attempt', { ip })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit (best-effort; don’t hard-fail if table missing)
    try {
      const { data: recent } = await supabase
        .from('checkout_attempts')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 60_000).toISOString())

      if (recent && recent.length >= 5) {
        logger.security('Checkout rate limit exceeded', { userId: user.id, email: user.email, ip })
        return NextResponse.json({ error: 'Too many checkout attempts. Please wait 1 minute.' }, { status: 429 })
      }

      await supabase.from('checkout_attempts').insert({
        user_id: user.id,
        price_id: priceId,
        captcha_score: captchaResult.score,
        ip_address: ip,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      logger.warn('Checkout rate-limit logging failed (non-blocking)', { msg: e?.message })
    }

    // NOTE: If you truly want "No credit card required", you can add:
    // payment_method_collection: 'if_required'
    // But many businesses prefer collecting card up-front to avoid churn at day 7.

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          captchaScore: captchaResult.score?.toString() || 'unknown',
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
        captchaScore: captchaResult.score?.toString() || 'unknown',
        ipAddress: ip || 'unknown',
      },
    })

    logger.audit('Checkout session created', {
      sessionId: checkoutSession.id,
      userId: user.id,
      email: user.email,
      priceId,
      captchaScore: captchaResult.score,
      ip,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Checkout error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Payment system error' }, { status: 500 })
  }
}
