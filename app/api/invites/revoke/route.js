import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { revokeSeat } from '@/lib/deviceSeats'

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
  const { seatId } = body

  if (!seatId) {
    return NextResponse.json({ error: 'Seat id required' }, { status: 400 })
  }

  try {
    const { code, last4 } = await revokeSeat(seatId, user.id)
    return NextResponse.json({ success: true, inviteCode: code, inviteCodeLast4: last4 })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to revoke seat' }, { status: 400 })
  }
}
