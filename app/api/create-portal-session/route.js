// app/api/create-portal-session/route.js - Stripe Customer Portal

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in billing portal')
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
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
      logger.warn('Unauthenticated portal attempt')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription?.stripe_customer_id) {
      logger.warn('No subscription found for portal', { userId: user.id })
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create portal session
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
    logger.error('Portal creation error', { error: error.message })
    return NextResponse.json(
      { error: error.message || 'Portal error' },
      { status: 500 }
    )
  }
}
