// lib/usage.js - FIXED: Secure trial verification
// ✅ NO grace period for payment failures
// ✅ Payment method required BEFORE trial expires
// ✅ Grace period ONLY for successful pending payments

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    const e = new Error('Missing Supabase admin env vars')
    e.code = 'MISSING_SUPABASE_ADMIN_ENV'
    throw e
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

function safeDate(value, fallback) {
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : fallback
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

async function getActiveSubscription(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, price_id, current_period_start, current_period_end, trial_end, plan, stripe_subscription_id, cancel_at_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('Subscription lookup failed', {
      error: error.message,
      userId,
    })
    const e = new Error('Subscription lookup failed')
    e.code = 'SUB_LOOKUP_FAILED'
    throw e
  }

  return data || null
}

/**
 * ✅ FIXED: Secure trial verification
 * - Payment method REQUIRED before trial expires
 * - NO grace period for failed payments
 * - Grace period ONLY for successful pending payments (rare edge case)
 */
async function verifyTrialExpiration(sub, userId) {
  if (sub.status !== 'trialing' || !sub.trial_end) {
    return { valid: true, subscription: sub }
  }

  const trialEnd = new Date(sub.trial_end)
  const now = new Date()
  
  // ✅ Trial still active
  if (trialEnd >= now) {
    const hoursLeft = Math.round((trialEnd - now) / (1000 * 60 * 60))
    
    // ✅ If no Stripe subscription, warn but allow (user can still add card)
    if (!sub.stripe_subscription_id) {
      if (hoursLeft <= 24) {
        logger.warn('Trial ending soon without payment method', { userId, hoursLeft })
        return { 
          valid: true, 
          subscription: sub, 
          warning: 'NO_PAYMENT_METHOD',
          hoursLeft 
        }
      }
      return { valid: true, subscription: sub }
    }
    
    logger.info('Trial active', { userId, hoursLeft })
    return { valid: true, subscription: sub }
  }
  
  // ============================================================================
  // ❌ TRIAL HAS EXPIRED - ENFORCE PAYMENT
  // ============================================================================
  
  // ✅ FIX 1: No Stripe subscription = Access denied immediately
  if (!sub.stripe_subscription_id) {
    logger.warn('Trial expired without Stripe subscription', { 
      userId,
      trialEnd: trialEnd.toISOString(),
      hoursSinceExpiry: Math.round((now - trialEnd) / (1000 * 60 * 60))
    })
    const e = new Error('Your trial has ended. Please subscribe to continue.')
    e.code = 'TRIAL_EXPIRED'
    throw e
  }
  
  // ✅ FIX 2: Verify with Stripe (fail-closed if Stripe unreachable)
  let stripeSubscription
  try {
    stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
  } catch (stripeError) {
    logger.error('Stripe verification failed during trial expiration check', {
      error: stripeError.message,
      userId
    })
    
    // ✅ CRITICAL: If Stripe is down, deny access (fail-closed security)
    const e = new Error('Unable to verify subscription status. Please try again in a few minutes.')
    e.code = 'TRIAL_EXPIRED_VERIFICATION_FAILED'
    throw e
  }
  
  // ✅ FIX 3: Check payment method exists
  const hasPaymentMethod = !!stripeSubscription.default_payment_method
  
  if (!hasPaymentMethod) {
    logger.warn('Trial expired without payment method', { 
      userId,
      trialEnd: trialEnd.toISOString(),
      stripeStatus: stripeSubscription.status
    })
    const e = new Error('Your trial has ended. Please add a payment method to continue.')
    e.code = 'TRIAL_EXPIRED'
    throw e
  }
  
  // ✅ FIX 4: Check if conversion succeeded
  if (stripeSubscription.status === 'active') {
    logger.info('Trial converted to active subscription', { userId })
    return { valid: true, subscription: sub }
  }
  
  // ✅ FIX 5: ONLY grant grace period for successful PROCESSING payments
  // This handles the rare case where Stripe needs extra time to confirm payment
  const latestInvoice = stripeSubscription.latest_invoice
  const paymentIntent = latestInvoice?.payment_intent
  
  if (paymentIntent?.status === 'processing' && 
      !paymentIntent.last_payment_error) { // ✅ NO errors on payment
    
    const GRACE_PERIOD_MINUTES = 15 // ✅ Reduced from 60 to 15 minutes
    const gracePeriodEnd = new Date(trialEnd.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000)
    
    if (now < gracePeriodEnd) {
      const minutesRemaining = Math.round((gracePeriodEnd - now) / (1000 * 60))
      logger.info('Trial conversion in progress (payment processing)', { 
        userId,
        minutesRemaining,
        stripeStatus: stripeSubscription.status
      })
      
      return { 
        valid: true, 
        subscription: sub,
        gracePeriod: true,
        gracePeriodMinutesRemaining: minutesRemaining
      }
    }
  }
  
  // ✅ FIX 6: All other cases = Access denied
  logger.warn('Trial expired - payment failed or incomplete', { 
    userId, 
    trialEnd: trialEnd.toISOString(),
    stripeStatus: stripeSubscription.status,
    invoiceStatus: latestInvoice?.status,
    paymentIntentStatus: paymentIntent?.status,
    paymentError: paymentIntent?.last_payment_error?.message
  })
  
  const e = new Error('Your trial has ended and payment could not be processed. Please update your payment method.')
  e.code = 'TRIAL_EXPIRED_PAYMENT_FAILED'
  throw e
}

export async function checkAccess(userId) {
  if (!userId) {
    const e = new Error('No user ID provided')
    e.code = 'NO_USER'
    throw e
  }

  const supabaseAdmin = getSupabaseAdmin()
  const sub = await getActiveSubscription(supabaseAdmin, userId)

  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  const trialCheck = await verifyTrialExpiration(sub, userId)
  if (!trialCheck.valid) {
    throw new Error(trialCheck.error || 'Trial verification failed')
  }

  // Check paid subscription expiration (with grace period)
  if (sub.status === 'active' && sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      const graceHours = 24
      const gracePeriodEnd = new Date(periodEnd.getTime() + graceHours * 60 * 60 * 1000)
      
      if (now > gracePeriodEnd) {
        logger.warn('Subscription period expired (past grace period)', { 
          userId, 
          periodEnd: periodEnd.toISOString(),
          hoursSinceExpiry: Math.round((now - periodEnd) / (1000 * 60 * 60))
        })
        const e = new Error('Your subscription has expired. Please update your payment method.')
        e.code = 'SUBSCRIPTION_EXPIRED'
        throw e
      }
      
      logger.warn('Subscription in grace period', { 
        userId,
        hoursRemaining: Math.round((gracePeriodEnd - now) / (1000 * 60 * 60))
      })
    }
  }

  return { valid: true, subscription: sub }
}

export async function logUsageForAnalytics(payload) {
  const { userId, mode, success, durationMs } = payload || {}

  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  const isImage = mode === 'vision'
  const supabaseAdmin = getSupabaseAdmin()

  const sub = await getActiveSubscription(supabaseAdmin, userId)
  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  await verifyTrialExpiration(sub, userId)

  const planName = 'unlimited'
  const now = new Date()
  let periodStart = safeDate(sub.current_period_start, safeDate(sub.current_period_end, now))
  let periodEnd = safeDate(sub.current_period_end, addDays(periodStart, 30))

  if (!Number.isFinite(periodEnd.getTime()) || periodEnd <= periodStart) {
    periodEnd = addDays(periodStart, 30)
  }

  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  try {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('usage_counters')
      .select('id, user_id, period_start, period_end, text_count, image_count, plan')
      .eq('user_id', userId)
      .gte('period_start', periodStartISO)
      .lt('period_start', periodEndISO)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingErr) {
      logger.error('Usage lookup failed', { error: existingErr.message, userId })
    }

    let row = existing

    if (!row) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('usage_counters')
        .insert({
          user_id: userId,
          plan: planName,
          plan_type: 'unlimited',
          period_start: periodStartISO,
          period_end: periodEndISO,
          text_count: 0,
          image_count: 0,
        })
        .select('id, text_count, image_count, plan')
        .single()

      if (insertErr) {
        logger.error('Usage insert failed', { error: insertErr.message, userId })
        return { success: true, planType: planName, unlimited: true }
      }

      row = inserted
    }

    const nextTextCount = (row.text_count || 0) + (isImage ? 0 : 1)
    const nextImageCount = (row.image_count || 0) + (isImage ? 1 : 0)

    const { error: updateErr } = await supabaseAdmin
      .from('usage_counters')
      .update({
        text_count: nextTextCount,
        image_count: nextImageCount,
        updated_at: new Date().toISOString(),
        last_mode: isImage ? 'vision' : 'text',
        last_success: typeof success === 'boolean' ? success : null,
        last_duration_ms: Number.isFinite(durationMs) ? Math.round(durationMs) : null,
      })
      .eq('id', row.id)

    if (updateErr) {
      logger.error('Usage update failed', { error: updateErr.message, userId })
      return { success: true, planType: planName, unlimited: true }
    }

    logger.info('Usage logged (unlimited Sonnet 4.5)', {
      userId,
      type: isImage ? 'image' : 'text',
      textCount: nextTextCount,
      imageCount: nextImageCount,
      plan: planName,
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
    })

    return {
      success: true,
      planType: planName,
      unlimited: true,
      textCount: nextTextCount,
      photoCount: nextImageCount,
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
    }
  } catch (err) {
    if (err?.code === 'NO_SUBSCRIPTION' || err?.code?.startsWith('TRIAL_EXPIRED') || err?.code === 'SUBSCRIPTION_EXPIRED') {
      throw err
    }

    logger.error('Usage logging exception', {
      error: err?.message || String(err),
      userId,
    })

    return { success: true, planType: planName, unlimited: true }
  }
}
