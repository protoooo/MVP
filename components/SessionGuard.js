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

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    // ✅ FIXED: Ensure CSRF token is loaded before allowing requests
    const injectCSRFToken = () => {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='))
        ?.split('=')[1]

      if (!csrfToken) {
        console.warn('[SessionGuard] No CSRF token found in cookies')
        return false
      }

      if (!window.__csrfToken) {
        window.__csrfToken = csrfToken
        console.log('[SessionGuard] CSRF token loaded from cookie')
      }

      return true
    }

    // ✅ NEW: Retry a few times to avoid timing issues on initial load (Safari/iOS can be finicky)
    const ensureCSRFToken = async () => {
      if (window.__csrfToken) return true

      // Try immediately first
      if (injectCSRFToken()) return true

      // Retry with short backoff
      for (let i = 0; i < 6; i++) {
        await sleep(50 * (i + 1))
        if (injectCSRFToken()) return true
      }

      return false
    }

    // ✅ UPDATED: Block requests until CSRF token is ready
    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const [url, options = {}] = args

      const isApiRequest = typeof url === 'string' && url.startsWith('/api/')
      const isSameOrigin = typeof url === 'string' && !url.startsWith('http')
      const method = (options.method || 'GET').toUpperCase()
      const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method)

      if ((isApiRequest || isSameOrigin) && isUnsafeMethod) {
        if (!window.__csrfToken) {
          console.warn('[SessionGuard] CSRF token not ready - loading now')
          const loaded = await ensureCSRFToken()

          if (!loaded) {
            console.error('[SessionGuard] Failed to load CSRF token - blocking request')
            throw new Error('Security token unavailable. Please hard refresh the page and try again.')
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

            const {
              data: { session: newSession },
            } = await supabase.auth.getSession()

            if (newSession) {
              console.log('[SessionGuard] Session recovered after token rotation')
              await ensureCSRFToken()
              return
            }
          }

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

        // ✅ NEW: Ensure CSRF token is available after session refresh
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

    // ✅ FIXED: Refresh immediately on mount, then every 5 minutes
    refreshSession()

    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    // ✅ Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('[SessionGuard] User signed out')
        delete window.__csrfToken

        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth'
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[SessionGuard] Token refreshed')
        await ensureCSRFToken()
      } else if (event === 'USER_UPDATED') {
        console.log('[SessionGuard] User updated')
      } else if (event === 'SIGNED_IN') {
        console.log('[SessionGuard] User signed in')
        await ensureCSRFToken()
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
