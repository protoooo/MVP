// middleware.js - COMPLETE: CSRF token generation + authentication checks
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrfProtection'
import { isSupabaseConfigured, missingSupabaseConfigMessage, supabaseAnonKey, supabaseUrl } from '@/lib/supabaseConfig'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Skip all API routes (they handle their own CSRF validation)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // ============================================================================
  // ✅ CSRF token cookie: ALWAYS set with correct flags (overwrites legacy cookie attrs)
  // ============================================================================
  const existing = request.cookies.get('csrf-token')?.value
  const token = existing || generateCSRFToken()

  response.cookies.set('csrf-token', token, {
    // Must be readable by JS for double-submit cookie CSRF (client echoes into X-CSRF-Token)
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24,
  })

  // ============================================================================
  // Security Headers
  // ============================================================================
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // ============================================================================
  // Public Routes (no authentication required)
  // ============================================================================
  const publicRoutes = [
    '/auth',
    '/terms',
    '/privacy',
    '/contact',
    '/verify-email',
    '/reset-password',
    '/accept-terms',
    '/register-location',
  ]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))
  if (isPublicRoute) return response

  if (!isSupabaseConfigured) {
    console.error(`[middleware] ${missingSupabaseConfigMessage}`)
    response.headers.set('X-Supabase-Config', 'missing')
    return response
  }

  // ============================================================================
  // Authentication Check (for protected routes)
  // ============================================================================
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Root path auth flow
  if (pathname === '/' && user) {
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status, trial_end')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (!subscription) {
      return NextResponse.redirect(new URL('/?showPricing=true', request.url))
    }

    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end)
      if (trialEnd < new Date()) {
        return NextResponse.redirect(new URL('/?showPricing=true', request.url))
      }
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !profile.accepted_terms || !profile.accepted_privacy) {
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
