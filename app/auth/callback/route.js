// app/auth/callback/route.js - Fixed version with proper redirects
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/'

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`

  console.log('🔄 Auth callback:', {
    hasCode: !!code,
    hasError: !!error,
    type,
    next,
    baseUrl,
  })

  // Handle OAuth / email-link errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)

    if (error === 'access_denied' && errorDescription?.includes('expired')) {
      return NextResponse.redirect(`${baseUrl}/?error=link_expired`)
    }

    return NextResponse.redirect(`${baseUrl}/?error=${error}`)
  }

  if (!code) {
    console.error('❌ No code provided')
    return NextResponse.redirect(`${baseUrl}/?error=no_code`)
  }

  const cookieStore = cookies()
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
    // Exchange code for a session (PKCE)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    )

    if (exchangeError) {
      console.error('❌ Session exchange failed:', exchangeError)

      if (exchangeError.message?.includes('code verifier')) {
        return NextResponse.redirect(`${baseUrl}/?error=pkce_failed`)
      }

      return NextResponse.redirect(`${baseUrl}/?error=auth_failed`)
    }

    if (!data.user) {
      console.error('❌ No user in session')
      return NextResponse.redirect(`${baseUrl}/?error=no_user`)
    }

    console.log('✅ Session established:', data.user.email)

    // EARLY RETURN: password recovery flow
    if (type === 'recovery' || next === '/reset-password' || next?.includes('reset-password')) {
      console.log('🔐 Password recovery detected, redirecting to /reset-password')
      return NextResponse.redirect(`${baseUrl}/reset-password`)
    }

    // Check if terms accepted
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profile?.accepted_terms || !profile?.accepted_privacy) {
      console.log('⚠️ Terms not accepted, redirecting to /accept-terms')
      return NextResponse.redirect(`${baseUrl}/accept-terms`)
    }

    // Check for active subscription
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', data.user.id)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    const now = new Date()

    if (!activeSub) {
      const { data: recentCheckout } = await supabase
        .from('checkout_attempts')
        .select('created_at')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentCheckout && now - new Date(recentCheckout.created_at) < 300000) {
        console.log('⏳ Recent checkout detected, allowing access')
        return NextResponse.redirect(baseUrl)
      }

      console.log('⚠️ No active subscription, redirecting to pricing')
      return NextResponse.redirect(`${baseUrl}/?showPricing=true`)
    }

    const periodEnd = new Date(activeSub.current_period_end)
    if (periodEnd < now) {
      console.log('⚠️ Subscription expired')
      return NextResponse.redirect(`${baseUrl}/?showPricing=true&expired=true`)
    }

    console.log('✅ All checks passed, redirecting to home')
    return NextResponse.redirect(baseUrl)
    
  } catch (error) {
    console.error('❌ Callback exception:', error)
    return NextResponse.redirect(`${baseUrl}/?error=callback_failed`)
  }
}
