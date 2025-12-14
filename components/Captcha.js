'use client'
import { useEffect, useState, useRef } from 'react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false)
  const didAttachListenersRef = useRef(false)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      console.warn('Turnstile site key not configured')
      setIsLoaded(true)
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
      setIsLoaded(true)
    }

    if (existingScript) {
      // If script already exists, just listen for it (don’t remove it on cleanup)
      existingScript.addEventListener('load', handleLoad)
      existingScript.addEventListener('error', handleError)
      didAttachListenersRef.current = true

      // If it’s already loaded but window.turnstile not set yet, give it a tick
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

    // ✅ IMPORTANT: do NOT remove the script on unmount.
    // AuthModal mount/unmount would nuke Turnstile for checkout later.
    return () => {
      if (!didAttachListenersRef.current) {
        script.onload = null
        script.onerror = null
      }
    }
  }, [])

  const executeRecaptcha = async (action = 'submit') => {
    if (!isLoaded || !window.turnstile || !TURNSTILE_SITE_KEY) {
      console.warn('Turnstile not available')
      return 'turnstile_unavailable'
    }

    return new Promise((resolve, reject) => {
      // Invisible container
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
        reject(new Error('Turnstile timeout'))
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
            reject(new Error('Turnstile challenge failed'))
          },
          'expired-callback': () => {
            clearTimeout(timeout)
            cleanup()
            reject(new Error('Turnstile challenge expired'))
          },
        })
      } catch (err) {
        clearTimeout(timeout)
        cleanup()
        reject(err)
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
