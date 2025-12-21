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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/accept-terms', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
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

            if (sub && !sub.metadata?.location_hash) {
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

  return (
    <InfoPageLayout
      title="Accept Updated Policies"
      subtitle="To continue using protocolLM, please confirm you have read and agree to our Terms of Service and Privacy Policy."
      eyebrow="Action Required"
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
        <h2 className="info-section-title">What You're Agreeing To</h2>
        <ul>
          <li>protocolLM is a reference tool; human review is required for compliance decisions.</li>
          <li>LLM outputs may be imperfect; always verify with official Washtenaw County guidance.</li>
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
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-1)' }}>
              I have read and agree to the Terms of Service, including the limits of LLM guidance and my 
              responsibility for compliance decisions.
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-1)' }}>
              I acknowledge the Privacy Policy describing data collection, retention, and protection practices.
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            opacity: (agreeTerms && agreePrivacy) ? 1 : 0.5,
            cursor: 'not-allowed'
          }}>
            <input
              type="checkbox"
              checked={agreeTerms && agreePrivacy}
              disabled
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--ink-1)' }}>
              I understand this license is valid for <strong style={{ color: 'var(--ink-0)' }}>one physical location only</strong>. 
              Multiple locations require separate licenses.
            </span>
          </label>

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
            disabled={!agreeTerms || !agreePrivacy || isSubmitting}
            style={{
              width: '100%',
              height: '44px',
              background: (agreeTerms && agreePrivacy) ? 'var(--accent)' : 'var(--bg-3)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (agreeTerms && agreePrivacy && !isSubmitting) ? 'pointer' : 'not-allowed',
              opacity: (agreeTerms && agreePrivacy && !isSubmitting) ? 1 : 0.5,
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
    </InfoPageLayout>
  )
}
