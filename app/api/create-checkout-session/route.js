import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { verifyCaptcha } from '@/lib/captchaVerification'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Your Stripe price IDs
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

function getClientIp() {
  const headersList = headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip')
}

export async function POST(request) {
  const ip = getClientIp()
  
  try {
    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in checkout')
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json()
    const { priceId, captchaToken } = body

    // Verify CAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken, 'checkout', ip)
    
    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for checkout', {
        ip,
        error: captchaResult.error,
        score: captchaResult.score
      })
      
      return NextResponse.json(
        { 
          error: 'Security verification failed. Please try again.',
          code: 'CAPTCHA_FAILED'
        },
        { status: 403 }
      )
    }

    // Log CAPTCHA score for monitoring
    logger.info('Checkout CAPTCHA verified', {
      ip,
      score: captchaResult.score,
      priceId
    })

    // Validate price ID
    if (!priceId || !ALLOWED_PRICES.includes(priceId)) {
      logger.security('Invalid price ID attempted', { priceId, ip })
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Get authenticated user
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
      logger.warn('Unauthenticated checkout attempt', { ip })
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit: Prevent abuse of checkout creation
    const { data: recent } = await supabase
      .from('checkout_attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())

    if (recent && recent.length >= 5) {
      logger.security('Checkout rate limit exceeded', { userId: user.id, email: user.email, ip })
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please wait 1 minute.' },
        { status: 429 }
      )
    }

    // Log checkout attempt
    await supabase.from('checkout_attempts').insert({
      user_id: user.id,
      price_id: priceId,
      captcha_score: captchaResult.score,
      ip_address: ip,
      created_at: new Date().toISOString(),
    })

    // Create Stripe checkout session with 7-day trial
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { 
          userId: user.id,
          userEmail: user.email,
          captchaScore: captchaResult.score?.toString() || 'unknown'
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
        ipAddress: ip || 'unknown'
      },
    })

    logger.audit('Checkout session created', {
      sessionId: checkoutSession.id,
      userId: user.id,
      email: user.email,
      priceId,
      captchaScore: captchaResult.score,
      ip
    })

    return NextResponse.json({ url: checkoutSession.url })
    
  } catch (error) {
    logger.error('Checkout error', { error: error.message, ip })
    return NextResponse.json(
      { error: error.message || 'Payment system error' },
      { status: 500 }
    )
  }
}
