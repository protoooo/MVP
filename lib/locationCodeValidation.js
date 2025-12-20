// lib/locationCodeValidation.js - STRICT location enforcement via codes
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Generate device fingerprint from browser characteristics
 * This is generated CLIENT-SIDE and sent with requests
 */
export function generateDeviceFingerprint() {
  // Client-side code to include in your app
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ]
  
  const fingerprint = components.join('|')
  return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 16)
}

/**
 * Generate network fingerprint from IP + rough location
 * Server-side only - based on request
 */
function generateNetworkFingerprint(ip) {
  // Use first 2 octets of IP to identify building/network
  const ipPrefix = ip.split('.').slice(0, 2).join('.')
  
  return crypto
    .createHash('sha256')
    .update(`net_${ipPrefix}`)
    .digest('hex')
    .substring(0, 12)
}

/**
 * Verify location code and bind device to that location
 * CRITICAL: This creates a HARD LOCK between device and location
 */
export async function validateLocationAccess(locationCode, deviceFingerprint, sessionInfo = {}) {
  const { ip = 'unknown', userAgent = '' } = sessionInfo
  
  try {
    // 1. Find location by access code
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, owner_id, name, is_active')
      .eq('access_code', locationCode.toUpperCase())
      .single()

    if (locationError || !location) {
      logger.security('Invalid location code attempted', { 
        code: locationCode.substring(0, 3) + '***'
      })
      return {
        valid: false,
        error: 'Invalid location code',
        code: 'INVALID_CODE'
      }
    }

    if (!location.is_active) {
      logger.warn('Inactive location access attempted', {
        locationId: location.id,
        locationName: location.name
      })
      return {
        valid: false,
        error: 'This location has been disabled by the owner',
        code: 'LOCATION_DISABLED'
      }
    }

    // 2. Check owner's subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', location.owner_id)
      .in('status', ['active', 'trialing'])
      .single()

    if (!subscription) {
      logger.warn('Location subscription inactive', {
        locationId: location.id,
        ownerId: location.owner_id
      })
      return {
        valid: false,
        error: 'Location subscription is inactive. Contact the location owner.',
        code: 'SUBSCRIPTION_INACTIVE'
      }
    }

    // Check if subscription has expired
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end)
      if (periodEnd < new Date()) {
        return {
          valid: false,
          error: 'Location subscription has expired. Contact the location owner.',
          code: 'SUBSCRIPTION_EXPIRED'
        }
      }
    }

    // 3. Generate network fingerprint for THIS request
    const currentNetworkFingerprint = generateNetworkFingerprint(ip)

    // 4. Check if this device has been registered before
    const { data: existingSession, error: sessionError } = await supabase
      .from('location_sessions')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle()

    // ============================================================================
    // CASE A: Device has NEVER been registered → Register it to THIS location
    // ============================================================================
    if (!existingSession) {
      const { error: insertError } = await supabase
        .from('location_sessions')
        .insert({
          location_id: location.id,
          device_fingerprint: deviceFingerprint,
          network_fingerprint: currentNetworkFingerprint,
          locked_network_fingerprint: currentNetworkFingerprint, // ✅ LOCK IT
          ip_prefix: ip.substring(0, 12),
          user_agent: userAgent.substring(0, 200),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          access_count: 1
        })

      if (insertError) {
        logger.error('Failed to register device', { error: insertError.message })
        return {
          valid: false,
          error: 'Failed to register device',
          code: 'REGISTRATION_FAILED'
        }
      }

      logger.audit('Device registered to location', {
        locationId: location.id,
        locationName: location.name,
        deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
        networkFingerprint: currentNetworkFingerprint
      })

      return {
        valid: true,
        locationId: location.id,
        locationName: location.name,
        firstTimeSetup: true
      }
    }

    // ============================================================================
    // CASE B: Device IS registered → Check if it belongs to THIS location
    // ============================================================================
    
    // SECURITY: Device is trying to use a DIFFERENT location code
    if (existingSession.location_id !== location.id) {
      // Update violation count
      await supabase
        .from('location_sessions')
        .update({
          violation_attempts: (existingSession.violation_attempts || 0) + 1,
          last_violation_at: new Date().toISOString()
        })
        .eq('device_fingerprint', deviceFingerprint)

      logger.security('Device attempted cross-location access', {
        deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
        registeredLocationId: existingSession.location_id,
        attemptedLocationId: location.id,
        violationCount: (existingSession.violation_attempts || 0) + 1
      })

      // Get the location name this device is registered to
      const { data: registeredLocation } = await supabase
        .from('locations')
        .select('name')
        .eq('id', existingSession.location_id)
        .single()

      return {
        valid: false,
        error: `This device is registered to "${registeredLocation?.name || 'another location'}". Each device can only be used at one location. Contact support if this is incorrect.`,
        code: 'CROSS_LOCATION_VIOLATION',
        registeredLocation: registeredLocation?.name
      }
    }

    // ============================================================================
    // CASE C: Device belongs to THIS location → Check network fingerprint
    // ============================================================================
    
    // SECURITY: Device is at the CORRECT location but WRONG network
    if (existingSession.locked_network_fingerprint !== currentNetworkFingerprint) {
      // Update violation count
      await supabase
        .from('location_sessions')
        .update({
          violation_attempts: (existingSession.violation_attempts || 0) + 1,
          last_violation_at: new Date().toISOString()
        })
        .eq('device_fingerprint', deviceFingerprint)

      logger.security('Device network fingerprint mismatch', {
        deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
        locationId: location.id,
        expectedNetwork: existingSession.locked_network_fingerprint,
        actualNetwork: currentNetworkFingerprint,
        violationCount: (existingSession.violation_attempts || 0) + 1
      })

      return {
        valid: false,
        error: 'This device must be used at the registered location. If you recently changed internet providers, contact support.',
        code: 'NETWORK_MISMATCH'
      }
    }

    // ============================================================================
    // CASE D: Everything checks out → Update last seen and allow access
    // ============================================================================
    
    await supabase
      .from('location_sessions')
      .update({
        last_seen: new Date().toISOString(),
        access_count: existingSession.access_count + 1,
        ip_prefix: ip.substring(0, 12), // Update in case of minor IP changes
        user_agent: userAgent.substring(0, 200)
      })
      .eq('device_fingerprint', deviceFingerprint)

    logger.info('Location access granted', {
      locationId: location.id,
      deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
      accessCount: existingSession.access_count + 1
    })

    return {
      valid: true,
      locationId: location.id,
      locationName: location.name,
      accessCount: existingSession.access_count + 1
    }

  } catch (error) {
    logger.error('Location validation exception', { error: error.message })
    return {
      valid: false,
      error: 'Validation failed. Please try again.',
      code: 'VALIDATION_ERROR'
    }
  }
}

/**
 * Admin function: Unbind a device from its location
 * Use case: User got a new tablet, needs to register new device
 */
export async function unbindDevice(deviceFingerprint, adminUserId) {
  try {
    const { error } = await supabase
      .from('location_sessions')
      .delete()
      .eq('device_fingerprint', deviceFingerprint)

    if (error) throw error

    logger.audit('Device unbound by admin', {
      adminUserId,
      deviceFingerprint: deviceFingerprint.substring(0, 8) + '***'
    })

    return { success: true }
  } catch (error) {
    logger.error('Device unbind failed', { error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * Get location statistics for admin/owner
 */
export async function getLocationStats(locationId) {
  try {
    const { data: sessions, error } = await supabase
      .from('location_sessions')
      .select('*')
      .eq('location_id', locationId)
      .order('last_seen', { ascending: false })

    if (error) throw error

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      totalDevices: sessions.length,
      activeDevices7d: sessions.filter(s => new Date(s.last_seen) > sevenDaysAgo).length,
      activeDevices30d: sessions.filter(s => new Date(s.last_seen) > thirtyDaysAgo).length,
      totalAccesses: sessions.reduce((sum, s) => sum + s.access_count, 0),
      devicesWithViolations: sessions.filter(s => (s.violation_attempts || 0) > 0).length,
      sessions: sessions.map(s => ({
        deviceFingerprint: s.device_fingerprint.substring(0, 8) + '***',
        firstSeen: s.first_seen,
        lastSeen: s.last_seen,
        accessCount: s.access_count,
        violationAttempts: s.violation_attempts || 0
      }))
    }
  } catch (error) {
    logger.error('Failed to get location stats', { error: error.message, locationId })
    return null
  }
}
