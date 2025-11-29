import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // FIX: Force production URL, fallback to origin only for localhost
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    ? process.env.NEXT_PUBLIC_BASE_URL 
    : requestUrl.origin

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
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // 1. Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      
      // 2. Get or Create Profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (!existingProfile) {
          await supabase.from('user_profiles').insert({
              id: session.user.id,
              email: session.user.email,
              county: 'washtenaw',
              is_subscribed: false, // Default to false
              accepted_terms: false,
              updated_at: new Date().toISOString()
          })
          // New user -> Send to terms
          return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }
      
      // 3. Check if terms accepted
      if (!existingProfile.accepted_terms) {
         return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }

      // 4. Route based on subscription status
      if (existingProfile.is_subscribed) {
        return NextResponse.redirect(baseUrl) // Dashboard at root
      } else {
        return NextResponse.redirect(`${baseUrl}/pricing`)
      }
    }
  }

  // Fallback
  return NextResponse.redirect(baseUrl)
}
