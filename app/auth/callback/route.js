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
          is_subscribed: false, // LEGACY FIELD - never use for auth
          accepted_terms: false,
          requests_used: 0,
          images_used: 0,
          updated_at: new Date().toISOString()
        })
        
        console.log('✅ New user created:', session.user.email)
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }
      
      // 3. EXISTING USER: Check if terms accepted
      if (!existingProfile.accepted_terms) {
        console.log('⚠️ Terms not accepted, redirecting:', session.user.email)
        return NextResponse.redirect(`${baseUrl}/accept-terms`)
      }

      // 4. CRITICAL FIX: ONLY check subscriptions table - NO LEGACY BYPASS
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('status, plan, current_period_end')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      // SECURITY: Verify subscription hasn't expired
      if (activeSub) {
        const periodEnd = new Date(activeSub.current_period_end)
        const now = new Date()
        
        if (periodEnd >= now) {
          console.log('✅ Active subscription verified:', activeSub.plan, activeSub.status)
          
          // Sync to profile for backward compatibility only (not for auth!)
          await supabase
            .from('user_profiles')
            .update({ 
              is_subscribed: true, // LEGACY FIELD ONLY
              updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id)
          
          return NextResponse.redirect(baseUrl) // Dashboard
        } else {
          console.log('❌ Subscription expired:', activeSub.plan)
          // Fall through to pricing redirect
        }
      }

      // 5. NO ACTIVE SUBSCRIPTION - ALWAYS redirect to pricing (no legacy bypass)
      console.log('❌ No active subscription found for:', session.user.email)
      return NextResponse.redirect(`${baseUrl}/pricing`)
    }
  }

  // Fallback
  return NextResponse.redirect(baseUrl)
}
