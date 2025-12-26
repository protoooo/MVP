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
      <div 
        className="pointer-events-auto w-full max-w-4xl px-5 sm:px-8 py-4 sm:py-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-80)' }}>
              We use essential cookies to provide authentication and core functionality. By continuing to use
              protocolLM, you agree to our use of cookies as described in our{' '}
              <a href="/privacy" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'underline' }}>
                Privacy Policy
              </a>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={decline}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--ink-60)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Decline cookies"
            >
              Decline
            </button>
            <button
              onClick={accept}
              style={{
                padding: '8px 24px',
                fontSize: '14px',
                fontWeight: '600',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer'
              }}
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
