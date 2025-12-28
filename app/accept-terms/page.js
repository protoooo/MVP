// app/accept-terms/page.js - COMPLETE FILE
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InfoPageLayout from '@/components/InfoPageLayout'
import { createClient } from '@/lib/supabase-browser'

export default function AcceptTermsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeLocation, setAgreeLocation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!agreeTerms || !agreePrivacy || !agreeLocation) {
      setError('Please confirm all statements before continuing.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/accept-terms', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        // Handle subscription errors properly
        if (data.code === 'NO_SUBSCRIPTION') {
          setError('Please complete your subscription before accepting terms.')
          setTimeout(() => {
            router.replace('/?showPricing=true')
          }, 2000)
          return
        }

        if (data.code === 'TRIAL_EXPIRED') {
          setError('Your trial has ended. Please subscribe to continue.')
          setTimeout(() => {
            router.replace('/?showPricing=true')
          }, 2000)
          return
        }

        if (data.code === 'SUBSCRIPTION_EXPIRED') {
          setError('Your subscription has expired. Please update your payment method.')
          setTimeout(() => {
            router.replace('/')
          }, 2000)
          return
        }

        setError(data?.error || 'Unable to save your acceptance. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      
      setTimeout(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('metadata')
              .eq('user_id', user.id)
              .in('status', ['active', 'trialing'])
              .maybeSingle()

            if (sub && !(sub.metadata?.device_fingerprint || sub.metadata?.location_hash)) {
              router.replace('/register-location')
              return
            }
          }
        } catch (e) {
          console.error('Location check failed:', e)
        }

        router.replace('/')
      }, 600)
      
    } catch (err) {
      console.error('Accept terms error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)
    setError('')

    try {
      await supabase.auth.signOut()
      router.replace('/auth')
    } catch (err) {
      console.error('Sign out error:', err)
      setError('Unable to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  const AgreementCard = ({ checked, onToggle, children }) => (
    <button
      type="button"
      className="agreement-card"
      data-selected={checked}
      onClick={() => onToggle(!checked)}
      role="checkbox"
      aria-checked={checked}
    >
      <span className="agreement-status" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className="agreement-text">{children}</span>
      <span className="agreement-action">{checked ? 'Selected' : 'Tap to agree'}</span>
    </button>
  )

  const canSubmit = agreeTerms && agreePrivacy && agreeLocation && !isSubmitting

  return (
    <InfoPageLayout
      title="Accept Updated Policies"
      subtitle="To continue using protocolLM, please confirm you have read and agree to our Terms of Service and Privacy Policy."
      eyebrow="Action Required"
      brandSize={96}
      backHref="/auth"
      headerAction={
        <button
          type="button"
          onClick={handleSignOut}
          className="info-action-button"
          disabled={isSigningOut || isSubmitting}
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
      }
    >
      <div className="info-section">
        <h2 className="info-section-title">What You&apos;re Agreeing To</h2>
        <ul>
          <li>protocolLM is a reference tool; human review is required for compliance decisions.</li>
          <li>LLM outputs may be imperfect; always verify with official Michigan guidance.</li>
          <li>Data is protected with encryption, limited retention, and no use for public model training.</li>
          <li>Each license is valid for ONE physical restaurant location only.</li>
        </ul>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ fontSize: '13px', fontWeight: '600' }}>
            View Terms of Service →
          </Link>
          <Link href="/privacy" style={{ fontSize: '13px', fontWeight: '600' }}>
            View Privacy Policy →
          </Link>
        </div>
      </div>

      <div className="info-highlight">
        <div className="info-highlight-title">Why This Matters</div>
        <p>
          We partner with local operators on safety and compliance. Confirming these policies keeps your account 
          active and helps us align with county standards.
        </p>
      </div>

      <div className="info-section">
        <h2 className="info-section-title">Confirm & Continue</h2>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="agreements-grid">
            <AgreementCard checked={agreeTerms} onToggle={setAgreeTerms}>
              I have read and agree to the Terms of Service, including the limits of LLM guidance and my responsibility 
              for compliance decisions.
            </AgreementCard>

            <AgreementCard checked={agreePrivacy} onToggle={setAgreePrivacy}>
              I acknowledge the Privacy Policy describing data collection, retention, and protection practices.
            </AgreementCard>

            <AgreementCard checked={agreeLocation} onToggle={setAgreeLocation}>
              I understand this license is valid for <strong style={{ color: 'var(--ink-0)' }}>one physical location only</strong>. 
              Multiple locations require separate licenses.
            </AgreementCard>
          </div>

          {error && (
            <p style={{ 
              color: '#ef4444', 
              fontSize: '14px', 
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ 
              color: '#22c55e', 
              fontSize: '14px', 
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: 'var(--radius-sm)'
            }}>
              Saved. Redirecting…
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              height: '44px',
              background: canSubmit ? 'var(--accent)' : 'var(--bg-3)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
              transition: 'background 0.15s ease'
            }}
          >
            {isSubmitting ? 'Saving…' : 'Agree and Continue'}
          </button>

          <p style={{ 
            marginTop: '16px', 
            fontSize: '13px', 
            color: 'var(--ink-2)', 
            textAlign: 'center' 
          }}>
            Need help? Email{' '}
            <a href="mailto:support@protocollm.org" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              support@protocollm.org
            </a>
          </p>
        </form>
      </div>

      <style jsx global>{`
        .agreements-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 12px;
        }

        .agreement-card {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--clay);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 12px;
          align-items: center;
          text-align: left;
          color: var(--ink-80);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          cursor: pointer;
        }

        .agreement-card[data-selected="true"] {
          border-color: var(--accent);
          box-shadow: var(--shadow-md);
        }

        .agreement-card:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .agreement-status {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--ink);
          font-weight: 700;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .agreement-card[data-selected="true"] .agreement-status {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }

        .agreement-text {
          font-size: 14px;
          line-height: 1.65;
          color: var(--ink-80);
        }

        .agreement-action {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
          border: 1px solid var(--accent);
          background: rgba(35, 131, 226, 0.1);
          border-radius: 999px;
          padding: 8px 12px;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .agreement-card[data-selected="true"] .agreement-action {
          background: rgba(35, 131, 226, 0.15);
          color: var(--ink);
          border-color: var(--accent);
        }

        @media (max-width: 640px) {
          .agreement-card {
            grid-template-columns: auto 1fr;
            grid-template-rows: auto auto;
          }

          .agreement-action {
            grid-column: 2 / 3;
            justify-self: start;
          }
        }
      `}</style>
    </InfoPageLayout>
  )
}
