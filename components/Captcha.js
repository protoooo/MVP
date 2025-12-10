'use client'
import { useEffect, useState } from 'react'

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

/**
 * Google reCAPTCHA v3 Component
 * Invisible captcha that runs in background
 */
export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('reCAPTCHA site key not configured')
      return
    }

    // Check if script already loaded
    if (window.grecaptcha) {
      setIsLoaded(true)
      return
    }

    // Load reCAPTCHA script
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      setIsLoaded(true)
    }
    
    script.onerror = () => {
      console.error('Failed to load reCAPTCHA')
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup if needed
      const existingScript = document.querySelector(`script[src*="recaptcha"]`)
      if (existingScript && existingScript === script) {
        document.head.removeChild(script)
      }
    }
  }, [])

  /**
   * Execute reCAPTCHA and get token
   * @param {string} action - Action name (e.g., 'login', 'signup', 'checkout')
   * @returns {Promise<string>} - reCAPTCHA token
   */
  const executeRecaptcha = async (action = 'submit') => {
    if (!isLoaded || !window.grecaptcha) {
      console.warn('reCAPTCHA not loaded yet')
      return null
    }

    try {
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
      return token
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error)
      return null
    }
  }

  return { isLoaded, executeRecaptcha }
}

/**
 * Badge component to show reCAPTCHA notice
 */
export function RecaptchaBadge() {
  return (
    <div className="text-xs text-slate-500 text-center mt-4">
      This site is protected by reCAPTCHA and the Google{' '}
      <a 
        href="https://policies.google.com/privacy" 
        target="_blank" 
        rel="noopener noreferrer"
        className="underline hover:text-slate-700"
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a 
        href="https://policies.google.com/terms" 
        target="_blank" 
        rel="noopener noreferrer"
        className="underline hover:text-slate-700"
      >
        Terms of Service
      </a>{' '}
      apply.
    </div>
  )
}
