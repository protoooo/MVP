import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`

  console.log('🔄 Auth callback:', {
    hasCode: !!code,
    hasError: !!error,
    baseUrl,
  })

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
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

  // Check if terms accepted
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('accepted_terms, accepted_privacy')
    .eq('id', data.user.id)
    .single()

  if (!profile?.accepted_terms || !profile?.accepted_privacy) {
    console.log('⚠️ Terms not accepted, redirecting to /accept-terms')
    return NextResponse.redirect(`${baseUrl}/accept-terms`)
  }

  // Check for active subscription
  const { data: activeSub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, trial_end')
    .eq('user_id', data.user.id)
    .in('status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If no subscription, show pricing
  if (!activeSub) {
    console.log('⚠️ No active subscription, redirecting to pricing')
    return NextResponse.redirect(`${baseUrl}/?showPricing=true`)
  }

  // Check if subscription is expired
  const periodEnd = new Date(activeSub.current_period_end)
  if (periodEnd < new Date()) {
    console.log('⚠️ Subscription expired')
    return NextResponse.redirect(`${baseUrl}/?showPricing=true&expired=true`)
  }

  // All checks passed - redirect to app
  console.log('✅ All checks passed, redirecting to home')
  return NextResponse.redirect(baseUrl)
}
