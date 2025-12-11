// lib/usage.js - Simplified for unlimited plan with logging
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing Supabase env vars for usage tracking')
}

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
    .select('id, status, price_id, current_period_start, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error('Subscription lookup failed', { error: error.message, userId })
    const e = new Error('Subscription lookup failed')
    e.code = 'SUB_LOOKUP_FAILED'
    throw e
  }

  return data || null
}

/**
 * Check subscription and log usage for analytics (no limits enforced - unlimited plan)
 * @param {string} userId - User ID
 * @param {object} options - Options { isImage: boolean }
 * @returns {Promise<object>} - { success: true }
 */
export async function logUsageForAnalytics(userId, { isImage = false } = {}) {
  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  // Check for active subscription
  const sub = await getActiveSubscription(userId)

  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
  }

  const periodStart = new Date(sub.current_period_start || sub.current_period_end)
  const periodEnd = new Date(sub.current_period_end || sub.current_period_start)

  // Log usage for analytics (no limits enforced)
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

    // Create new period row if needed
    if (!inSamePeriod) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('usage_counters')
        .insert({
          user_id: userId,
          plan_type: 'unlimited',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          text_count: 0,
          image_count: 0,
        })
        .select('*')
        .single()

      if (insertError) {
        logger.error('Failed to create usage row', { error: insertError.message })
      } else {
        row = inserted
      }
    }

    // Increment counters (for analytics only, no limits)
    if (row) {
      const nextTextCount = row.text_count + (isImage ? 0 : 1)
      const nextImageCount = row.image_count + (isImage ? 1 : 0)

      const { error: updateError } = await supabaseAdmin
        .from('usage_counters')
        .update({
          text_count: nextTextCount,
          image_count: nextImageCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateError) {
        logger.error('Failed to update usage', { error: updateError.message })
      } else {
        logger.info('Usage logged', {
          userId,
          type: isImage ? 'image' : 'text',
          textCount: nextTextCount,
          imageCount: nextImageCount
        })
      }
    }
  } catch (err) {
    // Don't block requests if usage logging fails
    logger.error('Usage logging exception', { error: err.message })
  }

  return {
    success: true,
    planType: 'unlimited',
    unlimited: true
  }
}
