import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function createSupabaseServer() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      }
    }
  )
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  if (code) {
    const supabase = createSupabaseServer()
    
    // 1. Exchange Code for Session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Session exchange error:', exchangeError)
      return NextResponse.redirect(`${baseUrl}/?error=auth_failed`)
    }

    if (session) {
      console.log('✅ Session verified for:', session.user.email)
      
      // 2. GET Existing Profile (Do NOT overwrite!)
      let { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('is_subscribed, accepted_terms, accepted_privacy, county')
        .eq('id', session.user.id)
        .single()

      // 3. Fallback: If profile doesn't exist (Trigger failed?), create it safely
      if (!profile || fetchError) {
        console.log('⚠️ Profile missing, creating fallback...')
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ 
            id: session.user.id,
            email: session.user.email,
            county: session.user.user_metadata?.county || 'washtenaw',
            is_subscribed: false,
            requests_used: 0,
            images_used: 0,
            accepted_terms: false,
            accepted_privacy: false,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (insertError) {
          console.error('❌ Failed to create profile:', insertError)
          return NextResponse.redirect(`${baseUrl}/?error=profile_creation_failed`)
        }
        profile = newProfile
      }

      // 4. Smart Routing
      
      // A. Terms not accepted -> Go to Terms
      if (!profile?.accepted_terms || !profile?.accepted_privacy) {
        console.log('📋 Terms needed -> /accept-terms')
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }

      // B. Already Subscribed -> Go directly to App
      if (profile?.is_subscribed) {
        console.log('🚀 User subscribed -> /documents')
        return NextResponse.redirect(`${baseUrl}/documents`)
      }

      // C. Not Subscribed -> Go to Pricing
      console.log('💳 User needs plan -> /pricing')
      return NextResponse.redirect(`${baseUrl}/pricing`)
    }
  }

  // No code found
  return NextResponse.redirect(baseUrl)
}
