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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M5 14l.8 2.6L8.5 17l-2.7.9L5 20l-.8-2.1L1.5 17l2.7-.4L5 14z" />
    </svg>
  ),
}

function LandingPage({ onShowPricing, onShowAuth, shellRef }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-14 sm:py-16">
      <div className="max-w-6xl w-full">
        <div className="ui-shell" ref={shellRef}>
          <div className="ui-hero">
            <div className="ui-kickers">
              <span className={`ui-kicker ${inter.className}`}>
                <Icons.Shield /> Inspection-grade
              </span>
              <span className={`ui-kicker-muted ${inter.className}`}>Washtenaw-first · enterprise posture</span>
            </div>

            <h1 className={`ui-title ${outfit.className}`}>Compliance you can run your restaurant on.</h1>

            <p className={`ui-subtitle ${inter.className}`}>
              A premium compliance console built for operators who take inspections seriously. Get grounded answers, photo risk scans, and
              actionable close/open checklists — without digging through manuals.
            </p>

            <div className="ui-cta-row" aria-label="Primary actions">
              <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                Start trial
              </button>
              <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                Sign in
              </button>
            </div>

            <div className={`ui-trust ${inter.className}`} aria-label="Product highlights">
              <span className="ui-trust-item">
                <Icons.Lock /> Secure by design
              </span>
              <span className="ui-dot" aria-hidden="true" />
              <span className="ui-trust-item">
                <Icons.Spark /> Operator-focused
              </span>
              <span className="ui-dot" aria-hidden="true" />
              <span className="ui-trust-item">
                <Icons.Shield /> Built for audits
              </span>
            </div>
          </div>

          <div className="ui-specgrid" role="list" aria-label="Features">
            <div className="ui-spec" role="listitem">
              <div className={`ui-spec-title ${inter.className}`}>Photo risk scan</div>
              <div className={`ui-spec-body ${inter.className}`}>
                Upload a walk-in or line photo. Get a tight list of likely issues to verify — fast.
              </div>
            </div>

            <div className="ui-spec" role="listitem">
              <div className={`ui-spec-title ${inter.className}`}>Grounded answers</div>
              <div className={`ui-spec-body ${inter.className}`}>
                Ask normal questions like “How should we store raw poultry?” and get rulebook-backed guidance.
              </div>
            </div>

            <div className="ui-spec" role="listitem">
              <div className={`ui-spec-title ${inter.className}`}>Action checklist</div>
              <div className={`ui-spec-body ${inter.className}`}>
                Convert concerns into a short close/open list your lead can run — today.
              </div>
            </div>
          </div>

          <div className={`ui-footerline ${inter.className}`}>One site license per restaurant · 7-day trial · Cancel anytime</div>
        </div>

        <footer className="pt-10 text-xs text-white/55">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/terms" className="hover:text-white/80 focus-visible:ui-focus">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white/80 focus-visible:ui-focus">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white/80 focus-visible:ui-focus">
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

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

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
      className="fixed inset-0 z-[999] ui-overlay flex items-center justify-center px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md ui-modal p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/70 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="ui-icon-btn focus-visible:ui-focus" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/75 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className={`ui-input ${inter.className}`}
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-white/75 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`ui-input pr-16 ${inter.className}`}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xs focus-visible:ui-focus rounded-md px-1"
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs rounded-lg px-3 py-2 ui-toast ${message.startsWith('Error') ? 'ui-toast-err' : 'ui-toast-ok'}`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/75">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full hover:text-white focus-visible:ui-focus rounded-md py-1">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full hover:text-white focus-visible:ui-focus rounded-md py-1">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="hover:text-white focus-visible:ui-focus rounded-md py-1">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="hover:text-white focus-visible:ui-focus rounded-md py-1">
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
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[900] ui-overlay flex items-center justify-center px-4" onClick={onClose} role="presentation">
      <div
        className="w-full max-w-xl ui-modal p-7 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pricing"
      >
        <button onClick={onClose} className="ui-icon-btn absolute right-6 top-6 focus-visible:ui-focus" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-6">
          <div className={`ui-tag ${inter.className}`}>Enterprise • Single site license</div>
          <h3 className={`text-2xl font-semibold text-white mb-2 tracking-tight ${outfit.className}`}>protocolLM Access</h3>
          <p className={`text-sm text-white/70 ${inter.className}`}>
            For operators who want inspection-grade confidence. Includes full chat + photo scanning.
          </p>
        </div>

        <div className="ui-pricewrap p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-semibold text-white tracking-tight ${outfit.className}`}>$200</span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">/ month</span>
              </div>
              <p className={`text-xs text-white/70 mt-2 ${inter.className}`}>
                Includes roughly <span className="font-semibold text-white">2,600 monthly checks</span>. Text questions count as one check;
                photo analyses count as two.
              </p>
            </div>

            <div className={`ui-badge ${inter.className}`}>
              <Icons.Shield />
              Premium tier
            </div>
          </div>

          <div className="ui-divider my-5" />

          <ul className="text-xs text-white/80 space-y-2">
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Text + photo compliance checks</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Grounded in Michigan Food Code &amp; Washtenaw guidance</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>One restaurant site license</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>7-day free trial · cancel anytime</span>
            </li>
          </ul>

          <div className="space-y-3 pt-5">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? 'Processing…' : 'Start $200/mo trial'}
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="ui-btn ui-btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'annual' ? 'Processing…' : 'Annual · save 15%'}
            </button>

            <p className={`text-[11px] text-white/60 text-center ${inter.className}`}>
              Not for hobbyists. Built for real operators who want inspection-ready workflows.
            </p>
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

  // Landing-only parallax refs (independent “card motion”)
  const landingScrollRef = useRef(null)
  const landingShellRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  const scrollToBottom = (behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 120
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < threshold
  }

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom('auto'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => scrollToBottom('auto'))
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

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('ui-enterprise-bg')
    return () => {
      document.body.classList.remove('ui-enterprise-bg')
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

  // Landing-only: scroll parallax to make the glass card feel independent of the scroll layer.
  useEffect(() => {
    const scroller = landingScrollRef.current
    const shell = landingShellRef.current
    if (!scroller || !shell) return

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduce) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = scroller.scrollTop
        // Subtle “lag”: card moves a little as you scroll, capped to stay premium (not gimmicky).
        const parallaxPx = Math.min(26, y * 0.085)
        shell.style.setProperty('--shell-parallax-y', `${parallaxPx}px`)

        // Micro tilt adds that iOS “layered glass” feeling without looking like a game UI.
        const tilt = Math.max(-0.5, Math.min(0.5, (y - 120) * 0.0012))
        shell.style.setProperty('--shell-tilt', `${tilt}deg`)
      })
    }

    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [isLoading, session])

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
    shouldAutoScrollRef.current = true
    requestAnimationFrame(() => scrollToBottom('auto'))
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

    shouldAutoScrollRef.current = true

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
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" aria-label="Loading" />
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
        }

        /* --- Premium “Amex black” base + Liquid Glass system tokens --- */
        :root {
          --bg: #050607;
          --bg-2: #07080b;
          --text: rgba(255, 255, 255, 0.92);
          --muted: rgba(255, 255, 255, 0.72);
          --muted-2: rgba(255, 255, 255, 0.62);
          --hairline: rgba(255, 255, 255, 0.10);

          /* Glass tuning (Apple-esque: bright rim, inner highlight, strong blur) */
          --glass-fill: rgba(255, 255, 255, 0.06);
          --glass-fill-2: rgba(255, 255, 255, 0.04);
          --glass-stroke: rgba(255, 255, 255, 0.14);
          --glass-stroke-soft: rgba(255, 255, 255, 0.09);

          --shadow-1: 0 24px 80px rgba(0, 0, 0, 0.60);
          --shadow-2: 0 40px 120px rgba(0, 0, 0, 0.78);

          /* Accent (subtle, not neon) */
          --accent-cyan: rgba(0, 255, 200, 0.18);
          --accent-indigo: rgba(120, 90, 255, 0.18);
        }

        body.ui-enterprise-bg {
          overflow: hidden;
          background: var(--bg);
          color: var(--text);
        }

        /* Background: no visible grid. Studio gradients + vignette + optional noise. */
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;

          /* “Black card” studio lighting */
          background:
            radial-gradient(900px 520px at 18% 12%, rgba(0, 255, 200, 0.06), transparent 60%),
            radial-gradient(900px 520px at 82% 10%, rgba(120, 90, 255, 0.06), transparent 60%),
            radial-gradient(1100px 520px at 50% -6%, rgba(255, 255, 255, 0.10), transparent 55%),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02), transparent 30%, rgba(0, 0, 0, 0.25));

          opacity: 1;
          transform: translateZ(0);
          animation: bgDrift 14s ease-in-out infinite;
        }

        /* Subtle vignette to anchor content */
        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 30%, transparent 0%, rgba(0, 0, 0, 0.62) 72%);
          opacity: 0.95;
        }

        /* Optional: “film grain” noise (no external assets). Keep very subtle. */
        .ui-noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.05;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E");
          background-size: 220px 220px;
        }

        @keyframes bgDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            filter: saturate(1) contrast(1);
          }
          50% {
            transform: translate3d(0, -6px, 0) scale(1.01);
            filter: saturate(1.04) contrast(1.02);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            filter: saturate(1) contrast(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          body.ui-enterprise-bg::before {
            animation: none !important;
          }
          .ui-noise {
            display: none;
          }
        }

        ::-webkit-scrollbar {
          width: 9px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.14);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.20);
        }

        /* Accessible focus helper */
        .ui-focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12), 0 0 0 6px rgba(0, 255, 200, 0.08);
        }

        /* Overlay */
        .ui-overlay {
          background: rgba(0, 0, 0, 0.66);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* Header: glass bar */
        .ui-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(7, 8, 11, 0.58);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .ui-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--glass-stroke-soft);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
          position: relative;
          overflow: hidden;
        }

        .ui-brand::before {
          content: '';
          position: absolute;
          inset: -60% -40%;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.14), transparent 45%);
          transform: translate3d(0, 0, 0);
          pointer-events: none;
          opacity: 0.7;
        }

        /* Liquid Glass Shell (Landing card) */
        .ui-shell {
          position: relative;
          border-radius: 22px;
          overflow: hidden;

          /* Glass recipe: fill + blur + inner highlight + edge stroke */
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.035));
          border: 1px solid var(--glass-stroke);
          box-shadow: var(--shadow-2);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);

          /* Independent layer motion variables */
          --shell-parallax-y: 0px;
          --shell-tilt: 0deg;
          transform: translate3d(0, var(--shell-parallax-y), 0) rotate(var(--shell-tilt));
          transform-origin: 50% 18%;
          will-change: transform;
        }

        /* Specular highlight band (Apple glass vibe) */
        .ui-shell::before {
          content: '';
          position: absolute;
          inset: -1px;
          pointer-events: none;
          background:
            radial-gradient(800px 320px at 50% 0%, rgba(255, 255, 255, 0.14), transparent 55%),
            radial-gradient(600px 280px at 18% 16%, rgba(0, 255, 200, 0.08), transparent 58%),
            radial-gradient(700px 320px at 86% 14%, rgba(120, 90, 255, 0.08), transparent 58%);
          opacity: 0.9;
          filter: blur(10px);
        }

        /* Inner stroke for that “machined premium” edge */
        .ui-shell::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 22px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 0 0 1px rgba(0, 0, 0, 0.35);
          opacity: 1;
        }

        .ui-hero {
          padding: 28px 22px 20px;
          position: relative;
          z-index: 1;
        }

        .ui-kickers {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }

        .ui-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.88);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .ui-kicker-muted {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.68);
        }

        .ui-title {
          font-size: clamp(30px, 4vw, 56px);
          line-height: 1.02;
          letter-spacing: -0.05em;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.98);
        }

        /* Increased contrast for readability */
        .ui-subtitle {
          font-size: 14px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.74);
          max-width: 72ch;
        }

        .ui-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .ui-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.68);
        }
        .ui-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.03);
        }
        .ui-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        .ui-specgrid {
          display: grid;
          grid-template-columns: 1fr;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          position: relative;
          z-index: 1;
        }
        .ui-spec {
          padding: 18px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ui-spec:first-child {
          border-top: none;
        }
        .ui-spec-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.94);
          margin-bottom: 6px;
        }
        .ui-spec-body {
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.70);
          max-width: 76ch;
        }
        @media (min-width: 920px) {
          .ui-specgrid {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .ui-spec {
            border-top: none;
            border-left: 1px solid rgba(255, 255, 255, 0.08);
          }
          .ui-spec:first-child {
            border-left: none;
          }
        }

        .ui-footerline {
          padding: 14px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          position: relative;
          z-index: 1;
        }

        /* Buttons: premium contrast, glass secondary */
        .ui-btn {
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
          user-select: none;
        }
        .ui-btn:active {
          transform: translateY(1px);
        }
        .ui-btn:focus-visible {
          /* Tailwind class hook below uses ui-focus, but keep safety here */
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.14), 0 0 0 6px rgba(0, 255, 200, 0.10);
        }

        .ui-btn-primary {
          background: rgba(255, 255, 255, 0.92);
          color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.20);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.52);
        }
        .ui-btn-primary:hover {
          background: #ffffff;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.62);
        }

        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .ui-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .ui-icon-btn {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.90);
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .ui-icon-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.20);
          color: rgba(255, 255, 255, 1);
        }
        .ui-icon-btn:active {
          transform: translateY(1px);
        }

        /* Modals: liquid glass panel */
        .ui-modal {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.04));
          box-shadow: var(--shadow-2);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          position: relative;
          overflow: hidden;
        }
        .ui-modal::before {
          content: '';
          position: absolute;
          inset: -40% -30%;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.14), transparent 45%),
            radial-gradient(circle at 78% 20%, rgba(0, 255, 200, 0.08), transparent 55%),
            radial-gradient(circle at 60% 80%, rgba(120, 90, 255, 0.08), transparent 55%);
          pointer-events: none;
          filter: blur(16px);
          opacity: 0.85;
        }

        .ui-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.94);
          outline: none;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.46);
        }
        .ui-input:focus {
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.06), 0 0 0 8px rgba(0, 255, 200, 0.06);
        }

        .ui-toast {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .ui-toast-ok {
          border-color: rgba(34, 197, 94, 0.40);
        }
        .ui-toast-err {
          border-color: rgba(239, 68, 68, 0.40);
        }

        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.84);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-pricewrap {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
          box-shadow: var(--shadow-1);
          position: relative;
          overflow: hidden;
        }
        .ui-pricewrap::before {
          content: '';
          position: absolute;
          inset: -40% -30%;
          background:
            radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.14), transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(0, 255, 200, 0.08), transparent 55%),
            radial-gradient(circle at 60% 80%, rgba(120, 90, 255, 0.08), transparent 55%);
          pointer-events: none;
          filter: blur(16px);
          opacity: 0.85;
        }

        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.86);
          font-size: 12px;
          font-weight: 700;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .ui-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.10);
        }

        /* Chat bubbles: slightly clearer for legibility on glass */
        .ui-bubble {
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .ui-bubble-user {
          background: rgba(255, 255, 255, 0.92);
          color: #000;
          border-color: rgba(255, 255, 255, 0.20);
        }

        .ui-empty {
          color: rgba(255, 255, 255, 0.70);
        }
      `}</style>

      {/* Premium subtle noise layer (optional but matches Apple/Amex vibe) */}
      <div className="ui-noise" aria-hidden="true" />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div className="h-[100dvh] min-h-0 flex flex-col">
        {/* Skip link for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 ui-btn ui-btn-secondary"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 flex-shrink-0 ui-header">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`ui-brand ${outfit.className}`} aria-label="protocolLM">
                <span className="text-white/95 text-[12px] font-semibold tracking-[0.14em] uppercase">protocolLM</span>
              </div>
              {hasActiveSubscription && (
                <span className={`hidden sm:inline-flex text-[11px] text-white/70 ${inter.className}`}>Active · site license</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className="ui-btn ui-btn-secondary">
                    Sign in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className="ui-btn ui-btn-primary">
                    Start trial
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleNewChat} className="ui-btn ui-btn-secondary hidden sm:inline-flex items-center gap-2">
                    <Icons.Plus />
                    New chat
                  </button>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="ui-icon-btn focus-visible:ui-focus"
                      aria-label="User menu"
                      aria-haspopup="menu"
                      aria-expanded={showUserMenu ? 'true' : 'false'}
                      title={session?.user?.email || 'User'}
                    >
                      <span className="text-xs font-semibold">{session.user.email?.[0]?.toUpperCase() || 'U'}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-52 ui-modal overflow-hidden" role="menu" aria-label="User menu">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/85 hover:text-white hover:bg-white/5 transition-colors focus-visible:ui-focus"
                          role="menuitem"
                        >
                          <Icons.Settings />
                          <span>Subscription</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-white/5 transition-colors focus-visible:ui-focus"
                          role="menuitem"
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

        <main id="main" className="flex-1 min-h-0 flex flex-col">
          {!isAuthenticated ? (
            <div ref={landingScrollRef} className="flex-1 min-h-0 overflow-y-auto">
              <LandingPage
                shellRef={landingShellRef}
                onShowPricing={() => setShowPricingModal(true)}
                onShowAuth={() => setShowAuthModal(true)}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable', paddingBottom: '2px' }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-4">
                    <div className="max-w-xl text-center">
                      <p className={`text-sm leading-relaxed ui-empty ${inter.className}`}>
                        Ask about Michigan Food Code requirements, Washtenaw enforcement actions, or attach a photo for an inspection-grade risk scan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ui-bubble ${msg.role === 'user' ? 'ui-bubble-user' : ''}`}>
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="mb-3 rounded-xl border border-white/10 max-h-64 object-contain bg-black/30"
                            />
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="flex gap-1 items-center" aria-label="Assistant is typing">
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.24s' }} />
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

              <div className="flex-shrink-0 ui-header border-t border-white/10">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/12 bg-white/5 text-[12px] text-white/80 backdrop-blur">
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="ui-icon-btn !w-9 !h-9 focus-visible:ui-focus"
                        aria-label="Remove image"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="ui-icon-btn focus-visible:ui-focus"
                      aria-label="Attach image"
                    >
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`ui-input flex-1 max-h-32 min-h-[44px] resize-none ${inter.className}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                        aria-label="Message"
                      />

                      <button
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`ui-icon-btn focus-visible:ui-focus ${(!input.trim() && !selectedImage) || isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/90 animate-spin" aria-hidden="true" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center text-white/55 ${inter.className}`}>
                    protocolLM may make mistakes. Confirm critical decisions with official regulations and your local health department.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
