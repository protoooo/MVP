import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyCaptcha } from '@/lib/captchaVerification'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

function getClientIp() {
  const headersList = headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip')
}

export async function POST(request) {
  const ip = getClientIp()
  
  try {
    const body = await request.json()
    const { email, captchaToken } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    // Verify CAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken, 'reset', ip)
    
    if (!captchaResult.success) {
      logger.security('CAPTCHA failed for password reset', {
        email: email.substring(0, 3) + '***',
        ip,
        error: captchaResult.error
      })
      
      return NextResponse.json(
        { error: 'Security verification failed. Please try again.', code: 'CAPTCHA_FAILED' },
        { status: 403 }
      )
    }

    const cookieStore = cookies()
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

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    })

    if (error) {
      logger.error('Password reset error', { error: error.message, email: email.substring(0, 3) + '***' })
      
      // Don't reveal if email exists
      return NextResponse.json({
        success: true,
        message: 'If an account exists, you will receive a password reset email'
      })
    }

    logger.audit('Password reset requested', {
      email: email.substring(0, 3) + '***',
      ip
    })

    return NextResponse.json({
      success: true,
      message: 'Check your email for password reset instructions'
    })

  } catch (error) {
    logger.error('Password reset exception', { error: error.message, ip })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
