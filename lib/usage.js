// lib/usage.js - UNLIMITED PLAN with trial expiration check

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
 * Log usage for analytics (Unlimited plan = NO LIMITS)
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

  // ✅ Require active/trialing subscription (Unlimited plan still paid)
  const sub = await getActiveSubscription(supabaseAdmin, userId)
  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  // ✅ NEW: Check if trial has expired
  if (sub.status === 'trialing' && sub.trial_end) {
    const trialEnd = new Date(sub.trial_end)
    if (trialEnd < new Date()) {
      logger.warn('Trial expired', { userId, trialEnd: trialEnd.toISOString() })
      const e = new Error('Your trial has ended. Please subscribe to continue.')
      e.code = 'TRIAL_EXPIRED'
      throw e
    }
  }

  const planName = sub.plan || 'premium'

  // ✅ Robust billing period
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
    // ✅ Try to find the counter row for THIS billing window
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

    // ✅ If not found, create a new period row
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
        // Optional metadata fields if you have them (safe even if ignored by DB):
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
    // ✅ Still enforce subscription errors
    if (err?.code === 'NO_SUBSCRIPTION' || err?.code === 'TRIAL_EXPIRED') throw err

    logger.error('Usage logging exception', {
      error: err?.message || String(err),
      userId,
    })

    // Don't break the app because analytics failed
    return { success: true, planType: planName, unlimited: true }
  }
}
