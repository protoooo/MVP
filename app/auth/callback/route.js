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
        }
      }
    }
  )
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createSupabaseServer()
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('❌ Session exchange error:', exchangeError)
      const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/?error=auth_failed`
      return NextResponse.redirect(redirectUrl)
    }

    if (session) {
      console.log('✅ Session created for user:', session.user.email)
      
      const county = session.user.user_metadata?.county || 'washtenaw'
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({ 
          id: session.user.id,
          email: session.user.email,
          county: county,
          is_subscribed: false,
          requests_used: 0,
          images_used: 0,
          accepted_terms: false,
          accepted_privacy: false,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })

      if (profileError) {
        console.error('⚠️ Profile upsert error:', profileError)
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_subscribed, accepted_terms, accepted_privacy')
        .eq('id', session.user.id)
        .single()

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

      if (!profile?.accepted_terms || !profile?.accepted_privacy) {
        console.log('✅ New user, redirecting to terms acceptance')
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }

      if (profile?.is_subscribed) {
        console.log('✅ User has subscription, redirecting to /documents')
        return NextResponse.redirect(`${baseUrl}/documents`)
      } else {
        console.log('✅ User needs subscription, redirecting to /pricing')
        return NextResponse.redirect(`${baseUrl}/pricing`)
      }
    }
  }

  console.log('⚠️ No code or session, redirecting to home')
  return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL)
}
