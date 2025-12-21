// lib/licenseValidation.js - STRICT: ONE location per license
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ✅ STRICT CONFIG: Only 1 location allowed
const MAX_LOCATIONS = 1
const LOCATION_WINDOW_DAYS = 7
const GRACE_PERIOD_HOURS = 24 // Allow location change within 24h (e.g., if user moves)

/**
 * Generate a location fingerprint from network data
 */
function generateLocationFingerprint(sessionInfo = {}) {
  const { ip = 'unknown' } = sessionInfo
  
  // Use first 3 octets of IP (more specific than before)
  const ipPrefix = ip.split('.').slice(0, 3).join('.')
  
  let hash = 0
  const str = `${ipPrefix}`
  
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return `net_${Math.abs(hash).toString(36)}`
}

/**
 * STRICT single-location validation
 */
export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
    // Check if user is whitelisted (enterprise customers only)
    const whitelisted = await isWhitelisted(userId)
    if (whitelisted) {
      logger.info('User whitelisted - skipping location check', { userId })
      return { valid: true, whitelisted: true }
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, metadata')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError || !subscription) {
      logger.warn('No active subscription found', { userId })
      return { valid: false, error: 'No active subscription found', needsSubscription: true }
    }

    const currentFingerprint = generateLocationFingerprint(sessionInfo)
    
    // Get location usage history
    const windowStart = new Date(Date.now() - LOCATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    
    const { data: recentLocations, error: historyError } = await supabase
      .from('location_access_log')
      .select('location_fingerprint, created_at, ip_prefix')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (historyError) {
      logger.error('Failed to fetch location history', { error: historyError.message, userId })
      // Fail open during outages (but log it)
      logger.security('Location check unavailable - allowing access', { userId })
      return { valid: true, warning: 'Location check unavailable' }
    }

    // Get unique locations
    const uniqueLocations = new Set(
      (recentLocations || []).map(r => r.location_fingerprint)
    )
    
    uniqueLocations.add(currentFingerprint)

    // ✅ STRICT: Only 1 location allowed
    if (uniqueLocations.size > MAX_LOCATIONS) {
      // Check if this is within grace period (they might be relocating)
      const firstLocation = recentLocations[recentLocations.length - 1]
      const firstLocationTime = new Date(firstLocation.created_at)
      const hoursSinceFirst = (Date.now() - firstLocationTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceFirst < GRACE_PERIOD_HOURS) {
        logger.warn('Multiple locations within grace period', {
          userId,
          uniqueLocations: uniqueLocations.size,
          hoursSinceFirst: hoursSinceFirst.toFixed(1)
        })
        
        // Allow but warn
        await logLocationAccess(userId, currentFingerprint, sessionInfo)
        return {
          valid: true,
          warning: `You've accessed from ${uniqueLocations.size} locations in the past ${GRACE_PERIOD_HOURS} hours. Each restaurant location requires its own license.`,
          locationFingerprint: currentFingerprint,
          uniqueLocationsUsed: uniqueLocations.size
        }
      }

      // Hard block after grace period
      logger.security('Multiple locations detected - blocking', {
        userId,
        uniqueLocations: uniqueLocations.size,
        windowDays: LOCATION_WINDOW_DAYS
      })

      return {
        valid: false,
        error: `This license is being used from ${uniqueLocations.size} different locations. Each restaurant requires its own license ($100/month per location). Contact support@protocollm.org to add locations.`,
        code: 'MULTI_LOCATION_DETECTED'
      }
    }

    // Valid - log access
    await logLocationAccess(userId, currentFingerprint, sessionInfo)

    return { 
      valid: true, 
      locationFingerprint: currentFingerprint,
      uniqueLocationsUsed: uniqueLocations.size 
    }

  } catch (error) {
    logger.error('License validation exception', { error: error.message, userId })
    // Fail open during system errors
    return { valid: true, warning: 'Validation unavailable' }
  }
}

/**
 * Log location access
 */
async function logLocationAccess(userId, locationFingerprint, sessionInfo) {
  try {
    const { error } = await supabase
      .from('location_access_log')
      .insert({
        user_id: userId,
        location_fingerprint: locationFingerprint,
        ip_prefix: sessionInfo.ip?.substring(0, 12) + '***',
        user_agent: sessionInfo.userAgent?.substring(0, 200),
        created_at: new Date().toISOString()
      })

    if (error) {
      logger.warn('Failed to log location access', { error: error.message })
    }
  } catch (error) {
    logger.warn('Location logging exception', { error: error.message })
  }
}

/**
 * Alias for SessionGuard compatibility
 */
export async function logSessionActivity(userId, sessionInfo) {
  try {
    const fingerprint = generateLocationFingerprint(sessionInfo)
    await logLocationAccess(userId, fingerprint, sessionInfo)
  } catch (error) {
    logger.warn('Session activity logging failed', { error: error.message, userId })
  }
}

/**
 * Get location summary (admin)
 */
export async function getUserLocationSummary(userId) {
  try {
    const windowStart = new Date(Date.now() - LOCATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('location_access_log')
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
      uniqueLocations: Object.keys(locations).length,
      locations: Object.values(locations).map(loc => ({
        ...loc,
        ipPrefixes: Array.from(loc.ipPrefixes)
      })),
      windowDays: LOCATION_WINDOW_DAYS,
      maxAllowed: MAX_LOCATIONS
    }
  } catch (error) {
    logger.error('Failed to get location summary', { error: error.message, userId })
    return null
  }
}

/**
 * Register initial location (optional - validation happens automatically)
 */
export async function registerLocation(userId, sessionInfo) {
  try {
    const locationFingerprint = generateLocationFingerprint(sessionInfo)
    await logLocationAccess(userId, locationFingerprint, sessionInfo)

    logger.audit('Location registered', {
      userId,
      locationFingerprint: locationFingerprint.substring(0, 8) + '***'
    })

    return { success: true, locationFingerprint }
  } catch (error) {
    logger.error('Location registration exception', { error: error.message, userId })
    return { success: false, error: 'Registration failed' }
  }
}

/**
 * Whitelist user for multi-location (enterprise only)
 */
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

    logger.audit('User whitelisted for multi-location', { userId, reason })
    return { success: true }
  } catch (error) {
    logger.error('Whitelist failed', { error: error.message, userId })
    return { success: false, error: error.message }
  }
}

/**
 * Check if user is whitelisted
 */
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

/**
 * Remove from whitelist
 */
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
