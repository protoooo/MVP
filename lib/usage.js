// lib/usage.js - UNLIMITED PLAN

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

async function getActiveSubscription(userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, status, price_id, current_period_start, current_period_end, plan')
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
 * Log usage for analytics (NO LIMITS - Unlimited plan)
 * @param {object} payload - { userId, mode, success, durationMs }
 */
export async function logUsageForAnalytics(payload) {
  const { userId, mode, success, durationMs } = payload || {}
  
  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  const isImage = mode === 'vision'

  // Check for active subscription
  const sub = await getActiveSubscription(userId)

  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  const planName = sub.plan || 'premium'

  const periodStart = new Date(
    sub.current_period_start || sub.current_period_end
  )
  const periodEnd = new Date(
    sub.current_period_end || sub.current_period_start
  )

  try {
    const { data: existing } = await supabaseAdmin
      .from('usage_counters')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    const inSamePeriod =
      existing &&
      existing.period_start &&
      new Date(existing.period_start) >= periodStart &&
      new Date(existing.period_start) < periodEnd

    let row = existing

    if (!inSamePeriod) {
      const { data: inserted } = await supabaseAdmin
        .from('usage_counters')
        .insert({
          user_id: userId,
          plan: planName,
          plan_type: 'unlimited',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          text_count: 0,
          image_count: 0,
        })
        .select('*')
        .single()

      row = inserted
    }

    if (!row) {
      return { success: true, planType: planName, unlimited: true }
    }

    const nextTextCount = row.text_count + (isImage ? 0 : 1)
    const nextImageCount = row.image_count + (isImage ? 1 : 0)

    // ✅ NO LIMITS - Just track for analytics
    await supabaseAdmin
      .from('usage_counters')
      .update({
        text_count: nextTextCount,
        image_count: nextImageCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    logger.info('Usage logged (unlimited)', {
      userId,
      type: isImage ? 'image' : 'text',
      textCount: nextTextCount,
      imageCount: nextImageCount,
      plan: planName,
    })

    return {
      success: true,
      planType: planName,
      unlimited: true,
      textCount: nextTextCount,
      photoCount: nextImageCount,
    }
  } catch (err) {
    if (err.code === 'NO_SUBSCRIPTION') {
      throw err
    }
    logger.error('Usage logging exception', {
      error: err.message,
      userId,
    })
  }

  return {
    success: true,
    planType: planName,
    unlimited: true,
  }
}
