// app/register-location/page.js - UPDATED: Light UI with Liquid Glass
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'
import LiquidGlass from '@/components/ui/LiquidGlass'

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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div style={{ color: 'rgba(15, 23, 42, 0.7)', fontSize: '15px', fontWeight: '600' }}>Loading...</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .register-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: transparent;
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
          color: rgba(15, 23, 42, 0.92);
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
          color: #5fa8ff;
          margin-bottom: 12px;
        }

        .register-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          color: rgba(15, 23, 42, 0.92);
        }

        .register-subtitle {
          font-size: 15px;
          color: rgba(30, 41, 59, 0.74);
          margin: 0;
          line-height: 1.6;
        }

        .register-info-box {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .register-info-title {
          font-size: 14px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.92);
          margin: 0 0 12px;
        }

        .register-info-list {
          font-size: 13px;
          color: rgba(30, 41, 59, 0.74);
          line-height: 1.7;
          margin: 0;
          padding-left: 20px;
          list-style: disc;
        }

        .register-warning {
          background: rgba(239, 68, 68, 0.1);
          border-left: 4px solid #ef4444;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .register-warning-title {
          color: #991b1b;
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .register-warning-text {
          color: #991b1b;
          font-size: 14px;
          margin: 0;
          line-height: 1.6;
        }

        .register-alert {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .register-alert.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
        }

        .register-alert.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #16a34a;
        }

        .register-btn {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.92);
          color: #fff;
          border: none;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
          transition: all 0.15s ease;
        }

        .register-btn:hover:not(:disabled) {
          background: rgba(15, 23, 42, 1);
          transform: translateY(-1px);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
        }

        .register-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .register-note {
          margin-top: 20px;
          font-size: 12px;
          color: rgba(100, 116, 139, 0.74);
          text-align: center;
          font-weight: 600;
        }

        .register-note a {
          color: #5fa8ff;
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .register-title {
            font-size: 24px;
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
          <LiquidGlass variant="main" className="register-card">
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
          </LiquidGlass>
        </div>
      </div>
    </>
  )
}
