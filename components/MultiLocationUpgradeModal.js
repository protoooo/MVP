// components/MultiLocationUpgradeModal.js - NO DISCOUNTS VERSION
'use client'

import { useState, useEffect } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { IBM_Plex_Mono } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ✅ Simple per-location pricing
const TIER_PRICES = {
  starter: { perLocation: 49, name: 'Starter', model: 'Haiku' },
  pro: { perLocation: 99, name: 'Professional', model: 'Sonnet' },
  enterprise: { perLocation: 199, name: 'Enterprise', model: 'Opus' }
}

export default function MultiLocationUpgradeModal({ 
  isOpen, 
  onClose, 
  currentLocations = 2,
  currentTier = 'pro',
  userId 
}) {
  const [selectedLocations, setSelectedLocations] = useState(currentLocations)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  useEffect(() => {
    if (isOpen) {
      setSelectedLocations(Math.max(2, currentLocations))
    }
  }, [isOpen, currentLocations])

  if (!isOpen) return null

  const tierInfo = TIER_PRICES[currentTier] || TIER_PRICES.pro
  const monthlyPrice = tierInfo.perLocation * selectedLocations

  const handleUpgrade = async () => {
    if (loading || !isLoaded) return

    setLoading(true)
    setError('')

    try {
      const captchaToken = await executeRecaptcha('multi_location_upgrade')
      
      if (!captchaToken) {
        setError('Security verification failed. Please try again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/upgrade-multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationCount: selectedLocations,
          tier: currentTier,
          captchaToken
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to start upgrade')
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
      console.error('Upgrade error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ zIndex: 2000 }}
    >
      <div 
        className="modal-container" 
        style={{ maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-card ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
              Multi-Location Upgrade
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--ink-0)', margin: '0 0 8px' }}>
              Add More Locations
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: 0, lineHeight: '1.5' }}>
              We detected <strong>{currentLocations} locations</strong>. Each location needs its own license.
            </p>
          </div>

          {/* Current Plan Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--ink-1)',
            marginBottom: '20px'
          }}>
            <span style={{ color: 'var(--accent)' }}>●</span>
            {tierInfo.name} ({tierInfo.model})
          </div>

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
              How many locations?
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
                  cursor: selectedLocations <= 2 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
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
                onClick={() => setSelectedLocations(Math.min(10, selectedLocations + 1))}
                disabled={selectedLocations >= 10}
                style={{
                  width: '40px',
                  height: '40px',
                  background: selectedLocations >= 10 ? 'var(--bg-2)' : 'var(--accent)',
                  color: selectedLocations >= 10 ? 'var(--ink-3)' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '20px',
                  fontWeight: '600',
                  cursor: selectedLocations >= 10 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                +
              </button>
            </div>

            {/* Quick select */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[2, 3, 4, 5].map(count => (
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
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
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
              ${tierInfo.perLocation} × {selectedLocations} location{selectedLocations > 1 ? 's' : ''}
            </div>
          </div>

          {/* What's Included */}
          <div style={{ 
            background: 'var(--bg-3)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '8px', 
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: '10px' }}>
              What You Get
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.8' }}>
              <li>Full {tierInfo.model} access at all {selectedLocations} locations</li>
              <li>Unlimited usage per location</li>
              <li>Individual location tracking</li>
              <li>Priority multi-location support</li>
            </ul>
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
            onClick={handleUpgrade}
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
              opacity: loading || !isLoaded ? 0.5 : 1,
              transition: 'all 0.15s ease'
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
            <span>Upgrade to {selectedLocations} Locations - ${monthlyPrice}/mo</span>
          </button>

          <p style={{ 
            marginTop: '16px', 
            fontSize: '12px', 
            color: 'var(--ink-2)', 
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            Billing starts immediately. Cancel anytime.
            <br />
            Questions? Email <a href="mailto:support@protocollm.org" style={{ color: 'var(--accent)' }}>support@protocollm.org</a>
          </p>

          <RecaptchaBadge />
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
