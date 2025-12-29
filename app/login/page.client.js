'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700'] })

export default function LoginPageClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usePasswordLogin, setUsePasswordLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const captchaToken = await executeRecaptcha('signin')
      
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
        setMessage('Security verification failed. Please allow Cloudflare Turnstile and try again.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(`Error: ${data.error || 'Login failed'}`)
        setLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      setMessage('Error: An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const captchaToken = await executeRecaptcha('login')
      
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
        setMessage('Security verification failed. Please allow Cloudflare Turnstile and try again.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(`Error: ${data.error || 'Failed to send login link'}`)
        setLoading(false)
        return
      }

      setMessage('✓ Check your email for the secure login link.')
    } catch (error) {
      console.error('Login error:', error)
      setMessage('Error: An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        .auth-page {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--paper);
        }

        .auth-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .auth-brand {
          color: var(--ink);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .auth-brand:hover { opacity: 0.7; }

        .auth-brand-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .auth-brand-mark {
          width: 48px;
          height: 48px;
        }

        .auth-brand-text {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .auth-back {
          font-size: 13px;
          color: var(--ink-60);
          text-decoration: none;
          font-weight: 600;
        }

        .auth-back:hover {
          color: var(--ink);
        }

        .auth-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          padding: 32px;
          text-align: center;
        }

        .auth-title {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0 0 10px;
        }

        .auth-subtitle {
          font-size: 14px;
          line-height: 1.5;
          color: var(--ink-60);
          margin: 0 0 25px;
        }

        .auth-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 16px;
          color: var(--ink);
          background: var(--surface);
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .auth-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--focus-ring);
        }

        .auth-btn {
          width: 100%;
          height: 44px;
          font-size: 14px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, opacity 0.15s ease;
        }

        .auth-btn:hover:not(:disabled) {
          opacity: 0.9;
        }

        .auth-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-btn-secondary {
          width: 100%;
          height: 44px;
          font-size: 14px;
          background: transparent;
          color: var(--accent);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 12px;
        }

        .auth-btn-secondary:hover:not(:disabled) {
          background: var(--surface-hover);
        }

        .auth-message {
          margin-top: 16px;
          font-size: 13px;
          padding: 10px;
          border-radius: var(--radius-sm);
        }

        .auth-message.error {
          color: var(--accent-red);
          background: rgba(212, 76, 71, 0.1);
          border: 1px solid rgba(212, 76, 71, 0.2);
        }

        .auth-message.success {
          color: var(--accent-green);
          background: rgba(15, 123, 108, 0.1);
          border: 1px solid rgba(15, 123, 108, 0.2);
        }

        .auth-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          text-align: center;
        }

        .auth-footer-text {
          font-size: 13px;
          color: var(--ink-60);
          margin-bottom: 8px;
        }

        .auth-footer-link {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }

        .auth-footer-link:hover {
          text-decoration: underline;
        }

        .auth-toggle {
          margin-top: 12px;
          font-size: 13px;
        }

        .auth-toggle-btn {
          background: none;
          border: none;
          color: var(--accent);
          cursor: pointer;
          font-weight: 600;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .auth-brand-mark {
            width: 40px;
            height: 40px;
          }

          .auth-brand-text {
            font-size: 15px;
          }

          .auth-card {
            padding: 24px;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className} auth-page`}>
        <header className="auth-topbar">
          <Link href="/" className="auth-brand">
            <span className="auth-brand-inner">
              <span className="auth-brand-mark">
                <Image src={appleIcon} alt="" width={48} height={48} priority />
              </span>
              <span className="auth-brand-text">protocolLM</span>
            </span>
          </Link>
          <Link href="/" className="auth-back">
            ← Back
          </Link>
        </header>

        <div className="auth-content">
          <div className="auth-card">
            <h1 className="auth-title">Sign in</h1>
            <p className="auth-subtitle">
              Access food safety compliance resources for Michigan restaurants.
            </p>
            
            {usePasswordLogin ? (
              <form onSubmit={handlePasswordLogin}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="auth-input"
                />
                
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="auth-input"
                />
                
                <button 
                  type="submit" 
                  disabled={loading || !isLoaded}
                  className="auth-btn"
                >
                  {loading ? 'Signing in...' : !isLoaded ? 'Loading...' : 'Sign In'}
                </button>

                <div className="auth-toggle">
                  <button
                    type="button"
                    onClick={() => setUsePasswordLogin(false)}
                    className="auth-toggle-btn"
                  >
                    Use magic link instead
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleMagicLink}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="auth-input"
                />
                
                <button 
                  type="submit" 
                  disabled={loading || !isLoaded}
                  className="auth-btn"
                >
                  {loading ? 'Sending...' : !isLoaded ? 'Loading...' : 'Send Magic Link'}
                </button>

                <div className="auth-toggle">
                  <button
                    type="button"
                    onClick={() => setUsePasswordLogin(true)}
                    className="auth-toggle-btn"
                  >
                    Use password instead
                  </button>
                </div>
              </form>
            )}

            {message && (
              <p className={`auth-message ${message.includes('Error') ? 'error' : 'success'}`}>
                {message}
              </p>
            )}

            <RecaptchaBadge />

            <div className="auth-footer">
              <div className="auth-footer-text">
                Don't have an account?{' '}
                <Link href="/signup" className="auth-footer-link">
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
