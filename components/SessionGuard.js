// components/SessionGuard.js - DISABLED for local testing (no authentication required)
'use client'
import { useEffect } from 'react'

export default function SessionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[SessionGuard] DISABLED - No authentication required for local testing')

    // ✅ Inject a dummy CSRF token to satisfy any CSRF checks
    const injectCSRFToken = () => {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='))
        ?.split('=')[1]

      if (csrfToken && !window.__csrfToken) {
        window.__csrfToken = csrfToken
        console.log('[SessionGuard] CSRF token loaded from cookie (auth disabled)')
      }

      return true
    }

    // ✅ Inject CSRF token into fetch requests (but no auth validation)
    const originalFetch = window.fetch
    window.fetch = async function (...args) {
      const [url, options = {}] = args

      const isApiRequest = typeof url === 'string' && url.startsWith('/api/')
      const isSameOrigin = typeof url === 'string' && !url.startsWith('http')
      const isUnsafeMethod =
        options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())

      if ((isApiRequest || isSameOrigin) && isUnsafeMethod) {
        injectCSRFToken()
        if (window.__csrfToken) {
          options.headers = {
            ...options.headers,
            'X-CSRF-Token': window.__csrfToken,
          }
        }
      }

      return originalFetch.apply(this, [url, options])
    }

    injectCSRFToken()

    return () => {
      if (window.fetch !== originalFetch) window.fetch = originalFetch
    }
  }, [])

  return null
}
