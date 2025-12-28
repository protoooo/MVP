// lib/rateLimiting.js - Rate limiting for public knowledge base features
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

// Rate limit configurations
export const RATE_LIMITS = {
  KNOWLEDGE_BASE_SEARCH: {
    limit: 10,
    windowMinutes: 60,
    type: 'kb_search'
  },
  FREE_IMAGE_ANALYSIS: {
    limit: 3,
    windowMinutes: 24 * 60, // 24 hours
    type: 'free_image'
  }
}

/**
 * Check if identifier has exceeded rate limit
 * @param {string} identifier - IP address or email
 * @param {object} config - Rate limit configuration
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: Date}>}
 */
export async function checkRateLimit(identifier, config) {
  if (!supabase) {
    logger.warn('Rate limiting unavailable - Supabase not configured')
    return { allowed: true, remaining: config.limit, resetAt: null }
  }

  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes)

  try {
    // Get or create rate limit record
    const { data: existing, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('limit_type', config.type)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('Rate limit check failed', { error: fetchError.message })
      // Fail open on database errors
      return { allowed: true, remaining: config.limit, resetAt: null }
    }

    const now = new Date()
    
    if (!existing) {
      // Create new rate limit record
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          limit_type: config.type,
          count: 1,
          window_start: now.toISOString()
        })

      if (insertError) {
        logger.error('Rate limit insert failed', { error: insertError.message })
        return { allowed: true, remaining: config.limit - 1, resetAt: null }
      }

      const resetAt = new Date(now)
      resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes)
      return { allowed: true, remaining: config.limit - 1, resetAt }
    }

    // Check if existing window is still valid
    const existingWindowStart = new Date(existing.window_start)
    const windowEnd = new Date(existingWindowStart)
    windowEnd.setMinutes(windowEnd.getMinutes() + config.windowMinutes)

    if (now > windowEnd) {
      // Window expired, create new one
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          limit_type: config.type,
          count: 1,
          window_start: now.toISOString()
        })

      if (insertError) {
        logger.error('Rate limit reset failed', { error: insertError.message })
      }

      const resetAt = new Date(now)
      resetAt.setMinutes(resetAt.getMinutes() + config.windowMinutes)
      return { allowed: true, remaining: config.limit - 1, resetAt }
    }

    // Window still valid, check limit
    if (existing.count >= config.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowEnd,
        retryAfter: Math.ceil((windowEnd - now) / 60000) // minutes
      }
    }

    // Increment count
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id)

    if (updateError) {
      logger.error('Rate limit increment failed', { error: updateError.message })
    }

    return {
      allowed: true,
      remaining: config.limit - existing.count - 1,
      resetAt: windowEnd
    }
  } catch (error) {
    logger.error('Rate limit check error', { error: error.message })
    // Fail open on errors
    return { allowed: true, remaining: config.limit, resetAt: null }
  }
}

/**
 * Get IP address from request
 */
export function getIpAddress(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
    request.headers.get('x-real-ip') || 
    'unknown'
  return ip
}

/**
 * Clean up old rate limit records
 */
export async function cleanupRateLimits() {
  if (!supabase) return

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7) // Delete records older than 7 days

  try {
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', cutoff.toISOString())

    if (error) {
      logger.error('Rate limit cleanup failed', { error: error.message })
    } else {
      logger.info('Rate limit cleanup completed')
    }
  } catch (error) {
    logger.error('Rate limit cleanup error', { error: error.message })
  }
}
