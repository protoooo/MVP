import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

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

  // CSRF Protection - SIMPLIFIED FOR PRODUCTION
  // Only generate tokens on GET, don't validate on POST (for now)
  if (req.method === 'GET' && !req.cookies.get('csrf-token')) {
    const token = Math.random().toString(36).substring(2, 15)
    res.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/'
    })
  }

  // NOTE: CSRF validation is temporarily disabled in production
  // Re-enable once app is stable on Railway

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
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|documents).*)',
  ],
}
