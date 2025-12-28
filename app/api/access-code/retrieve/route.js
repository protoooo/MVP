// app/api/access-code/retrieve/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { emails } from '@/lib/emails'

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

// Simple rate limiting using in-memory storage
// In production, you might want to use Redis or Supabase for this
const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 3

function checkRateLimit(email) {
  const now = Date.now()
  const key = email.toLowerCase()
  const record = rateLimitStore.get(key)

  if (!record) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }

  // Reset if window has passed
  if (now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }

  // Check if limit exceeded
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { 
      allowed: false, 
      remaining: 0,
      resetAt: record.resetAt 
    }
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count }
}

/**
 * POST /api/access-code/retrieve
 * Send access code to user's email
 */
export async function POST(request) {
  const ip = getClientIp(request)

  try {
    // CSRF validation
    if (!validateCSRF(request)) {
      logger.security('CSRF validation failed in access code retrieval', { ip })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(email)
    if (!rateLimit.allowed) {
      const minutesUntilReset = Math.ceil((rateLimit.resetAt - Date.now()) / 60000)
      logger.security('Rate limit exceeded for access code retrieval', { 
        email: email.substring(0, 3) + '***', 
        ip 
      })
      return NextResponse.json({ 
        error: `Too many requests. Please try again in ${minutesUntilReset} minutes.` 
      }, { status: 429 })
    }

    // Look up access codes for this email
    const { data: accessCodes, error: fetchError } = await supabase
      .from('access_codes')
      .select('code, status, created_at, stripe_payment_intent_id')
      .eq('email', email)
      .order('created_at', { ascending: false })

    if (fetchError) {
      logger.error('Failed to fetch access codes', { 
        error: fetchError.message, 
        email: email.substring(0, 3) + '***' 
      })
      return NextResponse.json({ error: 'Failed to retrieve access code' }, { status: 500 })
    }

    if (!accessCodes || accessCodes.length === 0) {
      logger.warn('No access codes found for email', { 
        email: email.substring(0, 3) + '***', 
        ip 
      })
      return NextResponse.json({ 
        error: 'No access codes found for this email address. Please check your email or contact support.' 
      }, { status: 404 })
    }

    // Get the most recent access code
    const mostRecentCode = accessCodes[0]
    const customerName = email.split('@')[0]

    // Send email with access code
    try {
      await emails.sendAccessCodeRetrieval(
        email,
        customerName,
        mostRecentCode.code,
        mostRecentCode.status
      )

      logger.audit('Access code retrieval email sent', {
        email: email.substring(0, 3) + '***',
        codeStatus: mostRecentCode.status,
        ip,
      })

      return NextResponse.json({ 
        success: true,
        message: 'Access code has been sent to your email.',
        remaining: rateLimit.remaining
      })
    } catch (emailError) {
      logger.error('Failed to send access code retrieval email', {
        error: emailError?.message,
        email: email.substring(0, 3) + '***',
      })
      return NextResponse.json({ 
        error: 'Failed to send email. Please try again later or contact support.' 
      }, { status: 500 })
    }
  } catch (error) {
    logger.error('Access code retrieval error', { error: error?.message, ip })
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
