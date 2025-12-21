// lib/licenseValidation.js - UPDATED with relaxed thresholds
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ✅ UPDATED: More lenient thresholds to avoid false positives
const MAX_LOCATIONS_SINGLE = 4  // Changed from 3 to 4 (home + office + restaurant + backup)
const LOCATION_WINDOW_DAYS = 7
const GRACE_PERIOD_DAYS = 7     // Changed from 5 to 7 days (full week grace period)

function generateLocationFingerprint(sessionInfo = {}) {
  const { ip = 'unknown' } = sessionInfo
  const ipPrefix = ip.split('.').slice(0, 3).join('.')
  
  let hash = 0
  const str = `${ipPrefix}`
  
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  
  return `net_${Math.abs(hash).toString(36)}`
}

export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
    // Check if user is whitelisted (multi-location subscribers)
    const whitelisted = await isWhitelisted(userId)
    if (whitelisted) {
      logger.info('User whitelisted - multi-location access', { userId })
      return { valid: true, whitelisted: true }
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, metadata, created_at')
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
      // Fail open during outages
      logger.security('Location check unavailable - allowing access', { userId })
      return { valid: true, warning: 'Location check unavailable' }
    }

    // Get unique locations
    const uniqueLocations = new Set(
      (recentLocations || []).map(r => r.location_fingerprint)
    )
    uniqueLocations.add(currentFingerprint)

    // ✅ UPDATED: Gradual enforcement with extended grace period and higher threshold
    if (uniqueLocations.size > MAX_LOCATIONS_SINGLE) {
      // Check if they're in grace period
      const firstMultiLocationUse = recentLocations.find(r => 
        r.location_fingerprint !== recentLocations[0].location_fingerprint
      )
      
      const gracePeriodEnd = firstMultiLocationUse 
        ? new Date(new Date(firstMultiLocationUse.created_at).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
        : new Date()
      
      const now = new Date()
      const inGracePeriod = now < gracePeriodEnd
      
      if (inGracePeriod) {
        const daysRemaining = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24))
        
        logger.warn('Multiple locations detected - grace period', {
          userId,
          uniqueLocations: uniqueLocations.size,
          daysRemaining
        })

        // Allow access but warn
        await logLocationAccess(userId, currentFingerprint, sessionInfo)
        
        return {
          valid: true,
          warning: `MULTI_LOCATION_DETECTED`,
          requiresUpgrade: true,
          gracePeriodDaysRemaining: daysRemaining,
          uniqueLocationsUsed: uniqueLocations.size,
          locationFingerprint: currentFingerprint,
          message: `We detected ${uniqueLocations.size} locations in the past week. You have ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} to upgrade to multi-location pricing ($${149 * uniqueLocations.size}/month for ${uniqueLocations.size} locations).`
        }
      }

      // Grace period expired - soft block with clear upgrade path
      logger.security('Multiple locations - grace period expired', {
        userId,
        uniqueLocations: uniqueLocations.size,
      })

      return {
        valid: false,
        error: `This license is being used from ${uniqueLocations.size} different locations. Each location needs its own license.`,
        code: 'MULTI_LOCATION_UPGRADE_REQUIRED',
        requiresUpgrade: true,
        uniqueLocationsUsed: uniqueLocations.size,
        suggestedPrice: 149 * uniqueLocations.size,
        upgradeUrl: process.env.NEXT_PUBLIC_BASE_URL + '/?upgrade=multi-location'
      }
    }

    // Valid - single location
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

export async function logSessionActivity(userId, sessionInfo) {
  try {
    const fingerprint = generateLocationFingerprint(sessionInfo)
    await logLocationAccess(userId, fingerprint, sessionInfo)
  } catch (error) {
    logger.warn('Session activity logging failed', { error: error.message, userId })
  }
}

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
      maxAllowed: MAX_LOCATIONS_SINGLE
    }
  } catch (error) {
    logger.error('Failed to get location summary', { error: error.message, userId })
    return null
  }
}

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
