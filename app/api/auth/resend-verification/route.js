// app/api/auth/resend-verification/route.js - Resend email verification
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
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

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ 
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED' 
      }, { status: 400 })
    }

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      }
    })

    if (error) {
      logger.error('Failed to resend verification email', { 
        error: error.message,
        userId: user.id 
      })
      return NextResponse.json({ 
        error: 'Failed to send verification email' 
      }, { status: 500 })
    }

    logger.audit('Verification email resent', { 
      userId: user.id,
      email: user.email?.substring(0, 3) + '***'
    })

    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent. Check your inbox and spam folder.' 
    })

  } catch (error) {
    logger.error('Resend verification exception', { error: error.message })
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}
