'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

const Icons = {
  Camera: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Zap: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  FileText: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Clock: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
}

const LandingPage = ({ onShowPricing, theme }) => {
  const isDark = theme === 'dark'

  return (
    <div className="w-full relative z-10 min-h-full flex flex-col">
      {/* Hero */}
      <section className="relative py-14 md:py-20">
        {/* subtle grid background */}
        <div
          className={`
            pointer-events-none absolute inset-0 -z-10 opacity-40
            ${isDark ? 'bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)]' : 'bg-slate-50'}
          `}
        >
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),transparent_60%)]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          {/* Text column */}
          <div className="space-y-6">
            <p
              className={`text-[11px] tracking-[0.24em] uppercase ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              } ${inter.className}`}
            >
              Washtenaw County · Food code index
            </p>
            <h1
              className={`text-3xl md:text-[2.4rem] font-semibold tracking-tight leading-tight ${
                outfit.className
              } ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
            >
              Food-safety rules, indexed like a database.
            </h1>
            <p
              className={`text-sm md:text-[0.95rem] max-w-xl leading-relaxed ${
                inter.className
              } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
            >
              ProtocolLM structures the Michigan Food Code, Modified Food Code, and
              Washtenaw County enforcement documents so your staff can query them
              in plain language or by section.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={onShowPricing}
                className={`
                  btn-press inline-flex items-center justify-center rounded-full px-7 py-3.5
                  text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors
                  ${isDark ? 'bg-slate-50 text-slate-900 hover:bg-white'
                          : 'bg-slate-900 text-slate-50 hover:bg-black'}
                `}
              >
                Start free demo
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-[11px] font-medium">
              <div
                className={`rounded-full px-3 py-1 border ${
                  isDark
                    ? 'border-slate-700 text-slate-300 bg-slate-900/60'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                ~2,000+ pages indexed
              </div>
              <div
                className={`rounded-full px-3 py-1 border ${
                  isDark
                    ? 'border-slate-700 text-slate-300 bg-slate-900/60'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                Focused on Washtenaw County food service
              </div>
            </div>
          </div>

          {/* “Database” / console card */}
          <div className="relative">
            <div
              className={`
                rounded-3xl border shadow-[0_24px_80px_rgba(15,23,42,0.35)]
                overflow-hidden
                ${
                  isDark
                    ? 'border-slate-800 bg-[#020617]'
                    : 'border-slate-200 bg-white'
                }
              `}
            >
              {/* top status bar */}
              <div
                className={`
                  flex items-center justify-between px-4 py-3 text-[11px] font-medium border-b
                  ${isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isDark ? 'bg-emerald-400' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="uppercase tracking-[0.18em]">
                    inspection view
                  </span>
                </div>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  source: mi &amp; washtenaw code
                </span>
              </div>

              {/* fake table */}
              <div className="px-4 pt-3 pb-4">
                <div
                  className={`
                    mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em]
                    ${isDark ? 'text-slate-400' : 'text-slate-500'}
                  `}
                >
                  <span>recent queries</span>
                  <span>violations (preview)</span>
                </div>

                <div
                  className={`
                    rounded-xl border text-xs font-mono overflow-hidden
                    ${
                      isDark
                        ? 'border-slate-800 bg-slate-950/60'
                        : 'border-slate-200 bg-slate-50'
                    }
                  `}
                >
                  <div
                    className={`
                      grid grid-cols-[1.4fr,1.2fr,0.8fr] gap-3 px-3 py-2 border-b
                      ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}
                    `}
                  >
                    <span>Question</span>
                    <span>System summary</span>
                    <span className="text-right">Code</span>
                  </div>

                  {/* row 1 */}
                  <div
                    className={`
                      grid grid-cols-[1.4fr,1.2fr,0.8fr] gap-3 px-3 py-2
                      ${isDark ? 'text-slate-200' : 'text-slate-800'}
                    `}
                  >
                    <span>cooler · raw chicken over lettuce?</span>
                    <span>storage requires RTE above raw poultry</span>
                    <span className="text-right">3-302.11</span>
                  </div>

                  {/* row 2 */}
                  <div
                    className={`
                      grid grid-cols-[1.4fr,1.2fr,0.8fr] gap-3 px-3 py-2
                      ${isDark ? 'bg-slate-900/60 text-slate-200' : 'bg-white text-slate-800'}
                    `}
                  >
                    <span>line · holding temp on queso 124°F</span>
                    <span>below hot-hold minimum, mark as priority</span>
                    <span className="text-right">3-501.16</span>
                  </div>

                  {/* row 3 */}
                  <div
                    className={`
                      grid grid-cols-[1.4fr,1.2fr,0.8fr] gap-3 px-3 py-2
                      ${isDark ? 'text-slate-200' : 'text-slate-800'}
                    `}
                  >
                    <span>3-comp sink · sanitizer change frequency</span>
                    <span>change when < 200 ppm or every 4 hrs</span>
                    <span className="text-right">4-501.114</span>
                  </div>
                </div>

                {/* sources card */}
                <div
                  className={`
                    mt-4 rounded-xl border px-3 py-3 text-[11px] leading-relaxed
                    ${
                      isDark
                        ? 'border-slate-800 bg-slate-950/80 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-600'
                    }
                  `}
                >
                  <div className="mb-1 font-semibold uppercase tracking-[0.18em]">
                    Loaded sources
                  </div>
                  <ul className="space-y-1">
                    <li>• Michigan Food Code (2022)</li>
                    <li>• Michigan Modified Food Code</li>
                    <li>• Washtenaw County enforcement actions</li>
                    <li>• USDA minimum cooking temperatures</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-16 md:pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            className={`text-base md:text-lg font-semibold text-center mb-10 tracking-tight ${
              outfit.className
            } ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {[
              {
                icon: <Icons.Camera />,
                title: '1. Capture or ask',
                body: 'Take a photo of a station or type a question about a procedure, temp, or setup.',
              },
              {
                icon: <Icons.Zap />,
                title: '2. Match to the rules',
                body: 'The system searches the indexed codes and local guidance instead of open web results.',
              },
              {
                icon: <Icons.FileText />,
                title: '3. Act and verify',
                body: 'You see a short answer plus the exact section, so staff and managers can confirm quickly.',
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`
                  group relative rounded-2xl border p-7 transition-all duration-200
                  ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                      : 'border-slate-200 bg-white hover:border-slate-900/70'
                  }
                `}
              >
                <div
                  className={`
                    mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border
                    ${
                      isDark
                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }
                  `}
                >
                  {card.icon}
                </div>
                <h3
                  className={`text-sm font-semibold mb-2 ${
                    outfit.className
                  } ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
                >
                  {card.title}
                </h3>
                <p
                  className={`text-[13px] leading-relaxed ${
                    inter.className
                  } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`mt-auto py-12 border-t text-center ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <p
          className={`font-medium mb-4 text-sm ${
            inter.className
          } ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          Serving Washtenaw County Food Service Establishments
        </p>
        <div
          className={`flex justify-center gap-6 mb-6 text-sm font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <Link
            href="/terms"
            className="hover:text-slate-100 md:hover:text-slate-900 transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="hover:text-slate-100 md:hover:text-slate-900 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/contact"
            className="hover:text-slate-100 md:hover:text-slate-900 transition-colors"
          >
            Contact
          </Link>
        </div>
      </footer>
    </div>
  )
}

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setMessage('')

  try {
      const captchaToken = await executeRecaptcha(mode)

      if (!captchaToken) {
        setMessage('Security verification failed. Please try again.')
        setLoading(false)
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password
        endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin'
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(`Error: ${data.error || 'Authentication failed'}`)
        setLoading(false)
        return
      }

      if (mode === 'reset') {
        setMessage('✓ Check your email for password reset instructions.')
        setTimeout(() => setMode('signin'), 2000)
      } else if (mode === 'signup') {
        setMessage('✓ Account created! Check your email to verify.')
        setTimeout(() => setMode('signin'), 2000)
      } else {
        setMessage('✓ Signing in...')
        setTimeout(() => {
          onSuccess?.()
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Error: An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2
              className={`text-xl font-semibold text-slate-900 mb-1 tracking-tight ${outfit.className}`}
            >
              {mode === 'signin' && 'Sign in to continue'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className={`text-sm text-slate-500 ${inter.className}`}>
              {mode === 'signin' && 'Enter your credentials'}
              {mode === 'signup' && 'Get started with protocolLM'}
              {mode === 'reset' && "We'll send you a reset link"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="work@restaurant.com"
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-all shadow-sm"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !isLoaded}
            className="w-full bg-black hover:bg-slate-900 text-white font-semibold py-3 rounded-lg text-xs uppercase tracking-[0.18em] transition-colors shadow-sm disabled:opacity-60"
          >
            {loading
              ? 'Processing...'
              : !isLoaded
              ? 'Loading...'
              : mode === 'signin'
              ? 'Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </div>

        {message && (
          <div
            className={`mt-6 p-4 rounded-lg text-sm border ${
              message.includes('Error')
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-green-50 border-green-200 text-green-900'
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors block w-full"
              >
                Forgot password?
              </button>
              <div className="text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-slate-900 font-semibold hover:underline"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-slate-900 font-semibold hover:underline"
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <button
              onClick={() => setMode('signin')}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Back to sign in
            </button>
          )}
        </div>

        <RecaptchaBadge />
      </div>
    </div>
  )
}

const PricingModal = ({ isOpen, onClose, onCheckout, loading }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[1000] bg-white/95 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <Icons.X />
        </button>
        <div className="mb-8 text-center">
          <h3
            className={`text-xs font-semibold text-slate-900 uppercase tracking-[0.25em] mb-3 ${outfit.className}`}
          >
            protocolLM
          </h3>
          <p
            className={`text-lg md:text-xl font-semibold text-slate-900 mb-2 tracking-tight ${outfit.className}`}
          >
            Choose your plan
          </p>
          <p
            className={`text-sm text-slate-600 max-w-xl mx-auto ${inter.className}`}
          >
            Start with a 7-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="border border-slate-200 rounded-xl p-6 bg-white">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
                Unlimited Access
              </p>
              <div className="flex items-baseline mb-2">
                <span
                  className={`text-4xl font-semibold text-slate-900 tracking-tight ${outfit.className}`}
                >
                  $100
                </span>
                <span className="ml-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  /month
                </span>
              </div>
              <p className={`text-sm text-slate-600 mb-4 ${inter.className}`}>
                Full access to compliance tools and resources.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Unlimited text queries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Unlimited image analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Washtenaw County guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Michigan Food Code access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>7-day free trial</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                disabled={!!loading && loading !== 'monthly'}
                className={`w-full bg-black hover:bg-slate-900 text-white font-semibold py-3.5 rounded-lg text-xs uppercase tracking-[0.18em] transition-colors ${
                  loading && loading !== 'monthly'
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                {loading === 'monthly' ? 'Processing...' : 'Monthly Access - Start Free Trial'}
              </button>
              <button
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading && loading !== 'annual'}
                className={`w-full bg-white border border-dashed border-slate-400 text-slate-900 font-semibold py-3.5 rounded-lg text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition-colors ${
                  loading && loading !== 'annual'
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                {loading === 'annual' ? 'Processing...' : 'Yearly Access - Save 15%'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SubscriptionPollingBanner = () => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-blue-50 border-b border-blue-200 px-4 py-3">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icons.Clock />
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Activating your subscription...
          </p>
          <p className="text-xs text-blue-700">
            This usually takes 5-10 seconds
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  </div>
)

export default function Page() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null) // 'monthly' | 'annual' | null
  const [isPollingSubscription, setIsPollingSubscription] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [theme, setTheme] = useState('light')

  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const pollIntervalRef = useRef(null)

  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Initial auth and subscription check with timeout
  useEffect(() => {
    let mounted = true
    let timeoutId = null

    const init = async () => {
      try {
        // Safety timeout - if loading takes more than 5 seconds, show the page anyway
        timeoutId = setTimeout(() => {
          if (mounted && isLoading) {
            console.warn('⚠️ Auth check timeout, showing page')
            setIsLoading(false)
          }
        }, 5000)

        const {
          data: { session: s },
        } = await supabase.auth.getSession()

        if (!mounted) return
        setSession(s)

        if (s) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status, current_period_end, trial_end')
            .eq('user_id', s.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()

          let active = false
          if (s.user.email === ADMIN_EMAIL) {
            active = true
          } else if (sub) {
            const periodEnd = new Date(sub.current_period_end)
            if (periodEnd > new Date()) active = true
          }
          setHasActiveSubscription(active)

          // If user has active subscription and no pricing param, skip to chat
          if (active && searchParams.get('showPricing') !== 'true') {
            setShowPricingModal(false)
          } else if (!active) {
            setShowPricingModal(true)
          }
        } else {
          setHasActiveSubscription(false)
        }
      } catch (e) {
        console.error('Auth Init Error', e)
      } finally {
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId)
          setIsLoading(false)
        }
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', newSession.user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        let active = false
        if (newSession.user.email === ADMIN_EMAIL) {
          active = true
        } else if (sub) {
          const periodEnd = new Date(sub.current_period_end)
          if (periodEnd > new Date()) active = true
        }
        setHasActiveSubscription(active)
      } else {
        setHasActiveSubscription(false)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase, searchParams, isLoading])

  // Subscription polling after payment
  useEffect(() => {
    if (!session) return

    const paymentStatus = searchParams.get('payment')
    if (paymentStatus !== 'success') return

    if (hasActiveSubscription) {
      router.replace('/')
      return
    }

    setIsPollingSubscription(true)
    let pollCount = 0
    const maxPolls = 12

    const pollSubscription = async () => {
      pollCount++

      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', session.user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        if (sub) {
          const periodEnd = new Date(sub.current_period_end)
          if (periodEnd > new Date()) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            setIsPollingSubscription(false)
            setHasActiveSubscription(true)
            setShowPricingModal(false)
            router.replace('/')
          }
        } else if (pollCount >= maxPolls) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setIsPollingSubscription(false)
          alert(
            'Subscription activation is taking longer than expected. Please refresh the page in a moment or contact support if the issue persists.'
          )
        }
      } catch (error) {
        console.error('Subscription polling error:', error)
        if (pollCount >= maxPolls) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          setIsPollingSubscription(false)
        }
      }
    }

    pollSubscription()
    pollIntervalRef.current = setInterval(pollSubscription, 5000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [session, searchParams, supabase, router, hasActiveSubscription])

  const handleCheckout = async (priceId, planName) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    if (!currentSession) {
      setShowPricingModal(false)
      setShowAuthModal(true)
      return
    }
    if (!priceId) {
      alert('Invalid price selected')
      return
    }
    setCheckoutLoading(planName)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Checkout failed')
      }

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + error.message)
      setCheckoutLoading(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      window.location.href = '/'
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null)
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const currentInput = input
    const currentImage = selectedImage
    const newMsg = { role: 'user', content: currentInput, image: currentImage }

    setMessages((p) => [...p, newMsg, { role: 'assistant', content: '' }])
    setInput('')
    setSelectedImage(null)
    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let activeChatId = currentChatId
    if (session && !activeChatId) {
      const { data: newChat } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          title: currentInput.slice(0, 30) + '...',
        })
        .select()
        .single()
      if (newChat) {
        activeChatId = newChat.id
        setCurrentChatId(newChat.id)
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          image: currentImage,
          chatId: activeChatId,
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          setShowPricingModal(true)
          throw new Error('Subscription required.')
        }
        if (res.status === 429) {
          const data = await res.json()
          throw new Error(data.error || 'Rate limit exceeded. Please upgrade.')
        }
        if (res.status === 503) {
          const data = await res.json()
          throw new Error(data.error || 'Service temporarily unavailable')
        }
        throw new Error(`Server error: ${res.status}`)
      }

      const data = await res.json()
      setMessages((p) => {
        const u = [...p]
        u[u.length - 1].content = data.message || 'No response.'
        return u
      })
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((p) => {
        const u = [...p]
        u[u.length - 1].content = `Error: ${err.message}`
        return u
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch (error) {
      console.error(error)
      alert('Failed to process image')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canUseApp = session && hasActiveSubscription
  const isDark = theme === 'dark'

  return (
    <>
      <style jsx global>{`
        body {
          background-color: #020617;
          color: #111827;
        }
        .btn-press {
          transition: transform 0.1s ease;
        }
        .btn-press:active {
          transform: scale(0.98);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12);
          border-radius: 3px;
        }
      `}</style>

      {isPollingSubscription && <SubscriptionPollingBanner />}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
        }}
      />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div
        className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${
          isDark ? 'bg-[#050816] text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
      >
        <div
          className={`relative z-10 flex flex-col h-[100dvh] ${
            isPollingSubscription ? 'pt-16' : ''
          }`}
        >
          <header
            className={`border-b z-30 ${
              isDark
                ? 'border-slate-800 bg-[#050816]/80 backdrop-blur'
                : 'border-slate-200 bg-white/80 backdrop-blur'
            }`}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
              <div
                className={`font-semibold tracking-tight text-xl ${outfit.className} ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                protocol<span className={isDark ? 'text-slate-400' : 'text-slate-500'}>LM</span>
              </div>
              <div className="flex items-center gap-4">
                {/* Theme toggle in header */}
                <button
                  type="button"
                  onClick={() =>
                    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
                  }
                  className={`
                    hidden sm:inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium transition-colors
                    ${
                      isDark
                        ? 'border-slate-700 text-slate-200 bg-slate-900/60 hover:bg-slate-900'
                        : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'
                    }
                  `}
                >
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      !isDark
                        ? 'bg-slate-900 text-slate-50'
                        : 'text-slate-400'
                    }`}
                  >
                    Light
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      isDark
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    Dark
                  </span>
                </button>

                {!session ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`text-xs sm:text-sm font-semibold ${
                        isDark
                          ? 'text-slate-300 hover:text-slate-50'
                          : 'text-slate-600 hover:text-slate-900'
                      } transition-colors ${inter.className}`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className={`inline-flex items-center gap-2 btn-press ${
                        isDark
                          ? 'bg-slate-50 text-slate-900 hover:bg-white'
                          : 'bg-black text-white hover:bg-slate-900'
                      } px-3 sm:px-4 py-2.5 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${inter.className}`}
                    >
                      <Icons.Check />
                      Sign up
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {canUseApp && (
                      <button
                        onClick={handleNewChat}
                        className={`p-2 rounded-lg transition-colors ${
                          isDark
                            ? 'text-slate-300 hover:text-slate-50 hover:bg-slate-800/70'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icons.Plus />
                      </button>
                    )}
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-100'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        {session.user.email[0].toUpperCase()}
                      </button>
                      {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 p-1">
                          <button
                            onClick={() => setShowPricingModal(true)}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-3 rounded-md transition-colors"
                          >
                            <Icons.Settings /> Subscription
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 rounded-md transition-colors"
                          >
                            <Icons.LogOut /> Log out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-start w-full pb-20 md:pb-0 overflow-y-auto">
            {!canUseApp ? (
              <LandingPage
                onShowPricing={() => setShowPricingModal(true)}
                theme={theme}
              />
            ) : (
              <>
                <div
                  className="flex-1 overflow-y-auto w-full py-8"
                  ref={scrollRef}
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <p
                        className={`text-slate-400 text-base max-w-md leading-relaxed ${inter.className}`}
                      >
                        Ask about the Michigan Food Code, Washtenaw enforcement, or upload a photo to check for
                        potential violations.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col w-full max-w-4xl mx-auto py-8 px-6 gap-8">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[90%] px-2 ${
                              msg.role === 'user'
                                ? isDark
                                  ? 'text-slate-50 font-medium'
                                  : 'text-slate-900 font-medium'
                                : isDark
                                ? 'text-slate-100'
                                : 'text-slate-800'
                            }`}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="rounded-lg mb-4 max-h-80 object-contain border border-slate-200"
                              />
                            )}
                            {msg.role === 'assistant' &&
                            msg.content === '' &&
                            isSending &&
                            idx === messages.length - 1 ? (
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <div
                                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.1s' }}
                                />
                                <div
                                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.2s' }}
                                />
                              </div>
                            ) : (
                              <div className="text-base leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={`w-full shrink-0 z-20 border-t pt-4 ${
                    isDark ? 'bg-[#050816] border-slate-800' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="w-full max-w-4xl mx-auto px-4 pb-8">
                    {selectedImage && (
                      <div
                        className={`mb-3 mx-1 p-3 inline-flex items-center gap-3 rounded-lg shadow-sm border ${
                          isDark
                            ? 'bg-slate-900/60 border-slate-700 text-slate-100'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          Image attached
                        </span>
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="text-slate-400 hover:text-slate-900"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <div
                      className={`
                        relative flex items-end w-full p-2 rounded-xl shadow-sm
                        border transition-all
                        ${
                          isDark
                            ? 'bg-slate-900/70 border-slate-700 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300'
                            : 'bg-white border-slate-300 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900'
                        }
                      `}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImage}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg mb-1 ml-1 transition-all ${
                          isDark
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icons.Camera />
                      </button>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                        placeholder="Ask about code sections, violations, or upload a photo..."
                        className={`flex-1 max-h-[200px] min-h-[44px] py-3 px-4 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none resize-none text-base leading-relaxed ${
                          inter.className
                        } ${
                          isDark
                            ? 'text-slate-100 placeholder-slate-500'
                            : 'text-slate-900 placeholder-slate-400'
                        }`}
                        rows={1}
                      />
                      <button
                        type="submit"
                        onClick={handleSend}
                        disabled={
                          (!input.trim() && !selectedImage) || isSending
                        }
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mb-1 mr-1 transition-all duration-200 ${
                          !input.trim() && !selectedImage
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : isDark
                            ? 'bg-slate-50 text-slate-900 hover:bg-white shadow-md'
                            : 'bg-black text-white hover:bg-slate-900 shadow-md'
                        }`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
