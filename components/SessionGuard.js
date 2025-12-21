// components/SessionGuard.js - Enterprise-safe: CSRF header injection without client-side hard blocking
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    const readCSRFTokenFromCookie = () => {
      try {
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('csrf-token='))
          ?.split('=')[1]
        return token || null
      } catch {
        return null
      }
    }

    const injectCSRFToken = () => {
      const csrfToken = readCSRFTokenFromCookie()

      if (!csrfToken) {
        console.warn('[SessionGuard] No CSRF token found in document.cookie')
        return false
      }

      if (!window.__csrfToken) {
        window.__csrfToken = csrfToken
        console.log('[SessionGuard] CSRF token loaded from cookie')
      }

      return true
    }

    const ensureCSRFToken = async () => {
      if (window.__csrfToken) return true
      if (injectCSRFToken()) return true

      // Light retry to handle “cookie set after first response” timing on Safari/iOS
      for (let i = 0; i < 6; i++) {
        await sleep(50 * (i + 1))
        if (injectCSRFToken()) return true
      }
      return false
    }

    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const [url, options = {}] = args

      const isApiRequest = typeof url === 'string' && url.startsWith('/api/')
      const isSameOrigin = typeof url === 'string' && !url.startsWith('http')
      const method = (options.method || 'GET').toUpperCase()
      const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method)

      // Only apply CSRF header to unsafe same-origin/api requests
      if ((isApiRequest || isSameOrigin) && isUnsafeMethod) {
        if (!window.__csrfToken) {
          await ensureCSRFToken()
        }

        // ✅ Enterprise-safe behavior:
        // - If token exists, attach it.
        // - If token does NOT exist, do NOT throw here.
        //   Let the server enforce CSRF and emit logs + requestId.
        if (window.__csrfToken) {
          options.headers = {
            ...options.headers,
            'X-CSRF-Token': window.__csrfToken,
          }
          console.log('[SessionGuard] CSRF token added to request:', url)
        } else {
          console.warn('[SessionGuard] CSRF token still unavailable; sending request without header:', url)
        }
      }

      return originalFetch.apply(this, [url, options])
    }

    const refreshSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        const publicPaths = [
          '/auth',
          '/terms',
          '/privacy',
          '/contact',
          '/verify-email',
          '/reset-password',
          '/accept-terms',
          '/register-location',
        ]
        const isPublicPage = publicPaths.some((path) => window.location.pathname.startsWith(path))

        if (error || !user) {
          if (!isPublicPage && window.location.pathname !== '/') {
            console.error('[SessionGuard] Session expired - redirecting to auth')
            window.location.href = '/auth?session_expired=true'
            return
          }
          return
        }

        const { error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error('[SessionGuard] Session refresh failed:', refreshError)

          if (refreshError.message?.includes('refresh_token')) {
            console.log('[SessionGuard] Token rotation detected - re-authenticating')

            const {
              data: { session: newSession },
            } = await supabase.auth.getSession()

            if (newSession) {
              console.log('[SessionGuard] Session recovered after token rotation')
              await ensureCSRFToken()
              return
            }
          }

          if (!isPublicPage && window.location.pathname !== '/') {
            window.location.href = '/auth?session_error=true'
          }
          return
        }

        console.log('[SessionGuard] Session refreshed successfully')
        await ensureCSRFToken()
      } catch (error) {
        console.error('[SessionGuard] Session refresh exception:', error)

        const publicPaths = [
          '/auth',
          '/terms',
          '/privacy',
          '/contact',
          '/verify-email',
          '/reset-password',
          '/accept-terms',
          '/register-location',
        ]
        const isPublicPage = publicPaths.some((path) => window.location.pathname.startsWith(path))

        if (!isPublicPage && window.location.pathname !== '/') {
          window.location.href = '/auth?session_error=true'
        }
      }
    }

    refreshSession()
    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        console.log('[SessionGuard] User signed out')
        delete window.__csrfToken
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth'
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[SessionGuard] Token refreshed')
        await ensureCSRFToken()
      } else if (event === 'SIGNED_IN') {
        console.log('[SessionGuard] User signed in')
        await ensureCSRFToken()
      }
    })

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[SessionGuard] Page became visible - refreshing session')
        refreshSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      subscription?.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (window.fetch !== originalFetch) {
        window.fetch = originalFetch
      }
    }
  }, [supabase, router])

  return null
}
