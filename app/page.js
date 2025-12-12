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
  const features = [
    {
      title: 'Photo scan',
      icon: <Icons.RetroCamera />,
      body: 'Snap a walk‑in, line, or storage area. Get likely risk flags in seconds.',
      kicker: 'Fast triage',
      tint: 'rgba(45, 212, 191, 0.18)',
      tab: 'rgba(20, 184, 166, 0.85)',
      anim: 'card-drift-a',
      delay: '0.05s',
    },
    {
      title: 'Code Q&A',
      icon: <Icons.GamePak />,
      body: 'Ask Michigan Food Code with Washtenaw-first context—no PDF hunting.',
      kicker: 'Grounded answers',
      tint: 'rgba(59, 130, 246, 0.16)',
      tab: 'rgba(37, 99, 235, 0.82)',
      anim: 'card-drift-b',
      delay: '0.10s',
    },
    {
      title: 'Runbook',
      icon: <Icons.ClipboardCheck />,
      body: 'Turn findings into a short open/close checklist your team can execute.',
      kicker: 'Actionable',
      tint: 'rgba(168, 85, 247, 0.14)',
      tab: 'rgba(124, 58, 237, 0.8)',
      anim: 'card-drift-c',
      delay: '0.15s',
    },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-4xl w-full text-center space-y-9">
        {/* top “cartridge label” */}
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg n64-liquid-panel text-[11px] font-semibold tracking-[0.24em] uppercase text-teal-950/90">
          protocolLM · compliance console
        </div>

        {/* hero */}
        <div className="space-y-4">
          <h1 className={`text-3xl sm:text-4xl md:text-[2.8rem] leading-tight font-semibold text-slate-950 ${outfit.className}`}>
            Be inspection‑ready.
          </h1>
          <p className={`text-sm sm:text-base text-slate-700 ${inter.className}`}>Catch violations before the inspector does.</p>
          <p className={`text-xs text-slate-600 ${inter.className}`}>Washtenaw County today · Wayne + Oakland planned for 2026.</p>
        </div>

        {/* feature “cartridges” */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {features.map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl n64-feature-card p-4 hover-lift transition-all animate-slide-up ${f.anim}`}
              style={{
                animationDelay: f.delay,
                ['--glass-tint']: f.tint,
                ['--tab-color']: f.tab,
              }}
            >
              <div className="n64-corner-tab" aria-hidden="true" />
              <div className="flex items-center gap-3 mb-3">
                <div className="retro-icon-chip">{f.icon}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold tracking-tight text-slate-950">{f.title}</span>
                    <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-700 n64-pill-soft">{f.kicker}</span>
                  </div>
                  <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500 mt-0.5">site ops</div>
                </div>
              </div>
              <p className={`text-xs text-slate-700/90 leading-relaxed ${inter.className}`}>{f.body}</p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            onClick={onShowPricing}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[14px] n64-plastic-btn-primary text-white text-[11px] font-semibold tracking-[0.24em] uppercase hover-lift button-press relative overflow-hidden group transition-all animate-float"
          >
            <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100" />
            <span className="n64-btn-dots" aria-hidden="true" />
            <Icons.Check />
            <span className="relative">Start trial</span>
          </button>

          <button
            onClick={onShowPricing}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-[14px] n64-plastic-btn-secondary text-slate-900 text-[11px] font-semibold tracking-[0.24em] uppercase hover-lift button-press relative overflow-hidden group transition-all"
          >
            <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100" />
            <span className="relative">See pricing</span>
          </button>
        </div>

        {/* small trust line */}
        <div className="mx-auto max-w-2xl rounded-2xl n64-liquid-card px-4 py-3 text-left">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-800">Simple promise</div>
          <p className={`mt-1 text-xs text-slate-700 ${inter.className}`}>
            Built for operators. Clear, county-aware guidance—plus photo triage to spot common issues fast.
          </p>
        </div>

        <footer className="pt-2 text-xs text-slate-600">
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
            className="w-full mt-2 inline-flex items-center justify-center rounded-[14px] n64-plastic-btn-primary text-white text-[11px] font-semibold tracking-[0.22em] uppercase py-3.5 hover-lift button-press disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
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
              className="w-full inline-flex items-center justify-center rounded-[14px] n64-plastic-btn-primary text-white text-[11px] font-semibold tracking-[0.22em] uppercase py-3.5 hover-lift button-press disabled:opacity-60 relative overflow-hidden group"
            >
              <span className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100"></span>
              <span className="relative">{loading === 'monthly' ? 'Processing…' : 'Start monthly trial'}</span>
            </button>
            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="w-full inline-flex items-center justify-center rounded-[14px] n64-plastic-btn-secondary text-[11px] font-semibold tracking-[0.22em] uppercase py-3.5 disabled:opacity-60"
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

  // Keeps the chat perfectly fit in the viewport (ChatGPT/Claude-style):
  // - no double-100vh containers
  // - internal scroll only in the message list
  // - auto-scroll only when user is already near bottom
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
    // initial auto-scroll (after first paint)
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
    // Background stays consistent + premium retro “Liquid Glass meets N64” vibe.
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

    // after user sends, we definitely want to stay pinned to bottom
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
        /* Keep scrolling inside the app panes (chat list), not the body. */
        body.n64-glass-bg {
          overflow: hidden;
          position: relative;
        }

        /* Premium-retro background: translucent plastic + liquid sheen (kept subtle) */
        body.n64-glass-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.6), transparent 38%),
            radial-gradient(circle at 78% 12%, rgba(255, 255, 255, 0.35), transparent 44%),
            radial-gradient(circle at 22% 70%, rgba(45, 212, 191, 0.12), transparent 46%),
            radial-gradient(circle at 84% 68%, rgba(59, 130, 246, 0.1), transparent 52%),
            linear-gradient(to bottom right, rgba(14, 165, 233, 0.08), rgba(20, 184, 166, 0.06), rgba(59, 130, 246, 0.06));
          mix-blend-mode: soft-light;
          opacity: 0.95;
          filter: saturate(1.05);
        }

        body.n64-glass-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          /* Tiny “N64-ish” pixel grid + micro-dither */
          background-image: linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
            radial-gradient(rgba(15, 23, 42, 0.06) 0.55px, transparent 0.65px);
          background-size: 26px 26px, 26px 26px, 6px 6px;
          opacity: 0.16;
        }

        /* 64-color palette (N64 energy), used subtly via gradients/borders */
        :root {
          --n64-0: #0b1020;
          --n64-1: #0f172a;
          --n64-2: #111827;
          --n64-3: #1f2937;
          --n64-4: #334155;
          --n64-5: #475569;
          --n64-6: #64748b;
          --n64-7: #94a3b8;
          --n64-8: #e2e8f0;
          --n64-9: #f8fafc;
          --n64-10: #0ea5e9;
          --n64-11: #0284c7;
          --n64-12: #38bdf8;
          --n64-13: #22c55e;
          --n64-14: #16a34a;
          --n64-15: #86efac;
          --n64-16: #14b8a6;
          --n64-17: #0d9488;
          --n64-18: #2dd4bf;
          --n64-19: #a7f3d0;
          --n64-20: #3b82f6;
          --n64-21: #2563eb;
          --n64-22: #93c5fd;
          --n64-23: #1d4ed8;
          --n64-24: #a855f7;
          --n64-25: #7c3aed;
          --n64-26: #c4b5fd;
          --n64-27: #6d28d9;
          --n64-28: #f97316;
          --n64-29: #ea580c;
          --n64-30: #fdba74;
          --n64-31: #c2410c;
          --n64-36: #eab308;
          --n64-40: #f59e0b;
          --n64-44: #ec4899;
          --n64-48: #06b6d4;
          --n64-52: #10b981;
          --n64-56: #8b5cf6;
          --n64-60: #f472b6;
          --n64-63: #fde047;
        }

        .n64-spectrum-line {
          position: relative;
        }
        .n64-spectrum-line::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: -2px;
          height: 2px;
          background: linear-gradient(
            90deg,
            var(--n64-10),
            var(--n64-16),
            var(--n64-20),
            var(--n64-24),
            var(--n64-28),
            var(--n64-36),
            var(--n64-44),
            var(--n64-48),
            var(--n64-52),
            var(--n64-56),
            var(--n64-60),
            var(--n64-63)
          );
          opacity: 0.62;
          filter: saturate(1.05);
        }

        .n64-spectrum-border {
          position: relative;
        }
        .n64-spectrum-border::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.28));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.55;
        }

        /* --- “N64 transparent plastic x Apple liquid glass” building blocks --- */
        .n64-liquid-panel {
          border: 2px solid rgba(45, 212, 191, 0.55);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.22)),
            radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.7), transparent 42%),
            radial-gradient(circle at 85% 25%, rgba(45, 212, 191, 0.12), transparent 50%);
          backdrop-filter: blur(14px) saturate(1.15);
          -webkit-backdrop-filter: blur(14px) saturate(1.15);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.7),
            inset 0 -8px 24px rgba(15, 23, 42, 0.06);
          position: relative;
          overflow: hidden;
        }

        .n64-liquid-panel::before {
          content: '';
          position: absolute;
          inset: -40% -30%;
          background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.55), transparent 40%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.25), transparent 55%);
          transform: rotate(12deg);
          opacity: 0.6;
          pointer-events: none;
        }

        .n64-liquid-panel::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          /* tiny dither/noise + faint “chromatic edge” */
          background-image: radial-gradient(rgba(2, 6, 23, 0.07) 0.6px, transparent 0.7px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.08), rgba(168, 85, 247, 0.06));
          background-size: 7px 7px, 100% 100%;
          opacity: 0.18;
          mix-blend-mode: soft-light;
        }

        .n64-liquid-panel-strong {
          border: 2px solid rgba(45, 212, 191, 0.6);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.28)),
            radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.75), transparent 42%),
            radial-gradient(circle at 82% 24%, rgba(59, 130, 246, 0.12), transparent 52%);
          backdrop-filter: blur(18px) saturate(1.18);
          -webkit-backdrop-filter: blur(18px) saturate(1.18);
          box-shadow: 0 16px 44px rgba(15, 23, 42, 0.14), inset 0 1px 2px rgba(255, 255, 255, 0.74),
            inset 0 -10px 30px rgba(15, 23, 42, 0.08);
          position: relative;
          overflow: hidden;
        }
        .n64-liquid-panel-strong::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(2, 6, 23, 0.08) 0.6px, transparent 0.7px);
          background-size: 7px 7px;
          opacity: 0.16;
          mix-blend-mode: soft-light;
        }

        .n64-liquid-card {
          --glass-tint: rgba(45, 212, 191, 0.14);
          border: 2px solid rgba(148, 163, 184, 0.5);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.25)),
            radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.72), transparent 45%),
            radial-gradient(circle at 88% 30%, var(--glass-tint), transparent 58%);
          backdrop-filter: blur(16px) saturate(1.12);
          -webkit-backdrop-filter: blur(16px) saturate(1.12);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.75),
            inset 0 -10px 26px rgba(15, 23, 42, 0.06);
          position: relative;
          overflow: hidden;
        }
        .n64-liquid-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255, 255, 255, 0.5), transparent 35%),
            radial-gradient(circle at 24% 22%, rgba(255, 255, 255, 0.55), transparent 40%);
          opacity: 0.6;
        }
        .n64-liquid-card::after {
          content: '';
          position: absolute;
          inset: -40% -60%;
          pointer-events: none;
          background: linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.28) 50%, transparent 60%);
          transform: rotate(10deg);
          opacity: 0;
          transition: opacity 250ms ease;
        }
        .n64-liquid-card:hover::after {
          opacity: 0.9;
          animation: sheenSweep 1.25s ease-in-out;
        }

        .n64-liquid-chip {
          border: 2px solid rgba(148, 163, 184, 0.55);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.35));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.7);
        }

        /* Soft pill (less “busy” for B2B) */
        .n64-pill-soft {
          border: 1px solid rgba(148, 163, 184, 0.35);
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.38);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.55);
        }

        .retro-icon-chip {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 2px solid rgba(148, 163, 184, 0.55);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.22));
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.7), inset 0 -10px 20px rgba(15, 23, 42, 0.06);
          color: rgba(15, 23, 42, 0.86);
        }

        /* NEW: feature card that feels like “cartridge plastic” */
        .n64-feature-card {
          --glass-tint: rgba(45, 212, 191, 0.14);
          --tab-color: rgba(20, 184, 166, 0.85);
          border: 2px solid rgba(148, 163, 184, 0.55);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.22)),
            radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.75), transparent 46%),
            radial-gradient(circle at 90% 28%, var(--glass-tint), transparent 60%);
          backdrop-filter: blur(16px) saturate(1.12);
          -webkit-backdrop-filter: blur(16px) saturate(1.12);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.09), inset 0 1px 2px rgba(255, 255, 255, 0.8),
            inset 0 -12px 30px rgba(15, 23, 42, 0.07);
          position: relative;
          overflow: hidden;
        }
        .n64-feature-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255, 255, 255, 0.55), transparent 38%),
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.55), transparent 44%);
          opacity: 0.55;
        }
        .n64-feature-card::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(2, 6, 23, 0.08) 0.6px, transparent 0.7px);
          background-size: 7px 7px;
          opacity: 0.12;
          mix-blend-mode: soft-light;
        }
        .n64-corner-tab {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 26px;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.08)),
            linear-gradient(90deg, var(--tab-color), rgba(255, 255, 255, 0));
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.35);
          opacity: 0.9;
        }

        /* NEW: “plastic” buttons (N64 colored but professional) */
        .n64-plastic-btn-primary {
          border: 2px solid rgba(45, 212, 191, 0.7);
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.96), rgba(34, 211, 238, 0.78), rgba(59, 130, 246, 0.62));
          backdrop-filter: blur(10px) saturate(1.12);
          -webkit-backdrop-filter: blur(10px) saturate(1.12);
          box-shadow: 0 16px 40px rgba(20, 184, 166, 0.24), inset 0 1px 2px rgba(255, 255, 255, 0.42),
            inset 0 -14px 24px rgba(2, 6, 23, 0.12);
          position: relative;
        }
        .n64-plastic-btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.45), transparent 40%),
            linear-gradient(115deg, rgba(255, 255, 255, 0.2), transparent 55%);
          opacity: 0.65;
        }

        .n64-btn-dots {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 8px;
          opacity: 0.9;
          background: radial-gradient(circle at 4px 4px, rgba(253, 224, 71, 0.9) 0 2px, transparent 3px),
            radial-gradient(circle at 10px 4px, rgba(236, 72, 153, 0.85) 0 2px, transparent 3px),
            radial-gradient(circle at 16px 4px, rgba(59, 130, 246, 0.85) 0 2px, transparent 3px);
          filter: drop-shadow(0 6px 10px rgba(15, 23, 42, 0.18));
          pointer-events: none;
        }

        .n64-plastic-btn-secondary {
          border: 2px solid rgba(148, 163, 184, 0.65);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(236, 254, 255, 0.46), rgba(224, 231, 255, 0.52));
          backdrop-filter: blur(12px) saturate(1.08);
          -webkit-backdrop-filter: blur(12px) saturate(1.08);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.7),
            inset 0 -14px 24px rgba(2, 6, 23, 0.06);
        }

        /* varied subtle card motion (not identical per card) */
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

        /* scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(20, 184, 166, 0.3);
          border-radius: 999px;
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
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
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
          .hover-lift,
          .n64-liquid-card::after,
          .n64-feature-card::after {
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
                    className="inline-flex items-center gap-1.5 rounded-[14px] n64-plastic-btn-primary text-white text-[11px] font-semibold tracking-[0.22em] uppercase px-4 py-2.5 hover-lift button-press relative overflow-hidden group"
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
                              ? 'border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/85 via-cyan-400/75 to-blue-500/65 backdrop-blur-sm text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.28),inset_0_-12px_22px_rgba(2,6,23,0.12)]'
                              : 'border-2 border-slate-300/60 bg-gradient-to-br from-white/82 via-slate-50/72 to-cyan-50/82 backdrop-blur-md text-slate-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]'
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
                      className="flex items-center justify-center w-9 h-9 rounded-[14px] border-2 border-sky-300/60 bg-gradient-to-br from-sky-200/60 via-cyan-100/50 to-sky-300/60 backdrop-blur-sm text-slate-700 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)] hover-lift button-press transition-all"
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
                        className={`flex items-center justify-center w-9 h-9 rounded-[14px] transition-all hover-lift button-press ${
                          (!input.trim() && !selectedImage) || isSending
                            ? 'bg-slate-300/60 text-slate-500 cursor-not-allowed border-2 border-slate-300/40'
                            : 'border-2 border-teal-400/70 bg-gradient-to-br from-teal-400/85 via-cyan-400/75 to-blue-500/65 backdrop-blur-sm text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.28),inset_0_-12px_22px_rgba(2,6,23,0.12)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),inset_0_-14px_26px_rgba(2,6,23,0.14)]'
                        }`}
                      >
                        {isSending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>
                  <p className={`mt-2 text-[10px] text-center text-slate-600 ${inter.className}`}>
                    protocolLM uses AI and may make mistakes. Always confirm critical food safety decisions with official regulations and your local health
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
}
