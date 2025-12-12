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
          window.location.reload()
        }, 1000)
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
      className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#020617] border border-emerald-900/80 rounded-sm w-full max-w-md p-8 shadow-2xl text-emerald-100 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2
              className={`text-xl md:text-2xl font-semibold text-emerald-100 mb-1 tracking-tight ${outfit.className}`}
            >
              {mode === 'signin' && 'Sign in to protocolLM'}
              {mode === 'signup' && 'Create access'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs md:text-sm text-emerald-400 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email for this location.'}
              {mode === 'signup' && 'Set up access for your restaurant.'}
              {mode === 'reset' && 'We’ll email you a reset link.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-500 hover:text-emerald-300 transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-emerald-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              placeholder="gm@yourrestaurant.com"
              required
              className="w-full bg-[#020617] border border-emerald-800 rounded-sm px-3 py-2.5 text-sm text-emerald-100 placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-emerald-300 mb-1">
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
                  className="w-full bg-[#020617] border border-emerald-800 rounded-sm px-3 py-2.5 pr-9 text-sm text-emerald-100 placeholder-emerald-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-300"
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
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2.5 rounded-sm text-xs uppercase tracking-[0.18em] transition-colors border border-emerald-300 disabled:opacity-60"
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
            className={`mt-5 p-3 rounded-sm text-xs border font-mono ${
              message.startsWith('Error')
                ? 'bg-red-950 border-red-500 text-red-100'
                : 'bg-emerald-950 border-emerald-500 text-emerald-100'
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
                className="text-emerald-400 hover:text-emerald-200 transition-colors block w-full"
              >
                Forgot password?
              </button>
              <div className="text-emerald-500/80">
                No account yet?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-emerald-300 font-semibold hover:underline"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="text-emerald-500/80">
              Already have access?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-emerald-300 font-semibold hover:underline"
              >
                Sign in
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <button
              onClick={() => setMode('signin')}
              className="text-emerald-400 hover:text-emerald-200 transition-colors"
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
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#020617] border border-emerald-900/80 rounded-sm p-8 md:p-9 shadow-2xl text-emerald-100 font-mono">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-emerald-500 hover:text-emerald-300 transition-colors"
        >
          <Icons.X />
        </button>
        <div className="mb-7 text-center">
          <h3
            className={`text-xs font-semibold text-emerald-400 uppercase tracking-[0.25em] mb-2 ${outfit.className}`}
          >
            PROTOCOLLM · ACCESS
          </h3>
          <p
            className={`text-lg md:text-2xl font-semibold text-emerald-100 mb-1 tracking-tight ${outfit.className}`}
          >
            Single-site compliance plan
          </p>
          <p className={`text-sm text-emerald-400/90 max-w-xl mx-auto ${inter.className}`}>
            Designed for GMs and owners who want fewer surprises on inspection day.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="border border-emerald-900/80 rounded-sm p-5 bg-black/60">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-500 mb-1.5">
                Compliance Plan
              </p>
              <div className="flex items-baseline mb-1.5">
                <span
                  className={`text-3xl md:text-4xl font-semibold text-emerald-300 tracking-tight ${outfit.className}`}
                >
                  $100
                </span>
                <span className="ml-2 text-emerald-500 text-[11px] font-medium uppercase tracking-wide">
                  /month · per site
                </span>
              </div>
              <p className={`text-sm text-emerald-400 mb-3.5 ${inter.className}`}>
                Includes roughly <span className="font-semibold">1,300 monthly checks</span>{' '}
                for one restaurant. Text questions count as one check; photo analyses count as two.
              </p>
              <ul className="space-y-1.5 text-sm text-emerald-300">
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
                className={`w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2.5 rounded-sm text-xs uppercase tracking-[0.18em] transition-colors border border-emerald-300 ${
                  loading && loading !== 'monthly' ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {loading === 'monthly' ? 'Processing…' : 'Monthly · Start Free Trial'}
              </button>
              <button
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading && loading !== 'annual'}
                className={`w-full bg-[#020617] border border-dashed border-emerald-500/80 text-emerald-200 font-semibold py-2.5 rounded-sm text-xs uppercase tracking-[0.18em] hover:bg-emerald-900/40 transition-colors ${
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
  <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-emerald-800 px-4 py-2">
    <div className="max-w-4xl mx-auto flex items-center justify-between text-emerald-200 font-mono">
      <div className="flex items-center gap-3">
        <Icons.Clock />
        <div>
          <p className="text-xs font-semibold">Activating your subscription…</p>
          <p className="text-[11px] text-emerald-400">
            This usually completes within a few seconds.
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
        <div
          className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
          style={{ animationDelay: '0.1s' }}
        />
        <div
          className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
          style={{ animationDelay: '0.2s' }}
        />
      </div>
    </div>
  </div>
)

const LandingPage = ({ onShowPricing, onOpenAuth }) => {
  return (
    <div className="w-full min-h-full flex flex-col items-center justify-center bg-[#020617] text-emerald-100 font-mono">
      <main className="w-full max-w-3xl px-6 text-center">
        <p
          className={`text-[11px] font-semibold tracking-[0.22em] uppercase text-emerald-500 mb-3 ${inter.className}`}
        >
          WASHTENAW COUNTY · FOOD SAFETY
        </p>
        <h1
          className={`text-3xl md:text-4xl font-semibold mb-4 text-emerald-100 leading-snug ${outfit.className}`}
        >
          Food safety compliance for Washtenaw County.
        </h1>
        <p
          className={`text-sm md:text-base text-emerald-400 mb-8 leading-relaxed ${inter.className}`}
        >
          Get instant, code-backed guidance using the Michigan Modified Food Code and local
          enforcement history—before the inspector walks in.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-sm border border-emerald-400 text-emerald-200 text-sm font-semibold tracking-[0.14em] uppercase hover:bg-emerald-900/40 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={onShowPricing}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-sm bg-emerald-500 text-black text-sm font-semibold tracking-[0.16em] uppercase border border-emerald-300 hover:bg-emerald-400 transition-colors"
          >
            Create Account
          </button>
        </div>
      </main>

      <footer className="mt-12 text-[11px] text-emerald-500/80 flex flex-col items-center gap-2">
        <p className={inter.className}>Serving Washtenaw County food service establishments</p>
        <div className="flex gap-5">
          <Link href="/terms" className="hover:text-emerald-300 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-emerald-300 transition-colors">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-emerald-300 transition-colors">
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
  const [checkoutLoading, setCheckoutLoading] = useState(null) // 'monthly' | 'annual' | null
  const [isPollingSubscription, setIsPollingSubscription] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', content, image? }[]
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
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-emerald-500/50 border-t-emerald-300 rounded-full animate-spin" />
      </div>
    )
  }

  const canUseApp = session && hasActiveSubscription

  return (
    <>
      <style jsx global>{`
        body {
          background-color: #020617;
          color: #e5f4d3;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
            'Courier New', monospace;
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
          background: #020617;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.6);
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

      <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-emerald-100 font-mono">
        <div
          className={`relative z-10 flex flex-col min-h-screen ${
            isPollingSubscription ? 'pt-10' : ''
          }`}
        >
          <header className="border-b z-30 border-emerald-900/80 bg-black/90">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
              <div className="flex items-center">
                <div
                  className={`font-semibold tracking-[0.18em] text-sm md:text-base uppercase ${outfit.className} text-emerald-300`}
                >
                  protocol<span className="text-emerald-500">LM</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {!session ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`text-xs md:text-sm font-semibold text-emerald-400 hover:text-emerald-200 transition-colors ${inter.className}`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className={`inline-flex items-center gap-2 btn-press bg-emerald-500 text-black hover:bg-emerald-400 px-3 py-2 rounded-sm text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors border border-emerald-300 ${inter.className}`}
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
                        className="p-2 rounded-sm text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/40 transition-colors border border-transparent hover:border-emerald-700"
                      >
                        <Icons.Plus />
                      </button>
                    )}
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-8 h-8 rounded-sm border flex items-center justify-center text-xs font-bold bg-emerald-900/40 border-emerald-700 text-emerald-200"
                      >
                        {session.user.email[0].toUpperCase()}
                      </button>
                      {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-52 bg-black border border-emerald-900/80 rounded-sm shadow-xl overflow-hidden z-50 p-1 text-xs">
                          <button
                            onClick={() => setShowPricingModal(true)}
                            className="w-full px-3 py-2 text-left text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/40 flex items-center gap-2 rounded-sm transition-colors"
                          >
                            <Icons.Settings /> Subscription
                          </button>
                          <div className="h-px bg-emerald-900 my-1" />
                          <button
                            onClick={handleSignOut}
                            className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-950 flex items-center gap-2 rounded-sm transition-colors"
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

          <main className="flex-1 flex flex-col items-center justify-start w-full">
            {!canUseApp ? (
              <LandingPage
                onShowPricing={() => setShowPricingModal(true)}
                onOpenAuth={() => setShowAuthModal(true)}
              />
            ) : (
              <>
                {/* messages area */}
                <div
                  className="flex-1 overflow-y-auto w-full py-4 bg-[#020617]"
                  ref={scrollRef}
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <p
                        className={`text-emerald-500/80 text-sm md:text-base max-w-md leading-relaxed ${inter.className}`}
                      >
                        Ask about Michigan Food Code sections, past Washtenaw enforcement, or
                        upload a photo of your walk-in, prep line, or dish area to check for
                        issues before inspection.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col w-full max-w-4xl mx-auto py-4 px-4 gap-4">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[90%] px-3 py-2 rounded-sm border text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
                              msg.role === 'user'
                                ? 'border-amber-400/70 bg-black/70 text-amber-100'
                                : 'border-emerald-700 bg-black/60 text-emerald-100'
                            }`}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="rounded-sm mb-3 max-h-72 object-contain border border-emerald-800"
                              />
                            )}
                            {msg.role === 'assistant' &&
                            msg.content === '' &&
                            isSending &&
                            idx === messages.length - 1 ? (
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                                <div
                                  className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.1s' }}
                                />
                                <div
                                  className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.2s' }}
                                />
                              </div>
                            ) : (
                              <div>{msg.content}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* input area */}
                <div className="w-full shrink-0 z-20 border-t bg-black border-emerald-900/80">
                  <div className="w-full max-w-4xl mx-auto px-4 pt-3 pb-5">
                    {selectedImage && (
                      <div className="mb-3 mx-1 p-2.5 inline-flex items-center gap-3 rounded-sm shadow-sm border bg-black/70 border-emerald-800 text-emerald-200 text-xs">
                        <span className="font-semibold tracking-[0.12em] uppercase">
                          Image attached
                        </span>
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="text-emerald-500 hover:text-emerald-300"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <div
                      className="
                        relative flex items-center w-full px-2.5 py-1.5 rounded-sm shadow-sm
                        border transition-all bg-black/70 border-emerald-800
                        focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/60
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
                        className="w-8 h-8 flex items-center justify-center rounded-sm mr-2 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/80 transition-all border border-emerald-700"
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
                        className={`flex-1 max-h-[140px] min-h-[38px] py-1.5 px-2 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none resize-none text-sm md:text-base leading-relaxed ${inter.className} text-emerald-100 placeholder-emerald-600`}
                        rows={1}
                      />
                      <button
                        type="submit"
                        onClick={handleSend}
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ml-2 transition-all duration-200 border ${
                          !input.trim() && !selectedImage
                            ? 'bg-emerald-900/40 text-emerald-700 border-emerald-900 cursor-not-allowed'
                            : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-md border-emerald-300'
                        }`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </div>
                    <p
                      className={`mt-2.5 text-[11px] text-center text-emerald-500/80 ${inter.className}`}
                    >
                      protocolLM uses AI and may make mistakes. Always confirm critical food
                      safety decisions with official regulations and your local health department.
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
