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
    const { inviteCode, userId } = await request.json()

    if (!inviteCode || !userId) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('multi_location_invites')
      .select('*')
      .eq('code', inviteCode)
      .maybeSingle()

    if (inviteError || !invite) {
      logger.error('Invite lookup failed', { error: inviteError?.message })
      return NextResponse.json({ 
        error: 'Invalid invite code' 
      }, { status: 404 })
    }

    // Check if already used
    if (invite.used) {
      logger.security('Attempted reuse of invite code', { 
        inviteCode: inviteCode.substring(0, 10) + '***',
        existingUser: invite.registered_user_id?.substring(0, 8) + '***',
        attemptingUser: userId.substring(0, 8) + '***'
      })
      return NextResponse.json({ 
        error: 'This invite code has already been used' 
      }, { status: 400 })
    }

    // ✅ NEW: Capture location fingerprint immediately
    const sessionInfo = {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    const locationResult = await registerLocation(userId, sessionInfo)
    
    if (!locationResult.success) {
      logger.error('Location registration failed during invite use', {
        userId: userId.substring(0, 8) + '***'
      })
      return NextResponse.json({ 
        error: 'Failed to register location' 
      }, { status: 500 })
    }

    // ✅ Mark invite as used AND lock to this location
    const { error: updateError } = await supabase
      .from('multi_location_invites')
      .update({
        used: true,
        registered_user_id: userId,
        location_fingerprint: locationResult.locationFingerprint, // ✅ NEW
        used_at: new Date().toISOString()
      })
      .eq('code', inviteCode)

    if (updateError) {
      logger.error('Failed to mark invite as used', { 
        error: updateError.message 
      })
      return NextResponse.json({ 
        error: 'Failed to use invite code' 
      }, { status: 500 })
    }

    // ✅ Store location hash in subscription metadata
    const { error: subUpdateError } = await supabase
      .from('subscriptions')
      .update({
        metadata: {
          location_hash: locationResult.locationFingerprint,
          registered_at: new Date().toISOString(),
          invite_code: inviteCode,
          location_number: invite.location_number
        }
      })
      .eq('stripe_subscription_id', invite.stripe_subscription_id)
      .eq('user_id', userId) // ✅ Only update this user's sub record

    if (subUpdateError) {
      logger.warn('Failed to update subscription metadata', { 
        error: subUpdateError.message 
      })
    }

    logger.audit('Invite code used and location locked', {
      userId: userId.substring(0, 8) + '***',
      locationNumber: invite.location_number,
      locationFingerprint: locationResult.locationFingerprint.substring(0, 8) + '***'
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Use invite exception', { error: error.message })
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}
