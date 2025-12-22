// lib/licenseValidation.js - Device-based licensing
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAX_DEVICES_PER_LICENSE = 1
const DEVICE_WINDOW_DAYS = 30
const ACCESS_LOG_TABLE = 'location_access_log' // reusing existing table for device fingerprints

function generateDeviceFingerprint(sessionInfo = {}) {
  const { ip = 'unknown', userAgent = 'unknown' } = sessionInfo
  const ipPrefix = ip.split('.').slice(0, 3).join('.')
  const uaPart = (userAgent || '').slice(0, 64)

  let hash = 0
  const str = `${ipPrefix}|${uaPart}`

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash &= hash
  }

  return `dev_${Math.abs(hash).toString(36)}`
}

export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
    // Check if user is whitelisted (bypass device cap)
    const whitelisted = await isWhitelisted(userId)
    if (whitelisted) {
      logger.info('User whitelisted - device cap bypassed', { userId })
      return { valid: true, whitelisted: true }
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, metadata, created_at, stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError || !subscription) {
      logger.warn('No active subscription found', { userId })
      return { valid: false, error: 'No active subscription found', needsSubscription: true }
    }

    const currentFingerprint = generateDeviceFingerprint(sessionInfo)

    // Get recent device usage history
    const windowStart = new Date(Date.now() - DEVICE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

    const { data: recentDevices, error: historyError } = await supabase
      .from(ACCESS_LOG_TABLE)
      .select('location_fingerprint, created_at, ip_prefix, user_agent')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (historyError) {
      logger.error('Failed to fetch device history', { error: historyError.message, userId })
      logger.security('Device check unavailable - allowing access', { userId })
      return { valid: true, warning: 'Device check unavailable' }
    }

    const uniqueDevices = new Set((recentDevices || []).map((r) => r.location_fingerprint))
    uniqueDevices.add(currentFingerprint)

    if (uniqueDevices.size > MAX_DEVICES_PER_LICENSE) {
      logger.security('Device limit exceeded', {
        userId,
        uniqueDevices: uniqueDevices.size,
        fingerprint: currentFingerprint.substring(0, 8) + '***',
      })

      return {
        valid: false,
        error: `This license is already active on another device. Each device needs its own subscription.`,
        code: 'DEVICE_LIMIT_EXCEEDED',
        requiresUpgrade: true,
        uniqueDevicesUsed: uniqueDevices.size,
        deviceFingerprint: currentFingerprint,
        suggestedPrice: 79,
      }
    }

    // Valid - log device
    await logDeviceAccess(userId, currentFingerprint, sessionInfo)

    return {
      valid: true,
      deviceFingerprint: currentFingerprint,
      uniqueDevicesUsed: uniqueDevices.size,
    }

  } catch (error) {
    logger.error('License validation exception', { error: error.message, userId })
    return { valid: true, warning: 'Validation unavailable' }
  }
}

async function logDeviceAccess(userId, locationFingerprint, sessionInfo) {
  try {
    const { error } = await supabase
      .from(ACCESS_LOG_TABLE)
      .insert({
        user_id: userId,
        location_fingerprint: locationFingerprint,
        ip_prefix: sessionInfo.ip?.substring(0, 12) + '***',
        user_agent: sessionInfo.userAgent?.substring(0, 200),
        created_at: new Date().toISOString()
      })

    if (error) {
      logger.warn('Failed to log device access', { error: error.message })
    }
  } catch (error) {
    logger.warn('Device logging exception', { error: error.message })
  }
}

export async function logSessionActivity(userId, sessionInfo) {
  try {
    const fingerprint = generateDeviceFingerprint(sessionInfo)
    await logDeviceAccess(userId, fingerprint, sessionInfo)
  } catch (error) {
    logger.warn('Session activity logging failed', { error: error.message, userId })
  }
}

export async function getUserDeviceSummary(userId) {
  try {
    const windowStart = new Date(Date.now() - DEVICE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from(ACCESS_LOG_TABLE)
      .select('location_fingerprint, ip_prefix, created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    const locations = {}
    
    for (const record of data || []) {
      const fp = record.location_fingerprint
      if (!locations[fp]) {
        locations[fp] = {
          fingerprint: fp,
          firstSeen: record.created_at,
          lastSeen: record.created_at,
          accessCount: 0,
          ipPrefixes: new Set()
        }
      }
      
      locations[fp].lastSeen = record.created_at
      locations[fp].accessCount++
      locations[fp].ipPrefixes.add(record.ip_prefix)
    }

    return {
      uniqueDevices: Object.keys(locations).length,
      devices: Object.values(locations).map(loc => ({
        ...loc,
        ipPrefixes: Array.from(loc.ipPrefixes)
      })),
      windowDays: DEVICE_WINDOW_DAYS,
      maxAllowed: MAX_DEVICES_PER_LICENSE
    }
  } catch (error) {
    logger.error('Failed to get device summary', { error: error.message, userId })
    return null
  }
}

export async function registerDevice(userId, sessionInfo) {
  try {
    const deviceFingerprint = generateDeviceFingerprint(sessionInfo)
    await logDeviceAccess(userId, deviceFingerprint, sessionInfo)

    logger.audit('Device registered', {
      userId,
      deviceFingerprint: deviceFingerprint.substring(0, 8) + '***'
    })

    return { success: true, locationFingerprint: deviceFingerprint, deviceFingerprint }
  } catch (error) {
    logger.error('Device registration exception', { error: error.message, userId })
    return { success: false, error: 'Registration failed' }
  }
}

export async function whitelistUser(userId, reason) {
  try {
    const { error } = await supabase
      .from('location_whitelist')
      .insert({
        user_id: userId,
        reason,
        whitelisted_at: new Date().toISOString()
      })

    if (error) throw error

    logger.audit('User whitelisted for device cap bypass', { userId, reason })
    return { success: true }
  } catch (error) {
    logger.error('Whitelist failed', { error: error.message, userId })
    return { success: false, error: error.message }
  }
}

async function isWhitelisted(userId) {
  try {
    const { data } = await supabase
      .from('location_whitelist')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    return !!data
  } catch (error) {
    logger.warn('Whitelist check failed', { error: error.message, userId })
    return false
  }
}

export async function removeWhitelist(userId) {
  try {
    const { error } = await supabase
      .from('location_whitelist')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    logger.audit('User removed from whitelist', { userId })
    return { success: true }
  } catch (error) {
    logger.error('Whitelist removal failed', { error: error.message, userId })
    return { success: false, error: error.message }
  }
}

// Backwards compatibility exports (old naming)
export const validateDeviceLicense = validateSingleLocation
export { registerDevice as registerLocation }
export { getUserDeviceSummary as getUserLocationSummary }
