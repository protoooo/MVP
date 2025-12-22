// components/MultiLocationPurchaseModal.js - COMPLETE with clear auth flow
'use client'

import { useState, useEffect } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { IBM_Plex_Mono } from 'next/font/google'
import { createClient } from '@/lib/supabase-browser'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const PRICE_PER_LOCATION = 149

export default function MultiLocationPurchaseModal({ isOpen, onClose, initialLocationCount = 2 }) {
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
          console.log('User not authenticated - will show signup flow')
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

  useEffect(() => {
    if (!isOpen) return
    const normalized = Math.min(50, Math.max(2, Number(initialLocationCount) || 2))
    setSelectedLocations(normalized)
  }, [initialLocationCount, isOpen])

  if (!isOpen) return null

  const monthlyPrice = PRICE_PER_LOCATION * selectedLocations

  const handleCreateAccountAndContinue = () => {
    // Store purchase intent
    sessionStorage.setItem('pendingMultiLocationPurchase', 'true')
    sessionStorage.setItem('pendingLocationCount', selectedLocations.toString())
    
    // Close modal and trigger auth
    onClose()
    
    // Trigger auth modal with signup mode
    window.dispatchEvent(new CustomEvent('openAuthModal', { 
      detail: { mode: 'signup' } 
    }))
  }

  const handlePurchase = async () => {
    if (loading || !isLoaded) return

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
              Multi-Location Pricing
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--ink-0)', margin: '0 0 8px' }}>
              Buy for All Your Locations
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: 0, lineHeight: '1.5' }}>
              One payment covers all locations. Each gets its own secure account.
            </p>
          </div>

          {checkingAuth && (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--ink-2)'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--bg-3)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite'
              }} />
              Checking account status...
            </div>
          )}

          {/* NOT AUTHENTICATED - Show clear signup flow */}
          {!checkingAuth && !isAuthenticated && (
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
                    type="button"
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
                    type="button"
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
                      type="button"
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

              {/* CLEAR CALL TO ACTION - Create Account First */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid var(--accent)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--ink-0)',
                  marginBottom: '12px'
                }}>
                  Step 1: Create Your Account
                </div>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--ink-1)',
                  lineHeight: '1.6',
                  margin: '0 0 20px 0'
                }}>
                  First, create your owner account. After signup, we reopen checkout with your {selectedLocations}-location selection so you can finish in one click.
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: '10px',
                  color: 'var(--ink-0)',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>We save your location count and trigger checkout automatically after signup.</span>
                </div>
                <button
                  type="button"
                  onClick={handleCreateAccountAndContinue}
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Create Account & Continue</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* What Happens Next */}
              <div style={{ 
                background: 'var(--bg-3)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
                  The Next Steps
                </div>
                <ol style={{ fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                  <li>Create your owner account (we reopen checkout instantly with your saved count)</li>
                  <li>Verify your email</li>
                  <li>Complete checkout for {selectedLocations} locations (${monthlyPrice}/month)</li>
                  <li>Add your location managers and we'll send them signup links</li>
                </ol>
              </div>

              {/* Already have account? */}
              <p style={{ 
                marginTop: '16px', 
                fontSize: '13px', 
                color: 'var(--ink-2)', 
                textAlign: 'center'
              }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('pendingMultiLocationPurchase', 'true')
                    sessionStorage.setItem('pendingLocationCount', selectedLocations.toString())
                    onClose()
                    window.dispatchEvent(new CustomEvent('openAuthModal', { 
                      detail: { mode: 'signin' } 
                    }))
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Sign in to continue
                </button>
              </p>
            </>
          )}

          {/* AUTHENTICATED - Direct to purchase */}
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
                    type="button"
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
                    type="button"
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
                      type="button"
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
                type="button"
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
