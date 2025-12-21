// app/api/register-location/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { registerLocation } from '@/lib/licenseValidation'

export const dynamic = 'force-dynamic'

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if already registered
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('metadata')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (subscription?.metadata?.location_hash) {
      return NextResponse.json({ 
        error: 'Location already registered',
        code: 'ALREADY_REGISTERED' 
      }, { status: 400 })
    }

    // Get session info
    const sessionInfo = {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    // Register location
    const result = await registerLocation(user.id, sessionInfo)

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to register location' 
      }, { status: 500 })
    }

    // Update subscription metadata
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    await supabaseAdmin
      .from('subscriptions')
      .update({
        metadata: {
          ...subscription?.metadata,
          location_hash: result.locationFingerprint,
          registered_at: new Date().toISOString()
        }
      })
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])

    logger.audit('Location registered successfully', {
      userId: user.id,
      locationHash: result.locationFingerprint?.substring(0, 8) + '***'
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Location registration exception', { error: error.message })
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}
