// app/auth/callback/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  // ✅ CRITICAL: Use env var, NOT requestUrl.origin
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.org'
  
  console.log('🔄 Auth callback:', { hasCode: !!code, hasError: !!error, baseUrl })

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

    // Check if user needs to accept terms
    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms, accepted_privacy')
        .eq('id', data.user.id)
        .single()

      if (!profile?.accepted_terms || !profile?.accepted_privacy) {
        console.log('⚠️ Redirecting to terms acceptance')
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }
    }
  }

  // ✅ Always redirect to baseUrl
  return NextResponse.redirect(`${baseUrl}${next}`)
}
