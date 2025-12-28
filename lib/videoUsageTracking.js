/**
 * Video Usage Tracking Module
 * Handles video duration metering and usage-based billing for buildings sector
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger.js'
import { calculateUsageCost } from './sectors.js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

/**
 * Get video duration in seconds using ffprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} - Duration in seconds
 */
export async function getVideoDuration(videoPath) {
  const ffmpeg = await import('fluent-ffmpeg')
  
  return new Promise((resolve, reject) => {
    ffmpeg.default.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video duration: ${err.message}`))
        return
      }
      
      const duration = metadata?.format?.duration
      if (typeof duration === 'number' && duration > 0) {
        resolve(Math.ceil(duration)) // Round up to nearest second
      } else {
        reject(new Error('Invalid video duration metadata'))
      }
    })
  })
}

/**
 * Log video usage for tracking and billing
 * @param {Object} params - Usage parameters
 * @param {string} params.userId - User ID
 * @param {string} params.sessionId - Session ID
 * @param {string} params.sector - Sector ID (e.g., 'fire_life_safety')
 * @param {number} params.videoDurationSeconds - Video duration in seconds
 * @param {number} params.framesAnalyzed - Number of frames analyzed
 * @param {string} params.buildingAccountId - Optional building account ID
 * @returns {Promise<Object>} - Usage record and cost information
 */
export async function logVideoUsage({
  userId,
  sessionId,
  sector,
  videoDurationSeconds,
  framesAnalyzed = 0,
  buildingAccountId = null,
}) {
  if (!userId || !sessionId || !sector) {
    throw new Error('Missing required parameters for video usage tracking')
  }

  if (typeof videoDurationSeconds !== 'number' || videoDurationSeconds <= 0) {
    throw new Error('Invalid video duration')
  }

  const supabaseAdmin = getSupabaseAdmin()
  const videoMinutes = Math.ceil(videoDurationSeconds / 60)

  // Calculate cost based on sector pricing
  const costInfo = calculateUsageCost(sector, {
    videoMinutes,
    imageCount: 0,
  })

  // Log to usage_events table (if exists)
  try {
    const usageEventPayload = {
      user_id: userId,
      session_id: sessionId,
      sector,
      video_duration_seconds: videoDurationSeconds,
      frames_analyzed: framesAnalyzed,
      created_at: new Date().toISOString(),
    }

    // Check if usage_events table supports video duration
    const { error: eventError } = await supabaseAdmin
      .from('usage_events')
      .insert(usageEventPayload)

    if (eventError && eventError.code !== '42703') {
      // 42703 = column does not exist, which is acceptable
      logger.warn('Failed to log video usage event', { 
        error: eventError.message,
        code: eventError.code 
      })
    }
  } catch (err) {
    logger.warn('Video usage event logging skipped', { 
      error: err?.message 
    })
  }

  // For usage-based sectors (buildings), log detailed billing record
  if (costInfo.billable && costInfo.cost > 0) {
    try {
      const billingPayload = {
        user_id: userId,
        building_account_id: buildingAccountId,
        session_id: sessionId,
        video_duration_seconds: videoDurationSeconds,
        frames_analyzed: framesAnalyzed,
        video_minutes_billed: videoMinutes,
        cost_usd: costInfo.cost,
        rate_per_minute: costInfo.breakdown?.videoRate || 0,
        created_at: new Date().toISOString(),
      }

      // Attempt to insert into building_video_usage table
      // This table may not exist yet - gracefully handle
      const { data, error } = await supabaseAdmin
        .from('building_video_usage')
        .insert(billingPayload)
        .select()
        .single()

      if (error) {
        logger.warn('Building video usage table not available', { 
          error: error.message 
        })
        // Continue without failing - table may not be created yet
      } else {
        logger.info('Building video usage logged', {
          userId,
          sessionId,
          minutes: videoMinutes,
          cost: costInfo.cost,
        })
      }
    } catch (err) {
      logger.warn('Building video usage logging failed', { 
        error: err?.message 
      })
    }
  }

  return {
    success: true,
    videoDurationSeconds,
    videoMinutes,
    framesAnalyzed,
    sector,
    costInfo,
  }
}

/**
 * Get usage summary for a user in a billing period
 * @param {string} userId - User ID
 * @param {string} sector - Sector ID
 * @param {Date} periodStart - Start of billing period
 * @param {Date} periodEnd - End of billing period
 * @returns {Promise<Object>} - Usage summary
 */
export async function getVideoUsageSummary(userId, sector, periodStart, periodEnd) {
  if (!userId || !sector) {
    throw new Error('Missing userId or sector')
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Query building_video_usage for usage-based sectors
    const { data, error } = await supabaseAdmin
      .from('building_video_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      // Table may not exist yet
      logger.warn('Building video usage table query failed', { 
        error: error.message 
      })
      return {
        totalMinutes: 0,
        totalCost: 0,
        sessionCount: 0,
        records: [],
      }
    }

    const records = data || []
    const totalMinutes = records.reduce((sum, r) => sum + (r.video_minutes_billed || 0), 0)
    const totalCost = records.reduce((sum, r) => sum + (r.cost_usd || 0), 0)

    return {
      totalMinutes,
      totalCost,
      sessionCount: records.length,
      records,
    }
  } catch (err) {
    logger.error('Failed to get video usage summary', { 
      error: err?.message,
      userId,
      sector,
    })
    
    return {
      totalMinutes: 0,
      totalCost: 0,
      sessionCount: 0,
      records: [],
      error: err?.message,
    }
  }
}

/**
 * Check soft usage limits for internal monitoring
 * These are NOT hard caps - just alerts for potential abuse
 * @param {string} userId - User ID
 * @param {string} sector - Sector ID
 * @returns {Promise<Object>} - Soft limit status
 */
export async function checkSoftUsageLimits(userId, sector) {
  // Define soft limits per sector (monthly)
  const SOFT_LIMITS = {
    food_safety: {
      maxImages: 100,
      maxVideoMinutes: 20,
      alertThreshold: 0.8, // Alert at 80%
    },
    rental_housing: {
      maxImages: 50,
      maxVideoMinutes: 10,
      alertThreshold: 0.8,
    },
    fire_life_safety: {
      // No limits for usage-based sector
      maxImages: null,
      maxVideoMinutes: null,
      alertThreshold: null,
    },
  }

  const limit = SOFT_LIMITS[sector]
  if (!limit || limit.maxImages === null) {
    return {
      limited: false,
      message: 'No soft limits for this sector',
    }
  }

  // Get current period usage
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const summary = await getVideoUsageSummary(userId, sector, periodStart, periodEnd)

  // Calculate usage percentages
  const imageUsage = 0 // TODO: Track image count separately
  const videoUsage = summary.totalMinutes
  
  const imagePercent = limit.maxImages ? (imageUsage / limit.maxImages) : 0
  const videoPercent = limit.maxVideoMinutes ? (videoUsage / limit.maxVideoMinutes) : 0

  const shouldAlert = imagePercent >= limit.alertThreshold || videoPercent >= limit.alertThreshold

  return {
    limited: false, // Never actually limit - just monitor
    shouldAlert,
    usage: {
      images: imageUsage,
      videoMinutes: videoUsage,
    },
    limits: {
      maxImages: limit.maxImages,
      maxVideoMinutes: limit.maxVideoMinutes,
    },
    percentages: {
      images: imagePercent,
      video: videoPercent,
    },
    message: shouldAlert 
      ? `Usage approaching soft limit: ${Math.max(imagePercent, videoPercent) * 100}%`
      : 'Usage within normal range',
  }
}
