import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'
import { emails } from '@/lib/emails'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const PRICE_PER_LOCATION = 149

function generateInviteCode() {
  return `ML-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
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

    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in multi-location purchase', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { locationCount, captchaToken } = body

    if (!locationCount || locationCount < 2 || locationCount > 50) {
      logger.security('Invalid location count', { locationCount, ip })
      return NextResponse.json({ error: 'Invalid location count (2-50 allowed)' }, { status: 400 })
    }

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

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (existingSubscription) {
      logger.warn('User already has subscription', { 
        userId: user.id
      })
      return NextResponse.json({ 
        error: 'You already have an active subscription. Please use the upgrade option instead.',
        code: 'ALREADY_SUBSCRIBED' 
      }, { status: 400 })
    }

    // âœ… CRITICAL FIX: Generate invite codes BEFORE Stripe checkout
    const inviteCodes = []
    for (let i = 0; i < locationCount; i++) {
      inviteCodes.push({
        code: generateInviteCode(),
        location_number: i + 1,
        used: false
      })
    }

    // Store invite codes in Supabase (we'll retrieve them in webhook)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    // Create pending purchase record
    const { data: pendingPurchase, error: insertError } = await supabaseAdmin
      .from('pending_multi_location_purchases')
      .insert({
        buyer_user_id: user.id,
        buyer_email: user.email,
        location_count: locationCount,
        invite_codes: inviteCodes,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create pending purchase', { error: insertError.message })
      return NextResponse.json({ error: 'Purchase initialization failed' }, { status: 500 })
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
              description: `${locationCount} separate logins (one per location) - Most secure`,
            },
            unit_amount: PRICE_PER_LOCATION * 100, // Price per location
          },
          quantity: locationCount, // Stripe handles quantity
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          locationCount: locationCount.toString(),
          isMultiLocation: 'true',
          pricePerLocation: PRICE_PER_LOCATION.toString(),
          pendingPurchaseId: pendingPurchase.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?purchase=success&locations=${locationCount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?purchase=cancelled`,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        locationCount: locationCount.toString(),
        isMultiLocation: 'true',
        timestamp: Date.now().toString(),
        ipAddress: ip || 'unknown',
        pricePerLocation: PRICE_PER_LOCATION.toString(),
        pendingPurchaseId: pendingPurchase.id,
      },
    })

    logger.audit('Multi-location purchase initiated', {
      sessionId: checkoutSession.id,
      userId: user.id,
      email: user.email,
      locationCount,
      monthlyPrice,
      pendingPurchaseId: pendingPurchase.id,
      ip,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    logger.error('Multi-location purchase error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Purchase system error' }, { status: 500 })
  }
}
