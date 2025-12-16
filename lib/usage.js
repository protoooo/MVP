// lib/usage.js - COMPLETE FILE - Single $100 Plan with 100 photos + 50 text

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

// ✅ Single plan limits - Image-first (100 photos, 50 text)
const USAGE_LIMITS = {
  textLimit: 50,
  photoLimit: 100,
}

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
 * Log usage for analytics + enforce limits
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

  // Extract plan name (for future flexibility, but all use same limits now)
  let planName = 'professional'
  
  if (sub.plan) {
    planName = sub.plan
  } else if (sub.price_id) {
    if (sub.price_id.includes('business')) {
      planName = 'business'
    } else if (sub.price_id.includes('professional')) {
      planName = 'professional'
    } else if (sub.price_id.includes('enterprise')) {
      planName = 'enterprise'
    }
  }

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
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('usage_counters')
        .insert({
          user_id: userId,
          plan: planName,
          plan_type: 'metered',
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          text_count: 0,
          image_count: 0,
        })
        .select('*')
        .single()

      if (insertError) {
        logger.error('Failed to create usage row', {
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          userId,
          planName,
          subscriptionId: sub.id
        })
      } else {
        row = inserted
        logger.info('Created new usage counter row', {
          userId,
          plan: planName,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString()
        })
      }
    }

    if (!row) {
      logger.error('No usage row available after insert attempt', {
        userId,
        planName
      })
      return { success: true, planType: planName, unlimited: false }
    }

    const nextTextCount = row.text_count + (isImage ? 0 : 1)
    const nextImageCount = row.image_count + (isImage ? 1 : 0)

    // ✅ Check separate limits for text and photos
    if (!isImage && nextTextCount > USAGE_LIMITS.textLimit) {
      const e = new Error(
        `Text question limit reached (${USAGE_LIMITS.textLimit}/month)`
      )
      e.code = 'TEXT_LIMIT_REACHED'
      e.meta = {
        textCount: nextTextCount,
        textLimit: USAGE_LIMITS.textLimit,
        plan: planName,
      }
      throw e
    }

    if (isImage && nextImageCount > USAGE_LIMITS.photoLimit) {
      const e = new Error(
        `Photo analysis limit reached (${USAGE_LIMITS.photoLimit}/month)`
      )
      e.code = 'PHOTO_LIMIT_REACHED'
      e.meta = {
        imageCount: nextImageCount,
        photoLimit: USAGE_LIMITS.photoLimit,
        plan: planName,
      }
      throw e
    }

    const { error: updateError } = await supabaseAdmin
      .from('usage_counters')
      .update({
        text_count: nextTextCount,
        image_count: nextImageCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (updateError) {
      logger.error('Failed to update usage', {
        error: updateError.message,
        userId,
      })
    } else {
      const remainingText = USAGE_LIMITS.textLimit - nextTextCount
      const remainingPhotos = USAGE_LIMITS.photoLimit - nextImageCount
      
      logger.info('Usage logged', {
        userId,
        type: isImage ? 'image' : 'text',
        textCount: nextTextCount,
        imageCount: nextImageCount,
        remainingText,
        remainingPhotos,
        plan: planName,
      })

      return {
        success: true,
        planType: planName,
        unlimited: false,
        textRemaining: remainingText,
        photoRemaining: remainingPhotos,
        textUsagePercent: Math.round((nextTextCount / USAGE_LIMITS.textLimit) * 100),
        photoUsagePercent: Math.round((nextImageCount / USAGE_LIMITS.photoLimit) * 100),
      }
    }
  } catch (err) {
    if (
      err.code === 'TEXT_LIMIT_REACHED' ||
      err.code === 'PHOTO_LIMIT_REACHED' ||
      err.code === 'NO_SUBSCRIPTION'
    ) {
      throw err
    }
    logger.error('Usage logging exception', {
      error: err.message,
      stack: err.stack,
      userId,
    })
  }

  return {
    success: true,
    planType: planName,
    unlimited: false,
  }
}
