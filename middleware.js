import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Get the current session
  const { data: { session }, error } = await supabase.auth.getSession()

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

  // Additional verification for API routes (except webhook)
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
