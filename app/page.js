'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { EvervaultCard } from '@/components/ui/evervault-card'

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
  Sun: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5 19 19M5 19l-1.5 1.5M20.5 3.5 19 5" />
    </svg>
  ),
  Moon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 12.79A9 9 0 0 1 12.21 3 7 7 0 1 0 21 12.79Z" />
    </svg>
  ),
}

const DOCUMENT_DISPLAY_NAMES = [
  'Michigan Modified Food Code',
  'FDA Food Code 2022',
  'Washtenaw enforcement actions',
  'Inspection report types · Washtenaw',
  'Minimum cooking temperatures',
  'Cooling foods guidance',
  'Consumer advisory requirements',
  'Date marking guide',
  'Food labeling guide',
  'Retail emergency action plans',
]

const LandingPage = ({ onShowPricing, theme }) => {
  const isDark = theme === 'dark'
  const [docIndex, setDocIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDocIndex((prev) => (prev + 1) % DOCUMENT_DISPLAY_NAMES.length)
    }, 3200) // ~3 seconds per document
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`w-full relative z-10 min-h-full flex flex-col ${
        isDark ? 'bg-black' : 'bg-white'
      }`}
    >
      {/* Main section with coverage + Evervault cards */}
      <section
        className={`relative border-b ${
          isDark ? 'border-slate-800 bg-black' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col items-center">
          {/* Coverage + rotating docs */}
          <div className="w-full max-w-3xl mx-auto mb-10 text-center space-y-3">
            <div className="flex flex-wrap justify-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase ${
                  isDark
                    ? 'border-slate-800 text-slate-400'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                Coverage
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${
                  isDark
                    ? 'bg-slate-900 text-slate-50'
                    : 'bg-slate-900 text-slate-50'
                }`}
              >
                Washtenaw County · Active
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${
                  isDark
                    ? 'bg-slate-900 text-slate-100 border border-slate-700'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                Michigan State Code
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${
                  isDark
                    ? 'bg-black text-slate-400 border border-dashed border-slate-700'
                    : 'bg-white text-slate-500 border border-dashed border-slate-300'
                }`}
              >
                Additional Counties · 2026
              </span>
            </div>

            <p
              className={`text-xs leading-relaxed ${
                inter.className
              } ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              Grounded in local enforcement actions and Michigan food safety regulations
              so you can see issues before the inspector does.
            </p>

            {/* Rotating document pill */}
            <div className="flex justify-center">
              <div
                className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[10px] font-medium tracking-[0.16em] uppercase ${
                  isDark
                    ? 'border-slate-800 text-slate-300 bg-black'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                <span key={docIndex} className="doc-fade">
                  {DOCUMENT_DISPLAY_NAMES[docIndex]}
                </span>
              </div>
            </div>
          </div>

          {/* Three Evervault cards: Capture / Cross-check / Correct */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {/* 1. Capture */}
            <div
              className={`relative border rounded-2xl p-6 flex flex-col min-h-[260px] ${
                isDark
                  ? 'bg-black border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="absolute h-6 w-6 -top-3 -left-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -bottom-3 -left-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -top-3 -right-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -bottom-3 -right-3 text-slate-400">
                <Icons.Plus />
              </div>

              <div className="h-44 mb-6">
                <EvervaultCard text="Snap a photo. Spot the risk." />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${outfit.className}`}>
                1. Capture
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  inter.className
                } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                Turn any phone into a mini health inspector. 
                  Snap a quick photo of your walk-in, prep line, or dish area. 
                  protocolLM analyzes the image for potential violations using your local health-department rules.

              </p>
            </div>

            {/* 2. Cross-check */}
            <div
              className={`relative border rounded-2xl p-6 flex flex-col min-h-[260px] ${
                isDark
                  ? 'bg-black border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="absolute h-6 w-6 -top-3 -left-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -bottom-3 -left-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -top-3 -right-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -bottom-3 -right-3 text-slate-400">
                <Icons.Plus />
              </div>

              <div className="h-44 mb-6">
                <EvervaultCard text="We handle the rulebook, you see the risks." />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${outfit.className}`}>
                2. Cross-check
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  inter.className
                } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                Compare what you see to the actual code. 
                  Behind the scenes, protocolLM checks each image against local enforcement actions and the Michigan Food Code, so you don’t have to dig through PDFs or policy binders.
              </p>
            </div>

            {/* 3. Correct */}
            <div
              className={`relative border rounded-2xl p-6 flex flex-col min-h-[260px] ${
                isDark
                  ? 'bg-black border-slate-800 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="absolute h-6 w-6 -top-3 -left-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -bottom-3 -left-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -top-3 -right-3 text-slate-400">
                <Icons.Plus />
              </div>
              <div className="absolute h-6 w-6 -bottom-3 -right-3 text-slate-400">
                <Icons.Plus />
              </div>

              <div className="h-44 mb-6">
                <EvervaultCard text="Turn risk into a quick checklist." />
              </div>
              <h3 className={`text-base font-semibold mb-1 ${outfit.className}`}>
                3. Correct
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  inter.className
                } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
              >
                Fix issues before the inspector arrives. Get a clear list of likely violations plus practical corrective actions. 
                  Turn every photo into a focused to-do list your team can handle before inspection day.
              </p>
            </div>
          </div>

          {/* Single CTA */}
          <button
            onClick={onShowPricing}
            className="mt-10 bg-black hover:bg-slate-900 text-white text-xs font-semibold py-3.5 px-8 rounded-full uppercase tracking-[0.18em] shadow-sm transition-colors"
          >
            Sign up
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`mt-auto py-12 text-center border-t ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <p
          className={`font-medium mb-4 text-sm ${
            inter.className
          } ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          Serving Washtenaw County food service establishments
        </p>
        <div
          className={`flex justify-center gap-6 mb-6 text-sm font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <Link href="/terms" className="hover:text-slate-900 transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/contact" className="hover:text-slate-900 transition-colors">
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
          <p className={`text-sm text-slate-600 max-w-xl mx-auto ${inter.className}`}>
            Start with a 7-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="border border-slate-200 rounded-xl p-6 bg-white">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
                Compliance Plan
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
                Includes approximately{' '}
                <span className="font-semibold">1,300 monthly compliance checks</span>{' '}
                for a single restaurant. Text questions count as one check; photo analyses
                count as two.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Text questions and photo analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Grounded in Washtenaw County guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Michigan Food Code & local enforcement docs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Designed for a single restaurant site license</span>
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
          <p className="text-sm font-semibold text-blue-900">Activating your subscription...</p>
          <p className="text-xs text-blue-700">This usually takes 5-10 seconds</p>
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
  const [theme, setTheme] = useState('light') // light/dark toggle

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

  // Initial auth + subscription check
  useEffect(() => {
    let mounted = true
    let timeoutId = null

    const init = async () => {
      try {
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
          background-color: #f9fafb;
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
        .doc-fade {
          display: inline-block;
          animation: docFade 3.2s ease-in-out;
        }
        @keyframes docFade {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          10%,
          90% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-4px);
          }
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
        className={`relative min-h-screen w-full overflow-hidden transition-colors duration-300 ${
          isDark ? 'bg-black text-slate-100' : 'bg-white text-slate-900'
        }`}
      >
        <div
          className={`relative z-10 flex flex-col h-[100dvh] ${
            isPollingSubscription ? 'pt-16' : ''
          }`}
        >
          {/* HEADER */}
          <header
            className={`border-b z-30 ${
              isDark
                ? 'border-slate-800 bg-black/90 backdrop-blur'
                : 'border-slate-200 bg-white/80 backdrop-blur'
            }`}
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
              <div
                className={`font-semibold tracking-tight text-xl ${outfit.className} ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                protocol
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>LM</span>
              </div>
              <div className="flex items-center gap-4">
                {/* Theme toggle: sun / moon */}
                <button
                  type="button"
                  onClick={() =>
                    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
                  }
                  className={`
                    hidden sm:inline-flex items-center rounded-full border px-1.5 py-1 text-[11px] font-medium transition-colors
                    ${
                      isDark
                        ? 'border-slate-700 text-slate-200 bg-black hover:bg-slate-900'
                        : 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'
                    }
                  `}
                >
                  <span
                    className={`p-1 rounded-full flex items-center justify-center ${
                      !isDark
                        ? 'bg-slate-900 text-slate-50'
                        : 'text-slate-500'
                    }`}
                  >
                    <Icons.Sun />
                  </span>
                  <span
                    className={`p-1 rounded-full flex items-center justify-center ${
                      isDark
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-400'
                    }`}
                  >
                    <Icons.Moon />
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
                            ? 'bg-black border-slate-700 text-slate-100'
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

          {/* MAIN */}
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
                        Ask about the Michigan Food Code, Washtenaw enforcement, or
                        upload a photo to check for violations.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col w-full max-w-4xl mx-auto py-8 px-6 gap-8">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
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

                {/* INPUT BAR */}
                <div
                  className={`w-full shrink-0 z-20 border-t pt-4 ${
                    isDark ? 'bg-black border-slate-800' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="w-full max-w-4xl mx-auto px-4 pb-8">
                    {selectedImage && (
                      <div
                        className={`mb-3 mx-1 p-3 inline-flex items-center gap-3 rounded-lg shadow-sm border ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-100'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <span className="text-sm font-semibold">Image attached</span>
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
                            ? 'bg-slate-900 border-slate-700 focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-300'
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
                    <p
                      className={`mt-3 text-[11px] text-center ${
                        isDark ? 'text-slate-500' : 'text-slate-500'
                      } ${inter.className}`}
                    >
                      protocolLM uses AI and may make mistakes. Always confirm critical
                      food safety decisions with official regulations and your local
                      health department.
                    </p>
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
