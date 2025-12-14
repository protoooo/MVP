// lib/usage.js - SECURITY FIX: Input validation on isImage parameter
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  logger.error('Missing Supabase env vars for usage tracking')
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

// Usage config: target ~ $20/month API cost per heavy tenant
// 1 text = 1 unit, 1 image = 2 units, 1,300 units per billing period
const USAGE_CONFIG = {
  monthlyUnitCap: 1300,
  textWeight: 1,
  imageWeight: 2,
}

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
 * Check subscription and log usage for analytics + limits.
 * Throws USAGE_LIMIT_REACHED when over the per-period cap.
 *
 * @param {string} userId - User ID
 * @param {object} options - Options { isImage: boolean }
 * @returns {Promise<object>} - { success: true, planType, remainingUnits }
 */
export async function logUsageForAnalytics(
  userId,
  { isImage = false } = {}
) {
  if (!userId) {
    const e = new Error('Missing user id')
    e.code = 'NO_USER'
    throw e
  }

  // ✅ SECURITY FIX: Validate input type
  if (typeof isImage !== 'boolean') {
    logger.error('Invalid isImage parameter type', { 
      userId, 
      isImage, 
      type: typeof isImage 
    })
    throw new Error('Invalid isImage parameter')
  }

  // Check for active subscription
  const sub = await getActiveSubscription(userId)

  if (!sub) {
    const e = new Error('No active subscription')
    e.code = 'NO_SUBSCRIPTION'
    throw e
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

    // Create new period row if needed
    if (!inSamePeriod) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('usage_counters')
        .insert({
          user_id: userId,
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
          userId,
        })
      } else {
        row = inserted
      }
    }

    if (!row) {
      // If we still don't have a row, don't block but log it
      logger.error('No usage row available after insert attempt', {
        userId,
      })
      return { success: true, planType: 'metered', unlimited: false }
    }

    // Compute next counts
    const nextTextCount = row.text_count + (isImage ? 0 : 1)
    const nextImageCount = row.image_count + (isImage ? 1 : 0)

    // Compute normalized usage units
    const unitsUsed =
      nextTextCount * USAGE_CONFIG.textWeight +
      nextImageCount * USAGE_CONFIG.imageWeight

    if (unitsUsed > USAGE_CONFIG.monthlyUnitCap) {
      const e = new Error(
        'Usage limit reached for current billing period'
      )
      e.code = 'USAGE_LIMIT_REACHED'
      e.meta = {
        unitsUsed,
        monthlyUnitCap: USAGE_CONFIG.monthlyUnitCap,
        textCount: nextTextCount,
        imageCount: nextImageCount,
      }
      throw e
    }

    // Within limit: update counters
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
      const remainingUnits = USAGE_CONFIG.monthlyUnitCap - unitsUsed
      logger.info('Usage logged', {
        userId,
        type: isImage ? 'image' : 'text',
        textCount: nextTextCount,
        imageCount: nextImageCount,
        unitsUsed,
        remainingUnits,
      })

      return {
        success: true,
        planType: 'metered',
        unlimited: false,
        remainingUnits,
      }
    }
  } catch (err) {
    // Propagate hard-limit or subscription errors; swallow others
    if (
      err.code === 'USAGE_LIMIT_REACHED' ||
      err.code === 'NO_SUBSCRIPTION'
    ) {
      throw err
    }
    logger.error('Usage logging exception', {
      error: err.message,
      userId,
    })
  }

  return {
    success: true,
    planType: 'metered',
    unlimited: false,
  }
}
