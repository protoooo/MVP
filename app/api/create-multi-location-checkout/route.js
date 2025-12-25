// app/api/create-multi-location-checkout/route.js
// Multi-location/enterprise checkout for bulk location purchases (e.g., Kroger Michigan locations)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const MIN_LOCATIONS = 2
const MAX_LOCATIONS = 500

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

function generateInviteCode() {
  return crypto.randomBytes(16).toString('hex')
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
      logger.security('CSRF validation failed in multi-location checkout', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { locationCount, captchaToken, organizationName, devicesPerLocation: rawDevicesPerLocation } = body

    // Validate location count
    const count = parseInt(locationCount, 10)
    if (!Number.isFinite(count) || count < MIN_LOCATIONS || count > MAX_LOCATIONS) {
      logger.security('Invalid location count attempted', { locationCount, ip })
      return NextResponse.json({ 
        error: `Location count must be between ${MIN_LOCATIONS} and ${MAX_LOCATIONS}` 
      }, { status: 400 })
    }

    const devicesPerLocation = Math.max(1, Math.min(20, parseInt(rawDevicesPerLocation || '1', 10)))

    const pricingTier = count >= 20 ? 'enterprise' : count >= 5 ? 'multi' : 'single'
    const pricePerLocation = pricingTier === 'enterprise' ? 35 : pricingTier === 'multi' ? 40 : 50
    const devicePrice = pricingTier === 'single' ? 20 : 15

    if (pricingTier === 'enterprise') {
      return NextResponse.json({ requiresContact: true, tier: pricingTier })
    }

    // CAPTCHA verification
    if (!captchaToken) {
      logger.security('Missing captcha token in multi-location checkout', { ip, locationCount: count })
      return NextResponse.json(
        { error: 'Security verification required. Please try again.', code: 'CAPTCHA_MISSING' },
        { status: 403 }
      )
    }

    const captchaResult = await verifyCaptcha(captchaToken, 'multi_location_checkout', ip)

    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for multi-location checkout', {
        ip,
        error: captchaResult.error,
        score: captchaResult.score,
        locationCount: count,
      })

      return NextResponse.json(
        { error: 'Security verification failed. Please try again.', code: 'CAPTCHA_FAILED' },
        { status: 403 }
      )
    }

    logger.info('Multi-location checkout CAPTCHA verified', { ip, score: captchaResult.score, locationCount: count })

    // Authentication
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
      logger.warn('Unauthenticated multi-location checkout attempt', { ip })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Email verification check
    if (!user.email_confirmed_at) {
      logger.security('Unverified email attempted multi-location checkout', { 
        userId: user.id, 
        email: user.email?.substring(0, 3) + '***',
        ip 
      })
      return NextResponse.json({ 
        error: 'Please verify your email before purchasing.',
        code: 'EMAIL_NOT_VERIFIED' 
      }, { status: 403 })
    }

    // Check for existing active subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, location_count')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (existingSubscription) {
      logger.warn('User already has active subscription', { userId: user.id })
      return NextResponse.json({ 
        error: 'You already have an active subscription. Contact support to add locations.',
        code: 'ALREADY_SUBSCRIBED' 
      }, { status: 400 })
    }

    // Generate invite codes for each device at each location
    const inviteCodes = []
    for (let i = 1; i <= count; i++) {
      for (let device = 1; device <= devicesPerLocation; device++) {
        inviteCodes.push({
          code: generateInviteCode(),
          location_number: i,
          device_number: device,
        })
      }
    }

    // Create pending multi-location purchase record
    const { data: pendingPurchase, error: purchaseError } = await supabase
      .from('pending_multi_location_purchases')
      .insert({
        buyer_user_id: user.id,
        buyer_email: user.email,
        organization_name: organizationName || null,
        location_count: count,
        devices_per_location: devicesPerLocation,
        invite_codes: inviteCodes,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (purchaseError) {
      logger.error('Failed to create pending purchase', { error: purchaseError.message, userId: user.id })
      return NextResponse.json({ error: 'Failed to initiate purchase' }, { status: 500 })
    }

    // Calculate total price
    const totalDevices = count * devicesPerLocation
    const additionalDevices = Math.max(0, totalDevices - count)
    const totalMonthlyPrice = (pricePerLocation * count) + (additionalDevices * devicePrice)

    // Create Stripe checkout session with quantity
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'protocolLM Location License' },
            recurring: { interval: 'month' },
            unit_amount: pricePerLocation * 100,
          },
          quantity: count,
        },
        ...(additionalDevices > 0
          ? [
              {
                price_data: {
                  currency: 'usd',
                  product_data: { name: 'Additional Device License' },
                  recurring: { interval: 'month' },
                  unit_amount: devicePrice * 100,
                },
                quantity: additionalDevices,
              },
            ]
          : []),
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          isMultiLocation: 'true',
          locationCount: count.toString(),
          devicesPerLocation: devicesPerLocation.toString(),
          basePricePerLocation: pricePerLocation.toString(),
          deviceAddonPrice: devicePrice.toString(),
          totalDevices: totalDevices.toString(),
          pricingTier,
          organizationName: organizationName || '',
          pendingPurchaseId: pendingPurchase.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=success&multi_location=true&locations=${count}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?payment=cancelled`,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        isMultiLocation: 'true',
        locationCount: count.toString(),
        devicesPerLocation: devicesPerLocation.toString(),
        basePricePerLocation: pricePerLocation.toString(),
        deviceAddonPrice: devicePrice.toString(),
        totalDevices: totalDevices.toString(),
        pricingTier,
        organizationName: organizationName || '',
        pendingPurchaseId: pendingPurchase.id,
        timestamp: Date.now().toString(),
        captchaScore: captchaResult.score?.toString() || 'unknown',
        ipAddress: ip || 'unknown',
      },
    })

    logger.audit('Multi-location checkout session created', {
      sessionId: checkoutSession.id,
      userId: user.id,
      email: user.email,
      locationCount: count,
      devicesPerLocation,
      totalMonthlyPrice,
      pendingPurchaseId: pendingPurchase.id,
      ip,
    })

    return NextResponse.json({ 
      url: checkoutSession.url,
      locationCount: count,
      devicesPerLocation,
      pricingTier,
      pricePerLocation,
      devicePrice,
      totalMonthly: totalMonthlyPrice,
    })
  } catch (error) {
    logger.error('Multi-location checkout error', { error: error?.message, ip })
    return NextResponse.json({ error: error?.message || 'Payment system error' }, { status: 500 })
  }
}
