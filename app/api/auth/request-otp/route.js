// app/api/auth/request-otp/route.js - OTP request with reCAPTCHA verification
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCaptcha } from '@/lib/captchaVerification'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// Rate limiting: Track by IP
const otpAttempts = new Map()
const MAX_ATTEMPTS_PER_HOUR = 5
const HOUR_MS = 60 * 60 * 1000

function getClientIp(request) {
  const headersList = headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown'
}

function checkRateLimit(ip) {
  const now = Date.now()
  const attempts = otpAttempts.get(ip) || []
  
  // Clean old attempts
  const recentAttempts = attempts.filter(timestamp => now - timestamp < HOUR_MS)
  
  if (recentAttempts.length >= MAX_ATTEMPTS_PER_HOUR) {
    logger.security('OTP rate limit exceeded', { ip, attempts: recentAttempts.length })
    return false
  }
  
  // Add current attempt
  recentAttempts.push(now)
  otpAttempts.set(ip, recentAttempts)
  
  return true
}

export async function POST(request) {
  const ip = getClientIp(request)
  
  try {
    // Parse body
    const body = await request.json()
    const { email, captchaToken } = body

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      )
    }

    // Verify CAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken, 'login', ip)
    
    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for OTP request', {
        email: email.substring(0, 3) + '***',
        ip,
        error: captchaResult.error,
        score: captchaResult.score
      })
      
      return NextResponse.json(
        { 
          error: 'Security verification failed. Please try again.',
          code: 'CAPTCHA_FAILED'
        },
        { status: 403 }
      )
    }

    // Check rate limit
    if (!checkRateLimit(ip)) {
      logger.security('OTP rate limit exceeded', { ip, email: email.substring(0, 3) + '***' })
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again in an hour.',
          code: 'RATE_LIMIT'
        },
        { status: 429 }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Send OTP
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      },
    })

    if (error) {
      logger.error('Supabase OTP error', { 
        error: error.message,
        email: email.substring(0, 3) + '***'
      })
      
      return NextResponse.json(
        { error: 'Failed to send login link. Please try again.' },
        { status: 500 }
      )
    }

    logger.audit('OTP sent successfully', {
      email: email.substring(0, 3) + '***',
      ip,
      captchaScore: captchaResult.score
    })

    return NextResponse.json({ 
      success: true,
      message: 'Check your email for the login link' 
    })

  } catch (error) {
    logger.error('OTP request exception', { 
      error: error.message,
      ip 
    })
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
