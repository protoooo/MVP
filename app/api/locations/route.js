// app/api/locations/route.js - Owner manages their locations
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

    return NextResponse.json({ location })

  } catch (error) {
    logger.error('Create location exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
