// components/Captcha.js - SECURITY FIX: Stricter CAPTCHA enforcement
'use client'
import { useEffect, useState, useRef } from 'react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false)
  const didAttachListenersRef = useRef(false)

  useEffect(() => {
    // ✅ SECURITY: In production, CAPTCHA is mandatory
    if (process.env.NODE_ENV === 'production' && !TURNSTILE_SITE_KEY) {
      console.error('CRITICAL: Turnstile not configured in production')
      setIsLoaded(false) // Never mark as loaded in prod without key
      return
    }

    if (!TURNSTILE_SITE_KEY) {
      console.warn('Turnstile site key not configured (development mode)')
      setIsLoaded(true) // Allow bypass in dev
      return
    }

    if (typeof window === 'undefined') {
      setIsLoaded(true)
      return
    }

    if (window.turnstile) {
      setIsLoaded(true)
      return
    }

    const existingScript = document.querySelector(`script[src="${TURNSTILE_SRC}"]`)

    const handleLoad = () => setIsLoaded(true)
    const handleError = () => {
      console.error('Failed to load Turnstile')
      // ✅ SECURITY: In production, stay blocked if script fails
      if (process.env.NODE_ENV === 'production') {
        setIsLoaded(false)
      } else {
        setIsLoaded(true)
      }
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad)
      existingScript.addEventListener('error', handleError)
      didAttachListenersRef.current = true

      setTimeout(() => {
        if (window.turnstile) setIsLoaded(true)
      }, 0)

      return () => {
        existingScript.removeEventListener('load', handleLoad)
        existingScript.removeEventListener('error', handleError)
      }
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SRC
    script.async = true
    script.defer = true
    script.onload = handleLoad
    script.onerror = handleError
    document.head.appendChild(script)

    return () => {
      if (!didAttachListenersRef.current) {
        script.onload = null
        script.onerror = null
      }
    }
  }, [])

  const executeRecaptcha = async (action = 'submit') => {
    const markUnavailable = (reason) => {
      console.error('Turnstile unavailable', { reason, action })
      return 'turnstile_unavailable'
    }

    // ✅ SECURITY FIX: Explicitly handle production vs development
    if (process.env.NODE_ENV === 'production') {
      if (!isLoaded || typeof window === 'undefined' || !window.turnstile || !TURNSTILE_SITE_KEY) {
        return markUnavailable('widget_not_loaded')
      }
    } else {
      // Development mode: allow bypass if Turnstile not configured
      if (!isLoaded || typeof window === 'undefined' || !window.turnstile || !TURNSTILE_SITE_KEY) {
        console.warn('CAPTCHA bypassed in development mode')
        return 'dev_bypass_token'
      }
    }

    return new Promise((resolve) => {
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.width = '1px'
      container.style.height = '1px'
      container.style.opacity = '0'
      container.style.pointerEvents = 'none'
      container.style.left = '-9999px'
      container.style.top = '-9999px'
      document.body.appendChild(container)

      let widgetId = null
      let done = false

      const cleanup = () => {
        if (done) return
        done = true
        try {
          if (widgetId !== null && window.turnstile?.remove) window.turnstile.remove(widgetId)
        } catch {}
        try {
          container.remove()
        } catch {}
      }

      const timeout = setTimeout(() => {
        cleanup()
        resolve(markUnavailable('timeout'))
      }, 15000)

      try {
        widgetId = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          callback: (token) => {
            clearTimeout(timeout)
            cleanup()
            resolve(token)
          },
          'error-callback': () => {
            clearTimeout(timeout)
            cleanup()
            resolve(markUnavailable('widget_error'))
          },
          'expired-callback': () => {
            clearTimeout(timeout)
            cleanup()
            resolve(markUnavailable('widget_expired'))
          },
        })
      } catch (err) {
        clearTimeout(timeout)
        cleanup()
        resolve(markUnavailable(err?.message || 'render_exception'))
      }
    })
  }

  return { isLoaded, executeRecaptcha }
}

export function RecaptchaBadge() {
  return (
    <div className="text-xs text-slate-500 text-center mt-4">
      This site is protected by Cloudflare Turnstile
    </div>
  )
}
