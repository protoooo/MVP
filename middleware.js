// middleware.js - SECURITY FIX: Prevent redirect loops and enforce proper flow
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  
  // Skip all API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // ✅ FIX: Comprehensive public route list to prevent redirect loops
  const publicRoutes = [
    '/auth', 
    '/terms', 
    '/privacy', 
    '/contact', 
    '/verify-email', 
    '/reset-password', 
    '/accept-terms',
    '/register-location'
  ]
  
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (isPublicRoute) {
    return response
  }

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()
  
  // ✅ FIX: Only redirect on root path to prevent loops
  if (pathname === '/' && user) {
    // Step 1: Check email verification
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }
    
    // Step 2: Check subscription status BEFORE checking terms
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status, trial_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    // ✅ CRITICAL: No subscription - redirect to pricing
    if (!subscription) {
      return NextResponse.redirect(new URL('/?showPricing=true', request.url))
    }

    // ✅ CRITICAL: Check if trial expired
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end)
      if (trialEnd < new Date()) {
        return NextResponse.redirect(new URL('/?showPricing=true', request.url))
      }
    }
    
    // Step 3: Check terms acceptance (ONLY if subscription is valid)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!profile || !profile.accepted_terms || !profile.accepted_privacy) {
      // Valid subscription exists - allow terms acceptance
      return NextResponse.redirect(new URL('/accept-terms', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
