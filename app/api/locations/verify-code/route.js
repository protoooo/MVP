// app/api/locations/verify-code/route.js - COMPLETE FILE
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Generate network fingerprint from IP
function generateNetworkFingerprint(ip) {
  const ipPrefix = ip.split('.').slice(0, 2).join('.')
  
  return crypto
    .createHash('sha256')
    .update(`net_${ipPrefix}`)
    .digest('hex')
    .substring(0, 12)
}

// POST /api/locations/verify-code - Verify access code and create session
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    )

    const body = await request.json()
    const { accessCode, deviceFingerprint } = body

    if (!accessCode || !deviceFingerprint) {
      return NextResponse.json({ 
        error: 'Access code and device ID required' 
      }, { status: 400 })
    }

    // Get IP and user agent
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    // Find location by access code
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, owner_id, name, is_active')
      .eq('access_code', accessCode.toUpperCase())
      .single()

    if (locationError || !location) {
      logger.security('Invalid access code attempted', { 
        accessCode: accessCode.substring(0, 3) + '***',
        ip: ip.substring(0, 12) + '***'
      })
      return NextResponse.json({ 
        error: 'Invalid access code' 
      }, { status: 404 })
    }

    if (!location.is_active) {
      return NextResponse.json({ 
        error: 'This location has been disabled' 
      }, { status: 403 })
    }

    // Check if owner has active subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', location.owner_id)
      .in('status', ['active', 'trialing'])
      .single()

    if (subError || !sub) {
      return NextResponse.json({ 
        error: 'Location subscription inactive. Contact location owner.' 
      }, { status: 403 })
    }

    // Check if subscription has expired
    if (sub.current_period_end) {
      const periodEnd = new Date(sub.current_period_end)
      if (periodEnd < new Date()) {
        return NextResponse.json({
          error: 'Location subscription has expired. Contact location owner.',
          code: 'SUBSCRIPTION_EXPIRED'
        }, { status: 403 })
      }
    }

    // Generate network fingerprint
    const currentNetworkFingerprint = generateNetworkFingerprint(ip)

    // Check if this device has been registered before
    const { data: existingSession, error: sessionError } = await supabase
      .from('location_sessions')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle()

    const now = new Date().toISOString()

    // CASE A: Device has NEVER been registered → Register it to THIS location
    if (!existingSession) {
      const { error: insertError } = await supabase
        .from('location_sessions')
        .insert({
          location_id: location.id,
          device_fingerprint: deviceFingerprint,
          network_fingerprint: currentNetworkFingerprint,
          locked_network_fingerprint: currentNetworkFingerprint,
          ip_prefix: ip.substring(0, 12),
          user_agent: userAgent.substring(0, 200),
          first_seen: now,
          last_seen: now,
          access_count: 1
        })

      if (insertError) {
        logger.error('Failed to register device', { error: insertError.message })
        return NextResponse.json({ 
          error: 'Failed to register device' 
        }, { status: 500 })
      }

      logger.audit('Device registered to location', {
        locationId: location.id,
        locationName: location.name,
        deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
        networkFingerprint: currentNetworkFingerprint
      })

      return NextResponse.json({
        success: true,
        location: {
          id: location.id,
          name: location.name
        },
        firstTimeSetup: true
      })
    }

    // CASE B: Device IS registered → Check if it belongs to THIS location
    if (existingSession.location_id !== location.id) {
      // Update violation count
      await supabase
        .from('location_sessions')
        .update({
          violation_attempts: (existingSession.violation_attempts || 0) + 1,
          last_violation_at: now
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

      return NextResponse.json({
        error: `This device is registered to "${registeredLocation?.name || 'another location'}". Each device can only be used at one location. Contact support if this is incorrect.`,
        code: 'CROSS_LOCATION_VIOLATION',
        registeredLocation: registeredLocation?.name
      }, { status: 403 })
    }

    // CASE C: Device belongs to THIS location → Check network fingerprint
    if (existingSession.locked_network_fingerprint !== currentNetworkFingerprint) {
      // Update violation count
      await supabase
        .from('location_sessions')
        .update({
          violation_attempts: (existingSession.violation_attempts || 0) + 1,
          last_violation_at: now
        })
        .eq('device_fingerprint', deviceFingerprint)

      logger.security('Device network fingerprint mismatch', {
        deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
        locationId: location.id,
        expectedNetwork: existingSession.locked_network_fingerprint,
        actualNetwork: currentNetworkFingerprint,
        violationCount: (existingSession.violation_attempts || 0) + 1
      })

      return NextResponse.json({
        error: 'This device must be used at the registered location. If you recently changed internet providers, contact support.',
        code: 'NETWORK_MISMATCH'
      }, { status: 403 })
    }

    // CASE D: Everything checks out → Update last seen
    await supabase
      .from('location_sessions')
      .update({
        last_seen: now,
        access_count: existingSession.access_count + 1,
        ip_prefix: ip.substring(0, 12),
        user_agent: userAgent.substring(0, 200)
      })
      .eq('device_fingerprint', deviceFingerprint)

    logger.info('Location access granted', {
      locationId: location.id,
      deviceFingerprint: deviceFingerprint.substring(0, 8) + '***',
      accessCount: existingSession.access_count + 1
    })

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name
      },
      accessCount: existingSession.access_count + 1
    })

  } catch (error) {
    logger.error('Verify code exception', { error: error.message })
    return NextResponse.json({ 
      error: 'Server error' 
    }, { status: 500 })
  }
}
