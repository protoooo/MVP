// app/api/accept-terms/route.js - SECURITY FIX: Subscription verification before terms acceptance
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    
    // First, authenticate the user with anon key
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ✅ SECURITY FIX: Verify user has active subscription BEFORE allowing terms acceptance
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      const message = 'SUPABASE_SERVICE_ROLE_KEY is missing; service role key is required for accept-terms'
      logger.error(message)
      throw new Error(message)
    }

    const supabase = createServerClient(
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

    // ✅ CRITICAL: Check for active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      logger.error('Subscription check failed in accept-terms', { 
        error: subError.message,
        userId: user.id 
      })
      return NextResponse.json({ 
        error: 'Unable to verify subscription status. Please try again.' 
      }, { status: 500 })
    }

    if (!subscription) {
      logger.security('Attempted terms acceptance without subscription', { 
        userId: user.id,
        email: user.email 
      })
      return NextResponse.json({ 
        error: 'Please complete your subscription setup before accepting terms.',
        code: 'NO_SUBSCRIPTION'
      }, { status: 402 })
    }

    // ✅ CRITICAL: Check if trial has expired
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end)
      const now = new Date()
      
      if (trialEnd < now) {
        logger.security('Attempted terms acceptance with expired trial', {
          userId: user.id,
          trialEnd: trialEnd.toISOString(),
          hoursExpired: Math.round((now - trialEnd) / (1000 * 60 * 60))
        })
        return NextResponse.json({
          error: 'Your trial has ended. Please subscribe to continue.',
          code: 'TRIAL_EXPIRED'
        }, { status: 402 })
      }
    }

    // ✅ ENHANCEMENT: Check if paid subscription has expired
    if (subscription.status === 'active' && subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end)
      const now = new Date()
      
      if (periodEnd < now) {
        logger.security('Attempted terms acceptance with expired subscription', {
          userId: user.id,
          periodEnd: periodEnd.toISOString()
        })
        return NextResponse.json({
          error: 'Your subscription has expired. Please update your payment method.',
          code: 'SUBSCRIPTION_EXPIRED'
        }, { status: 402 })
      }
    }

    const now = new Date().toISOString()

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          accepted_terms: true,
          accepted_privacy: true,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          updated_at: now
        })
        .eq('id', user.id)

      if (updateError) {
        logger.error('Failed to update terms acceptance', { 
          error: updateError.message,
          userId: user.id 
        })
        return NextResponse.json({ error: 'Failed to save acceptance' }, { status: 500 })
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          accepted_terms: true,
          accepted_privacy: true,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          created_at: now,
          updated_at: now
        })

      if (insertError) {
        logger.error('Failed to create user profile', { 
          error: insertError.message,
          code: insertError.code,
          userId: user.id 
        })
        return NextResponse.json({ error: 'Failed to save acceptance' }, { status: 500 })
      }
    }

    logger.audit('Terms accepted (with valid subscription)', { 
      userId: user.id, 
      email: user.email,
      subscriptionStatus: subscription.status
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Accept terms exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
