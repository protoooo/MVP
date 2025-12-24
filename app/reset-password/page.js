// app/reset-password/page.js - UPDATED: Light UI with Liquid Glass
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

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [verifying, setVerifying] = useState(true)
  const [fatalError, setFatalError] = useState('')
  const [formError, setFormError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = 'landing'
  }, [])

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const tokenHash = params.get('token_hash')
        const type = params.get('type')

        if (!tokenHash || type !== 'recovery') {
          setFatalError('Invalid or expired reset link. Please request a new password reset.')
          setVerifying(false)
          return
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })

        if (error) {
          console.error('verifyOtp error:', error)
          setFatalError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        console.error('verifyOtp exception:', err)
        setFatalError('Failed to verify reset link. Please try again.')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [supabase])

  const handleBackHome = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut error (back home):', e)
    }
    router.push('/')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setFormError('')

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.error('updateUser error:', error)
        setFormError(error.message || 'Failed to update password.')
        setLoading(false)
        return
      }

      try {
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.error('signOut after reset error:', signOutErr)
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      console.error('Reset password exception:', err)
      setFormError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-0: rgba(5, 7, 13, 0.72);
          --bg-1: rgba(7, 10, 18, 0.78);
          --bg-2: rgba(9, 13, 22, 0.82);
          --bg-3: rgba(255, 255, 255, 0.1);

          --ink-0: #f6f9ff;
          --ink-1: rgba(240, 244, 255, 0.86);
          --ink-2: rgba(214, 222, 240, 0.76);
          --ink-3: rgba(178, 190, 215, 0.6);

          --accent: #5fa8ff;
          --accent-hover: #7bc2ff;
          --accent-dim: rgba(95, 168, 255, 0.2);

          --border-subtle: rgba(255, 255, 255, 0.18);
          --border-default: rgba(255, 255, 255, 0.32);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
        }

        html, body {
          height: 100%;
          margin: 0;
          background: transparent;
          color: var(--ink-0);
        }

        .reset-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: transparent;
          display: flex;
          flex-direction: column;
        }

        .reset-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .reset-brand {
          color: rgba(15, 23, 42, 0.92);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .reset-brand:hover { opacity: 0.7; }

        .reset-brand-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .reset-brand-mark {
          width: 48px;
          height: 48px;
        }

        .reset-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .reset-brand-text {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .reset-back {
          font-size: 13px;
          color: rgba(15, 23, 42, 0.72);
          text-decoration: none;
          font-weight: 600;
        }

        .reset-back:hover {
          color: rgba(15, 23, 42, 0.92);
        }

        .reset-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .reset-card {
          width: 100%;
          max-width: 480px;
        }

        .reset-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .reset-eyebrow {
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

        .reset-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          color: rgba(15, 23, 42, 0.92);
        }

        .reset-subtitle {
          font-size: 15px;
          color: rgba(30, 41, 59, 0.74);
          margin: 0;
          line-height: 1.6;
        }

        .reset-alert {
          padding: 16px;
          border-radius: var(--radius-sm);
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.6;
          text-align: center;
          font-weight: 600;
        }

        .reset-alert.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
        }

        .reset-alert.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #16a34a;
        }

        .reset-alert.loading {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(15, 23, 42, 0.12);
          color: rgba(15, 23, 42, 0.72);
        }

        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: rgba(15, 23, 42, 0.7);
        }

        .form-input-group {
          position: relative;
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 12px;
          color: rgba(15, 23, 42, 0.92);
          font-size: 14px;
          font-weight: 600;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(95, 168, 255, 0.12);
        }

        .form-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(15, 23, 42, 0.72);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .form-toggle:hover {
          color: rgba(15, 23, 42, 0.92);
        }

        .reset-btn {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(95, 168, 255, 0.24);
          transition: background 0.15s ease, transform 0.12s ease;
          margin-top: 4px;
        }

        .reset-btn:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 16px 40px rgba(95, 168, 255, 0.28);
        }

        .reset-btn:active:not(:disabled) {
          transform: translateY(0px);
        }

        .reset-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .reset-footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(15, 23, 42, 0.12);
          text-align: center;
        }

        .reset-link {
          font-size: 13px;
          color: rgba(15, 23, 42, 0.72);
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
        }

        .reset-link:hover {
          color: rgba(15, 23, 42, 0.92);
        }

        @media (max-width: 768px) {
          .reset-card {
            max-width: 100%;
          }

          .reset-brand-mark {
            width: 40px;
            height: 40px;
          }

          .reset-brand-text {
            font-size: 15px;
          }

          .reset-title {
            font-size: 24px;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className} reset-page`}>
        <header className="reset-topbar">
          <Link href="/" className="reset-brand">
            <span className="reset-brand-inner">
              <span className="reset-brand-mark">
                <Image src={appleIcon} alt="" width={64} height={64} priority />
              </span>
              <span className="reset-brand-text">protocolLM</span>
            </span>
          </Link>
          <button onClick={handleBackHome} className="reset-back">
            ← Back
          </button>
        </header>

        <div className="reset-content">
          <LiquidGlass variant="main" className="reset-card">
            <div className="reset-header">
              <div className="reset-eyebrow">Password Reset</div>
              <h1 className="reset-title">Set New Password</h1>
              <p className="reset-subtitle">Choose a strong password to secure your account.</p>
            </div>

            {verifying && !fatalError && (
              <div className="reset-alert loading">
                Verifying your reset link…
              </div>
            )}

            {fatalError && (
              <div className="reset-alert error">
                {fatalError}
              </div>
            )}

            {!verifying && !fatalError && !success && (
              <form onSubmit={handleSubmit} className="reset-form">
                {formError && (
                  <div className="reset-alert error">
                    {formError}
                  </div>
                )}

                <div className="form-field">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Confirm Password</label>
                  <div className="form-input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="form-input"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="form-toggle"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="reset-btn"
                >
                  {loading && <span className="btn-spinner" />}
                  <span>{loading ? 'Updating…' : 'Update Password'}</span>
                </button>
              </form>
            )}

            {success && (
              <>
                <div className="reset-alert success">
                  ✓ Your password has been reset successfully! You can now sign in with your new password.
                </div>
                <button
                  onClick={() => router.push('/')}
                  className="reset-btn"
                >
                  Go to Sign In
                </button>
              </>
            )}

            <div className="reset-footer">
              <button onClick={handleBackHome} className="reset-link">
                ← Back to home
              </button>
            </div>
          </LiquidGlass>
        </div>
      </div>
    </>
  )
}
