// app/api/validate-invite/route.js - NEW FILE
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json({ 
        valid: false, 
        error: 'No invite code provided' 
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

    // Look up invite code
    const { data: invite, error } = await supabase
      .from('multi_location_invites')
      .select('*')
      .eq('code', inviteCode)
      .maybeSingle()

    if (error || !invite) {
      logger.security('Invalid invite code attempted', { inviteCode: inviteCode.substring(0, 10) + '***' })
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid invite code' 
      }, { status: 404 })
    }

    // Check if already used
    if (invite.used) {
      logger.security('Already used invite code attempted', { inviteCode: inviteCode.substring(0, 10) + '***' })
      return NextResponse.json({ 
        valid: false, 
        error: 'This invite code has already been used' 
      }, { status: 400 })
    }

    // Check if subscription is still active
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('stripe_subscription_id', invite.stripe_subscription_id)
      .maybeSingle()

    if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
      logger.security('Invite code for inactive subscription', { 
        inviteCode: inviteCode.substring(0, 10) + '***',
        subscriptionStatus: subscription?.status 
      })
      return NextResponse.json({ 
        valid: false, 
        error: 'This invite is no longer valid (subscription inactive)' 
      }, { status: 400 })
    }

    logger.info('Invite code validated successfully', {
      locationNumber: invite.location_number,
      totalLocations: invite.total_locations
    })

    return NextResponse.json({ 
      valid: true,
      details: {
        location_number: invite.location_number,
        total_locations: invite.total_locations,
        buyer_user_id: invite.buyer_user_id
      }
    })

  } catch (error) {
    logger.error('Invite validation exception', { error: error.message })
    return NextResponse.json({ 
      valid: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}
