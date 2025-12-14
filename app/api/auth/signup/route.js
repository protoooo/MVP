// app/api/auth/signup/route.js - Minimal safe version
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
    const { email, password, captchaToken } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

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

    const cookieStore = cookies()
    
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

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      },
    })

    if (error) {
      logger.error('Signup error', { error: error.message, email: email.substring(0, 3) + '***' })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    // ✅ MINIMAL PROFILE CREATION - Only required fields
    const now = new Date().toISOString()
    
    try {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: data.user.id,
          created_at: now,
          updated_at: now
        })

      if (profileError) {
        logger.error('Profile creation failed', { 
          error: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
          userId: data.user.id
        })
      } else {
        logger.info('User profile created successfully', { userId: data.user.id })
      }
    } catch (profileException) {
      logger.error('Profile creation exception', {
        error: profileException.message,
        userId: data.user.id
      })
    }

    logger.audit('User signed up', {
      email: email.substring(0, 3) + '***',
      userId: data.user.id,
      ip
    })

    return NextResponse.json({
      success: true,
      message: 'Check your email to verify your account'
    })

  } catch (error) {
    logger.error('Signup exception', { error: error.message, stack: error.stack, ip })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
