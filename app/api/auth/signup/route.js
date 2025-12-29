// app/api/auth/signup/route.js - COMPLETE with plan storage
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
    const { email, password, captchaToken, selectedPriceId } = body

    // ✅ Validate input
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Verify CAPTCHA (allow bypass in development if Turnstile fails)
    if (!captchaToken || captchaToken === 'turnstile_unavailable') {
      // In non-production, allow bypass if token is missing
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('CAPTCHA bypassed in development mode', { email: email.substring(0, 3) + '***' })
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
      const captchaResult = await verifyCaptcha(captchaToken, 'signup', ip)
      
      if (!captchaResult.success) {
        logger.security('CAPTCHA failed for signup', {
          email: email.substring(0, 3) + '***',
          ip,
          error: captchaResult.error
        })
        
        return NextResponse.json(
          { error: 'Security verification failed. Please try again.', code: 'CAPTCHA_FAILED' },
          { status: 403 }
        )
      }
    }

    const cookieStore = await cookies()
    
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // ✅ CRITICAL: Store selected price ID in user metadata
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?type=signup`,
        data: {
          source: 'signup',
          signup_ip: ip,
          signup_timestamp: new Date().toISOString(),
          selected_price_id: selectedPriceId || null // ✅ Store selected plan
        }
      },
    })

    if (error) {
      logger.error('Signup error', { error: error.message, email: email.substring(0, 3) + '***' })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    logger.audit('User signed up', {
      email: email.substring(0, 3) + '***',
      userId: data.user.id,
      ip,
      emailConfirmed: !!data.user.email_confirmed_at,
      selectedPlan: selectedPriceId ? selectedPriceId.substring(0, 15) + '***' : 'none'
    })

    return NextResponse.json({
      success: true,
      needsVerification: true,
      message: 'Account created! Check your email to verify and start your trial.',
      userId: data.user.id
    })

  } catch (error) {
    logger.error('Signup exception', { error: error.message, stack: error.stack, ip })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
