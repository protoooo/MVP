// lib/licenseValidation.js - Enforce one license per location
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Check if a subscription is tied to a single physical location
 * Returns { valid: boolean, error?: string, location?: object }
 */
export async function validateSingleLocation(userId, sessionInfo = {}) {
  try {
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

    // Get location info from metadata (set during checkout)
    const registeredLocation = subscription.metadata?.location_hash
    
    if (!registeredLocation) {
      // First-time access - need to register location
      return { 
        valid: false, 
        error: 'LOCATION_NOT_REGISTERED',
        needsRegistration: true 
      }
    }

    // Generate current session location hash
    const currentLocationHash = generateLocationHash(sessionInfo)

    // Check if location matches
    if (currentLocationHash !== registeredLocation) {
      logger.security('Location mismatch detected', {
        userId,
        registered: registeredLocation.substring(0, 8),
        current: currentLocationHash.substring(0, 8)
      })

      return {
        valid: false,
        error: 'This license is registered to a different location. Each physical location requires its own license.',
        code: 'LOCATION_MISMATCH'
      }
    }

    // Check for simultaneous access from different IPs
    const recentSessions = await getRecentSessions(userId)
    
    if (recentSessions.length > 1) {
      const uniqueHashes = new Set(recentSessions.map(s => s.location_hash))
      
      if (uniqueHashes.size > 1) {
        logger.security('Multiple locations detected', {
          userId,
          uniqueLocations: uniqueHashes.size,
          timeWindow: '5 minutes'
        })

        return {
          valid: false,
          error: 'Multiple simultaneous logins detected from different locations. Each location needs its own license.',
          code: 'MULTI_LOCATION_ACCESS'
        }
      }
    }

    return { valid: true, location: { hash: registeredLocation } }

  } catch (error) {
    logger.error('License validation exception', { error: error.message, userId })
    // Fail open to prevent blocking legitimate users during outages
    return { valid: true }
  }
}

/**
 * Register a physical location for a subscription
 */
export async function registerLocation(userId, sessionInfo) {
  try {
    const locationHash = generateLocationHash(sessionInfo)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        metadata: {
          location_hash: locationHash,
          registered_at: new Date().toISOString(),
          ip: sessionInfo.ip?.substring(0, 12) + '***', // Partial IP for auditing
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])

    if (error) {
      logger.error('Location registration failed', { error: error.message, userId })
      return { success: false, error: 'Failed to register location' }
    }

    logger.audit('Location registered', {
      userId,
      locationHash: locationHash.substring(0, 8) + '***'
    })

    return { success: true, locationHash }

  } catch (error) {
    logger.error('Location registration exception', { error: error.message, userId })
    return { success: false, error: 'Registration failed' }
  }
}

/**
 * Generate a stable location hash from session info
 * Uses IP prefix + User-Agent fingerprint (not perfect but good enough)
 */
function generateLocationHash(sessionInfo = {}) {
  const { ip = 'unknown', userAgent = 'unknown' } = sessionInfo
  
  // Use first 2 octets of IP (same building/ISP should match)
  const ipPrefix = ip.split('.').slice(0, 2).join('.')
  
  // Simple UA fingerprint (browser family + OS)
  const uaFingerprint = userAgent
    .toLowerCase()
    .replace(/[0-9.]/g, '') // Remove version numbers
    .substring(0, 100)

  const combined = `${ipPrefix}:${uaFingerprint}`
  
  // Simple hash (good enough for our purposes)
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Get recent session activity for location checking
 */
async function getRecentSessions(userId) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('session_activity')
    .select('location_hash, created_at')
    .eq('user_id', userId)
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })

  return data || []
}

/**
 * Log session activity for location monitoring
 */
export async function logSessionActivity(userId, sessionInfo) {
  try {
    const locationHash = generateLocationHash(sessionInfo)

    const { error } = await supabase
      .from('session_activity')
      .insert({
        user_id: userId,
        location_hash: locationHash,
        ip_prefix: sessionInfo.ip?.substring(0, 12) + '***',
        user_agent: sessionInfo.userAgent?.substring(0, 200),
        created_at: new Date().toISOString()
      })

    if (error) {
      logger.warn('Failed to log session activity', { error: error.message })
    }
  } catch (error) {
    logger.warn('Session activity logging exception', { error: error.message })
  }
}
