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

  // Retro/N64-ish icons for the landing cards (inline SVG; no new deps)
  RetroCamera: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M7 7h2l1-2h4l1 2h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z" />
      <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M8 10h.01" />
    </svg>
  ),
  GamePak: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 4v4h8V4" />
      <path d="M9 12h6" />
      <path d="M9 15h6" />
    </svg>
  ),
  ClipboardCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l-1-2Z" />
      <path d="M9 13l2 2 4-5" />
    </svg>
  ),
}

function LandingPage({ onShowPricing }) {
  const cards = [
    {
      title: 'Capture',
      badge: 'Photo scan',
      icon: <Icons.RetroCamera />,
      body: 'Snap a walk-in or line. Get a quick risk scan in seconds.',
      tint: 'rgba(45, 212, 191, 0.22)',
      anim: 'card-drift-a',
      delay: '0.06s',
    },
    {
      title: 'Rulebook',
      badge: 'Grounded',
      icon: <Icons.GamePak />,
      body: 'Ask Michigan Food Code + Washtenaw context. No PDF digging.',
      tint: 'rgba(59, 130, 246, 0.20)',
      anim: 'card-drift-b',
      delay: '0.12s',
    },
    {
      title: 'Checklist',
      badge: 'Actionable',
      icon: <Icons.ClipboardCheck />,
      body: 'Turn flags into a short close/open list your team can run.',
      tint: 'rgba(168, 85, 247, 0.18)',
      anim: 'card-drift-c',
      delay: '0.18s',
    },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg n64-liquid-panel text-[11px] font-semibold tracking-[0.24em] uppercase text-teal-950/90">
          protocolLM · compliance console
        </div>

        <div className="space-y-4">
          <h1 className={`text-3xl sm:text-4xl md:text-[2.6rem] leading-tight font-semibold text-slate-950 ${outfit.className}`}>
            Be inspection-ready.
          </h1>
          <p className={`text-sm sm:text-base text-slate-700 ${inter.className}`}>
            Ask the Michigan Food Code. Scan photos for likely violations. Washtenaw-first.
          </p>
          <p className={`text-xs text-slate-600 ${inter.className}`}>Washtenaw County today · Wayne + Oakland planned for 2026.</p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {cards.map((c) => (
            <div
              key={c.title}
              className={`rounded-2xl n64-liquid-card p-4 hover-lift transition-all animate-slide-up ${c.anim}`}
              style={{
                animationDelay: c.delay,
                ['--glass-tint']: c.tint,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2">
                  <div className="retro-icon-chip">{c.icon}</div>
                  <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-900">{c.title}</span>
                </div>
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-teal-800/90 n64-pill">{c.badge}</span>
              </div>

              <p className={`text-xs text-slate-700/90 leading-relaxed ${inter.className}`}>{c.body}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onShowPricing}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg n64-liquid-cta text-white text-xs font-semibold tracking-[0.2em] uppercase hover-lift button-press relative overflow-hidden group transition-all animate-float"
        >
          <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
          <Icons.Check />
          <span className="relative">Start trial</span>
        </button>

        <footer className="pt-4 text-xs text-slate-600">
          <p className={`mb-2 ${inter.className}`}>Built for Washtenaw County food service establishments.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-slate-900">
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
    <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl n64-liquid-panel-strong p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-lg font-semibold text-slate-950 tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in to protocolLM'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className={`text-xs text-slate-700 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 n64-liquid-chip text-slate-700 hover:text-slate-950">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className="w-full rounded-lg border-2 border-slate-300/60 bg-gradient-to-br from-white/85 via-slate-50/75 to-white/85 backdrop-blur-sm px-3.5 py-2.5 text-sm text-slate-950 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border-2 border-slate-300/60 bg-gradient-to-br from-white/85 via-slate-50/75 to-white/85 backdrop-blur-sm px-3.5 py-2.5 pr-10 text-sm text-slate-950 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg n64-liquid-cta text-white text-[11px] font-semibold tracking-[0.22em] uppercase py-3 hover-lift button-press disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
          >
            <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
            <span className="relative">
              {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
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

        <div className="mt-4 text-center space-y-1 text-xs text-slate-700">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-teal-700 hover:text-teal-900">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-slate-700 hover:text-slate-950">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-slate-700 hover:text-slate-950">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-slate-700 hover:text-slate-950">
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
    <div className="fixed inset-0 z-[900] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl n64-liquid-panel-strong p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-7 top-7 rounded-lg p-1.5 n64-liquid-chip text-slate-700 hover:text-slate-950">
          <Icons.X />
        </button>

        <div className="mb-6 text-center">
          <p className={`text-[11px] font-semibold tracking-[0.24em] uppercase text-teal-900/90 mb-2 ${outfit.className}`}>protocolLM</p>
          <h3 className={`text-xl font-semibold text-slate-950 mb-1 tracking-tight ${outfit.className}`}>Compliance access</h3>
          <p className={`text-sm text-slate-700 ${inter.className}`}>One site license per restaurant. 7-day free trial included.</p>
        </div>

        <div className="rounded-2xl n64-liquid-card p-5 space-y-4">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-3xl font-semibold text-slate-950 tracking-tight ${outfit.className}`}>$100</span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-600">/ month</span>
            </div>
            <p className={`text-xs text-slate-700 ${inter.className}`}>
              Includes roughly <span className="font-semibold text-slate-900">1,300 monthly checks</span> for a single restaurant. Text questions count as one
              check; photo analyses count as two.
            </p>
          </div>

          <ul className="text-xs text-slate-800 space-y-2">
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
              className="w-full inline-flex items-center justify-center rounded-lg n64-liquid-cta text-white text-[11px] font-semibold tracking-[0.22em] uppercase py-3 hover-lift button-press disabled:opacity-60 relative overflow-hidden group"
            >
              <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
              <span className="relative">{loading === 'monthly' ? 'Processing…' : 'Start monthly trial'}</span>
            </button>
            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="w-full inline-flex items-center justify-center rounded-lg border-2 border-dashed border-teal-400/70 bg-gradient-to-br from-white/70 via-cyan-50/60 to-teal-50/70 backdrop-blur-sm text-[11px] font-semibold tracking-[0.22em] uppercase text-teal-900 py-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] hover:shadow-[0_4px_12px_rgba(20,184,166,0.18),inset_0_1px_2px_rgba(255,255,255,0.7)] hover-lift button-press disabled:opacity-60"
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

  const shouldAutoScrollRef = useRef(true)

  const scrollToBottom = (behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 120 // px from bottom
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

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('bg-gradient-to-br', 'from-cyan-50', 'via-sky-100', 'to-blue-100')
    document.body.classList.add('n64-glass-bg')
    return () => {
      document.body.classList.remove('bg-gradient-to-br', 'from-cyan-50', 'via-sky-100', 'to-blue-100')
      document.body.classList.remove('n64-glass-bg')
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
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-50 via-sky-100 to-blue-100">
        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        /* --- Viewport fit fix (prevents double-100vh and “input off screen” issues) --- */
        html,
        body {
          height: 100%;
          width: 100%;
        }
        body.n64-glass-bg {
          overflow: hidden;
          position: relative;
        }

        /* =========================================================
           N64 TRANSLUCENT PLASTIC  ✕  LIQUID GLASS (PUSHED HARD)
           ========================================================= */

        :root {
          /* global “shell colors” (you can tweak these) */
          --lg-a: 20 184 166; /* teal */
          --lg-b: 34 211 238; /* cyan */
          --lg-c: 124 58 237; /* violet */
          --ink: 15 23 42;

          /* stronger glass + stronger rim */
          --glass-blur: 22px;
          --rim: 2.5px;
          --rim-soft: 0.58;

          /* glass body */
          --g-top: 0.80;
          --g-bot: 0.44;

          /* shadows */
          --sh-1: 0 22px 70px rgba(2, 6, 23, 0.18);
          --sh-2: 0 3px 14px rgba(2, 6, 23, 0.12);
          --sh-in: inset 0 1px 2px rgba(255, 255, 255, 0.70), inset 0 -18px 48px rgba(2, 6, 23, 0.06);

          /* specular */
          --spec: rgba(255, 255, 255, 0.72);
        }

        /* Background stays consistent + PREMIUM: refraction + plastic glow + micro grid */
        body.n64-glass-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle at 16% 12%, rgba(255, 255, 255, 0.74), transparent 42%),
            radial-gradient(circle at 82% 10%, rgba(255, 255, 255, 0.42), transparent 52%),
            radial-gradient(circle at 22% 70%, rgba(var(--lg-a), 0.20), transparent 56%),
            radial-gradient(circle at 86% 74%, rgba(var(--lg-b), 0.16), transparent 58%),
            radial-gradient(circle at 70% 46%, rgba(var(--lg-c), 0.10), transparent 60%),
            conic-gradient(
              from 220deg at 60% 20%,
              rgba(var(--lg-b), 0.10),
              rgba(var(--lg-a), 0.10),
              rgba(var(--lg-c), 0.08),
              rgba(var(--lg-b), 0.10)
            );
          mix-blend-mode: soft-light;
          opacity: 0.98;
          filter: saturate(1.25) contrast(1.02);
        }

        body.n64-glass-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
            radial-gradient(rgba(15, 23, 42, 0.07) 0.55px, transparent 0.65px);
          background-size: 22px 22px, 22px 22px, 5px 5px;
          opacity: 0.18;
        }

        /* “Spectrum line” gets more plastic glow */
        .n64-spectrum-line {
          position: relative;
        }
        .n64-spectrum-line::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: -2px;
          height: 3px;
          background: linear-gradient(90deg, rgba(var(--lg-b), 0.9), rgba(var(--lg-a), 0.95), rgba(59, 130, 246, 0.9), rgba(var(--lg-c), 0.9));
          opacity: 0.62;
          filter: blur(0.2px) saturate(1.25);
        }

        /* Border wrapper gets a thicker iridescent rim */
        .n64-spectrum-border {
          position: relative;
        }
        .n64-spectrum-border::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.55),
            rgba(var(--lg-b), 0.20),
            rgba(var(--lg-a), 0.18),
            rgba(var(--lg-c), 0.16),
            rgba(255, 255, 255, 0.40)
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.62;
        }

        /* ---------- N64 liquid glass surfaces (more of BOTH) ---------- */

        .n64-liquid-panel,
        .n64-liquid-panel-strong,
        .n64-liquid-card {
          position: relative;
          overflow: hidden;
          transform: translateZ(0);

          border: var(--rim) solid rgba(255, 255, 255, var(--rim-soft));
          box-shadow: var(--sh-1), var(--sh-2), var(--sh-in);

          background:
            linear-gradient(180deg, rgba(255, 255, 255, var(--g-top)), rgba(255, 255, 255, var(--g-bot))),
            radial-gradient(140% 90% at 12% 10%, rgba(var(--lg-a), 0.22), transparent 58%),
            radial-gradient(140% 90% at 92% 18%, rgba(var(--lg-b), 0.18), transparent 62%),
            conic-gradient(from 210deg at 70% 30%, rgba(var(--lg-b), 0.08), rgba(var(--lg-c), 0.06), rgba(var(--lg-a), 0.08), rgba(var(--lg-b), 0.08));
        }

        @supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
          .n64-liquid-panel,
          .n64-liquid-panel-strong,
          .n64-liquid-card {
            -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(1.45);
            backdrop-filter: blur(var(--glass-blur)) saturate(1.45);
          }
        }

        /* Liquid refraction + strong specular band */
        .n64-liquid-panel::before,
        .n64-liquid-panel-strong::before,
        .n64-liquid-card::before {
          content: '';
          position: absolute;
          inset: -8%;
          pointer-events: none;
          border-radius: inherit;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.18) 18%, rgba(255, 255, 255, 0.06) 45%, rgba(255, 255, 255, 0.0) 70%),
            radial-gradient(120% 70% at 18% 18%, rgba(255, 255, 255, 0.60), transparent 54%),
            linear-gradient(110deg, transparent 42%, rgba(255, 255, 255, 0.22) 52%, transparent 62%);
          transform: translateY(-10%) rotate(-2deg);
          opacity: 0.92;
        }

        /* N64-ish dither + chroma edge */
        .n64-liquid-panel::after,
        .n64-liquid-panel-strong::after,
        .n64-liquid-card::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background-image:
            radial-gradient(rgba(2, 6, 23, 0.10) 0.55px, transparent 0.65px),
            linear-gradient(90deg, rgba(var(--lg-b), 0.10), rgba(var(--lg-c), 0.08)),
            linear-gradient(0deg, rgba(var(--lg-a), 0.08), rgba(59, 130, 246, 0.06));
          background-size: 6px 6px, 100% 100%, 100% 100%;
          opacity: 0.22;
          mix-blend-mode: soft-light;
        }

        /* Stronger modal glass */
        .n64-liquid-panel-strong {
          --g-top: 0.86;
          --g-bot: 0.50;
          box-shadow: 0 26px 90px rgba(2, 6, 23, 0.22), 0 6px 18px rgba(2, 6, 23, 0.14), var(--sh-in);
          border-color: rgba(255, 255, 255, 0.70);
        }

        /* Card tint hook you already use */
        .n64-liquid-card {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.40)),
            radial-gradient(140% 90% at 12% 10%, rgba(var(--lg-a), 0.18), transparent 60%),
            radial-gradient(140% 90% at 92% 26%, var(--glass-tint, rgba(var(--lg-b), 0.16)), transparent 64%),
            conic-gradient(from 210deg at 70% 30%, rgba(var(--lg-b), 0.08), rgba(var(--lg-c), 0.06), rgba(var(--lg-a), 0.08), rgba(var(--lg-b), 0.08));
        }

        .n64-liquid-card:hover {
          box-shadow: 0 28px 90px rgba(2, 6, 23, 0.18), 0 6px 18px rgba(2, 6, 23, 0.12), var(--sh-in);
        }

        /* Chips */
        .n64-liquid-chip {
          border: 2px solid rgba(255, 255, 255, 0.60);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.44)),
            radial-gradient(120% 80% at 20% 18%, rgba(var(--lg-b), 0.14), transparent 60%);
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.14), inset 0 1px 2px rgba(255, 255, 255, 0.65), inset 0 -12px 26px rgba(2, 6, 23, 0.06);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          backdrop-filter: blur(18px) saturate(1.35);
        }

        /* Pills */
        .n64-pill {
          border: 2px solid rgba(255, 255, 255, 0.58);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.34)),
            radial-gradient(120% 80% at 20% 18%, rgba(var(--lg-a), 0.12), transparent 60%);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.60);
          -webkit-backdrop-filter: blur(16px) saturate(1.35);
          backdrop-filter: blur(16px) saturate(1.35);
        }

        /* Icon chip: more “N64 shell” bevel */
        .retro-icon-chip {
          border: 2px solid rgba(255, 255, 255, 0.62);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.38)),
            radial-gradient(120% 80% at 18% 18%, rgba(var(--lg-b), 0.18), transparent 60%),
            radial-gradient(120% 80% at 84% 30%, rgba(var(--lg-a), 0.14), transparent 62%);
          box-shadow: 0 12px 34px rgba(2, 6, 23, 0.14), inset 0 1px 2px rgba(255, 255, 255, 0.70), inset 0 -14px 30px rgba(2, 6, 23, 0.06);
          -webkit-backdrop-filter: blur(18px) saturate(1.35);
          backdrop-filter: blur(18px) saturate(1.35);
        }

        /* CTA button: thicker rim + glossy top */
        .n64-liquid-cta {
          border: 2px solid rgba(255, 255, 255, 0.45);
          background:
            linear-gradient(180deg, rgba(var(--lg-a), 0.95), rgba(var(--lg-a), 0.62)),
            radial-gradient(120% 80% at 18% 12%, rgba(255, 255, 255, 0.34), transparent 60%),
            linear-gradient(90deg, rgba(var(--lg-b), 0.30), rgba(var(--lg-c), 0.18), rgba(var(--lg-b), 0.26));
          box-shadow: 0 22px 70px rgba(var(--lg-a), 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.44);
          -webkit-backdrop-filter: blur(14px) saturate(1.35);
          backdrop-filter: blur(14px) saturate(1.35);
        }

        /* scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(var(--lg-a), 0.34);
          border-radius: 999px;
        }

        /* --- Your motion (kept) --- */
        @keyframes cardDriftA {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -3px, 0);
          }
        }
        @keyframes cardDriftB {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(1px, -2px, 0);
          }
        }
        @keyframes cardDriftC {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-1px, -3px, 0);
          }
        }
        .card-drift-a {
          animation: cardDriftA 5.8s ease-in-out infinite;
        }
        .card-drift-b {
          animation: cardDriftB 6.6s ease-in-out infinite;
        }
        .card-drift-c {
          animation: cardDriftC 6.2s ease-in-out infinite;
        }

        @keyframes sheenSweep {
          0% {
            transform: translateX(-18%) rotate(10deg);
          }
          100% {
            transform: translateX(22%) rotate(10deg);
          }
        }

        @keyframes buttonPress {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.95);
          }
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -100% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4), 0 0 0 0 rgba(20, 184, 166, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(20, 184, 166, 0), 0 0 0 0 rgba(20, 184, 166, 0.4);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(20, 184, 166, 0), 0 0 0 16px rgba(20, 184, 166, 0);
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
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.36) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        .pulse-ring {
          animation: ripple 2s ease-out infinite;
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .pulse-ring,
          .card-drift-a,
          .card-drift-b,
          .card-drift-c,
          .message-appear,
          .animate-slide-up,
          .animate-slide-down,
          .animate-fade-in,
          .shimmer-effect {
            animation: none !important;
          }
          .hover-lift {
            transition: none !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      {/* SINGLE viewport container; no nested 100dvh (fixes “not visible on load”) */}
      <div className="h-[100dvh] min-h-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex-shrink-0 n64-spectrum-line border-b-2 border-teal-300/60 bg-gradient-to-br from-teal-200/40 via-cyan-100/35 to-blue-200/40 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] animate-slide-down">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1 rounded-lg n64-liquid-panel text-[11px] font-semibold tracking-[0.22em] uppercase text-emerald-900 hover-lift cursor-pointer ${outfit.className}`}
              >
                protocol<span className="text-emerald-700">LM</span>
              </div>
              {hasActiveSubscription && (
                <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-lg border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-200/50 via-teal-100/40 to-emerald-300/50 backdrop-blur-sm text-emerald-950 font-medium tracking-[0.16em] uppercase shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] pulse-ring animate-fade-in">
                  Active · site license
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className={`text-xs font-semibold text-slate-700 hover:text-slate-950 ${inter.className}`}>
                    Sign in
                  </button>
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg n64-liquid-cta text-white text-[11px] font-semibold tracking-[0.22em] uppercase px-4 py-2 hover-lift button-press relative overflow-hidden group"
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
                    className="hidden sm:inline-flex items-center justify-center rounded-full border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/50 via-cyan-100/40 to-sky-300/50 backdrop-blur-sm text-slate-800 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[0_8px_20px_rgba(14,165,233,0.22),inset_0_1px_2px_rgba(255,255,255,0.6)]"
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

        {/* Main: flex-1 + min-h-0 ensures message list is visible immediately */}
        <main className="flex-1 min-h-0 flex flex-col">
          {!isAuthenticated ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LandingPage onShowPricing={() => setShowPricingModal(true)} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Messages container */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{
                  overscrollBehavior: 'contain',
                  scrollbarGutter: 'stable',
                  paddingBottom: '2px',
                }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-4">
                    <p className={`max-w-md text-sm text-slate-700 text-center leading-relaxed ${inter.className}`}>
                      Ask about Michigan Food Code requirements, past Washtenaw enforcement actions, or attach a photo of your walk-in or line to scan for likely
                      violations before inspection.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex w-full message-appear ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div
                          className={`n64-spectrum-border max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed hover-lift transition-all ${
                            msg.role === 'user'
                              ? 'border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/80 via-cyan-400/70 to-teal-500/80 backdrop-blur-sm text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                              : 'border-2 border-slate-300/60 bg-gradient-to-br from-white/80 via-slate-50/70 to-cyan-50/80 backdrop-blur-md text-slate-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]'
                          }`}
                        >
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="mb-3 rounded-xl border-2 border-slate-200/60 max-h-64 object-contain bg-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]"
                            />
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.24s' }} />
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

              {/* Input bar */}
              <div className="flex-shrink-0 n64-spectrum-line border-t-2 border-teal-300/60 bg-gradient-to-br from-teal-200/40 via-cyan-100/35 to-blue-200/40 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/60 via-cyan-100/50 to-sky-300/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] text-[11px] text-slate-800 animate-slide-up">
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="text-slate-600 hover:text-slate-950 transition-colors hover:rotate-90 transition-transform duration-200"
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
                      className="flex items-center justify-center w-9 h-9 rounded-lg border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/60 via-cyan-100/50 to-sky-300/60 backdrop-blur-sm text-slate-700 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] hover-lift button-press transition-all"
                    >
                      <Icons.Camera />
                    </button>
                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a code question or attach a photo."
                        rows={1}
                        className={`flex-1 max-h-32 min-h-[40px] resize-none rounded-2xl border-2 border-slate-300/60 bg-gradient-to-br from-white/80 via-slate-50/70 to-white/80 backdrop-blur-sm px-3.5 py-2 text-sm text-slate-950 placeholder-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 ${inter.className}`}
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
                        {isSending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>
                  <p className={`mt-2 text-[10px] text-center text-slate-600 ${inter.className}`}>
                    protocolLM uses AI and may make mistakes. Always confirm critical food safety decisions with official regulations and your local health department.
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
