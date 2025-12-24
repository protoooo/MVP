'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700'] })

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
    document.documentElement.dataset.view = 'chat'
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
          --bg-0: #09090b;
          --bg-1: #0c0c0e;
          --bg-2: #131316;
          --bg-3: #1a1a1f;

          --ink-0: #fafafa;
          --ink-1: #a0a0a8;
          --ink-2: #636369;
          --ink-3: #3f3f46;

          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --accent-dim: rgba(59, 130, 246, 0.1);

          --border-subtle: rgba(255, 255, 255, 0.05);
          --border-default: rgba(255, 255, 255, 0.08);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
        }

        html, body {
          height: 100%;
          margin: 0;
          background: var(--bg-0);
          color: var(--ink-0);
        }

        .reset-page {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg-0);
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
          color: var(--ink-0);
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
          color: var(--ink-1);
          text-decoration: none;
        }

        .reset-back:hover {
          color: var(--ink-0);
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
          max-width: 420px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 32px;
        }

        .reset-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .reset-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
          color: var(--ink-0);
        }

        .reset-subtitle {
          font-size: 14px;
          color: var(--ink-1);
          margin: 0;
        }

        .reset-alert {
          padding: 16px;
          border-radius: var(--radius-sm);
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.6;
          text-align: center;
        }

        .reset-alert.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .reset-alert.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #6ee7b7;
        }

        .reset-alert.loading {
          background: var(--bg-3);
          border: 1px solid var(--border-subtle);
          color: var(--ink-1);
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
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--ink-1);
        }

        .form-input-group {
          position: relative;
        }

        .form-input {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          background: var(--bg-3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 14px;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .form-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--ink-2);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .form-toggle:hover {
          color: var(--ink-0);
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
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 4px;
        }

        .reset-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .reset-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          border-top: 1px solid var(--border-subtle);
          text-align: center;
        }

        .reset-link {
          font-size: 13px;
          color: var(--ink-2);
          text-decoration: underline;
          cursor: pointer;
        }

        .reset-link:hover {
          color: var(--ink-0);
        }

        @media (max-width: 768px) {
          .reset-card {
            padding: 24px;
          }

          .reset-brand-mark {
            width: 40px;
            height: 40px;
          }

          .reset-brand-text {
            font-size: 15px;
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
          <div className="reset-card">
            <div className="reset-header">
              <h1 className="reset-title">Reset Your Password</h1>
              <p className="reset-subtitle">Choose a new password to secure your account.</p>
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
                  Your password has been reset successfully! You can now sign in with your new password.
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
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
