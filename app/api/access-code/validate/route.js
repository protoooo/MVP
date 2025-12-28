// app/api/access-code/validate/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

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

export async function POST(request) {
  const ip = getClientIp(request)

  try {
    const body = await request.json().catch(() => ({}))
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Invalid access code format' }, { status: 400 })
    }

    // Look up the access code
    const { data: accessCode, error: lookupError } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (lookupError || !accessCode) {
      logger.warn('Invalid access code attempt', { code, ip })
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 })
    }

    // Check if code is expired (if expires_at is set)
    if (accessCode.expires_at) {
      const expiryDate = new Date(accessCode.expires_at)
      if (expiryDate < new Date()) {
        return NextResponse.json({ 
          error: 'This access code has expired',
          status: 'expired'
        }, { status: 403 })
      }
    }

    // Determine what the code can do
    const canProcess = accessCode.status === 'unused' || accessCode.is_admin
    const hasReport = !!accessCode.report_data && !!accessCode.report_generated_at
    const canAccessReport = hasReport

    // Calculate remaining time
    const remainingSeconds = Math.max(0, 
      accessCode.max_video_duration_seconds - (accessCode.total_video_duration_seconds || 0)
    )

    logger.info('Access code validated', { 
      code, 
      status: accessCode.status,
      canProcess,
      hasReport,
      ip 
    })

    return NextResponse.json({
      valid: true,
      code: accessCode.code,
      status: accessCode.status,
      isAdmin: accessCode.is_admin || false,
      canProcess,
      canAccessReport,
      hasReport,
      remainingSeconds,
      maxDurationSeconds: accessCode.max_video_duration_seconds,
      usedSeconds: accessCode.total_video_duration_seconds || 0,
      reportData: hasReport ? {
        generatedAt: accessCode.report_generated_at,
        // Include minimal report metadata for preview
        hasData: true
      } : null
    })
  } catch (error) {
    logger.error('Access code validation error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to validate access code' }, { status: 500 })
  }
}
