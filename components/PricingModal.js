// components/PricingModal.js - Single device-based plan
'use client'

import { IBM_Plex_Mono } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

export default function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  const Icons = {
    X: () => (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-card pricing-modal glass-surface ${ibmMono.className}`} style={{ padding: '32px' }}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: 'var(--ink-0)' }}>
              Unlimited Plan
            </h2>
          </div>

          {/* Single Plan Card */}
          <div
            style={{
              background: 'linear-gradient(140deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08))',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.48), 0 24px 72px rgba(5, 7, 13, 0.4)',
              backdropFilter: 'blur(14px) saturate(125%)',
              WebkitBackdropFilter: 'blur(14px) saturate(125%)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              color: 'var(--ink-0)',
              marginBottom: '24px'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '48px', fontWeight: '700' }}>$50</span>
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
                background: 'linear-gradient(120deg, #7bc2ff, #5fa8ff)',
                color: '#05070d',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                borderRadius: '9999px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                marginBottom: '24px',
                transition: 'all 0.15s ease',
                boxShadow: '0 12px 36px rgba(95, 168, 255, 0.32)',
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
                'Unlimited questions and photo scans',
                'Cohere-powered responses for maximum privacy and security',
                'Full Washtenaw County database',
                'Email support',
                'One registered device per license'
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
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08))',
            border: '1px solid rgba(255, 255, 255, 0.26)',
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

          <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '16px', textAlign: 'center', lineHeight: '1.5' }}>
            By starting your trial, you agree to our <a href="/terms" style={{ color: 'var(--accent)' }}>Terms</a> and <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
