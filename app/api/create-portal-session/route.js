// app/api/create-portal-session/route.js - SECURITY FIX
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  return auth.slice(7).trim() || null
}

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('Missing STRIPE_SECRET_KEY')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in billing portal')
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    // Supabase auth (cookie or Bearer)
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
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const bearer = getBearerToken(request)
    const { data: { user }, error: authError } = bearer 
      ? await supabase.auth.getUser(bearer) 
      : await supabase.auth.getUser()

    // ✅ SECURITY FIX: Explicitly check for auth errors
    if (authError) {
      logger.security('Auth error in portal', { error: authError.message })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      logger.warn('No user in portal session')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ✅ SECURITY: Verify user still has active session (not revoked)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      logger.security('Session validation failed in portal', { 
        userId: user.id,
        error: sessionError?.message 
      })
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get user's Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      logger.error('Subscription lookup error', { 
        error: subError.message,
        userId: user.id 
      })
      return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
    }

    if (!subscription?.stripe_customer_id) {
      logger.warn('No subscription found for portal', { userId: user.id })
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // ✅ SECURITY: Double-check user_id matches (paranoid check)
    if (subscription.user_id !== user.id) {
      logger.security('User ID mismatch in portal', {
        authUserId: user.id,
        subscriptionUserId: subscription.user_id
      })
      return NextResponse.json({ error: 'Authorization failed' }, { status: 403 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?portal=success`,
    })

    logger.audit('Billing portal session created', {
      userId: user.id,
      customerId: subscription.stripe_customer_id,
    })

    return NextResponse.json({ url: portalSession.url })
    
  } catch (error) {
    logger.error('Portal creation error', { error: error?.message })
    return NextResponse.json({ error: error?.message || 'Portal error' }, { status: 500 })
  }
}
