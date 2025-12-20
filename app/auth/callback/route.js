// app/auth/callback/route.js - COMPLETE FILE with proper redirect flow
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') // Get redirect destination

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`

  console.log('🔄 Auth callback:', {
    hasCode: !!code,
    hasError: !!error,
    type,
    next,
    baseUrl,
  })

  // Handle errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${baseUrl}/?error=${error}`)
  }

  if (!code) {
    console.error('❌ No code provided')
    return NextResponse.redirect(`${baseUrl}/?error=no_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Cookie set error:', error)
          }
        },
        remove(name, options) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (error) {
            console.error('Cookie remove error:', error)
          }
        },
      },
    }
  )

  try {
    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Session exchange failed:', exchangeError)
      return NextResponse.redirect(`${baseUrl}/?error=auth_failed`)
    }

    if (!data.user) {
      console.error('❌ No user in session')
      return NextResponse.redirect(`${baseUrl}/?error=no_user`)
    }

    console.log('✅ Session established:', data.user.email)

    // Password recovery flow - redirect to reset page
    if (type === 'recovery') {
      console.log('🔐 Password recovery, redirecting to reset page')
      return NextResponse.redirect(`${baseUrl}/reset-password`)
    }

    // Email verification complete - redirect to pricing to start trial
    if (next === 'pricing') {
      console.log('✅ Email verified, redirecting to pricing to start trial')
      return NextResponse.redirect(`${baseUrl}/?showPricing=true&emailVerified=true`)
    }

    // Regular login - redirect to home (let page.js handle subscription checks)
    console.log('✅ Regular auth flow, redirecting to home')
    return NextResponse.redirect(baseUrl)

  } catch (error) {
    console.error('❌ Callback exception:', error)
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`)
  }
}
