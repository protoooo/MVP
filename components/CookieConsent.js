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
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-slate-200 shadow-2xl animate-slideUp"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-slate-700 leading-relaxed">
              We use essential cookies to provide authentication and core functionality. 
              By continuing to use protocolLM, you agree to our use of cookies as described in our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline font-medium">
                Privacy Policy
              </a>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={decline}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              aria-label="Decline cookies"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="px-6 py-2 text-sm font-semibold bg-black text-white rounded-lg hover:bg-slate-900 transition-colors"
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
