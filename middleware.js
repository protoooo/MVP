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
  
  // Public routes that don't need auth
  const publicRoutes = [
    '/auth', '/terms', '/privacy', '/contact', 
    '/verify-email', '/reset-password', '/accept-terms'
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
  
  // If on root path, check if user needs to complete signup flow
  if (pathname === '/' && user) {
    // Check email verification
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }
    
    // Check terms acceptance
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('accepted_terms, accepted_privacy')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!profile || !profile.accepted_terms || !profile.accepted_privacy) {
      return NextResponse.redirect(new URL('/accept-terms', request.url))
    }
    
    // Check if user has active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()
    
    // If no subscription, redirect to pricing modal (handled by page.js)
    if (!subscription) {
      // Let the page handle showing pricing modal
      return response
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
