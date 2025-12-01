// app/auth/callback/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.org'
  
  console.log('🔄 Auth callback:', { 
    hasCode: !!code, 
    hasError: !!error, 
    baseUrl,
    fullUrl: request.url 
  })

  // Handle OAuth errors
  if (error) {
    console.error('❌ OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${baseUrl}/?error=${error}`)
  }

  if (code) {
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

    console.log('✅ Session established:', data.user?.email)

    // ✅ FIX: Check profile and subscription status BEFORE deciding redirect
    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms, accepted_privacy')
        .eq('id', data.user.id)
        .single()

      // If terms not accepted, go to terms page
      if (!profile?.accepted_terms || !profile?.accepted_privacy) {
        console.log('⚠️ Terms not accepted, redirecting to /accept-terms')
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }

      // ✅ NEW: Check if user has active subscription
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', data.user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      // If no active subscription, redirect to pricing
      if (!activeSub) {
        console.log('⚠️ No active subscription, redirecting to home (pricing modal will open)')
        return NextResponse.redirect(`${baseUrl}/?showPricing=true`)
      }

      // Check if subscription expired
      const periodEnd = new Date(activeSub.current_period_end)
      if (periodEnd < new Date()) {
        console.log('⚠️ Subscription expired, redirecting to home')
        return NextResponse.redirect(`${baseUrl}/?showPricing=true`)
      }

      console.log('✅ All checks passed, redirecting to home')
    }
  }

  return NextResponse.redirect(`${baseUrl}`)
}
