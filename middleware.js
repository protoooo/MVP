import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  let res = NextResponse.next({
    request: {
      headers: req.headers
    }
  })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          req.cookies.set({
            name,
            value,
            ...options
          })
          res = NextResponse.next({
            request: {
              headers: req.headers
            }
          })
          res.cookies.set({
            name,
            value,
            ...options
          })
        },
        remove(name, options) {
          req.cookies.set({
            name,
            value: '',
            ...options
          })
          res = NextResponse.next({
            request: {
              headers: req.headers
            }
          })
          res.cookies.set({
            name,
            value: '',
            ...options
          })
        }
      }
    }
  )

  // Refresh session if needed
  const { data: { session } } = await supabase.auth.getSession()

  // Protected routes
  const protectedRoutes = ['/documents', '/api/chat', '/api/create-checkout-session', '/api/create-portal-session']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
