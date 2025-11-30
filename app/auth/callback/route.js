import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
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
        // NEW USER: Create profile and mark as needing terms
        await supabase.from('user_profiles').insert({
          id: session.user.id,
          email: session.user.email,
          county: 'washtenaw',
          is_subscribed: false,
          accepted_terms: false,
          requests_used: 0,
          images_used: 0,
          updated_at: new Date().toISOString()
        })
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }
      
      // 3. EXISTING USER: Check if terms accepted
      if (!existingProfile.accepted_terms) {
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }

      // 4. CRITICAL FIX: Check subscription status from subscriptions table
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('status, plan')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      // If they have an active/trialing subscription, sync it to profile
      if (activeSub) {
        console.log('✅ Active subscription found:', activeSub.plan, activeSub.status)
        
        // Sync to profile for backward compatibility
        await supabase
          .from('user_profiles')
          .update({ 
            is_subscribed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id)
        
        return NextResponse.redirect(baseUrl) // Dashboard
      }

      // SECURITY FIX: Also check if profile has legacy is_subscribed flag
      // (This handles users who subscribed before the subscriptions table existed)
      if (existingProfile.is_subscribed) {
        console.log('⚠️ Legacy subscription flag found, allowing access')
        return NextResponse.redirect(baseUrl)
      }

      // 5. No active subscription - send to pricing
      console.log('❌ No subscription found, redirecting to pricing')
      return NextResponse.redirect(`${baseUrl}/pricing`)
    }
  }

  // Fallback
  return NextResponse.redirect(baseUrl)
}
