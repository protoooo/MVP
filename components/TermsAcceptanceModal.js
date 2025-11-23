'use client'

import { useState } from 'react'

export default function TermsAcceptanceModal({ isOpen, onAccept, onDecline, userEmail }) {
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false)
  const [hasScrolledPrivacy, setHasScrolledPrivacy] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [activeTab, setActiveTab] = useState('terms')

  const handleTermsScroll = (e) => {
    const element = e.target
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 10
    if (isAtBottom) {
      setHasScrolledTerms(true)
    }
  }

  const handlePrivacyScroll = (e) => {
    const element = e.target
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 10
    if (isAtBottom) {
      setHasScrolledPrivacy(true)
    }
  }

  const canAccept = hasScrolledTerms && hasScrolledPrivacy && agreedToTerms && agreedToPrivacy

  if (!isOpen) return null

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Allow clicking outside to close if needed
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflow: 'auto'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '48rem',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1000000,
          margin: '2rem auto'
        }}
      >
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
            Welcome to protocolLM Beta
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Before you start, please review and accept our Terms of Service and Privacy Policy
          </p>
          {userEmail && (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              Account: {userEmail}
            </p>
          )}
        </div>

        {/* Beta Warning Banner */}
        <div style={{ 
          backgroundColor: '#fffbeb', 
          borderTop: '1px solid #fcd34d',
          borderBottom: '1px solid #fcd34d',
          padding: '1rem',
          flexShrink: 0 
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <svg style={{ width: '1.5rem', height: '1.5rem', color: '#d97706', flexShrink: 0, marginTop: '0.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 style={{ fontWeight: 'bold', color: '#78350f', marginBottom: '0.25rem' }}>
                Beta Product Notice
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: '1.5' }}>
                This is a <strong>BETA product</strong>. AI-generated guidance may contain errors. Always verify critical compliance decisions with your local health department or licensed consultant. Not for mission-critical use.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <button
            onClick={() => setActiveTab('terms')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'terms' ? '#0f172a' : '#64748b',
              backgroundColor: activeTab === 'terms' ? '#f8fafc' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'terms' ? '2px solid #0f172a' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Terms of Service {hasScrolledTerms && '✓'}
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'privacy' ? '#0f172a' : '#64748b',
              backgroundColor: activeTab === 'privacy' ? '#f8fafc' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'privacy' ? '2px solid #0f172a' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Privacy Policy {hasScrolledPrivacy && '✓'}
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {activeTab === 'terms' ? (
            <div 
              onScroll={handleTermsScroll}
              style={{
                height: '100%',
                overflowY: 'scroll',
                padding: '1.5rem',
                fontSize: '0.875rem',
                color: '#334155',
                lineHeight: '1.6'
              }}
            >
              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                1. Beta Service Agreement
              </h3>
              <p style={{ marginBottom: '1rem' }}>
                By accessing protocolLM ("the Service"), you acknowledge this is a BETA product under active development. Features may change, and service interruptions may occur.
              </p>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                2. AI Limitations & Disclaimer
              </h3>
              <div style={{ 
                backgroundColor: '#fef2f2', 
                borderLeft: '4px solid #ef4444', 
                padding: '1rem', 
                marginBottom: '1rem' 
              }}>
                <p style={{ fontWeight: 'bold', color: '#7f1d1d', marginBottom: '0.5rem' }}>
                  ⚠️ CRITICAL DISCLAIMER
                </p>
                <p style={{ color: '#991b1b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  AI-generated responses may contain errors, outdated information, or misinterpretations. This service does NOT replace:
                </p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', marginTop: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
                  <li>Official health department guidance</li>
                  <li>Licensed food safety consultants</li>
                  <li>Legal counsel</li>
                  <li>Professional inspection services</li>
                </ul>
                <p style={{ color: '#7f1d1d', fontWeight: 'bold', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  You are solely responsible for verifying all information before making compliance decisions.
                </p>
              </div>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                3. Use of Service
              </h3>
              <p style={{ marginBottom: '0.5rem' }}>You must:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Be at least 18 years old</li>
                <li style={{ marginBottom: '0.5rem' }}>Provide accurate registration information</li>
                <li style={{ marginBottom: '0.5rem' }}>Maintain account security</li>
                <li style={{ marginBottom: '0.5rem' }}>Use the Service only for lawful purposes</li>
                <li style={{ marginBottom: '0.5rem' }}>Verify all AI-generated guidance with official sources</li>
              </ul>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                4. Subscription & Billing
              </h3>
              <p style={{ marginBottom: '0.5rem' }}><strong>30-Day Free Trial:</strong></p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Requires valid payment method</li>
                <li style={{ marginBottom: '0.5rem' }}>Automatic billing after trial ends</li>
                <li style={{ marginBottom: '0.5rem' }}>Cancel anytime during trial to avoid charges</li>
              </ul>
              <p style={{ marginBottom: '0.5rem' }}><strong>Pricing:</strong></p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Pro Plan: $49/month</li>
                <li style={{ marginBottom: '0.5rem' }}>Enterprise Plan: $99/month</li>
                <li style={{ marginBottom: '0.5rem' }}>Prices subject to change with 30 days notice</li>
              </ul>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                5. Cancellation & Refunds
              </h3>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Cancel anytime via account settings</li>
                <li style={{ marginBottom: '0.5rem' }}>Access continues until end of billing period</li>
                <li style={{ marginBottom: '0.5rem' }}>No refunds for partial months</li>
                <li style={{ marginBottom: '0.5rem' }}>Refunds at our discretion for technical failures</li>
              </ul>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                6. Limitation of Liability
              </h3>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
                  PROTOCOLLM IS NOT LIABLE FOR:
                </p>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                  <li style={{ marginBottom: '0.25rem' }}>Health inspection failures or violations</li>
                  <li style={{ marginBottom: '0.25rem' }}>Fines, penalties, or legal fees</li>
                  <li style={{ marginBottom: '0.25rem' }}>Business interruption or lost revenue</li>
                  <li style={{ marginBottom: '0.25rem' }}>Reliance on AI-generated content</li>
                  <li style={{ marginBottom: '0.25rem' }}>Data loss or service interruptions</li>
                  <li style={{ marginBottom: '0.25rem' }}>Any indirect or consequential damages</li>
                </ul>
                <p style={{ fontWeight: 'bold', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                  Maximum liability is limited to fees paid in past 12 months.
                </p>
              </div>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                7. Contact
              </h3>
              <p style={{ marginBottom: '4rem' }}>
                Questions? Email: <a href="mailto:austinrnorthrop@gmail.com" style={{ color: '#2563eb', textDecoration: 'underline' }}>austinrnorthrop@gmail.com</a>
              </p>

              {!hasScrolledTerms && (
                <div style={{
                  position: 'sticky',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, white, white, transparent)',
                  paddingTop: '2rem',
                  paddingBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <svg style={{ width: '1rem', height: '1rem', animation: 'bounce 1s infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    Scroll to bottom to continue
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div 
              onScroll={handlePrivacyScroll}
              style={{
                height: '100%',
                overflowY: 'scroll',
                padding: '1.5rem',
                fontSize: '0.875rem',
                color: '#334155',
                lineHeight: '1.6'
              }}
            >
              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                1. Information We Collect
              </h3>
              <p style={{ marginBottom: '0.5rem' }}>We collect:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>Account Information:</strong> Email, password (encrypted)</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Usage Data:</strong> Queries, uploaded images, chat history</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Payment Information:</strong> Processed by Stripe (we don't store card details)</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Technical Data:</strong> IP address, browser type, device information</li>
              </ul>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                2. How We Use Your Information
              </h3>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Provide and improve the Service</li>
                <li style={{ marginBottom: '0.5rem' }}>Generate AI-powered responses</li>
                <li style={{ marginBottom: '0.5rem' }}>Process payments</li>
                <li style={{ marginBottom: '0.5rem' }}>Send service updates and support messages</li>
                <li style={{ marginBottom: '0.5rem' }}>Analyze usage patterns to improve features</li>
                <li style={{ marginBottom: '0.5rem' }}>Enforce our terms and prevent abuse</li>
              </ul>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                3. Third-Party Services
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>
                    Supabase (Database & Auth)
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>Stores your account and chat data</p>
                  <a href="https://supabase.com/privacy" style={{ color: '#2563eb', fontSize: '0.75rem', textDecoration: 'underline' }} target="_blank" rel="noopener">
                    Privacy Policy
                  </a>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>
                    Google Vertex AI (AI Processing)
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>Processes queries and images (not permanently stored)</p>
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" style={{ color: '#2563eb', fontSize: '0.75rem', textDecoration: 'underline' }} target="_blank" rel="noopener">
                    Privacy Policy
                  </a>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem' }}>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>
                    Stripe (Payment Processing)
                  </p>
                  <p style={{ fontSize: '0.875rem' }}>Handles all payment transactions</p>
                  <a href="https://stripe.com/privacy" style={{ color: '#2563eb', fontSize: '0.75rem', textDecoration: 'underline' }} target="_blank" rel="noopener">
                    Privacy Policy
                  </a>
                </div>
              </div>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                4. Data Retention
              </h3>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Account data: Retained while account is active + 90 days</li>
                <li style={{ marginBottom: '0.5rem' }}>Chat history: Retained while account is active + 90 days</li>
                <li style={{ marginBottom: '0.5rem' }}>Payment records: 7 years (legal requirement)</li>
                <li style={{ marginBottom: '0.5rem' }}>Analytics data: Aggregated and anonymized permanently</li>
              </ul>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                5. Your Rights (GDPR/CCPA)
              </h3>
              <p style={{ marginBottom: '0.5rem' }}>You have the right to:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong>Access:</strong> Request a copy of your data</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Correction:</strong> Update incorrect information</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Deletion:</strong> Request account and data deletion</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Export:</strong> Download your chat history</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Opt-out:</strong> Unsubscribe from emails</li>
              </ul>
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                To exercise these rights, email: <a href="mailto:austinrnorthrop@gmail.com" style={{ color: '#2563eb', textDecoration: 'underline' }}>austinrnorthrop@gmail.com</a>
              </p>

              <h3 style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.75rem', fontSize: '1rem' }}>
                6. Contact
              </h3>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '4rem' }}>
                <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem' }}>
                  Privacy Questions?
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  Email: <a href="mailto:austinrnorthrop@gmail.com" style={{ color: '#2563eb', textDecoration: 'underline' }}>austinrnorthrop@gmail.com</a>
                </p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  protocolLM<br />
                  Michigan, United States
                </p>
              </div>

              {!hasScrolledPrivacy && (
                <div style={{
                  position: 'sticky',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, white, white, transparent)',
                  paddingTop: '2rem',
                  paddingBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <svg style={{ width: '1rem', height: '1rem', animation: 'bounce 1s infinite' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    Scroll to bottom to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checkboxes */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={!hasScrolledTerms}
              style={{
                marginTop: '0.25rem',
                width: '1rem',
                height: '1rem',
                cursor: hasScrolledTerms ? 'pointer' : 'not-allowed',
                opacity: hasScrolledTerms ? 1 : 0.5
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>
              I have read and agree to the <strong>Terms of Service</strong>
              {!hasScrolledTerms && <span style={{ color: '#94a3b8', marginLeft: '0.25rem' }}>(scroll to enable)</span>}
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              disabled={!hasScrolledPrivacy}
              style={{
                marginTop: '0.25rem',
                width: '1rem',
                height: '1rem',
                cursor: hasScrolledPrivacy ? 'pointer' : 'not-allowed',
                opacity: hasScrolledPrivacy ? 1 : 0.5
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>
              I have read and agree to the <strong>Privacy Policy</strong>
              {!hasScrolledPrivacy && <span style={{ color: '#94a3b8', marginLeft: '0.25rem' }}>(scroll to enable)</span>}
            </span>
          </label>
        </div>

        {/* Footer Buttons */}
        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <button
            onClick={onDecline}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              fontWeight: '600',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f1f5f9'}
          >
            Decline
          </button>
          <button
            onClick={canAccept ? onAccept : undefined}
            disabled={!canAccept}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              backgroundColor: canAccept ? '#0f172a' : '#cbd5e1',
              color: 'white',
              fontWeight: '600',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: canAccept ? 'pointer' : 'not-allowed',
              opacity: canAccept ? 1 : 0.5,
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              if (canAccept) e.target.style.backgroundColor = '#1e293b'
            }}
            onMouseOut={(e) => {
              if (canAccept) e.target.style.backgroundColor = '#0f172a'
            }}
          >
            {canAccept ? 'Accept & Continue' : 'Read & Check All'}
          </button>
        </div>
      </div>
    </div>
  )
}
