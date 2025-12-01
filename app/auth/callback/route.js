// app/auth/callback/route.js
// COMPLETE REWRITE - FIXES ALL ROUTING ISSUES

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

  if (!code) {
    console.log('❌ No auth code provided')
    return NextResponse.redirect(baseUrl)
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
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  // ============================================
  // STEP 1: Exchange code for session
  // ============================================
  const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !session) {
    console.error('❌ Auth error:', sessionError?.message)
    return NextResponse.redirect(baseUrl)
  }

  console.log('✅ Session established for:', session.user.email)

  // ============================================
  // STEP 2: Get or Create Profile
  // ============================================
  const { data: existingProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  
  // NEW USER - Create profile
  if (profileError || !existingProfile) {
    console.log('📝 Creating new user profile')
    
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: session.user.id,
        email: session.user.email,
        county: 'washtenaw',
        is_subscribed: false,
        accepted_terms: false,
        accepted_privacy: false,
        requests_used: 0,
        images_used: 0,
        updated_at: new Date().toISOString()
      })
    
    if (insertError) {
      console.error('❌ Profile creation failed:', insertError)
      return NextResponse.redirect(baseUrl)
    }
    
    console.log('✅ New user created, redirecting to terms')
    return NextResponse.redirect(`${baseUrl}/accept-terms`)
  }

  // ============================================
  // STEP 3: EXISTING USER - Check Terms
  // ============================================
  if (!existingProfile.accepted_terms || !existingProfile.accepted_privacy) {
    console.log('⚠️ Terms not accepted, redirecting:', session.user.email)
    return NextResponse.redirect(`${baseUrl}/accept-terms`)
  }

  // ============================================
  // STEP 4: CRITICAL - Check ONLY subscriptions table
  // ============================================
  const { data: activeSub, error: subError } = await supabase
    .from('subscriptions')
    .select('status, plan, current_period_end')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  // NO ACTIVE SUBSCRIPTION FOUND
  if (!activeSub || subError) {
    console.log('❌ No active subscription for:', session.user.email)
    
    // Ensure is_subscribed is false
    await supabase
      .from('user_profiles')
      .update({ 
        is_subscribed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
    
    return NextResponse.redirect(`${baseUrl}/pricing`)
  }

  // ============================================
  // STEP 5: Verify subscription NOT expired
  // ============================================
  const periodEnd = new Date(activeSub.current_period_end)
  const now = new Date()
  
  if (periodEnd < now) {
    console.log('❌ Subscription expired:', activeSub.plan)
    
    // Mark as expired
    await supabase
      .from('subscriptions')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .eq('status', activeSub.status)
    
    await supabase
      .from('user_profiles')
      .update({ 
        is_subscribed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
    
    return NextResponse.redirect(`${baseUrl}/pricing`)
  }

  // ============================================
  // STEP 6: VALID SUBSCRIPTION - Sync to profile
  // ============================================
  console.log('✅ Active subscription verified:', {
    plan: activeSub.plan,
    status: activeSub.status,
    expires: periodEnd.toISOString()
  })
  
  await supabase
    .from('user_profiles')
    .update({ 
      is_subscribed: true, // Legacy field for backward compatibility
      updated_at: new Date().toISOString()
    })
    .eq('id', session.user.id)
  
  console.log('✅ Redirecting to dashboard')
  return NextResponse.redirect(baseUrl)
}
