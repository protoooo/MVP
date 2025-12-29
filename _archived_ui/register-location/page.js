// app/register-location/page.js - Notion-inspired flat UI
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

export default function RegisterLocationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = 'landing'
  }, [])

  useEffect(() => {
    async function checkAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth')
          return
        }

        // Check if already registered
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('metadata')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        if (subscription?.metadata?.device_fingerprint || subscription?.metadata?.location_hash) {
          // Already registered - go to chat
          router.push('/')
          return
        }

        setLoading(false)
      } catch (err) {
        console.error('Access check failed:', err)
        setError('Failed to verify access')
        setLoading(false)
      }
    }

    checkAccess()
  }, [supabase, router])

  const handleRegister = async () => {
    if (registering) return

    setRegistering(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      const res = await fetch('/api/register-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to register device')
        return
      }

      setSuccess(true)
      
      setTimeout(() => {
        router.push('/')
      }, 1500)

    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div style={{ color: 'var(--ink-60)', fontSize: '15px', fontWeight: '600' }}>Loading...</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .register-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--paper);
          display: flex;
          flex-direction: column;
        }

        .register-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .register-brand {
          color: var(--ink);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .register-brand:hover { opacity: 0.7; }

        .register-brand-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .register-brand-mark {
          width: 48px;
          height: 48px;
        }

        .register-brand-text {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--ink);
        }

        .register-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .register-card {
          width: 100%;
          max-width: 500px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          padding: 32px;
        }

        .register-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .register-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 12px;
        }

        .register-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          color: var(--ink);
        }

        .register-subtitle {
          font-size: 15px;
          color: var(--ink-60);
          margin: 0;
          line-height: 1.6;
        }

        .register-info-box {
          background: var(--clay);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 20px;
          margin-bottom: 24px;
        }

        .register-info-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 12px;
        }

        .register-info-list {
          font-size: 13px;
          color: var(--ink-60);
          line-height: 1.7;
          margin: 0;
          padding-left: 20px;
          list-style: disc;
        }

        .register-warning {
          background: rgba(212, 76, 71, 0.08);
          border: 1px solid rgba(212, 76, 71, 0.2);
          border-left: 3px solid var(--accent-red);
          border-radius: var(--radius-sm);
          padding: 16px;
          margin-bottom: 24px;
        }

        .register-warning-title {
          color: var(--accent-red);
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .register-warning-text {
          color: var(--accent-red);
          font-size: 14px;
          margin: 0;
          line-height: 1.6;
        }

        .register-alert {
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .register-alert.error {
          background: rgba(212, 76, 71, 0.1);
          border: 1px solid rgba(212, 76, 71, 0.2);
          color: var(--accent-red);
        }

        .register-alert.success {
          background: rgba(15, 123, 108, 0.1);
          border: 1px solid rgba(15, 123, 108, 0.2);
          color: var(--accent-green);
        }

        .register-btn {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
          transition: all 0.15s ease;
        }

        .register-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .register-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .register-note {
          margin-top: 20px;
          font-size: 12px;
          color: var(--ink-40);
          text-align: center;
          font-weight: 600;
        }

        .register-note a {
          color: var(--accent);
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .register-title {
            font-size: 24px;
          }

          .register-card {
            padding: 24px;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className} register-page`}>
        <header className="register-topbar">
          <Link href="/" className="register-brand">
            <span className="register-brand-inner">
              <span className="register-brand-mark">
                <Image src={appleIcon} alt="" width={64} height={64} priority />
              </span>
              <span className="register-brand-text">protocolLM</span>
            </span>
          </Link>
        </header>

        <div className="register-content">
          <div className="register-card">
            <div className="register-header">
              <div className="register-eyebrow">One More Step</div>
              <h1 className="register-title">Register Your Device</h1>
              <p className="register-subtitle">
                Each protocolLM license is valid for <strong>one device</strong>. 
                We'll register the device you are using right now to activate your account.
              </p>
            </div>

            <div className="register-info-box">
              <h3 className="register-info-title">
                📍 What We Track
              </h3>
              <ul className="register-info-list">
                <li>Your network prefix and browser fingerprint</li>
                <li>Used to prevent license sharing across multiple devices</li>
                <li>One license = One device</li>
              </ul>
            </div>

            <div className="register-warning">
              <p className="register-warning-title">
                ⚠️ Important: One Account Per Location
              </p>
              <p className="register-warning-text">
                Each signup link is for <strong>one physical location only</strong>. Do not share credentials across locations. Each location manager must create their own account using their unique link.
              </p>
            </div>

            {error && (
              <div className="register-alert error">
                {error}
              </div>
            )}

            {success && (
              <div className="register-alert success">
                ✓ Device registered! Redirecting to chat...
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={registering || success}
              className="register-btn"
            >
              {registering ? 'Registering...' : success ? 'Redirecting...' : 'Register This Device'}
            </button>

            <p className="register-note">
              Questions? Email{' '}
              <a href="mailto:support@protocollm.org">
                support@protocollm.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
