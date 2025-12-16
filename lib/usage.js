// lib/usage.js - REPLACE USAGE_CONFIG section

const USAGE_CONFIG = {
  starter: {
    textLimit: 30,
    photoLimit: 40,
  },
  professional: {
    textLimit: 50,
    photoLimit: 100,
  },
  enterprise: {
    textLimit: 100,
    photoLimit: 200,
  }
}

// Update the logUsageForAnalytics function to use separate counters
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

  // Extract plan name
  let planName = 'professional'
  
  if (sub.plan) {
    planName = sub.plan
  } else if (sub.price_id) {
    if (sub.price_id.includes('starter')) {
      planName = 'starter'
    } else if (sub.price_id.includes('professional')) {
      planName = 'professional'
    } else if (sub.price_id.includes('enterprise')) {
      planName = 'enterprise'
    }
  }

  // Get plan-specific limits
  const planConfig = USAGE_CONFIG[planName] || USAGE_CONFIG.professional
  const textLimit = planConfig.textLimit
  const photoLimit = planConfig.photoLimit

  const periodStart = new Date(sub.current_period_start || sub.current_period_end)
  const periodEnd = new Date(sub.current_period_end || sub.current_period_start)

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
          userId,
          planName,
        })
      } else {
        row = inserted
      }
    }

    if (!row) {
      return { success: true, planType: planName }
    }

    const nextTextCount = row.text_count + (isImage ? 0 : 1)
    const nextImageCount = row.image_count + (isImage ? 1 : 0)

    // Check limits separately
    if (!isImage && nextTextCount > textLimit) {
      const e = new Error('Text question limit reached')
      e.code = 'TEXT_LIMIT_REACHED'
      e.meta = { textCount: nextTextCount, textLimit, plan: planName }
      throw e
    }

    if (isImage && nextImageCount > photoLimit) {
      const e = new Error('Photo analysis limit reached')
      e.code = 'PHOTO_LIMIT_REACHED'
      e.meta = { photoCount: nextImageCount, photoLimit, plan: planName }
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
      logger.error('Failed to update usage', { error: updateError.message, userId })
    } else {
      logger.info('Usage logged', {
        userId,
        type: isImage ? 'image' : 'text',
        textCount: nextTextCount,
        imageCount: nextImageCount,
        plan: planName,
      })

      return {
        success: true,
        planType: planName,
        textRemaining: textLimit - nextTextCount,
        photoRemaining: photoLimit - nextImageCount,
      }
    }
  } catch (err) {
    if (err.code === 'TEXT_LIMIT_REACHED' || err.code === 'PHOTO_LIMIT_REACHED' || err.code === 'NO_SUBSCRIPTION') {
      throw err
    }
    logger.error('Usage logging exception', { error: err.message, userId })
  }

  return { success: true, planType: planName }
}
