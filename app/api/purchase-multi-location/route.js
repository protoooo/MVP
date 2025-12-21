// app/api/purchase-multi-location/route.js
// NEW: Self-service multi-location purchase (before abuse detection)
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
const PRICE_PER_LOCATION = 149

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

    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in multi-location purchase', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { locationCount, purchaseType, captchaToken } = body

    // Validate location count
    if (!locationCount || locationCount < 2 || locationCount > 50) {
      logger.security('Invalid location count', { locationCount, ip })
      return NextResponse.json({ error: 'Invalid location count (2-50 allowed)' }, { status: 400 })
    }

    // Validate purchase type
    if (!['separate', 'single'].includes(purchaseType)) {
      logger.security('Invalid purchase type', { purchaseType, ip })
      return NextResponse.json({ error: 'Invalid purchase type' }, { status: 400 })
    }

    // CAPTCHA verification
    if (!captchaToken) {
      logger.security('Missing captcha token in multi-location purchase', { ip })
      return NextResponse.json(
        { error: 'Security verification required', code: 'CAPTCHA_MISSING' },
        { status: 403 }
      )
    }

    const captchaResult = await verifyCaptcha(captchaToken, 'multi_location_purchase', ip)

    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for multi-location purchase', {
        ip,
        error: captchaResult.error,
        locationCount,
      })

      return NextResponse.json(
        { error: 'Security verification failed', code: 'CAPTCHA_FAILED' },
        { status: 403 }
      )
    }

    // Authentication
    const cookieStore = await cookies()
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
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthenticated multi-location purchase attempt', { ip })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Email verification check
    if (!user.email_confirmed_at) {
      logger.security('Unverified email attempted multi-location purchase', { 
        userId: user.id, 
        email: user.email?.substring(0, 3) + '***',
        ip 
      })
      return NextResponse.json({ 
        error: 'Please verify your email before purchasing',
        code: 'EMAIL_NOT_VERIFIED' 
      }, { status: 403 })
    }

    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, is_multi_location, location_count')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (existingSubscription) {
      logger.warn('User already has subscription', { 
        userId: user.id,
        existingLocationCount: existingSubscription.location_count 
      })
      return NextResponse.json({ 
        error: 'You already have an active subscription. Please use the upgrade option instead.',
        code: 'ALREADY_SUBSCRIBED' 
      }, { status: 400 })
    }

    const monthlyPrice = PRICE_PER_LOCATION * locationCount

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            product_data: {
              name: `protocolLM - ${locationCount} Location${locationCount > 1 ? 's' : ''}`,
              description: purchaseType === 'separate'
                ? `${locationCount} separate logins (one per location) - Most secure`
                : `Single shared login across ${locationCount} locations`,
            },
            unit_amount: monthlyPrice * 100,
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          locationCount: locationCount.toString(),
          purchaseType,
          isMultiLocation: 'true',
          pricePerLocation: PRICE_PER_LOCATION.toString(),
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?purchase=success&locations=${locationCount}&type=${purchaseType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?purchase=cancelled`,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        locationCount: locationCount.toString(),
        purchaseType,
        isMultiLocation: 'true',
        timestamp: Date.now().toString(),
        ipAddress: ip || 'unknown',
        pricePerLocation: PRICE_PER_LOCATION.toString(),
      },
    })

    logger.audit('Multi-location purchase initiated', {
      sessionId: checkoutSession.id,
      userId: user.id,
      email: user.email,
      locationCount,
      purchaseType,
      monthlyPrice,
      ip,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Multi-location purchase error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Purchase system error' }, { status: 500 })
  }
}
