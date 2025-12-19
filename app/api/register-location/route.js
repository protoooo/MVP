// app/api/register-location/route.js - Register physical location for license
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { registerLocation } from '@/lib/licenseValidation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

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

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get session info
    const sessionInfo = {
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    const result = await registerLocation(user.id, sessionInfo)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    logger.audit('Location registered via API', {
      userId: user.id,
      email: user.email?.substring(0, 3) + '***'
    })

    return NextResponse.json({ 
      success: true,
      message: 'Location registered successfully' 
    })

  } catch (error) {
    logger.error('Location registration API error', { error: error.message })
    return NextResponse.json({ 
      error: 'Failed to register location' 
    }, { status: 500 })
  }
}
