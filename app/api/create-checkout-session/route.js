// app/api/create-checkout-session/route.js - SINGLE PLAN VERSION
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF, validateCriticalOperation } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

const ALLOWED_PRICES = [UNLIMITED_MONTHLY].filter(Boolean)

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

    // ✅ CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in checkout', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { priceId, captchaToken } = body

    // ✅ Validate price ID
    if (!priceId || !ALLOWED_PRICES.includes(priceId)) {
      logger.security('Invalid price ID attempted', { priceId, ip })
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // ✅ CAPTCHA verification
    if (!captchaToken) {
      logger.security('Missing captcha token in checkout', { ip, priceId })
      return NextResponse.json(
        { error: 'Security verification required. Please try again.', code: 'CAPTCHA_MISSING' },
        { status: 403 }
      )
    }

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

    // ✅ Authentication
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

    const bearer = getBearerToken(request)
    const {
      data: { user },
      error: authError,
    } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthenticated checkout attempt', { ip })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ✅ NEW: Session consistency validation (prevent session hijacking)
    const storedSessionData = {
      ip: user.user_metadata?.signup_ip,
      userAgent: user.user_metadata?.signup_user_agent
    }
    
    const sessionCheck = validateCriticalOperation(request, storedSessionData)
    
    if (!sessionCheck.valid) {
      logger.security('Session consistency check failed in checkout', {
        userId: user.id,
        reason: sessionCheck.reason,
        code: sessionCheck.code
      })
      
      return NextResponse.json({
        error: sessionCheck.reason || 'Security verification failed. Please sign in again.',
        code: sessionCheck.code || 'SESSION_VALIDATION_FAILED'
      }, { status: 403 })
    }

    // ✅ Email verification check
    if (!user.email_confirmed_at) {
      logger.security('Unverified email attempted checkout', { 
        userId: user.id, 
        email: user.email?.substring(0, 3) + '***',
        ip 
      })
      return NextResponse.json({ 
        error: 'Please verify your email before starting a trial. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED' 
      }, { status: 403 })
    }

    logger.info('Email verification confirmed', { userId: user.id })

    // ✅ Check for existing subscription BEFORE rate limiting
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (existingSubscription) {
      logger.warn('User already has active subscription', { userId: user.id })
      return NextResponse.json({ 
        error: 'You already have an active subscription',
        code: 'ALREADY_SUBSCRIBED' 
      }, { status: 400 })
    }

    // ✅ Check for pending checkout sessions
    const { data: pendingSessions, error: pendingError } = await supabase
      .from('checkout_attempts')
      .select('id, created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (pendingError) {
      logger.warn('Failed to check pending sessions', { error: pendingError.message, userId: user.id })
    } else if (pendingSessions && pendingSessions.length >= 3) {
      logger.security('Too many pending checkout sessions', { 
        userId: user.id, 
        email: user.email?.substring(0, 3) + '***',
        count: pendingSessions.length,
        ip 
      })
      return NextResponse.json({ 
        error: 'You have too many pending checkout sessions. Please complete or wait for them to expire.',
        code: 'TOO_MANY_PENDING_SESSIONS' 
      }, { status: 429 })
    }

    // ✅ Rate limit check
    try {
      const { data: recent, error: rateLimitError } = await supabase
        .from('checkout_attempts')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 60_000).toISOString())

      if (rateLimitError) {
        logger.error('Checkout rate-limit check failed - blocking request', { 
          msg: rateLimitError?.message,
          userId: user.id 
        })
        return NextResponse.json({ 
          error: 'Service temporarily unavailable. Please try again.' 
        }, { status: 503 })
      }

      if (recent && recent.length >= 5) {
        logger.security('Checkout rate limit exceeded', { userId: user.id, email: user.email, ip })
        return NextResponse.json({ error: 'Too many checkout attempts. Please wait 1 minute.' }, { status: 429 })
      }

      // ✅ Log checkout attempt
      const { error: insertError } = await supabase.from('checkout_attempts').insert({
        user_id: user.id,
        price_id: priceId,
        captcha_score: captchaResult.score,
        ip_address: ip,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        logger.warn('Failed to log checkout attempt', { msg: insertError?.message })
      }
    } catch (e) {
      logger.error('Checkout rate-limit exception - blocking request', { 
        msg: e?.message,
        userId: user.id 
      })
      return NextResponse.json({ 
        error: 'Service temporarily unavailable. Please try again.' 
      }, { status: 503 })
    }

    // ✅ Create Stripe checkout session
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

    logger.audit('Checkout session created (single plan)', {
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
