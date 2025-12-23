'use client'
import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie_consent')
    
    // If no consent recorded, show banner after 1 second (better UX)
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem('cookie_consent', 'accepted')
      localStorage.setItem('cookie_consent_date', new Date().toISOString())
      setShow(false)
    } catch (err) {
      console.error('Failed to save cookie consent:', err)
      // Still hide banner even if storage fails
      setShow(false)
    }
  }

  const decline = () => {
    try {
      localStorage.setItem('cookie_consent', 'declined')
      localStorage.setItem('cookie_consent_date', new Date().toISOString())
      setShow(false)
    } catch (err) {
      console.error('Failed to save cookie consent:', err)
      setShow(false)
    }
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center px-4 pb-6 pointer-events-none animate-slideUp"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="pointer-events-auto glass-surface w-full max-w-4xl border border-white/25 shadow-[0_18px_60px_rgba(5,7,13,0.42)] px-5 sm:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-slate-100/85">
              We use essential cookies to provide authentication and core functionality. By continuing to use
              protocolLM, you agree to our use of cookies as described in our{' '}
              <a href="/privacy" className="text-sky-200 hover:text-white font-semibold underline decoration-white/40">
                Privacy Policy
              </a>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={decline}
              className="px-4 py-2 text-sm font-semibold text-slate-100/85 hover:text-white transition-colors"
              aria-label="Decline cookies"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="px-6 py-2 text-sm font-semibold bg-gradient-to-r from-sky-400/90 to-blue-500/90 text-slate-900 rounded-full shadow-[0_10px_30px_rgba(95,168,255,0.35)] hover:from-sky-300 hover:to-blue-400 transition-colors"
              aria-label="Accept cookies"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
