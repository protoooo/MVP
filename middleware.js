import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Add security headers to all responses
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // CSRF Protection: Generate token for GET requests
  if (req.method === 'GET' && !req.cookies.get('csrf-token')) {
    const token = randomBytes(32).toString('hex')
    res.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    })
  }

  // CSRF Protection: Validate token on state-changing requests
  // Skip webhook endpoint (it has its own Stripe signature verification)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && 
      !req.nextUrl.pathname.startsWith('/api/webhook')) {
    
    const cookieToken = req.cookies.get('csrf-token')?.value
    const headerToken = req.headers.get('x-csrf-token')
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      console.warn('CSRF validation failed:', {
        path: req.nextUrl.pathname,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
        match: cookieToken === headerToken
      })
      
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
  }

  // Refresh session and get user
  const { data: { session }, error } = await supabase.auth.getSession()

  // Log authentication issues for debugging
  if (error) {
    console.error('Middleware auth error:', error.message)
  }

  // Session timeout check
  if (session) {
    const lastActivity = req.cookies.get('last_activity')?.value
    const now = Date.now()
    
    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity)
      if (now - lastActivityTime > SESSION_TIMEOUT) {
        console.log('Session timeout - forcing logout')
        await supabase.auth.signOut()
        const redirectUrl = new URL('/', req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
    
    // Update last activity timestamp
    res.cookies.set('last_activity', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_TIMEOUT / 1000,
      path: '/'
    })
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/documents', '/api/chat', '/api/create-checkout-session', '/api/create-portal-session']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // If accessing protected route without session, redirect to home
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Additional verification for API routes (except webhook which has its own auth)
  if (req.nextUrl.pathname.startsWith('/api/') && 
      !req.nextUrl.pathname.startsWith('/api/webhook')) {
    
    // Verify session is valid and not expired
    if (session) {
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      
      if (expiresAt < now) {
        return NextResponse.json(
          { error: 'Session expired' }, 
          { status: 401 }
        )
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icon-192.png (PWA icon)
     * - documents/ (public PDFs - these need special handling)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|documents).*)',
  ],
}
