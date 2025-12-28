// app/api/access-code/lock/route.js
// Lock an access code after report processing
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
    const { code, reportUrl, reportData } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
    }

    // Validate code format (BASIC-XXXXX or PREMIUM-XXXXX or legacy 6 digits)
    if (!/^(BASIC|PREMIUM)-\d{5}$/.test(code) && !/^\d{6}$/.test(code)) {
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

    // Check if already locked (unless admin)
    if (accessCode.status === 'used' && !accessCode.is_admin) {
      return NextResponse.json({ 
        error: 'Access code already locked',
        status: 'already_locked'
      }, { status: 400 })
    }

    // Lock the passcode
    const { error: updateError } = await supabase
      .from('access_codes')
      .update({
        status: 'used',
        report_url: reportUrl || accessCode.report_url,
        report_data: reportData || accessCode.report_data,
        report_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('code', code)

    if (updateError) {
      logger.error('Failed to lock access code', { error: updateError.message, code })
      return NextResponse.json({ error: 'Failed to lock access code' }, { status: 500 })
    }

    logger.audit('Access code locked after report generation', {
      code,
      tier: accessCode.tier || 'LEGACY',
      totalPhotosUploaded: accessCode.total_photos_uploaded || 0,
      ip
    })

    return NextResponse.json({
      success: true,
      status: 'locked',
      message: 'Access code locked. You can still view your report but cannot upload new photos.',
      reportUrl: reportUrl || accessCode.report_url
    })
  } catch (error) {
    logger.error('Lock access code error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to lock access code' }, { status: 500 })
  }
}
