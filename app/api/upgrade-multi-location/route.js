// app/api/upgrade-multi-location/route.js
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

const BASE_PRICE = 100
const ADDITIONAL_LOCATION_PRICE = 80

function calculatePrice(locations) {
  if (locations <= 1) return BASE_PRICE
  return BASE_PRICE + (ADDITIONAL_LOCATION_PRICE * (locations - 1))
}

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
      logger.security('CSRF validation failed in multi-location upgrade', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { locationCount, captchaToken } = body

    // Validate location count
    if (!locationCount || locationCount < 2 || locationCount > 10) {
      logger.security('Invalid location count', { locationCount, ip })
      return NextResponse.json({ error: 'Invalid location count (2-10 allowed)' }, { status: 400 })
    }

    // CAPTCHA verification
    if (!captchaToken) {
      logger.security('Missing captcha token in multi-location upgrade', { ip })
      return NextResponse.json(
        { error: 'Security verification required', code: 'CAPTCHA_MISSING' },
        { status: 403 }
      )
    }

    const captchaResult = await verifyCaptcha(captchaToken, 'multi_location_upgrade', ip)

    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for multi-location upgrade', {
        ip,
        error: captchaResult.error,
        locationCount,
      })

      return NextResponse.json(
        { error: 'Security verification failed', code: 'CAPTCHA_FAILED' },
        { status: 403 }
      )
    }

    logger.info('Multi-location upgrade CAPTCHA verified', { ip, locationCount })

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

    const bearer = getBearerToken(request)
    const {
      data: { user },
      error: authError,
    } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Unauthenticated multi-location upgrade attempt', { ip })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get current subscription
    const { data: currentSub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status, price_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (subError || !currentSub) {
      logger.warn('No active subscription for multi-location upgrade', { userId: user.id })
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Calculate new pricing
    const monthlyPrice = calculatePrice(locationCount)

    // Create new subscription with quantity-based pricing
    // Cancel old subscription and create new one
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: currentSub.stripe_customer_id,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `protocolLM - ${locationCount} Locations`,
              description: `Multi-location license for ${locationCount} restaurant locations`,
            },
            unit_amount: monthlyPrice * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: user.id,
          userEmail: user.email,
          locationCount: locationCount.toString(),
          isMultiLocation: 'true',
          oldSubscriptionId: currentSub.stripe_subscription_id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?upgrade=cancelled`,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        locationCount: locationCount.toString(),
        isMultiLocation: 'true',
        oldSubscriptionId: currentSub.stripe_subscription_id,
        timestamp: Date.now().toString(),
        ipAddress: ip || 'unknown',
      },
    })

    logger.audit('Multi-location upgrade checkout created', {
      sessionId: checkoutSession.id,
      userId: user.id,
      email: user.email,
      locationCount,
      monthlyPrice,
      ip,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Multi-location upgrade error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Upgrade system error' }, { status: 500 })
  }
}
