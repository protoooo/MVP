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
      <div className="modal-container pricing-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card pricing-modal glass-surface ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="pricing-header">
            <h2 className="pricing-title">Unlimited Plan</h2>
          </div>

          <div className="pricing-card-shell">
            <div className="pricing-price-block">
              <div className="pricing-price">
                <span className="pricing-price-figure">$50</span>
                <span className="pricing-price-period">/month</span>
              </div>
              <div className="pricing-subtitle">7-day free trial • Cancel anytime</div>
            </div>

            <button
              onClick={() => onCheckout(UNLIMITED_MONTHLY, 'unlimited')}
              disabled={!!loading}
              className="pricing-cta"
              type="button"
            >
              {loading === 'unlimited' && <span className="spinner" />}
              <span>Start 7-Day Free Trial</span>
            </button>

            <div className="pricing-features">
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
          <div className="pricing-note">
            <div className="pricing-note-title">💡 Why Unlimited?</div>
            <p className="pricing-note-text">
              Government compliance shouldn't have artificial limits. Use protocolLM as much as you need -
              before inspections, during training, or whenever questions come up. One avoided violation
              ($200-500) pays for 1-3 months.
            </p>
          </div>

          <p className="pricing-legal">
            By starting your trial, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
