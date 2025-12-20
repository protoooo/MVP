'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { IBM_Plex_Mono } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

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

      // Sign out the recovery session
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
          --bg-0: #0e0e11;
          --bg-1: #121218;
          --bg-2: #15151a;
          --ink-0: #f2f2f2;
          --ink-1: #d9d9df;
          --ink-2: #b9b9c4;
          --line-0: #24242d;
          --line-1: #2a2a32;
          --line-2: #3a3a42;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: var(--bg-0);
          color: var(--ink-0);
          height: 100%;
          overflow-x: hidden;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
          pointer-events: none;
        }

        .reset-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          padding-left: max(24px, env(safe-area-inset-left));
          padding-right: max(24px, env(safe-area-inset-right));
          background: var(--bg-0);
        }

        .reset-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-1);
          border: 1px solid var(--line-1);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.55);
        }

        .reset-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .reset-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
          color: var(--ink-0);
        }

        .reset-subtitle {
          font-size: 13px;
          color: var(--ink-1);
          line-height: 1.55;
          margin: 0;
        }

        .reset-status {
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--ink-1);
          text-align: center;
        }

        .reset-alert {
          padding: 12px 14px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 13px;
          line-height: 1.5;
          text-align: center;
        }

        .reset-alert.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
        }

        .reset-alert.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #6ee7b7;
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
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-2);
          font-weight: 600;
        }

        .form-input-group {
          position: relative;
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: #1a1a20;
          border: 1px solid var(--line-1);
          border-radius: 10px;
          color: var(--ink-0);
          font-size: 14px;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }

        .form-input::placeholder {
          color: rgba(217, 217, 223, 0.45);
        }

        .form-input:focus {
          border-color: #34343c;
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
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          font-weight: 600;
        }

        .form-toggle:hover {
          color: var(--ink-0);
        }

        .reset-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 44px;
          background: #2a2a32;
          color: var(--ink-0);
          border: 1px solid #34343c;
          border-radius: 10px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .reset-btn:hover:not(:disabled) {
          background: #34343c;
          transform: translateY(-1px);
        }

        .reset-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-top-color: rgba(255, 255, 255, 0.8);
          border-radius: 999px;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .reset-footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--line-1);
          display: flex;
          justify-content: center;
        }

        .reset-link {
          background: none;
          border: none;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: var(--ink-2);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .reset-link:hover {
          color: var(--ink-0);
        }

        @media (max-width: 480px) {
          .reset-card {
            padding: 22px 18px;
          }
        }
      `}</style>

      <div className={`${ibmMono.className} reset-page`}>
        <div className="reset-card">
          <div className="reset-header">
            <h1 className="reset-title">Reset your password</h1>
            <p className="reset-subtitle">Choose a new password to secure your account.</p>
          </div>

          {verifying && !fatalError && (
            <div className="reset-status">
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
                <label className="form-label">New password</label>
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
                <label className="form-label">Confirm password</label>
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
                <span>{loading ? 'Updating…' : 'Update password'}</span>
              </button>
            </form>
          )}

          {success && (
            <>
              <div className="reset-alert success">
                Your password has been reset successfully! You can now sign in with your new password.
              </div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="reset-btn"
              >
                Go to sign in
              </button>
            </>
          )}

          <div className="reset-footer">
            <button
              type="button"
              onClick={handleBackHome}
              className="reset-link"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
