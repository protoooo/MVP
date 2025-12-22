import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { emails } from '@/lib/emails'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId, locations } = body

    if (!purchaseId || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from('pending_multi_location_purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('buyer_user_id', user.id)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const emailsSent = []

    for (const loc of locations) {
      const { inviteCode, managerEmail, restaurantName } = loc

      if (!inviteCode || !managerEmail || !restaurantName) continue

      const { error: updateError } = await supabase
        .from('multi_location_invites')
        .update({
          manager_email: managerEmail,
          restaurant_name: restaurantName,
          invited_at: new Date().toISOString(),
        })
        .eq('code', inviteCode)

      if (updateError) {
        logger.error('Failed to update invite', { error: updateError.message, inviteCode })
        continue
      }

      const signupUrl = `${baseUrl}/signup?invite=${inviteCode}`

      try {
        await emails.locationManagerInvite(managerEmail, restaurantName, signupUrl, purchase.buyer_email)

        emailsSent.push(managerEmail)

        logger.audit('Location manager invited', {
          buyerUserId: user.id,
          managerEmail: managerEmail.substring(0, 3) + '***',
          restaurantName,
        })
      } catch (emailError) {
        logger.error('Failed to send invite email', {
          error: emailError.message,
          managerEmail: managerEmail.substring(0, 3) + '***',
        })
      }
    }

    const totalLocations = purchase.location_count
    if (emailsSent.length === totalLocations) {
      await supabase
        .from('pending_multi_location_purchases')
        .update({
          status: 'invites_sent',
          invites_sent_at: new Date().toISOString(),
        })
        .eq('id', purchaseId)
    }

    return NextResponse.json({
      success: true,
      emailsSent: emailsSent.length,
    })
  } catch (error) {
    logger.error('Send invites exception', { error: error.message })
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
