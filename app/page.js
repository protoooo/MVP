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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
}

function LandingPage({ onShowPricing }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg border-2 border-teal-400/70 bg-gradient-to-br from-teal-300/40 via-cyan-200/30 to-blue-300/40 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] text-[11px] font-semibold tracking-[0.24em] uppercase text-teal-900">
          protocolLM · restaurant compliance console
        </div>

        <div className="space-y-4">
          <h1
            className={`text-3xl sm:text-4xl md:text-[2.6rem] leading-tight font-semibold text-slate-900 ${outfit.className}`}
          >
            Spot violations before the health inspector.
          </h1>
          <p className={`text-sm sm:text-base text-slate-600 ${inter.className}`}>
            Built for GMs and owners who want fewer surprises on inspection day.
            Ask about Michigan Food Code sections, past Washtenaw enforcement, or
            upload a photo of your walk-in or line to scan for likely issues.
          </p>
          <p className={`text-xs text-slate-500 ${inter.className}`}>
            Focused on <span className="font-medium text-slate-700">Washtenaw County</span>{' '}
            today. Wayne and Oakland County support planned for 2026.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="rounded-2xl border-2 border-teal-300/60 bg-gradient-to-br from-teal-200/30 via-cyan-100/25 to-blue-200/30 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] p-4 hover-lift transition-all animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] uppercase text-teal-800 mb-3">
              <span>Capture</span>
              <span className="text-teal-600 pulse-ring">Online</span>
            </div>
            <p className={`text-xs text-slate-700 leading-relaxed ${inter.className}`}>
              Snap your walk-in, prep line, or dish area. protocolLM turns photos into a
              quick risk scan using local rules instead of guesswork.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-teal-300/60 bg-gradient-to-br from-teal-200/30 via-cyan-100/25 to-blue-200/30 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] p-4 hover-lift transition-all animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] uppercase text-teal-800 mb-3">
              <span>Rulebook</span>
              <span className="text-teal-600 pulse-ring">Synced</span>
            </div>
            <p className={`text-xs text-slate-700 leading-relaxed ${inter.className}`}>
              Answers pull from the Michigan Food Code and Washtenaw enforcement
              history, so your team doesn&apos;t have to dig through PDFs.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-teal-300/60 bg-gradient-to-br from-teal-200/30 via-cyan-100/25 to-blue-200/30 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] p-4 hover-lift transition-all animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] uppercase text-teal-800 mb-3">
              <span>Checklist</span>
              <span className="text-teal-600 pulse-ring">Ready</span>
            </div>
            <p className={`text-xs text-slate-700 leading-relaxed ${inter.className}`}>
              Turn flagged risks into a short action list your closers or AM can knock
              out before the inspector walks in.
            </p>
          </div>
        </div>

        <button
          onClick={onShowPricing}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white text-xs font-semibold tracking-[0.2em] uppercase shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_4px_12px_rgba(20,184,166,0.3),inset_0_1px_2px_rgba(255,255,255,0.5)] hover-lift button-press relative overflow-hidden group transition-all animate-float"
        >
          <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
          <Icons.Check />
          <span className="relative">Sign up · Compliance access</span>
        </button>

        <footer className="pt-4 text-xs text-slate-500">
          <p className={`mb-2 ${inter.className}`}>
            Serving Washtenaw County food service establishments.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/terms" className="hover:text-slate-800">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-800">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-slate-800">
              Contact
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken) {
        setMessage('Error: Security verification failed. Please try again.')
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

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(`Error: ${data.error || 'Authentication failed'}`)
        return
      }

      if (mode === 'reset') {
        setMessage('✓ Check your email for password reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else if (mode === 'signup') {
        setMessage('✓ Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else {
        setMessage('✓ Signed in. Redirecting…')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 600)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Error: Unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-teal-300/70 bg-gradient-to-br from-teal-100/60 via-cyan-50/50 to-blue-100/60 backdrop-blur-xl shadow-[0_8px_24px_rgba(20,184,166,0.2),inset_0_1px_2px_rgba(255,255,255,0.7)] p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2
              className={`text-lg font-semibold text-slate-900 tracking-tight mb-1 ${outfit.className}`}
            >
              {mode === 'signin' && 'Sign in to protocolLM'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className={`text-xs text-slate-600 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 border-2 border-slate-300/60 bg-gradient-to-br from-slate-100/70 via-slate-50/60 to-slate-200/70 backdrop-blur-sm text-slate-600 hover:border-slate-400/70 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className="w-full rounded-lg border-2 border-slate-300/60 bg-gradient-to-br from-white/80 via-slate-50/70 to-white/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border-2 border-slate-300/60 bg-gradient-to-br from-white/80 via-slate-50/70 to-white/80 backdrop-blur-sm px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white text-[11px] font-semibold tracking-[0.22em] uppercase py-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_4px_12px_rgba(20,184,166,0.35),inset_0_1px_2px_rgba(255,255,255,0.5)] hover-lift button-press disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
          >
            <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
            <span className="relative">
              {loading
                ? 'Processing…'
                : mode === 'signin'
                ? 'Sign in'
                : mode === 'signup'
                ? 'Create account'
                : 'Send reset link'}
            </span>
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 text-xs rounded-lg px-3 py-2 border-2 ${
              message.startsWith('Error')
                ? 'bg-red-50/80 border-red-300/70 text-red-700 backdrop-blur-sm'
                : 'bg-emerald-50/80 border-emerald-300/70 text-emerald-700 backdrop-blur-sm'
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-slate-600">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="block w-full text-teal-700 hover:text-teal-800"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="block w-full text-slate-600 hover:text-slate-800"
              >
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-slate-600 hover:text-slate-800"
            >
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-slate-600 hover:text-slate-800"
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

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[900] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-teal-300/80 bg-gradient-to-br from-teal-100/70 via-cyan-50/60 to-blue-100/70 backdrop-blur-xl shadow-[0_8px_24px_rgba(20,184,166,0.25),inset_0_1px_2px_rgba(255,255,255,0.7)] p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-7 top-7 rounded-lg border-2 border-slate-300/60 bg-gradient-to-br from-slate-100/70 via-slate-50/60 to-slate-200/70 backdrop-blur-sm text-slate-600 hover:border-slate-400/70 p-1.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]"
        >
          <Icons.X />
        </button>

        <div className="mb-6 text-center">
          <p
            className={`text-[11px] font-semibold tracking-[0.24em] uppercase text-teal-800 mb-2 ${outfit.className}`}
          >
            protocolLM
          </p>
          <h3
            className={`text-xl font-semibold text-slate-900 mb-1 tracking-tight ${outfit.className}`}
          >
            Compliance access
          </h3>
          <p className={`text-sm text-slate-600 ${inter.className}`}>
            One site license per restaurant. 7-day free trial included.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-teal-300/70 bg-gradient-to-br from-white/70 via-slate-50/60 to-cyan-50/70 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] p-5 space-y-4">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span
                className={`text-3xl font-semibold text-slate-900 tracking-tight ${outfit.className}`}
              >
                $100
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                / month
              </span>
            </div>
            <p className={`text-xs text-slate-600 ${inter.className}`}>
              Includes roughly{' '}
              <span className="font-semibold text-slate-800">1,300 monthly checks</span>{' '}
              for a single restaurant. Text questions count as one check; photo analyses
              count as two.
            </p>
          </div>

          <ul className="text-xs text-slate-700 space-y-2">
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Text questions and photo uploads</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Grounded in Michigan Food Code &amp; Washtenaw guidance</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Built for one restaurant site license</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>7-day free trial · cancel anytime</span>
            </li>
          </ul>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className="w-full inline-flex items-center justify-center rounded-lg border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white text-[11px] font-semibold tracking-[0.22em] uppercase py-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_4px_12px_rgba(20,184,166,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)] hover-lift button-press disabled:opacity-60 relative overflow-hidden group"
            >
              <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
              <span className="relative">{loading === 'monthly' ? 'Processing…' : 'Start monthly trial'}</span>
            </button>
            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="w-full inline-flex items-center justify-center rounded-lg border-2 border-dashed border-teal-400/70 bg-gradient-to-br from-white/70 via-cyan-50/60 to-teal-50/70 backdrop-blur-sm text-[11px] font-semibold tracking-[0.22em] uppercase text-teal-800 py-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(20,184,166,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] hover-lift button-press disabled:opacity-60"
            >
              {loading === 'annual' ? 'Processing…' : 'Yearly · save 15%'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [showUserMenu, setShowUserMenu] = useState(false)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setHasActiveSubscription(false)
        setShowPricingModal(false)
        setIsLoading(false)
        return
      }

      let active = false
      try {
        if (s.user.email === ADMIN_EMAIL) {
          active = true
        } else {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status,current_period_end')
            .eq('user_id', s.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()

          if (sub && sub.current_period_end) {
            const end = new Date(sub.current_period_end)
            if (end > new Date()) active = true
          }
        }
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (!isMounted) return
      setHasActiveSubscription(active)
      if (!active && searchParams.get('payment') === 'success') {
        setShowPricingModal(false)
      }
      setIsLoading(false)
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        await loadSessionAndSub(data.session || null)
      } catch (e) {
        console.error('Auth init error', e)
        if (isMounted) setIsLoading(false)
      }
    }

    init()

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      loadSessionAndSub(newSession)
    })

    return () => {
      isMounted = false
      data.subscription?.unsubscribe()
    }
  }, [supabase, searchParams])

  const handleCheckout = async (priceId, planName) => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setShowPricingModal(false)
        setShowAuthModal(true)
        return
      }
      if (!priceId) {
        alert('Invalid price selected.')
        return
      }

      setCheckoutLoading(planName)

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Checkout failed')
      }

      const payload = await res.json()
      if (payload.url) {
        window.location.href = payload.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
      setCheckoutLoading(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out error', e)
    } finally {
      setMessages([])
      setCurrentChatId(null)
      router.replace('/')
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

    const question = input.trim()
    const image = selectedImage

    const newUserMessage = { role: 'user', content: question, image }
    setMessages((prev) => [...prev, newUserMessage, { role: 'assistant', content: '' }])
    setInput('')
    setSelectedImage(null)
    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let activeChatId = currentChatId

    try {
      if (session && !activeChatId) {
        const { data: created } = await supabase
          .from('chats')
          .insert({
            user_id: session.user.id,
            title: (question || 'New chat').slice(0, 40),
          })
          .select()
          .single()

        if (created) {
          activeChatId = created.id
          setCurrentChatId(created.id)
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          image,
          chatId: activeChatId,
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          setShowPricingModal(true)
          throw new Error('Subscription required for additional questions.')
        }
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Rate limit exceeded.')
        }
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Service temporarily unavailable.')
        }
        throw new Error(`Server error (${res.status})`)
      }

      const data = await res.json()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: data.message || 'No response.',
        }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${error.message}`,
        }
        return updated
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch (error) {
      console.error('Image compression error', error)
      alert('Failed to process image.')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-blue-100">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.3);
          border-radius: 999px;
        }
        
        @keyframes buttonPress {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.95); }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4),
                        0 0 0 0 rgba(20, 184, 166, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(20, 184, 166, 0),
                        0 0 0 0 rgba(20, 184, 166, 0.4);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(20, 184, 166, 0),
                        0 0 0 16px rgba(20, 184, 166, 0);
          }
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        
        .button-press:active {
          animation: buttonPress 0.15s ease;
        }
        
        .message-appear {
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        .pulse-ring {
          animation: ripple 2s ease-out infinite;
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div className="min-h-screen flex flex-col" style={{ height: '100dvh' }}>
        {/* Header */}
        <header className="sticky top-0 z-40 border-b-2 border-teal-300/60 bg-gradient-to-br from-teal-200/40 via-cyan-100/35 to-blue-200/40 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] animate-slide-down flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1 rounded-lg border-2 border-emerald-400/70 bg-gradient-to-br from-emerald-300/50 via-teal-200/40 to-cyan-300/50 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] text-[11px] font-semibold tracking-[0.22em] uppercase text-emerald-800 hover-lift cursor-pointer ${outfit.className}`}
              >
                protocol<span className="text-emerald-600">LM</span>
              </div>
              {hasActiveSubscription && (
                <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-lg border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-200/50 via-teal-100/40 to-emerald-300/50 backdrop-blur-sm text-emerald-900 font-medium tracking-[0.16em] uppercase shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] pulse-ring animate-fade-in">
                  Active · site license
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className={`text-xs font-semibold text-slate-700 hover:text-slate-900 ${inter.className}`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white text-[11px] font-semibold tracking-[0.22em] uppercase px-4 py-2 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] hover:shadow-[0_4px_12px_rgba(20,184,166,0.35),inset_0_1px_2px_rgba(255,255,255,0.5)] hover-lift button-press relative overflow-hidden group"
                  >
                    <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
                    <Icons.Check />
                    <span className="relative">Sign up</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChat}
                    className="hidden sm:inline-flex items-center justify-center rounded-full border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/50 via-cyan-100/40 to-sky-300/50 backdrop-blur-sm text-slate-800 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[0_8px_20px_rgba(14,165,233,0.25),inset_0_1px_2px_rgba(255,255,255,0.6)]"
                  >
                    <Icons.Plus />
                    New chat
                  </button>
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="w-8 h-8 rounded-full border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/60 via-cyan-100/50 to-sky-300/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] flex items-center justify-center text-xs font-bold text-slate-800"
                    >
                      {session.user.email?.[0]?.toUpperCase() || 'U'}
                    </button>
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 rounded-xl border-2 border-slate-300/70 bg-gradient-to-br from-white/80 via-slate-50/70 to-cyan-50/80 backdrop-blur-xl shadow-[0_8px_20px_rgba(15,23,42,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] overflow-hidden text-sm animate-slide-down">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100/60 text-slate-700 transition-colors hover-lift"
                        >
                          <Icons.Settings />
                          <span>Subscription</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50/60 transition-colors hover-lift"
                        >
                          <Icons.LogOut />
                          <span>Log out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col" style={{ height: '100dvh' }}>
          {!isAuthenticated ? (
            <LandingPage onShowPricing={() => setShowPricingModal(true)} />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages container with proper height calculation */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-4">
                    <p
                      className={`max-w-md text-sm text-slate-600 text-center leading-relaxed ${inter.className}`}
                    >
                      Ask about Michigan Food Code requirements, past Washtenaw
                      enforcement actions, or attach a photo of your walk-in or line to
                      scan for likely violations before inspection.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex w-full message-appear ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed hover-lift transition-all ${
                            msg.role === 'user'
                              ? 'border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                              : 'border-2 border-slate-300/60 bg-gradient-to-br from-white/80 via-slate-50/70 to-cyan-50/80 backdrop-blur-md text-slate-900 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]'
                          }`}
                        >
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="mb-3 rounded-xl border-2 border-slate-200/60 max-h-64 object-contain bg-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]"
                            />
                          )}
                          {msg.role === 'assistant' &&
                          msg.content === '' &&
                          isSending &&
                          idx === messages.length - 1 ? (
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                              <span
                                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                                style={{ animationDelay: '0.12s' }}
                              />
                              <span
                                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                                style={{ animationDelay: '0.24s' }}
                              />
                            </div>
                          ) : (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input bar fixed to viewport bottom */}
              <div className="flex-shrink-0 border-t-2 border-teal-300/60 bg-gradient-to-br from-teal-200/40 via-cyan-100/35 to-blue-200/40 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/60 via-cyan-100/50 to-sky-300/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] text-[11px] text-slate-800 animate-slide-up">
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="text-slate-600 hover:text-slate-900 transition-colors hover:rotate-90 transition-transform duration-200"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center w-9 h-9 rounded-lg border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/60 via-cyan-100/50 to-sky-300/60 backdrop-blur-sm text-slate-700 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] hover-lift button-press transition-all"
                    >
                      <Icons.Camera />
                    </button>
                    <form
                      onSubmit={handleSend}
                      className="flex-1 flex items-end gap-2"
                    >
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about code sections, enforcement history, or attach a photo of your line or walk-in."
                        rows={1}
                        className={`flex-1 max-h-32 min-h-[40px] resize-none rounded-2xl border-2 border-slate-300/60 bg-gradient-to-br from-white/80 via-slate-50/70 to-white/80 backdrop-blur-sm px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 ${inter.className}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all hover-lift button-press ${
                          (!input.trim() && !selectedImage) || isSending
                            ? 'bg-slate-300/60 text-slate-500 cursor-not-allowed border-2 border-slate-300/40'
                            : 'border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
                        }`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </form>
                  </div>
                  <p className={`mt-2 text-[10px] text-center text-slate-500 ${inter.className}`}>
                    protocolLM uses AI and may make mistakes. Always confirm critical
                    food safety decisions with official regulations and your local health
                    department.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('bg-gradient-to-br', 'from-cyan-50', 'via-sky-100', 'to-blue-100')
    return () => {
      document.body.classList.remove('bg-gradient-to-br', 'from-cyan-50', 'via-sky-100', 'to-blue-100')
    }
  }, [])

  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect
