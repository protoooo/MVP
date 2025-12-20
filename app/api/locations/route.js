// ============================================================================
// app/api/locations/route.js - Manage locations (owner account)
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET /api/locations - Get all locations for current owner
export async function GET(request) {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all locations for this owner
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch locations', { error: error.message, userId: user.id })
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    return NextResponse.json({ locations })

  } catch (error) {
    logger.error('Get locations exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/locations - Create new location
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Location name required' }, { status: 400 })
    }

    // Check subscription status (must be active or trialing)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    if (!sub) {
      return NextResponse.json({ 
        error: 'Active subscription required to add locations' 
      }, { status: 403 })
    }

    // Call database function to create location with unique code
    const { data: location, error } = await supabase.rpc('create_location', {
      p_owner_id: user.id,
      p_name: name.trim(),
      p_address: address?.trim() || null
    })

    if (error) {
      logger.error('Failed to create location', { error: error.message, userId: user.id })
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }

    logger.audit('Location created', {
      userId: user.id,
      locationId: location.id,
      locationName: name
    })

    // ✅ SYNC: Update Stripe quantity when location is added
    const { syncLocationQuantityToStripe } = await import('@/app/api/webhook/route')
    const syncResult = await syncLocationQuantityToStripe(user.id)
    
    if (!syncResult.success) {
      logger.warn('Failed to sync location count to Stripe', { 
        error: syncResult.error,
        userId: user.id 
      })
    } else {
      logger.info('Location count synced to Stripe', {
        userId: user.id,
        quantity: syncResult.quantity
      })
    }

    return NextResponse.json({ location })

  } catch (error) {
    logger.error('Create location exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


// ============================================================================
// app/api/locations/[id]/route.js - Manage specific location
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// PATCH /api/locations/[id] - Update location (enable/disable)
export async function PATCH(request, { params }) {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = params.id
    const body = await request.json()

    // Verify ownership
    const { data: location } = await supabase
      .from('locations')
      .select('id, owner_id, name')
      .eq('id', locationId)
      .eq('owner_id', user.id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Update location
    const { error } = await supabase
      .from('locations')
      .update({
        is_active: body.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', locationId)

    if (error) {
      logger.error('Failed to update location', { error: error.message })
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    logger.audit('Location updated', {
      userId: user.id,
      locationId,
      isActive: body.is_active
    })

    // ✅ SYNC: Update Stripe quantity when location is enabled/disabled
    const { syncLocationQuantityToStripe } = await import('@/app/api/webhook/route')
    const syncResult = await syncLocationQuantityToStripe(user.id)
    
    if (!syncResult.success) {
      logger.warn('Failed to sync location count to Stripe', { 
        error: syncResult.error 
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Update location exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/locations/[id] - Delete location
export async function DELETE(request, { params }) {
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locationId = params.id

    // Verify ownership before deleting
    const { data: location } = await supabase
      .from('locations')
      .select('id, owner_id, name')
      .eq('id', locationId)
      .eq('owner_id', user.id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Delete location (cascade will delete associated sessions)
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)

    if (error) {
      logger.error('Failed to delete location', { error: error.message })
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }

    logger.audit('Location deleted', {
      userId: user.id,
      locationId,
      locationName: location.name
    })

    // ✅ SYNC: Update Stripe quantity when location is deleted
    const { syncLocationQuantityToStripe } = await import('@/app/api/webhook/route')
    const syncResult = await syncLocationQuantityToStripe(user.id)
    
    if (!syncResult.success) {
      logger.warn('Failed to sync location count to Stripe', { 
        error: syncResult.error 
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Delete location exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


// ============================================================================
// app/api/locations/verify-code/route.js - Staff uses this to authenticate
// ============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

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
      return NextResponse.json({ error: 'Access code and device ID required' }, { status: 400 })
    }

    // Find location by access code
    const { data: location, error } = await supabase
      .from('locations')
      .select('id, owner_id, name, is_active')
      .eq('access_code', accessCode.toUpperCase())
      .single()

    if (error || !location) {
      logger.security('Invalid access code attempted', { accessCode })
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
    }

    if (!location.is_active) {
      return NextResponse.json({ error: 'This location has been disabled' }, { status: 403 })
    }

    // Check if owner has active subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', location.owner_id)
      .in('status', ['active', 'trialing'])
      .single()

    if (!sub) {
      return NextResponse.json({ 
        error: 'Location subscription inactive. Contact location owner.' 
      }, { status: 403 })
    }

    // Create or update location session
    const now = new Date().toISOString()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    const { error: sessionError } = await supabase
      .from('location_sessions')
      .upsert({
        location_id: location.id,
        device_fingerprint: deviceFingerprint,
        ip_prefix: ip.substring(0, 12),
        user_agent: userAgent.substring(0, 200),
        last_seen: now,
        access_count: 1
      }, {
        onConflict: 'location_id,device_fingerprint',
        ignoreDuplicates: false
      })

    if (sessionError) {
      logger.error('Failed to create location session', { error: sessionError.message })
    }

    logger.audit('Location access granted', {
      locationId: location.id,
      locationName: location.name,
      deviceFingerprint: deviceFingerprint.substring(0, 8) + '***'
    })

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name
      }
    })

  } catch (error) {
    logger.error('Verify code exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
