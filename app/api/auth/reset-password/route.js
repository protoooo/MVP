import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyCaptcha } from '@/lib/captchaVerification'
import { logger } from '@/lib/logger'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getClientIp() {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip')
}

export async function POST(request) {
  const ip = await getClientIp()

  try {
    const body = await request.json()
    const { email, captchaToken } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    // Verify CAPTCHA (allow bypass in development or if explicitly disabled)
    const captchaDisabled = process.env.DISABLE_CAPTCHA === 'true'
    
    if (!captchaToken || captchaToken === 'turnstile_unavailable') {
      // Allow bypass if captcha is disabled or in non-production
      if (captchaDisabled || process.env.NODE_ENV !== 'production') {
        logger.warn('CAPTCHA bypassed', { 
          email: email.substring(0, 3) + '***',
          reason: captchaDisabled ? 'DISABLE_CAPTCHA=true' : 'non-production environment'
        })
      } else {
        logger.security('Missing CAPTCHA token in production', {
          email: email.substring(0, 3) + '***',
          ip
        })
        return NextResponse.json(
          { error: 'Security verification required.', code: 'CAPTCHA_REQUIRED' },
          { status: 403 }
        )
      }
    } else {
      // Skip verification if captcha is disabled
      if (captchaDisabled) {
        logger.warn('CAPTCHA verification skipped (DISABLE_CAPTCHA=true)', { 
          email: email.substring(0, 3) + '***' 
        })
      } else {
        const captchaResult = await verifyCaptcha(captchaToken, 'reset', ip)

        if (!captchaResult.success) {
          logger.security('CAPTCHA failed for password reset', {
            email: email.substring(0, 3) + '***',
            ip,
            error: captchaResult.error,
          })

          return NextResponse.json(
            { error: 'Security verification failed. Please try again.', code: 'CAPTCHA_FAILED' },
            { status: 403 }
          )
        }
      }
    }

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

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      logger.error('Password reset error', {
        error: error.message,
        email: email.substring(0, 3) + '***',
      })

      return NextResponse.json({
        success: true,
        message: 'If an account exists, you will receive a password reset email',
      })
    }

    logger.audit('Password reset requested', {
      email: email.substring(0, 3) + '***',
      ip,
    })

    return NextResponse.json({
      success: true,
      message: 'Check your email for password reset instructions',
    })
  } catch (error) {
    logger.error('Password reset exception', { error: error.message, ip })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
