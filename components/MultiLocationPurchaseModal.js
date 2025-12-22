// components/MultiLocationPurchaseModal.js - COMPLETE with auth check
'use client'

import { useState, useEffect } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { IBM_Plex_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase-browser'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const PRICE_PER_LOCATION = 149

export default function MultiLocationPurchaseModal({ isOpen, onClose }) {
  const [selectedLocations, setSelectedLocations] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  
  const { isLoaded, executeRecaptcha } = useRecaptcha()
  const supabase = createClient()

  // Check authentication when modal opens
  useEffect(() => {
    async function checkAuth() {
      if (!isOpen) {
        setCheckingAuth(true)
        return
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
        
        if (!user) {
          console.log('User not authenticated - will redirect to signup')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        setIsAuthenticated(false)
      } finally {
        setCheckingAuth(false)
      }
    }
    
    checkAuth()
  }, [isOpen, supabase])

  if (!isOpen) return null

  const monthlyPrice = PRICE_PER_LOCATION * selectedLocations

  const handlePurchase = async () => {
    if (loading || !isLoaded) return

    if (!isAuthenticated) {
      // Store intent and redirect to signup
      onClose()
      sessionStorage.setItem('pendingMultiLocationPurchase', 'true')
      sessionStorage.setItem('pendingLocationCount', selectedLocations.toString())
      
      // Trigger auth modal
      window.dispatchEvent(new CustomEvent('openAuthModal', { 
        detail: { mode: 'signup' } 
      }))
      return
    }

    setLoading(true)
    setError('')

    try {
      const captchaToken = await executeRecaptcha('multi_location_purchase')
      
      if (!captchaToken) {
        setError('Security verification failed. Please try again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/purchase-multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationCount: selectedLocations,
          captchaToken
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start purchase')
        setLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        setError('No checkout URL returned')
        setLoading(false)
      }

    } catch (err) {
      console.error('Purchase error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div 
        className="modal-container" 
        style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-card ${ibmMono.className}`} style={{ padding: '32px' }}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
              Multi-Location Setup
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--ink-0)', margin: '0 0 8px' }}>
              Purchase for Multiple Locations
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: 0, lineHeight: '1.5' }}>
              Buy once, distribute access to all your locations
            </p>
          </div>

          {!checkingAuth && !isAuthenticated && (
            <div style={{
              padding: '20px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '16px', fontWeight: '600' }}>
                ℹ️ Create an account to purchase
              </p>
              <button
                onClick={() => {
                  onClose()
                  sessionStorage.setItem('pendingMultiLocationPurchase', 'true')
                  sessionStorage.setItem('pendingLocationCount', selectedLocations.toString())
                  window.dispatchEvent(new CustomEvent('openAuthModal', { 
                    detail: { mode: 'signup' } 
                  }))
                }}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create Account & Continue
              </button>
            </div>
          )}

          {checkingAuth && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: 'var(--ink-2)'
            }}>
              Checking account status...
            </div>
          )}

          {!checkingAuth && isAuthenticated && (
            <>
              {/* Location Selector */}
              <div style={{ 
                background: 'var(--bg-3)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '12px', 
                padding: '20px',
                marginBottom: '20px'
              }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'var(--ink-1)', 
                  marginBottom: '12px' 
                }}>
                  Number of locations
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <button
                    onClick={() => setSelectedLocations(Math.max(2, selectedLocations - 1))}
                    disabled={selectedLocations <= 2}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: selectedLocations <= 2 ? 'var(--bg-2)' : 'var(--accent)',
                      color: selectedLocations <= 2 ? 'var(--ink-3)' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '20px',
                      fontWeight: '600',
                      cursor: selectedLocations <= 2 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    −
                  </button>

                  <div style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '36px',
                    fontWeight: '700',
                    color: 'var(--ink-0)'
                  }}>
                    {selectedLocations}
                  </div>

                  <button
                    onClick={() => setSelectedLocations(Math.min(50, selectedLocations + 1))}
                    disabled={selectedLocations >= 50}
                    style={{
                      width: '40px',
                      height: '40px',
                      background: selectedLocations >= 50 ? 'var(--bg-2)' : 'var(--accent)',
                      color: selectedLocations >= 50 ? 'var(--ink-3)' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '20px',
                      fontWeight: '600',
                      cursor: selectedLocations >= 50 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[2, 3, 5, 10].map(count => (
                    <button
                      key={count}
                      onClick={() => setSelectedLocations(count)}
                      style={{
                        padding: '6px 12px',
                        background: selectedLocations === count ? 'var(--accent)' : 'var(--bg-2)',
                        color: selectedLocations === count ? 'white' : 'var(--ink-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', opacity: 0.8 }}>Monthly Total</div>
                  <div style={{ fontSize: '36px', fontWeight: '700' }}>
                    ${monthlyPrice}
                  </div>
                </div>
                <div style={{ 
                  paddingTop: '12px', 
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '13px',
                  opacity: 0.8
                }}>
                  ${PRICE_PER_LOCATION} × {selectedLocations} location{selectedLocations > 1 ? 's' : ''}
                </div>
              </div>

              {/* Next Steps */}
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid rgba(34, 197, 94, 0.3)', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#22c55e', marginBottom: '8px' }}>
                  What happens next
                </div>
                <ol style={{ fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                  <li>Complete checkout for {selectedLocations} locations</li>
                  <li>Add your location managers' info</li>
                  <li>We email each manager a unique signup link</li>
                  <li>They create their account (no payment needed)</li>
                </ol>
              </div>

              {/* Security Notice */}
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '8px' }}>
                  Security & Compliance
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.6', margin: 0 }}>
                  Each location gets its own secure account. No shared credentials = better security and accurate compliance tracking.
                </p>
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handlePurchase}
                disabled={loading || !isLoaded}
                style={{
                  width: '100%',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: loading || !isLoaded ? 'var(--bg-3)' : 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading || !isLoaded ? 'not-allowed' : 'pointer',
                  opacity: loading || !isLoaded ? 0.5 : 1
                }}
              >
                {loading && (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                )}
                <span>Purchase {selectedLocations} Licenses - ${monthlyPrice}/mo</span>
              </button>

              <p style={{ 
                marginTop: '16px', 
                fontSize: '12px', 
                color: 'var(--ink-2)', 
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                Questions?{' '}
                <a href="mailto:support@protocollm.org" style={{ color: 'var(--accent)' }}>support@protocollm.org</a>
              </p>

              <RecaptchaBadge />
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
