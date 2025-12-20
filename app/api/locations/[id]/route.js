// app/api/locations/[id]/route.js - COMPLETE FILE
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
    try {
      const { syncLocationQuantityToStripe } = await import('@/app/api/webhook/route')
      const syncResult = await syncLocationQuantityToStripe(user.id)
      
      if (!syncResult.success) {
        logger.warn('Failed to sync location count to Stripe', { 
          error: syncResult.error 
        })
      }
    } catch (syncError) {
      logger.error('Stripe sync exception', { error: syncError.message })
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
    try {
      const { syncLocationQuantityToStripe } = await import('@/app/api/webhook/route')
      const syncResult = await syncLocationQuantityToStripe(user.id)
      
      if (!syncResult.success) {
        logger.warn('Failed to sync location count to Stripe', { 
          error: syncResult.error 
        })
      }
    } catch (syncError) {
      logger.error('Stripe sync exception', { error: syncError.message })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Delete location exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
