// middleware.js - UPDATED for access code system (no authentication required)
import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrfProtection'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '@/lib/supabaseConfig'

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
  // Public Routes (no authentication required - all routes are public now)
  // ============================================================================
  const publicRoutes = [
    '/auth',
    '/login',
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
  // NO AUTHENTICATION CHECK - Access code system doesn't require login
  // ============================================================================
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

// test change
