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

  return `dev_${Math.abs(hash).toString(36)}`
}

async function getSeatInventory(userId) {
  const { data, error } = await supabase
    .from('device_seats')
    .select('*')
    .or(`purchaser_user_id.eq.${userId},claimed_user_id.eq.${userId}`)

  if (error) {
    logger.error('Failed to load seats', { error: error.message, userId })
    return []
  }

  return data || []
}

export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
    // Check if user is whitelisted or admin (bypass device cap)
    const [whitelisted, isAdmin] = await Promise.all([
      isWhitelisted(userId),
      isAdminUser(userId),
    ])

    if (whitelisted) {
      logger.info('User whitelisted - device cap bypassed', { userId })
      return { valid: true, whitelisted: true }
    }

    if (isAdmin) {
      logger.info('Admin bypass - device cap skipped', { userId })
      return { valid: true, whitelisted: true }
    }

    const currentFingerprint = generateDeviceFingerprint(sessionInfo)

    const seats = await getSeatInventory(userId)

    const purchaserSeats = seats.filter((s) => s.purchaser_user_id === userId)
    const claimedSeats = seats.filter((s) => s.claimed_user_id === userId)

    let claimedSeat = claimedSeats.find((s) => s.status === 'claimed')

    // Purchaser auto-claims a seat for themselves on first use
    if (!claimedSeat && purchaserSeats.length) {
      const available = purchaserSeats.find((s) => s.status === 'available')
      if (available) {
        const { error: claimError } = await supabase
          .from('device_seats')
          .update({
            status: 'claimed',
            claimed_user_id: userId,
            claimed_at: new Date().toISOString(),
            device_fingerprint: currentFingerprint,
          })
          .eq('id', available.id)
          .eq('purchaser_user_id', userId)
          .eq('status', 'available')

        if (claimError) {
          logger.error('Failed to auto-claim purchaser seat', { error: claimError.message, userId })
        } else {
          claimedSeat = { ...available, status: 'claimed', claimed_user_id: userId, device_fingerprint: currentFingerprint }
        }
      }
    }

    if (!claimedSeat) {
      logger.warn('No claimed seat for user', { userId })
      return { valid: false, error: 'No available device seat. Please ask your admin for a new invite.' }
    }

    if (claimedSeat.status !== 'claimed') {
      logger.security('Seat not in claimed state', { userId, seatId: claimedSeat.id })
      return { valid: false, error: 'Your seat was revoked. Please request a new invite.', code: 'SEAT_REVOKED' }
    }

    if (claimedSeat.device_fingerprint && claimedSeat.device_fingerprint !== currentFingerprint) {
      logger.security('Registered device mismatch', {
        userId,
        seatId: claimedSeat.id,
        registeredFingerprint: claimedSeat.device_fingerprint?.substring(0, 8) + '***',
        presentedFingerprint: currentFingerprint.substring(0, 8) + '***',
      })

      return {
        valid: false,
        error: 'This seat is locked to a different device.',
        code: 'DEVICE_FINGERPRINT_MISMATCH',
        requiresUpgrade: false,
        deviceFingerprint: currentFingerprint,
        registeredFingerprint: claimedSeat.device_fingerprint,
      }
    }

    if (!claimedSeat.device_fingerprint) {
      const { error: bindError } = await supabase
        .from('device_seats')
        .update({ device_fingerprint: currentFingerprint })
        .eq('id', claimedSeat.id)
        .eq('claimed_user_id', userId)

      if (bindError) {
        logger.warn('Failed to bind device fingerprint', { error: bindError.message, seatId: claimedSeat.id })
      } else {
        claimedSeat = { ...claimedSeat, device_fingerprint: currentFingerprint }
      }
    }

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

async function isAdminUser(userId) {
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase()

  if (!adminEmail) return false

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error) throw error

    const email = data?.user?.email?.toLowerCase()
    return email === adminEmail
  } catch (error) {
    logger.warn('Admin lookup failed', { error: error.message, userId })
    return false
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
