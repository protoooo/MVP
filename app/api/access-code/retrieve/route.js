// app/api/notification-preferences/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * POST /api/notification-preferences
 * Save notification preferences after purchase
 */
export async function POST(request) {
  const ip = getClientIp(request)

  try {
    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in notification preferences', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { 
      email, 
      inspectionReminders, 
      regulationUpdates, 
      establishmentType 
    } = body

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // More thorough email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Validate booleans
    if (typeof inspectionReminders !== 'boolean' || typeof regulationUpdates !== 'boolean') {
      return NextResponse.json({ error: 'Invalid preference values' }, { status: 400 })
    }

    // Validate establishment type if provided
    const validTypes = ['restaurant', 'cafe', 'food_truck', 'catering', 'bakery', 'bar', 'other']
    if (establishmentType && !validTypes.includes(establishmentType)) {
      return NextResponse.json({ error: 'Invalid establishment type' }, { status: 400 })
    }

    // Check if preferences already exist
    const { data: existingPrefs } = await supabase
      .from('user_notification_preferences')
      .select('id, unsubscribed_at')
      .eq('email', email)
      .maybeSingle()

    let result

    if (existingPrefs) {
      // Update existing preferences (unless they've unsubscribed)
      if (existingPrefs.unsubscribed_at) {
        return NextResponse.json({ 
          error: 'This email has unsubscribed from all notifications' 
        }, { status: 403 })
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update({
          opted_in_inspection_reminders: inspectionReminders,
          opted_in_regulation_updates: regulationUpdates,
          establishment_type: establishmentType || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPrefs.id)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update notification preferences', { 
          error: error.message, 
          email: email.substring(0, 3) + '***' 
        })
        return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
      }

      result = data
      logger.audit('Notification preferences updated', {
        email: email.substring(0, 3) + '***',
        inspectionReminders,
        regulationUpdates,
        establishmentType,
        ip,
      })
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert({
          email,
          opted_in_inspection_reminders: inspectionReminders,
          opted_in_regulation_updates: regulationUpdates,
          establishment_type: establishmentType || null,
          purchase_date: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to create notification preferences', { 
          error: error.message, 
          email: email.substring(0, 3) + '***' 
        })
        return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
      }

      result = data
      logger.audit('Notification preferences created', {
        email: email.substring(0, 3) + '***',
        inspectionReminders,
        regulationUpdates,
        establishmentType,
        ip,
      })
    }

    return NextResponse.json({ 
      success: true,
      preferences: {
        inspectionReminders: result.opted_in_inspection_reminders,
        regulationUpdates: result.opted_in_regulation_updates,
        establishmentType: result.establishment_type,
      }
    })
  } catch (error) {
    logger.error('Notification preferences error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}

/**
 * GET /api/notification-preferences?email=xxx
 * Retrieve notification preferences for an email
 */
export async function GET(request) {
  const ip = getClientIp(request)

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('opted_in_inspection_reminders, opted_in_regulation_updates, establishment_type, unsubscribed_at')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      logger.error('Failed to fetch notification preferences', { 
        error: error.message, 
        email: email.substring(0, 3) + '***' 
      })
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        exists: false,
        preferences: null
      })
    }

    return NextResponse.json({ 
      exists: true,
      unsubscribed: !!data.unsubscribed_at,
      preferences: {
        inspectionReminders: data.opted_in_inspection_reminders,
        regulationUpdates: data.opted_in_regulation_updates,
        establishmentType: data.establishment_type,
      }
    })
  } catch (error) {
    logger.error('Notification preferences fetch error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}
