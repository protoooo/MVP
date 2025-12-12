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
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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

const LandingPage = ({ onShowPricing }) => {
  return (
    <section className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-20">
        <div className="max-w-3xl w-full text-center space-y-5">
          <p
            className={`text-xs font-semibold tracking-[0.27em] uppercase text-teal-700 ${inter.className}`}
          >
            Washtenaw County · Live
          </p>
          <h1
            className={`text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 leading-tight md:leading-snug ${outfit.className} [text-wrap:balance]`}
          >
            Spot violations before the health inspector.
          </h1>
          <p className={`text-sm sm:text-base text-slate-600 leading-relaxed ${inter.className}`}>
            ProtocolLM watches your food safety the way you watch sales – in real time,
            grounded in local enforcement actions and the Michigan Food Code. Wayne and
            Oakland County support scheduled for 2026.
          </p>
        </div>

        <div className="mt-10 max-w-4xl w-full space-y-6">
          {/* glassy three-up explainer – still GM-friendly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-teal-300/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,118,110,0.18)] p-5 text-left">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-700 mb-2">
                Capture
              </p>
              <p className={`text-sm font-semibold text-slate-900 mb-2 ${outfit.className}`}>
                Turn any device into a health inspector
              </p>
              <p className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${inter.className}`}>
                Snap a quick photo of your walk-in, prep line, or dish area. ProtocolLM
                flags likely issues using your local health-department rules.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-300/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,118,110,0.18)] p-5 text-left">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-700 mb-2">
                Rulebook
              </p>
              <p className={`text-sm font-semibold text-slate-900 mb-2 ${outfit.className}`}>
                We handle the code, you see the risk
              </p>
              <p className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${inter.className}`}>
                Behind the scenes, ProtocolLM reads the Michigan Food Code and Washtenaw
                enforcement history so your team isn’t hunting through PDFs.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-300/60 bg-white/70 backdrop-blur-xl shadow-[0_18px_40px_rgba(15,118,110,0.18)] p-5 text-left">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-700 mb-2">
                Checklist
              </p>
              <p className={`text-sm font-semibold text-slate-900 mb-2 ${outfit.className}`}>
                Turn risk into a quick checklist
              </p>
              <p className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${inter.className}`}>
                Get a clear list of likely violations and corrective actions your shift can
                knock out before the inspector walks in.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onShowPricing}
              className={`glass-button px-8 py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] ${inter.className}`}
            >
              Sign up · Compliance access
            </button>
          </div>
        </div>

        <footer className="mt-10 text-center space-y-3">
          <p className={`text-xs text-slate-500 ${inter.className}`}>
            Serving Washtenaw County food service establishments
          </p>
          <div className="flex justify-center gap-6 text-xs font-medium text-slate-500">
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
    </section>
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
          if (onSuccess) onSuccess()
          window.location.href = '/'
        }, 900)
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
      className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-teal-300/70 bg-white/80 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,118,110,0.35)] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2
              className={`text-xl font-semibold text-slate-900 mb-1 tracking-tight ${outfit.className}`}
            >
              {mode === 'signin' && 'Sign in to ProtocolLM'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className={`text-sm text-slate-600 ${inter.className}`}>
              {mode === 'signin' && 'Use the email you’ll use for inspections and line checks.'}
              {mode === 'signup' && 'One login per restaurant site license.'}
              {mode === 'reset' && "We'll send you a reset link."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100"
          >
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="gm@restaurant.com"
              required
              className="w-full rounded-lg border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/80 focus:border-teal-500"
            </input>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white/70 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/80 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className={`glass-button w-full py-2.5 rounded-lg text-[11px] font-semibold uppercase tracking-[0.2em] ${
              !isLoaded || loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading
              ? 'Processing...'
              : !isLoaded
              ? 'Loading...'
              : mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
              ? 'Create account'
              : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
              message.startsWith('Error')
                ? 'border-red-300 bg-red-50 text-red-800'
                : 'border-teal-300 bg-teal-50 text-teal-800'
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-5 text-center space-y-1.5 text-sm">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="block w-full text-slate-600 hover:text-slate-900"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-teal-700 font-semibold hover:underline"
              >
                Need an account? Sign up
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-slate-600 hover:text-slate-900"
            >
              Already have an account? Sign in
            </button>
          )}
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-slate-600 hover:text-slate-900"
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
    <div className="fixed inset-0 z-[900] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-teal-300/70 bg-white/85 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,118,110,0.35)] p-8 md:p-9">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100"
        >
          <Icons.X />
        </button>

        <div className="mb-6 text-center">
          <p
            className={`text-[11px] font-semibold tracking-[0.27em] uppercase text-teal-700 mb-2 ${inter.className}`}
          >
            ProtocolLM · Site license
          </p>
          <p
            className={`text-lg md:text-xl font-semibold text-slate-900 tracking-tight ${outfit.className}`}
          >
            Compliance plan
          </p>
          <p className={`mt-1 text-sm text-slate-600 ${inter.className}`}>
            Built for a single restaurant. Unlimited users on your team.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-teal-300/70 bg-white/80 p-6 space-y-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-semibold text-slate-900 tracking-tight ${outfit.className}`}
                >
                  $100
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  / month
                </span>
              </div>
              <p className={`mt-2 text-sm text-slate-600 ${inter.className}`}>
                Includes roughly <span className="font-semibold">1,300 monthly checks</span>{' '}
                for one location. Text questions count as one check; photo analyses count
                as two.
              </p>
            </div>

            <ul className="text-sm text-slate-700 space-y-1.5">
              <li className="flex gap-2 items-start">
                <Icons.Check />
                <span>Questions about Michigan Food Code &amp; local guidance</span>
              </li>
              <li className="flex gap-2 items-start">
                <Icons.Check />
                <span>Image checks for walk-ins, prep lines, and service areas</span>
              </li>
              <li className="flex gap-2 items-start">
                <Icons.Check />
                <span>Designed for a single restaurant site license</span>
              </li>
            </ul>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                disabled={!!loading && loading !== 'monthly'}
                className={`glass-button w-full py-3 rounded-lg text-[11px] font-semibold uppercase tracking-[0.2em] ${
                  loading && loading !== 'monthly' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading === 'monthly' ? 'Starting checkout…' : 'Start monthly access'}
              </button>
              <button
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading && loading !== 'annual'}
                className={`w-full py-3 rounded-lg text-[11px] font-semibold uppercase tracking-[0.2em] border border-teal-400/70 text-teal-800 bg-teal-50/70 hover:bg-teal-100/80 transition-colors ${
                  loading && loading !== 'annual' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading === 'annual' ? 'Starting checkout…' : 'Annual · Save 15%'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SubscriptionPollingBanner = () => (
  <div className="fixed top-0 left-0 right-0 z-40 bg-teal-50/95 border-b border-teal-200 px-4 py-2">
    <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icons.Clock />
        <p className="text-xs font-medium text-teal-900">
          Activating your subscription… usually just a few seconds.
        </p>
      </div>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce" />
        <div
          className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce"
          style={{ animationDelay: '0.08s' }}
        />
        <div
          className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce"
          style={{ animationDelay: '0.16s' }}
        />
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
            console.warn('Auth check timeout, showing page')
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
            .select('status, current_period_end')
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
        } else {
          setHasActiveSubscription(false)
        }
      } catch (e) {
        console.error('Auth init error', e)
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
  }, [supabase, isLoading])

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
            'Subscription activation is taking longer than expected. Please refresh in a moment or contact support.'
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
          throw new Error(data.error || 'Service temporarily unavailable.')
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
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const signedIn = !!session

  return (
    <>
      <style jsx global>{`
        body {
          background: radial-gradient(circle at top, #e0f7fa 0, #f1f5f9 40%, #e5edf7 100%);
          color: #020617;
        }
        .glass-button {
          background: linear-gradient(145deg, rgba(45, 212, 191, 0.95), rgba(56, 189, 248, 0.95));
          color: #022c22;
          box-shadow: 0 14px 30px rgba(13, 148, 136, 0.42);
          border: 1px solid rgba(34, 197, 235, 0.9);
          transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease;
        }
        .glass-button:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(13, 148, 136, 0.5);
        }
        .glass-button:active {
          transform: translateY(0);
          box-shadow: 0 8px 18px rgba(13, 148, 136, 0.35);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(15, 118, 110, 0.25);
          border-radius: 999px;
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

      <div className="relative min-h-screen w-full">
        <div
          className={`flex flex-col min-h-screen ${
            isPollingSubscription ? 'pt-10 md:pt-12' : ''
          }`}
        >
          {/* header */}
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-slate-200/70">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`text-lg font-semibold tracking-tight text-slate-900 ${outfit.className}`}
                >
                  protocol<span className="text-teal-600">LM</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!signedIn ? (
                  <>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 ${inter.className}`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className={`glass-button rounded-full px-4 sm:px-5 py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] ${inter.className}`}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleNewChat}
                      className="h-8 w-8 rounded-full flex items-center justify-center border border-teal-400/70 bg-white/80 text-teal-700 hover:bg-teal-50"
                    >
                      <Icons.Plus />
                    </button>
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu((v) => !v)}
                        className="h-8 w-8 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shadow-md"
                      >
                        {session.user.email[0].toUpperCase()}
                      </button>
                      {showUserMenu && (
                        <div className="absolute top-10 right-0 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-sm">
                          <button
                            onClick={() => setShowPricingModal(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                          >
                            <Icons.Settings />
                            Subscription
                          </button>
                          <div className="my-1 h-px bg-slate-100" />
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                          >
                            <Icons.LogOut />
                            Log out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col">
            {!signedIn ? (
              <LandingPage onShowPricing={() => setShowPricingModal(true)} />
            ) : (
              <section className="flex-1 flex flex-col">
                {/* messages area – open canvas like ChatGPT */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-24 max-w-4xl mx-auto w-full"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <p
                        className={`text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed ${inter.className}`}
                      >
                        Ask about Michigan Food Code sections, past Washtenaw enforcement
                        actions, or attach a photo of your walk-in or prep line to check
                        for issues before inspection.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 pb-4">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex w-full ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[92%] text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                              msg.role === 'user'
                                ? 'bg-teal-50 border border-teal-200 text-slate-900 rounded-2xl rounded-br-sm px-3 py-2 shadow-sm'
                                : 'bg-white/80 border border-slate-200 text-slate-900 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm'
                            }`}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="rounded-lg mb-3 max-h-80 object-contain border border-slate-200"
                              />
                            )}
                            {msg.role === 'assistant' &&
                            msg.content === '' &&
                            isSending &&
                            idx === messages.length - 1 ? (
                              <div className="flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                                  style={{ animationDelay: '0.08s' }}
                                />
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                                  style={{ animationDelay: '0.16s' }}
                                />
                              </div>
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* input pinned to bottom, always visible */}
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-4">
                    {selectedImage && (
                      <div className="mb-2 inline-flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs text-slate-800">
                        <span className="font-semibold">Image attached</span>
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="text-slate-500 hover:text-slate-800"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <form
                      onSubmit={handleSend}
                      className="flex items-end gap-2 rounded-2xl border border-teal-300/70 bg-white/70 backdrop-blur px-2.5 py-2 shadow-[0_10px_24px_rgba(15,118,110,0.22)]"
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
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                      >
                        <Icons.Camera />
                      </button>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about code sections, enforcement history, or attach a photo of your line or walk-in."
                        className={`flex-1 max-h-32 min-h-[40px] resize-none bg-transparent border-none focus:outline-none text-sm sm:text-base leading-relaxed ${inter.className}`}
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
                        className={`h-9 w-9 flex items-center justify-center rounded-xl ${
                          !input.trim() && !selectedImage
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'glass-button text-slate-900'
                        }`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </form>
                    <p
                      className={`mt-2 text-[10px] text-center text-slate-500 ${inter.className}`}
                    >
                      ProtocolLM uses AI and may make mistakes. Always confirm critical food
                      safety decisions with official regulations and your local health
                      department.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
