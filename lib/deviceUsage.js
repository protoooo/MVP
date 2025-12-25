// lib/deviceUsage.js - Anonymous device-based free usage tracking
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const FREE_USES_LIMIT = 5
const DEVICE_USAGE_TABLE = 'device_free_usage'

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

/**
 * Generate a device fingerprint from request headers
 * Uses IP prefix + user agent hash for basic device identification
 */
export function generateDeviceFingerprint(sessionInfo = {}) {
  const { ip = 'unknown', userAgent = 'unknown' } = sessionInfo
  const ipPrefix = ip.split('.').slice(0, 3).join('.').toLowerCase()
  const uaPart = (userAgent || '').slice(0, 96)

  let hash = 0
  const str = `${ipPrefix}|${uaPart}`

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash &= hash
  }

  return `anon_${Math.abs(hash).toString(36)}`
}

/**
 * Get session info from request headers
 */
export function getSessionInfoFromRequest(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return { ip, userAgent }
}

/**
 * Check if a device has remaining free uses
 * Returns: { allowed: boolean, remaining: number, fingerprint: string }
 */
export async function checkDeviceFreeUsage(sessionInfo) {
  const fingerprint = generateDeviceFingerprint(sessionInfo)
  
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Try to get existing usage record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(DEVICE_USAGE_TABLE)
      .select('id, fingerprint, usage_count, blocked, created_at, updated_at')
      .eq('fingerprint', fingerprint)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Table might not exist - allow access but log warning
      logger.warn('Device usage check failed - table may not exist', { 
        error: fetchError.message,
        fingerprint: fingerprint.substring(0, 8) + '***'
      })
      return { allowed: true, remaining: FREE_USES_LIMIT, fingerprint, tableError: true }
    }

    if (!existing) {
      // New device - full free uses available
      return { allowed: true, remaining: FREE_USES_LIMIT, fingerprint, isNew: true }
    }

    // Check if device is hard-blocked
    if (existing.blocked) {
      logger.info('Device blocked from free usage', { 
        fingerprint: fingerprint.substring(0, 8) + '***',
        usageCount: existing.usage_count
      })
      return { allowed: false, remaining: 0, fingerprint, blocked: true }
    }

    // Check remaining uses
    const remaining = Math.max(0, FREE_USES_LIMIT - existing.usage_count)
    const allowed = remaining > 0

    if (!allowed) {
      logger.info('Device free usage exhausted', { 
        fingerprint: fingerprint.substring(0, 8) + '***',
        usageCount: existing.usage_count
      })
    }

    return { allowed, remaining, fingerprint, usageCount: existing.usage_count }

  } catch (error) {
    logger.error('Device usage check exception', { error: error?.message })
    // Fail open for system errors (allow access)
    return { allowed: true, remaining: FREE_USES_LIMIT, fingerprint, error: true }
  }
}

/**
 * Increment device usage count atomically
 * Returns: { success: boolean, remaining: number }
 */
export async function incrementDeviceUsage(sessionInfo) {
  const fingerprint = generateDeviceFingerprint(sessionInfo)
  
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const now = new Date().toISOString()

    // Try to get existing record
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(DEVICE_USAGE_TABLE)
      .select('id, usage_count, blocked')
      .eq('fingerprint', fingerprint)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Table might not exist - log but don't fail
      logger.warn('Device usage increment failed - table may not exist', { 
        error: fetchError.message 
      })
      return { success: true, remaining: FREE_USES_LIMIT - 1, tableError: true }
    }

    if (!existing) {
      // Create new record with usage_count = 1
      const { error: insertError } = await supabaseAdmin
        .from(DEVICE_USAGE_TABLE)
        .insert({
          fingerprint,
          usage_count: 1,
          blocked: false,
          ip_prefix: sessionInfo.ip?.split('.').slice(0, 3).join('.') || 'unknown',
          user_agent: (sessionInfo.userAgent || '').substring(0, 200),
          created_at: now,
          updated_at: now
        })

      if (insertError) {
        logger.warn('Device usage insert failed', { error: insertError.message })
        return { success: true, remaining: FREE_USES_LIMIT - 1, insertError: true }
      }

      logger.info('New device free usage started', { 
        fingerprint: fingerprint.substring(0, 8) + '***',
        remaining: FREE_USES_LIMIT - 1
      })

      return { success: true, remaining: FREE_USES_LIMIT - 1, isNew: true }
    }

    // Check if already blocked
    if (existing.blocked) {
      return { success: false, remaining: 0, blocked: true }
    }

    // Check if would exceed limit
    if (existing.usage_count >= FREE_USES_LIMIT) {
      // Block the device
      await supabaseAdmin
        .from(DEVICE_USAGE_TABLE)
        .update({ blocked: true, updated_at: now })
        .eq('id', existing.id)

      return { success: false, remaining: 0, limitReached: true }
    }

    // Increment usage count
    const newCount = existing.usage_count + 1
    const { error: updateError } = await supabaseAdmin
      .from(DEVICE_USAGE_TABLE)
      .update({ 
        usage_count: newCount,
        updated_at: now,
        // Block if this was the last free use
        blocked: newCount >= FREE_USES_LIMIT
      })
      .eq('id', existing.id)

    if (updateError) {
      logger.warn('Device usage update failed', { error: updateError.message })
      return { success: true, remaining: Math.max(0, FREE_USES_LIMIT - newCount), updateError: true }
    }

    const remaining = Math.max(0, FREE_USES_LIMIT - newCount)
    
    logger.info('Device usage incremented', { 
      fingerprint: fingerprint.substring(0, 8) + '***',
      newCount,
      remaining
    })

    return { success: true, remaining, usageCount: newCount }

  } catch (error) {
    logger.error('Device usage increment exception', { error: error?.message })
    return { success: true, remaining: FREE_USES_LIMIT - 1, error: true }
  }
}

/**
 * Get device usage status without incrementing
 * Useful for client-side display
 */
export async function getDeviceUsageStatus(sessionInfo) {
  return checkDeviceFreeUsage(sessionInfo)
}

/**
 * Reset device usage (for admin/support use)
 */
export async function resetDeviceUsage(fingerprint) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    const { error } = await supabaseAdmin
      .from(DEVICE_USAGE_TABLE)
      .update({ 
        usage_count: 0, 
        blocked: false,
        updated_at: new Date().toISOString()
      })
      .eq('fingerprint', fingerprint)

    if (error) {
      logger.error('Device usage reset failed', { error: error.message })
      return { success: false, error: error.message }
    }

    logger.audit('Device usage reset', { fingerprint: fingerprint.substring(0, 8) + '***' })
    return { success: true }

  } catch (error) {
    logger.error('Device usage reset exception', { error: error?.message })
    return { success: false, error: error?.message }
  }
}

export const FREE_USAGE_LIMIT = FREE_USES_LIMIT
