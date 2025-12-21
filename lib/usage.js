// lib/usage.js - STRICT trial enforcement with card-required flow + Security Enhancements

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

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
    .select('id, status, price_id, current_period_start, current_period_end, trial_end, plan')
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
 * ✅ ENHANCED: Check if user has valid access (STRICT enforcement + Grace Period)
 */
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

  // ========================================================================
  // ✅ STRICT: Check if trial has expired
  // ========================================================================
  if (sub.status === 'trialing' && sub.trial_end) {
    const trialEnd = new Date(sub.trial_end)
    const now = new Date()
    
    if (trialEnd < now) {
      logger.warn('Trial expired - blocking access', { 
        userId, 
        trialEnd: trialEnd.toISOString(),
        hoursExpired: Math.round((now - trialEnd) / (1000 * 60 * 60))
      })
      
      const e = new Error('Your trial has ended. Please subscribe to continue.')
      e.code = 'TRIAL_EXPIRED'
      throw e
    }
    
    // Log time remaining
    const hoursLeft = Math.round((trialEnd - now) / (1000 * 60 * 60))
    logger.info('Trial access granted', { userId, hoursLeft })
  }

  // ========================================================================
  // ✅ ENHANCEMENT: Check if paid subscription has expired (with grace period)
  // ========================================================================
  if (sub.status === 'active' && sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      // Give 24-hour grace period for payment processing
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
      
      // Within grace period - log but allow
      logger.warn('Subscription in grace period', { 
        userId,
        hoursRemaining: Math.round((gracePeriodEnd - now) / (1000 * 60 * 60))
      })
    }
  }

  return { valid: true, subscription: sub }
}

/**
 * ✅ ENHANCED: Log usage for analytics (Unlimited plan = NO LIMITS)
 * - Enforces trial expiration
 * - Enforces subscription expiration
 * - Includes grace period handling
 * 
 * payload: { userId, mode: 'vision' | 'text', success?: boolean, durationMs?: number }
 */
export async function logUsageForAnalytics(payload) {
  const { userId, mode, success, durationMs } = payload || {}

  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  const isImage = mode === 'vision'
  const supabaseAdmin = getSupabaseAdmin()

  // Require active/trialing subscription (Unlimited plan still paid)
  const sub = await getActiveSubscription(supabaseAdmin, userId)
  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  // ========================================================================
  // ✅ STRICT: Check if trial has expired
  // ========================================================================
  if (sub.status === 'trialing' && sub.trial_end) {
    const trialEnd = new Date(sub.trial_end)
    const now = new Date()
    
    if (trialEnd < now) {
      logger.warn('Trial expired during usage logging', { 
        userId, 
        trialEnd: trialEnd.toISOString(),
        hoursExpired: Math.round((now - trialEnd) / (1000 * 60 * 60))
      })
      const e = new Error('Your trial has ended. Please subscribe to continue.')
      e.code = 'TRIAL_EXPIRED'
      throw e
    }
  }

  // ========================================================================
  // ✅ ENHANCEMENT: Check if paid subscription has expired (with grace period)
  // ========================================================================
  if (sub.status === 'active' && sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end)
    const now = new Date()
    
    if (periodEnd < now) {
      // Give 24-hour grace period for payment processing
      const graceHours = 24
      const gracePeriodEnd = new Date(periodEnd.getTime() + graceHours * 60 * 60 * 1000)
      
      if (now > gracePeriodEnd) {
        logger.warn('Subscription expired during usage logging (past grace period)', { 
          userId, 
          periodEnd: periodEnd.toISOString(),
          hoursSinceExpiry: Math.round((now - periodEnd) / (1000 * 60 * 60))
        })
        const e = new Error('Your subscription has expired. Please update your payment method.')
        e.code = 'SUBSCRIPTION_EXPIRED'
        throw e
      }
      
      // Within grace period - log but allow
      logger.warn('Subscription in grace period during usage logging', { 
        userId,
        hoursRemaining: Math.round((gracePeriodEnd - now) / (1000 * 60 * 60))
      })
    }
  }

  const planName = sub.plan || 'premium'

  // Robust billing period
  const now = new Date()
  let periodStart = safeDate(sub.current_period_start, safeDate(sub.current_period_end, now))
  let periodEnd = safeDate(sub.current_period_end, addDays(periodStart, 30))

  // If periodEnd is invalid or <= start, force a sane window
  if (!Number.isFinite(periodEnd.getTime()) || periodEnd <= periodStart) {
    periodEnd = addDays(periodStart, 30)
  }

  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  try {
    // Try to find the counter row for THIS billing window
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

    // If not found, create a new period row
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
        // Don't break the app for analytics failures
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

    logger.info('Usage logged (unlimited)', {
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
    // ✅ CRITICAL: Still enforce subscription errors (don't fail open)
    if (err?.code === 'NO_SUBSCRIPTION' || err?.code === 'TRIAL_EXPIRED' || err?.code === 'SUBSCRIPTION_EXPIRED') {
      throw err
    }

    logger.error('Usage logging exception', {
      error: err?.message || String(err),
      userId,
    })

    // Don't break the app because analytics failed (only if NOT a subscription error)
    return { success: true, planType: planName, unlimited: true }
  }
}
