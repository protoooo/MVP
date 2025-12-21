// components/SessionGuard.js - FIXED: Immediate refresh on mount + CSRF token injection (race-condition safe)
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // ✅ FIXED: Ensure CSRF token is loaded before allowing requests
    const injectCSRFToken = () => {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='))
        ?.split('=')[1]

      if (!csrfToken) {
        console.warn('[SessionGuard] No CSRF token found in cookies')
        return false // ✅ Return false to indicate failure
      }

      if (!window.__csrfToken) {
        window.__csrfToken = csrfToken
        console.log('[SessionGuard] CSRF token loaded from cookie')
      }

      return true // ✅ Return true to indicate success
    }

    // ✅ UPDATED: Block requests until CSRF token is ready
    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const [url, options = {}] = args

      const isApiRequest = typeof url === 'string' && url.startsWith('/api/')
      const isSameOrigin = typeof url === 'string' && !url.startsWith('http')
      const isUnsafeMethod =
        options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())

      if ((isApiRequest || isSameOrigin) && isUnsafeMethod) {
        // ✅ NEW: Wait for CSRF token if not yet loaded
        if (!window.__csrfToken) {
          console.warn('[SessionGuard] CSRF token not ready - loading now')
          const loaded = injectCSRFToken()

          if (!loaded) {
            console.error('[SessionGuard] Failed to load CSRF token - blocking request')
            throw new Error('CSRF token unavailable - please refresh the page')
          }
        }

        options.headers = {
          ...options.headers,
          'X-CSRF-Token': window.__csrfToken,
        }

        console.log('[SessionGuard] CSRF token added to request:', url)
      }

      return originalFetch.apply(this, [url, options])
    }

    const refreshSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        // ✅ FIXED: Complete public paths list
        if (error || !user) {
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
            console.error('[SessionGuard] Session expired - redirecting to auth')
            window.location.href = '/auth?session_expired=true'
            return
          }
          return
        }

        // ✅ Session valid - refresh token
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error('[SessionGuard] Session refresh failed:', refreshError)

          // ✅ FIXED: Handle refresh token rotation
          if (refreshError.message?.includes('refresh_token')) {
            console.log('[SessionGuard] Token rotation detected - re-authenticating')

            // Try to get session again (Supabase will use new token if available)
            const {
              data: { session: newSession },
            } = await supabase.auth.getSession()

            if (newSession) {
              console.log('[SessionGuard] Session recovered after token rotation')
              injectCSRFToken()
              return
            }
          }

          // Only redirect if we're on a protected route
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
          return
        }

        console.log('[SessionGuard] Session refreshed successfully')

        // ✅ NEW: Inject CSRF token into requests after session refresh
        injectCSRFToken()
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

    // ✅ FIXED: Refresh immediately on mount, then every 5 minutes
    refreshSession()

    // Refresh every 5 minutes
    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    // ✅ Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('[SessionGuard] User signed out')
        // Clear CSRF token
        delete window.__csrfToken

        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth'
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[SessionGuard] Token refreshed')
        // Reload CSRF token
        injectCSRFToken()
      } else if (event === 'USER_UPDATED') {
        console.log('[SessionGuard] User updated')
      } else if (event === 'SIGNED_IN') {
        console.log('[SessionGuard] User signed in')
        // Inject CSRF token for new session
        injectCSRFToken()
      }
    })

    // ✅ NEW: Refresh on page visibility change (when user returns to tab)
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

      // ✅ Restore original fetch (cleanup)
      if (window.fetch !== originalFetch) {
        window.fetch = originalFetch
      }
    }
  }, [supabase, router])

  return null
}
