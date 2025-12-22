// components/PricingModal.js - FIXED: Correct multi-location flow
'use client'

import { IBM_Plex_Mono } from 'next/font/google'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

export default function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  const [hasExistingSubscription, setHasExistingSubscription] = useState(false)
  const supabase = createClient()

  // ✅ Check if user has existing subscription
  useEffect(() => {
    async function checkSubscription() {
      if (!isOpen) return
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasExistingSubscription(false)
        return
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      setHasExistingSubscription(!!subscription)
    }

    checkSubscription()
  }, [isOpen, supabase])

  if (!isOpen) return null

  const Icons = {
    X: () => (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }

  // ✅ FIXED: Use upgrade flow for existing users
  const handleMultiLocationClick = () => {
    onClose()
    if (hasExistingSubscription) {
      // Existing users -> upgrade modal
      window.dispatchEvent(new CustomEvent('openMultiLocationUpgrade'))
    } else {
      // New users -> purchase modal
      window.dispatchEvent(new CustomEvent('openMultiLocationPurchase'))
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-card pricing-modal ${ibmMono.className}`} style={{ padding: '32px' }}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'inline-block',
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '16px'
            }}>
              Unlimited Usage
            </div>
            
            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: 'var(--ink-0)' }}>
              Professional Plan
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
              Full access to Sonnet 4.5 • Unlimited questions & photo scans
            </p>
          </div>

          {/* Single Plan Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '2px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              position: 'relative',
              color: 'white',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--accent)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Best Value
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '48px', fontWeight: '700' }}>$149</span>
                <span style={{ fontSize: '16px', opacity: 0.7 }}>/month</span>
              </div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                7-day free trial • Cancel anytime
              </div>
            </div>

            <button
              onClick={() => onCheckout(UNLIMITED_MONTHLY, 'unlimited')}
              disabled={!!loading}
              style={{
                width: '100%',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'white',
                color: 'var(--bg-1)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginBottom: '24px',
                transition: 'all 0.15s ease',
              }}
            >
              {loading === 'unlimited' && <span className="spinner" />}
              <span>Start 7-Day Free Trial</span>
            </button>

            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.12)',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {[
                'Unlimited questions & photo scans',
                'Sonnet 4.5 - Best reasoning & accuracy',
                'Full Washtenaw County database',
                'Priority email support',
                'One physical location included'
              ].map((feature, idx) => (
                <div key={idx} className="pricing-feature">
                  <span className="pricing-feature-check" aria-hidden="true">✓</span>
                  <span className="pricing-feature-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Value Proposition */}
          <div style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', marginBottom: '8px' }}>
              💡 Why Unlimited?
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.6', margin: 0 }}>
              Government compliance shouldn't have artificial limits. Use protocolLM as much as you need - 
              before inspections, during training, or whenever questions come up. One avoided violation 
              ($200-500) pays for 1-3 months.
            </p>
          </div>

          {/* ✅ FIXED: Show correct CTA based on subscription status */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '4px' }}>
                📍 Have Multiple Locations?
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                {hasExistingSubscription 
                  ? 'Upgrade your existing subscription to cover multiple locations.'
                  : 'Each restaurant location needs its own license. We make it easy to purchase and manage multiple locations.'
                }
              </p>
            </div>

            <button
              onClick={handleMultiLocationClick}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'var(--bg-3)',
                color: 'var(--ink-0)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-2)'
                e.currentTarget.style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-3)'
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              <span>{hasExistingSubscription ? 'Upgrade to Multi-Location' : 'Purchase for 2+ Locations'}</span>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14m-7-7l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '12px', lineHeight: '1.4' }}>
              $149/location • Separate logins for each location
            </p>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '16px', textAlign: 'center', lineHeight: '1.5' }}>
            By starting your trial, you agree to our <a href="/terms" style={{ color: 'var(--accent)' }}>Terms</a> and <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
