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
  Check: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
}

// AUTH MODAL (light + glass)
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
        setMessage('Error: security verification failed.')
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
        setMessage('✓ Account created. Check your email to verify.')
        setTimeout(() => setMode('signin'), 2000)
      } else {
        setMessage('✓ Signing in...')
        setTimeout(() => {
          if (onSuccess) onSuccess()
          window.location.href = '/'
        }, 800)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Error: unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white/85 border border-white/60 rounded-2xl w-full max-w-md p-8 shadow-[0_24px_80px_rgba(15,23,42,0.35)] text-slate-900 font-sans backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2
              className={`text-xl md:text-2xl font-semibold text-slate-900 mb-1 tracking-tight ${outfit.className}`}
            >
              {mode === 'signin' && 'Sign in to protocolLM'}
              {mode === 'signup' && 'Create access'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs md:text-sm text-slate-600 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email for this location.'}
              {mode === 'signup' && 'Set up access for your restaurant.'}
              {mode === 'reset' && 'We’ll email you a reset link.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="gm@yourrestaurant.com"
              required
              className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2.5 pr-9 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
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
                      width="18"
                      height="18"
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
            className="w-full bg-gradient-to-b from-sky-200 via-sky-300 to-sky-500 text-slate-900 font-semibold py-2.5 rounded-full text-xs uppercase tracking-[0.18em] shadow-[0_12px_30px_rgba(56,189,248,0.75)] border border-white/70 hover:from-sky-100 hover:via-sky-200 hover:to-sky-400 transition-colors disabled:opacity-60"
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
            className={`mt-5 p-3 rounded-lg text-xs border ${
              message.startsWith('Error')
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-5 text-center space-y-2 text-xs">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-slate-600 hover:text-slate-900 transition-colors block w-full"
              >
                Forgot password?
              </button>
              <div className="text-slate-600">
                No account yet?{' '}
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
            <div className="text-slate-600">
              Already have access?{' '}
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
              className="text-slate-600 hover:text-slate-900 transition-colors"
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
    <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white/85 border border-white/70 rounded-2xl p-8 md:p-9 shadow-[0_24px_80px_rgba(15,23,42,0.35)] text-slate-900 font-sans backdrop-blur-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <Icons.X />
        </button>
        <div className="mb-7 text-center">
          <h3
            className={`text-[11px] font-semibold text-slate-700 uppercase tracking-[0.25em] mb-2 ${outfit.className}`}
          >
            PROTOCOLLM · ACCESS
          </h3>
          <p
            className={`text-lg md:text-2xl font-semibold text-slate-900 mb-1 tracking-tight ${outfit.className}`}
          >
            Single-site compliance plan
          </p>
          <p className={`text-sm text-slate-600 max-w-xl mx-auto ${inter.className}`}>
            Designed for GMs and owners who want fewer surprises on inspection day.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="border border-sky-100 rounded-2xl p-5 bg-white/80 shadow-inner">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-1.5">
                Compliance Plan
              </p>
              <div className="flex items-baseline mb-1.5">
                <span
                  className={`text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight ${outfit.className}`}
                >
                  $100
                </span>
                <span className="ml-2 text-slate-500 text-[11px] font-medium uppercase tracking-wide">
                  /month · per site
                </span>
              </div>
              <p className={`text-sm text-slate-700 mb-3.5 ${inter.className}`}>
                Includes roughly <span className="font-semibold">1,300 monthly checks</span>{' '}
                for one restaurant. Text questions count as one check; photo analyses count as
                two.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-800">
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
                  <span>Michigan Food Code &amp; local enforcement docs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Single restaurant site license</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>7-day free trial</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                disabled={!!loading && loading !== 'monthly'}
                className={`w-full bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-500 text-slate-900 font-semibold py-2.5 rounded-full text-xs uppercase tracking-[0.18em] shadow-[0_12px_30px_rgba(16,185,129,0.7)] border border-white/80 hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-400 transition-colors ${
                  loading && loading !== 'monthly' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading === 'monthly' ? 'Processing…' : 'Monthly · Start Free Trial'}
              </button>
              <button
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading && loading !== 'annual'}
                className={`w-full bg-white/70 border border-dashed border-sky-300 text-slate-900 font-semibold py-2.5 rounded-full text-xs uppercase tracking-[0.18em] hover:bg-sky-50 transition-colors ${
                  loading && loading !== 'annual' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading === 'annual' ? 'Processing…' : 'Yearly · Save 15%'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SubscriptionPollingBanner = () => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 border-b border-sky-200 px-4 py-2 backdrop-blur-md">
    <div className="max-w-4xl mx-auto flex items-center justify-between text-slate-900 text-xs font-medium">
      <div className="flex items-center gap-3">
        <Icons.Clock />
        <div>
          <p className="font-semibold">Activating your subscription…</p>
          <p className="text-[11px] text-slate-600">
            This usually completes within a few seconds.
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" />
        <div
          className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"
          style={{ animationDelay: '0.1s' }}
        />
        <div
          className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"
          style={{ animationDelay: '0.2s' }}
        />
      </div>
    </div>
  </div>
)

// Minimal business-card landing
const LandingPage = ({ onShowPricing, onOpenAuth }) => {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center px-6 py-16">
      <main className="w-full max-w-3xl text-center">
        <p
          className={`text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-500 mb-3 ${inter.className}`}
        >
          WASHTENAW COUNTY · LIVE · WAYNE &amp; OAKLAND COMING 2026
        </p>
        <h1
          className={`text-3xl md:text-4xl font-semibold mb-4 text-slate-900 leading-snug ${outfit.className}`}
        >
          Spot violations before the health inspector.
        </h1>
        <p
          className={`text-sm md:text-base text-slate-700 mb-8 leading-relaxed ${inter.className}`}
        >
          protocolLM checks your questions and photos against the Michigan Modified Food Code
          and local enforcement history so you can fix issues before the inspector walks in.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-white/70 bg-white/60 text-slate-900 text-sm font-semibold tracking-[0.14em] uppercase shadow-[0_10px_25px_rgba(148,163,184,0.6)] hover:bg-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onShowPricing}
            className="inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-500 text-slate-900 text-sm font-semibold tracking-[0.18em] uppercase border border-white/80 shadow-[0_14px_32px_rgba(16,185,129,0.7)] hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-400 transition-colors"
          >
            Start Access
          </button>
        </div>
      </main>

      <footer className="mt-10 text-[11px] text-slate-500 flex flex-col items-center gap-2">
        <p className={inter.className}>Serving Washtenaw County food service establishments</p>
        <div className="flex gap-5">
          <Link href="/terms" className="hover:text-slate-800 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-800 transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-slate-800 transition-colors">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default function Page() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [isPollingSubscription, setIsPollingSubscription] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const pollIntervalRef = useRef(null)

  const [supabase] = useState(() => createClient())
  const router = useRouter()

  // close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // keep chat scrolled to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // initial auth + subscription check
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

          if (searchParams.get('showPricing') === 'true') {
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
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
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

  // poll Stripe after returning from checkout
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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
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
    } catch (error) {
      console.error('Sign out error', error)
    } finally {
      setSession(null)
      setHasActiveSubscription(false)
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
    const file = e.target.files && e.target.files[0]
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
      <div className="fixed inset-0 bg-gradient-to-br from-sky-50 via-slate-50 to-slate-200 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  // any logged-in user goes straight to chat UI
  const canUseApp = !!session

  return (
    <>
      <style jsx global>{`
        body {
          background: radial-gradient(circle at top left, #e0f2fe 0, #f9fafb 55%);
          color: #020617;
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
          background: rgba(148, 163, 184, 0.75);
          border-radius: 3px;
        }
      `}</style>

      {isPollingSubscription && <SubscriptionPollingBanner />}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 via-slate-50 to-slate-200 text-slate-900 flex flex-col">
        <div className={`flex flex-col flex-1 ${isPollingSubscription ? 'pt-8' : ''}`}>
          <header className="border-b border-sky-200 bg-white/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
              <div
                className={`font-semibold tracking-[0.18em] text-sm md:text-base uppercase ${outfit.className} text-slate-900`}
              >
                protocol<span className="text-sky-500">LM</span>
              </div>

              <div className="flex items-center gap-4">
                {!session ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors ${inter.className}`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className={`inline-flex items-center gap-2 btn-press bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-500 text-slate-900 hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-400 px-3 py-2 rounded-full text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] shadow-[0_12px_30px_rgba(16,185,129,0.7)] border border-white/80 ${inter.className}`}
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
                        className="p-2 rounded-full text-slate-700 hover:text-slate-900 hover:bg-sky-100/80 transition-colors border border-sky-200 bg-white/70"
                      >
                        <Icons.Plus />
                      </button>
                    )}
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold bg-white/80 border-sky-200 text-slate-800 shadow-sm"
                      >
                        {session.user.email[0].toUpperCase()}
                      </button>
                      {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-52 bg-white/95 border border-sky-200 rounded-xl shadow-2xl overflow-hidden z-50 p-1 text-xs backdrop-blur-xl">
                          <button
                            onClick={() => setShowPricingModal(true)}
                            className="w-full px-3 py-2 text-left text-slate-700 hover:text-slate-900 hover:bg-sky-50 flex items-center gap-2 rounded-lg transition-colors"
                          >
                            <Icons.Settings /> Subscription
                          </button>
                          <div className="h-px bg-sky-100 my-1" />
                          <button
                            onClick={handleSignOut}
                            className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg transition-colors"
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

          <main className="flex-1 flex flex-col items-center w-full">
            {!canUseApp ? (
              <LandingPage
                onShowPricing={() => setShowPricingModal(true)}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            ) : (
              // OPEN CHAT VIEW (no boxed panel)
              <div className="flex-1 w-full flex justify-center">
                <div className="flex-1 max-w-4xl flex flex-col px-4 md:px-6 pt-4 pb-4">
                  {/* Messages area: takes remaining height, open background */}
                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-4 pb-2"
                  >
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <p
                          className={`text-slate-600 text-sm md:text-base max-w-md leading-relaxed ${inter.className}`}
                        >
                          Ask about Michigan Food Code sections, past Washtenaw enforcement, or
                          upload a photo of your walk-in, prep line, or dish area to check for
                          issues before inspection.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[92%] px-3 py-2.5 rounded-2xl border text-sm md:text-base leading-relaxed whitespace-pre-wrap shadow-[0_10px_24px_rgba(148,163,184,0.6)] ${
                              msg.role === 'user'
                                ? 'border-sky-300 bg-gradient-to-br from-sky-400 to-sky-500 text-white'
                                : 'border-slate-200 bg-white/80 text-slate-900 backdrop-blur-md'
                            }`}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="rounded-xl mb-3 max-h-72 object-contain border border-white/70"
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
                              <div>{msg.content}</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input area pinned to bottom of content area */}
                  <div className="mt-3">
                    {selectedImage && (
                      <div className="mb-2 mx-1 p-2.5 inline-flex items-center gap-3 rounded-full shadow-sm border bg-white/80 border-sky-200 text-slate-800 text-xs">
                        <span className="font-semibold tracking-[0.12em] uppercase">
                          Image attached
                        </span>
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <div
                      className="
                        relative flex items-center w-full px-2.5 py-1.5 rounded-full shadow-[0_16px_40px_rgba(148,163,184,0.75)]
                        border bg-white/90 border-sky-200 backdrop-blur-xl
                        focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-200
                      "
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
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        className="w-9 h-9 flex items-center justify-center rounded-full mr-2 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-all border border-sky-200"
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
                        placeholder="Ask about code sections, enforcement history, or attach a photo of your line or walk-in."
                        className={`flex-1 max-h-[140px] min-h-[38px] py-1.5 px-2 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none resize-none text-sm md:text-base leading-relaxed ${inter.className} text-slate-900 placeholder-slate-400`}
                        rows={1}
                      />
                      <button
                        type="submit"
                        onClick={handleSend}
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ml-2 transition-all duration-200 border ${
                          !input.trim() && !selectedImage
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-500 text-slate-900 hover:from-emerald-100 hover:via-emerald-200 hover:to-emerald-400 shadow-[0_10px_26px_rgba(16,185,129,0.8)] border-white/80'
                        }`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </div>
                    <p
                      className={`mt-2 text-[11px] text-center text-slate-500 ${inter.className}`}
                    >
                      protocolLM uses AI and may make mistakes. Always confirm critical food
                      safety decisions with official regulations and your local health department.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
