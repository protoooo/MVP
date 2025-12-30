// app/api/access-code/track-upload/route.js
// Track photo uploads for access codes and enforce limits
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request) {
  const ip = getClientIp(request)

  try {
    const body = await request.json().catch(() => ({}))
    const { code, photoCount = 1 } = body

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

    // Check if code is expired
    if (accessCode.expires_at) {
      const expiryDate = new Date(accessCode.expires_at)
      if (expiryDate < new Date()) {
        return NextResponse.json({ 
          error: 'This access code has expired',
          status: 'expired'
        }, { status: 403 })
      }
    }

    // Check if passcode has been used (locked after processing)
    if (accessCode.status === 'used' && !accessCode.is_admin) {
      return NextResponse.json({ 
        error: 'This passcode has been used. Access your report here: [link]',
        status: 'used',
        reportUrl: accessCode.report_url || null
      }, { status: 403 })
    }

    // Calculate current photo count
    const maxPhotos = accessCode.max_photos || 200
    const currentCount = accessCode.total_photos_uploaded || 0
    const newCount = currentCount + photoCount

    // Check if exceeding limit
    if (newCount > maxPhotos && !accessCode.is_admin) {
      const tier = accessCode.tier || 'BASIC'
      const upgradeMessage = tier === 'BASIC' 
        ? 'Process your report or upgrade to Premium (500 photos).'
        : 'Process your report.'
      
      return NextResponse.json({ 
        error: `You've reached your ${maxPhotos} photo limit. ${upgradeMessage}`,
        status: 'limit_exceeded',
        maxPhotos,
        currentCount
      }, { status: 403 })
    }

    // Update the photo count
    const { error: updateError } = await supabase
      .from('access_codes')
      .update({
        total_photos_uploaded: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('code', code)

    if (updateError) {
      logger.error('Failed to update photo count', { error: updateError.message, code })
      return NextResponse.json({ error: 'Failed to track upload' }, { status: 500 })
    }

    logger.info('Photo upload tracked', {
      code,
      tier: accessCode.tier || 'LEGACY',
      photoCount,
      newCount,
      maxPhotos,
      ip
    })

    return NextResponse.json({
      success: true,
      totalPhotosUploaded: newCount,
      maxPhotos,
      remainingPhotos: Math.max(0, maxPhotos - newCount),
      canUploadMore: newCount < maxPhotos || accessCode.is_admin
    })
  } catch (error) {
    logger.error('Track upload error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to track upload' }, { status: 500 })
  }
}
