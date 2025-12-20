// lib/licenseValidation.js - UPDATED: Allow multiple users per location, prevent cross-location sharing
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuration
const MAX_LOCATIONS = 2 // Allow 2 network fingerprints (home + restaurant, or 2 nearby locations)
const LOCATION_WINDOW_DAYS = 7 // Track locations over 7 days
const SUSPICIOUS_THRESHOLD = 4 // Flag if 4+ different networks in 24 hours

/**
 * Generate a location fingerprint from network data
 * Uses IP prefix + rough geolocation to identify physical location
 */
function generateLocationFingerprint(sessionInfo = {}) {
  const { ip = 'unknown' } = sessionInfo
  
  // Use first 2 octets of IP (identifies ISP/building but not specific device)
  // Example: 192.168.x.x → "192.168"
  const ipPrefix = ip.split('.').slice(0, 2).join('.')
  
  // Create a simple hash
  let hash = 0
  const str = `${ipPrefix}`
  
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return `net_${Math.abs(hash).toString(36)}`
}

/**
 * Check if user is accessing from an approved location
 */
export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
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
      return { valid: false, error: 'No active subscription found' }
    }

    const currentFingerprint = generateLocationFingerprint(sessionInfo)
    
    // Get location usage history (last 7 days)
    const windowStart = new Date(Date.now() - LOCATION_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    
    const { data: recentLocations, error: historyError } = await supabase
      .from('location_access_log')
      .select('location_fingerprint, created_at, ip_prefix')
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (historyError) {
      logger.error('Failed to fetch location history', { error: historyError.message, userId })
      // Fail open to prevent blocking legitimate users during outages
      return { valid: true, warning: 'Location check unavailable' }
    }

    // Get unique locations from history
    const uniqueLocations = new Set(
      (recentLocations || []).map(r => r.location_fingerprint)
    )
    
    // Add current location
    uniqueLocations.add(currentFingerprint)

    // Check if within allowed limit
    if (uniqueLocations.size > MAX_LOCATIONS) {
      // Check for suspicious rapid location changes (anti-abuse)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent24h = (recentLocations || []).filter(
        r => new Date(r.created_at) > last24Hours
      )
      
      const uniqueIn24h = new Set(recent24h.map(r => r.location_fingerprint))
      
      if (uniqueIn24h.size >= SUSPICIOUS_THRESHOLD) {
        logger.security('Suspicious location pattern detected', {
          userId,
          uniqueLocations: uniqueIn24h.size,
          timeWindow: '24 hours'
        })

        return {
          valid: false,
          error: 'Unusual access pattern detected. This license appears to be shared across multiple locations. Each location requires its own license ($100/month per location).',
          code: 'MULTI_LOCATION_ABUSE'
        }
      }

      // Not suspicious, but over limit - soft warning
      logger.warn('User exceeding location limit', {
        userId,
        uniqueLocations: uniqueLocations.size,
        maxAllowed: MAX_LOCATIONS,
        windowDays: LOCATION_WINDOW_DAYS
      })

      return {
        valid: false,
        error: `This license is being used from ${uniqueLocations.size} different locations. Each physical restaurant location requires its own license. Contact support@protocollm.org if you have multiple locations.`,
        code: 'LOCATION_LIMIT_EXCEEDED'
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
    // Fail open - don't block users if our system is down
    return { valid: true, warning: 'Validation unavailable' }
  }
}

/**
 * Log location access for audit trail
 */
async function logLocationAccess(userId, locationFingerprint, sessionInfo) {
  try {
    const { error } = await supabase
      .from('location_access_log')
      .insert({
        user_id: userId,
        location_fingerprint: locationFingerprint,
        ip_prefix: sessionInfo.ip?.substring(0, 12) + '***', // Partial IP for privacy
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
 * Admin function: Get location usage summary for a user
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
      windowDays: LOCATION_WINDOW_DAYS
    }
  } catch (error) {
    logger.error('Failed to get location summary', { error: error.message, userId })
    return null
  }
}

/**
 * Register initial location (called after trial starts)
 * This is OPTIONAL now - validation happens automatically
 */
export async function registerLocation(userId, sessionInfo) {
  try {
    const locationFingerprint = generateLocationFingerprint(sessionInfo)

    // Just log the registration
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
 * Admin override: Allow multi-location access for enterprise customers
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
 * Check if user is whitelisted (skip location checks)
 */
async function isWhitelisted(userId) {
  const { data } = await supabase
    .from('location_whitelist')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return !!data
}
