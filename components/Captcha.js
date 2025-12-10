'use client'
import { useEffect, useState, useRef } from 'react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      console.warn('Turnstile site key not configured')
      setIsLoaded(true)
      return
    }

    if (window.turnstile) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      setIsLoaded(true)
    }
    
    script.onerror = () => {
      console.error('Failed to load Turnstile')
      setIsLoaded(true)
    }

    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src*="turnstile"]`)
      if (existingScript) {
        document.head.removeChild(existingScript)
      }
    }
  }, [])

  const executeRecaptcha = async (action = 'submit') => {
    if (!isLoaded || !window.turnstile || !TURNSTILE_SITE_KEY) {
      console.warn('Turnstile not available')
      return 'turnstile_unavailable'
    }

    return new Promise((resolve, reject) => {
      try {
        // Create invisible container
        const container = document.createElement('div')
        container.style.display = 'none'
        document.body.appendChild(container)

        window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            document.body.removeChild(container)
            resolve(token)
          },
          'error-callback': () => {
            document.body.removeChild(container)
            reject(new Error('Turnstile challenge failed'))
          },
        })
      } catch (error) {
        console.error('Turnstile execution error:', error)
        reject(error)
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
