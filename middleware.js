import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session and get user
  const { data: { session }, error } = await supabase.auth.getSession()

  // Log authentication issues for debugging
  if (error) {
    console.error('Middleware auth error:', error.message)
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
     * - api/webhook (has its own authentication)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-192.png).*)',
  ],
}
