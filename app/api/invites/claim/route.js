import { createServerClient } from '@supabase/ssr'
import { cookies, headers as nextHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { claimSeat } from '@/lib/deviceSeats'
import { generateDeviceFingerprint } from '@/lib/licenseValidation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {}
      },
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { inviteCode } = body

  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
  }

  const headerList = await nextHeaders()
  const sessionInfo = {
    ip: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || headerList.get('x-real-ip') || undefined,
    userAgent: headerList.get('user-agent') || undefined,
  }

  try {
    const deviceFingerprint = generateDeviceFingerprint(sessionInfo)
    await claimSeat({ inviteCode, claimerUserId: user.id, deviceFingerprint })
    return NextResponse.json({ success: true, deviceFingerprint })
  } catch (error) {
    logger.warn('Invite claim failed', { error: error.message })
    return NextResponse.json({ error: error.message || 'Unable to claim invite' }, { status: 400 })
  }
}
