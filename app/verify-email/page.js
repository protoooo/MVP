// app/verify-email/page.js - Notion-inspired flat UI
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

export default function VerifyEmailPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.view = 'landing'
    }
  }, [])

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      if (user.email_confirmed_at) {
        console.log('✅ Email already verified, redirecting to pricing')
        router.push('/?showPricing=true&emailVerified=true')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const handleResend = async () => {
    setResending(true)
    setMessage('')

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (!res.ok) {
        setMessageType('error')
        setMessage(data.error || 'Failed to send verification email')
      } else {
        setMessageType('success')
        setMessage('Verification email sent! Check your inbox and spam folder.')
      }
    } catch (error) {
      setMessageType('error')
      setMessage('An unexpected error occurred')
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div style={{ color: 'var(--ink-60)', fontSize: '15px', fontWeight: '600' }}>Loading…</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .verify-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--paper);
          display: flex;
          flex-direction: column;
        }

        .verify-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .verify-brand {
          color: var(--ink);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .verify-brand:hover { opacity: 0.7; }

        .verify-brand-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .verify-brand-mark {
          width: 48px;
          height: 48px;
        }

        .verify-brand-text {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--ink);
        }

        .verify-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .verify-card {
          width: 100%;
          max-width: 500px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          padding: 32px;
        }

        .verify-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .verify-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: var(--radius-md);
          background: rgba(35, 131, 226, 0.1);
          border: 1px solid rgba(35, 131, 226, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }

        .verify-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--ink);
          margin: 0 0 8px;
        }

        .verify-subtitle {
          font-size: 14px;
          color: var(--ink-60);
          margin: 0 0 8px;
          font-weight: 600;
        }

        .verify-email {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 24px;
        }

        .verify-message {
          margin-bottom: 16px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          text-align: center;
        }

        .verify-message.error {
          background: rgba(212, 76, 71, 0.1);
          border: 1px solid rgba(212, 76, 71, 0.2);
          color: var(--accent-red);
        }

        .verify-message.success {
          background: rgba(15, 123, 108, 0.1);
          border: 1px solid rgba(15, 123, 108, 0.2);
          color: var(--accent-green);
        }

        .verify-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .verify-step {
          padding: 16px;
          background: var(--clay);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .verify-step-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .verify-step-content {
          flex: 1;
        }

        .verify-step-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 4px;
        }

        .verify-step-text {
          font-size: 13px;
          color: var(--ink-60);
          margin: 0;
          line-height: 1.5;
        }

        .verify-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .verify-btn {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .verify-btn-primary {
          background: var(--accent);
          color: #fff;
          border: none;
          box-shadow: var(--shadow-sm);
        }

        .verify-btn-primary:hover:not(:disabled) {
          opacity: 0.9;
        }

        .verify-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .verify-btn-secondary {
          background: var(--surface);
          color: var(--ink-80);
          border: 1px solid var(--border);
        }

        .verify-btn-secondary:hover {
          background: var(--clay);
        }

        .verify-note {
          margin-top: 16px;
          text-align: center;
          font-size: 12px;
          color: var(--ink-40);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .verify-brand-mark {
            width: 40px;
            height: 40px;
          }

          .verify-brand-text {
            font-size: 15px;
          }

          .verify-title {
            font-size: 24px;
          }

          .verify-icon {
            width: 56px;
            height: 56px;
          }

          .verify-card {
            padding: 24px;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className} verify-page`}>
        <header className="verify-topbar">
          <Link href="/" className="verify-brand">
            <span className="verify-brand-inner">
              <span className="verify-brand-mark">
                <Image src={appleIcon} alt="" width={64} height={64} priority />
              </span>
              <span className="verify-brand-text">protocolLM</span>
            </span>
          </Link>
        </header>

        <div className="verify-content">
          <div className="verify-card">
            <div className="verify-header">
              <div className="verify-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h1 className="verify-title">Verify Your Email</h1>
              
              <p className="verify-subtitle">
                We sent a verification link to:
              </p>
              
              <p className="verify-email">
                {user?.email}
              </p>
            </div>

            {message && (
              <div className={`verify-message ${messageType}`}>
                {message}
              </div>
            )}

            <div className="verify-steps">
              <div className="verify-step">
                <div className="verify-step-icon">📧</div>
                <div className="verify-step-content">
                  <div className="verify-step-title">Check your email</div>
                  <div className="verify-step-text">
                    Click the verification link to activate your account and get started.
                  </div>
                </div>
              </div>

              <div className="verify-step">
                <div className="verify-step-icon">📂</div>
                <div className="verify-step-content">
                  <div className="verify-step-title">Check spam folder</div>
                  <div className="verify-step-text">
                    If you don't see it in your inbox, check your spam or junk folder.
                  </div>
                </div>
              </div>
            </div>

            <div className="verify-actions">
              <button
                onClick={handleResend}
                disabled={resending}
                className="verify-btn verify-btn-primary"
              >
                {resending ? 'Sending…' : 'Resend Verification Email'}
              </button>

              <button
                onClick={handleSignOut}
                className="verify-btn verify-btn-secondary"
              >
                Sign Out
              </button>
            </div>

            <p className="verify-note">
             After verifying, you'll be able to purchase inspection reports ($149 each)
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
