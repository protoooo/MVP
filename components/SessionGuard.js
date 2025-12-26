// components/SessionGuard.js - FIXED: logout goes to landing page (prevents /auth redirect race)
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '@/lib/supabaseConfig'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.error(`[SessionGuard] ${missingSupabaseConfigMessage}`)
      return
    }

    if (typeof window === 'undefined') return

    // ✅ Ensure CSRF token is loaded before allowing requests
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

    // ✅ Block requests until CSRF token is ready
    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const [url, options = {}] = args

      const isApiRequest = typeof url === 'string' && url.startsWith('/api/')
      const isSameOrigin = typeof url === 'string' && !url.startsWith('http')
      const isUnsafeMethod =
        options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())

      if ((isApiRequest || isSameOrigin) && isUnsafeMethod) {
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
      }

      return originalFetch.apply(this, [url, options])
    }

    const refreshSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        // ✅ Public paths
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

        // ✅ If user intentionally logged out, always go home (prevents /auth race)
        if (!user || error) {
          if (window.__intentionalSignOut) {
            window.__intentionalSignOut = false
            if (window.location.pathname !== '/') {
              window.location.href = '/'
            }
            return
          }

          // Session expired: only redirect if we're on a protected route (not public, not home)
          if (!isPublicPage && window.location.pathname !== '/') {
            console.error('[SessionGuard] Session expired - redirecting to auth')
            window.location.href = '/auth?session_expired=true'
            return
          }
          return
        }

        // ✅ Session valid - refresh token
        const { error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error('[SessionGuard] Session refresh failed:', refreshError)

          // Handle refresh token rotation
          if (refreshError.message?.includes('refresh_token')) {
            const {
              data: { session: newSession },
            } = await supabase.auth.getSession()

            if (newSession) {
              injectCSRFToken()
              return
            }
          }

          if (!isPublicPage && window.location.pathname !== '/') {
            window.location.href = '/auth?session_error=true'
          }
          return
        }

        injectCSRFToken()
      } catch (err) {
        console.error('[SessionGuard] Session refresh exception:', err)

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

        if (window.__intentionalSignOut) {
          window.__intentionalSignOut = false
          if (window.location.pathname !== '/') window.location.href = '/'
          return
        }

        if (!isPublicPage && window.location.pathname !== '/') {
          window.location.href = '/auth?session_error=true'
        }
      }
    }

    refreshSession()
    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log('[SessionGuard] User signed out')

        // ✅ mark logout as intentional so refreshSession won't send to /auth
        window.__intentionalSignOut = true

        delete window.__csrfToken

        if (window.location.pathname !== '/') {
          window.location.href = '/'
        }
      } else if (event === 'TOKEN_REFRESHED') {
        injectCSRFToken()
      } else if (event === 'SIGNED_IN') {
        injectCSRFToken()
      }
    })

    const handleVisibilityChange = () => {
      if (!document.hidden) refreshSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      subscription?.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (window.fetch !== originalFetch) window.fetch = originalFetch
    }
  }, [supabase, router])

  return null
}
