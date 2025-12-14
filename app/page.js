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

const UNICORN_PROJECT_ID = 'qF3qXhdiOxdUeQYH8wCK' // ✅ Chrome Ribbon / UnicornStudio

// Boot screen behavior
const BOOT_ONCE_PER_TAB = true // set false if you want the power button every refresh

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
      <line x1="18" y1="6" x2="6" y1="18" />
      <line x1="6" y1="6" x2="18" y1="18" />
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
      <line x1="5" y1="12" x2="19" y1="12" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M5 14l.8 2.6L8.5 17l-2.7.9L5 20l-.8-2.1L1.5 17l2.7-.4L5 14z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Power: () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M12 2v10" strokeLinecap="round" />
      <path d="M6.2 5.2a9 9 0 1 0 11.6 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

function FAQItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="ui-faqitem">
      <button type="button" onClick={onToggle} className="ui-faqbtn" aria-expanded={isOpen}>
        <span className={`ui-faqq ${inter.className}`}>{q}</span>
        <span className={`ui-faqchev ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <Icons.ChevronDown />
        </span>
      </button>
      <div className={`ui-faqpanel ${isOpen ? 'is-open' : ''}`} role="region">
        <div className={`ui-faqa ${inter.className}`}>{a}</div>
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    {
      q: 'Is this only for Washtenaw County?',
      a: 'Yes. The database and guidance are built specifically around Washtenaw County enforcement patterns and the codes your inspector expects.',
    },
    {
      q: 'What should my team upload for photo checks?',
      a: 'Walk-ins, prep tables, hot/cold holding, dish area, labels, storage order, and any “does this look right?” moments mid-shift.',
    },
    {
      q: 'How should we use the document side?',
      a: 'Ask short, operational questions. You’ll get answers grounded in local enforcement actions plus the relevant food-code sources.',
    },
    {
      q: 'Will it replace training or a manager?',
      a: 'No. It’s a fast second set of eyes and a reference console—meant to help you verify and fix issues earlier.',
    },
    {
      q: 'Do I need it every day?',
      a: 'Most teams use it before rushes, during closes/opens, after new hires, or when they want to tighten up the line.',
    },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-10">
      <div className="max-w-6xl w-full">
        <div className="ui-shell ui-frost">
          <section className="ui-hero">
            {/* subtle purple “black hole” accent (optional) */}
            <div className="ui-blackhole" aria-hidden="true" />

            <h1 className={`ui-title ${outfit.className}`}>Compliance Console</h1>

            <p className={`ui-subtitle ${inter.className}`}>Catch violations before the health inspector.</p>

            <p className={`ui-body ${inter.className}`}>
              Photo scans for instant violation checks. Document search for Washtenaw-specific enforcement and food-code guidance.
            </p>

            <div className="ui-cta-row">
              <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                <span className="ui-btn-inner">Start trial</span>
              </button>

              <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                <span className="ui-btn-inner">Sign in</span>
              </button>
            </div>
          </section>

          <div className="ui-section-divider" />

          <section className="ui-section">
            <div className="ui-featuregrid">
              <div className="ui-stepcard ui-frost">
                <div className="ui-stephead">
                  <span className="ui-stepicon" aria-hidden="true">
                    <Icons.Camera />
                  </span>
                  <div className={`ui-steptitle ${inter.className}`}>Photo analysis</div>
                </div>
                <div className={`ui-stepbody ${inter.className}`}>
                  Take a picture. Cross-check against Washtenaw County requirements for likely violations to verify.
                </div>
              </div>

              <div className="ui-stepcard ui-frost">
                <div className="ui-stephead">
                  <span className="ui-stepicon" aria-hidden="true">
                    <Icons.Lock />
                  </span>
                  <div className={`ui-steptitle ${inter.className}`}>Document search</div>
                </div>
                <div className={`ui-stepbody ${inter.className}`}>
                  Washtenaw enforcement actions + Michigan Modified Food Code + FDA guidance—organized for quick answers.
                </div>
              </div>
            </div>
          </section>

          <div className="ui-section-divider" />

          <section className="ui-section">
            <h2 className={`ui-h2 ${outfit.className}`}>FAQ</h2>
            <div className="ui-faq ui-frost">
              {faqs.map((f, i) => (
                <FAQItem
                  key={i}
                  q={f.q}
                  a={f.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq((v) => (v === i ? null : i))}
                />
              ))}
            </div>
          </section>

          <div className="ui-section-divider" />

          <section className="ui-final">
            <div className="ui-finalinner">
              <div>
                <h3 className={`ui-h2 ${outfit.className}`}>Be inspection-ready on your next shift.</h3>
                <p className={`ui-p ${inter.className}`}>
                  Start the trial, run a quick scan, and keep the checklist on a manager clipboard.
                </p>
              </div>

              <div className="ui-cta-row">
                <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                  <span className="ui-btn-inner">Start trial</span>
                </button>
                <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                  <span className="ui-btn-inner">Sign in</span>
                </button>
              </div>
            </div>
          </section>

          <div className={`ui-footerline ${inter.className}`}>
            <span>One site license per restaurant · 7-day trial · Cancel anytime</span>
          </div>
        </div>

        <footer className={`pt-8 text-[13px] text-white/80 ${inter.className}`}>
          <div className="flex flex-wrap gap-5 justify-center">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}

function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setMessage('')
      setMessageKind('info')
    }
  }, [isOpen, initialMode])

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')
    setMessageKind('info')

    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken) {
        setMessageKind('err')
        setMessage('Security verification failed. Please try again.')
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
        setMessageKind('err')
        setMessage(data.error || 'Authentication failed.')
        return
      }

      if (mode === 'reset') {
        setMessageKind('ok')
        setMessage('Check your email for reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 1200)
      } else if (mode === 'signup') {
        setMessageKind('ok')
        setMessage('Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 1200)
      } else {
        setMessageKind('ok')
        setMessage('Signed in. Redirecting…')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 450)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessageKind('err')
      setMessage('Unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] ui-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md ui-modal ui-modal-anim ui-frost p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/55 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="ui-icon-btn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/55 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className={`ui-input ${inter.className}`}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-white/55 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`ui-input pr-16 ${inter.className}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/55 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="ui-btn ui-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="ui-btn-inner">
              {loading && <span className="ui-spinner" aria-hidden="true" />}
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </span>
          </button>
        </form>

        {message && (
          <div className={`mt-4 ui-toast ${messageKind === 'err' ? 'ui-toast-err' : messageKind === 'ok' ? 'ui-toast-ok' : ''}`}>
            <span className="ui-toasticon" aria-hidden="true">
              {messageKind === 'err' ? <Icons.X /> : messageKind === 'ok' ? <Icons.Check /> : <Icons.Spark />}
            </span>
            <span className={`ui-toasttext ${inter.className}`}>{message}</span>
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/55">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-white/55 hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-white/55 hover:text-white">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/55 hover:text-white">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/55 hover:text-white">
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
    <div className="fixed inset-0 z-[900] ui-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-xl ui-modal ui-modal-anim ui-frost p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="ui-icon-btn absolute right-5 top-5" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-5">
          <div className={`ui-tag ${inter.className}`}>Single site license</div>
          <h3 className={`text-2xl font-semibold text-white mb-2 tracking-tight ${outfit.className}`}>protocolLM Access</h3>
          <p className={`text-sm text-white/55 ${inter.className}`}>
            Photo checks + document search—built specifically for Washtenaw County operators.
          </p>
        </div>

        <div className="ui-pricewrap ui-frost p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-semibold text-white tracking-tight ${outfit.className}`}>$100</span>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">/ month</span>
              </div>
              <p className={`text-xs text-white/55 mt-2 ${inter.className}`}>
                Includes generous monthly usage. Photos count as two checks.
              </p>
            </div>

            <div className={`ui-badge ${inter.className}`}>
              <Icons.Shield />
              Premium tier
            </div>
          </div>

          <div className="ui-divider my-5" />

          <div className="space-y-3">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className="ui-btn ui-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="ui-btn-inner">
                {loading === 'monthly' && <span className="ui-spinner" aria-hidden="true" />}
                Start trial
              </span>
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="ui-btn ui-btn-secondary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="ui-btn-inner">
                {loading === 'annual' && <span className="ui-spinner" aria-hidden="true" />}
                Annual · $1,000/yr
              </span>
            </button>

            <p className={`text-[12px] text-white/80 text-center ${inter.className}`}>
              One site license per restaurant · 7-day trial · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BootOverlay({ state, isLoading, onPower }) {
  // state: 'off' | 'powering' | 'on'
  if (state === 'on') return null

  return (
    <div className={`ui-boot ${state === 'powering' ? 'is-powering' : ''}`} aria-hidden="true">
      <div className="ui-boot-grid" />
      <div className="ui-boot-vignette" />

      <div className="ui-boot-center">
        <button
          type="button"
          onClick={onPower}
          className={`ui-powerbtn ui-frost ${state === 'powering' ? 'is-on' : ''}`}
          aria-label="Power on"
        >
          <span className="ui-powerbtn-ring" />
          <span className="ui-powerbtn-icon">
            <Icons.Power />
          </span>
        </button>

        <div className={`ui-boottext ${inter.className}`}>
          {state === 'off' ? (
            <>
              <div className="ui-bootline1">Power on console</div>
              <div className="ui-bootline2">protocolLM · Compliance Database</div>
            </>
          ) : (
            <>
              <div className="ui-bootline1">Starting…</div>
              <div className="ui-bootline2">{isLoading ? 'Connecting & loading session…' : 'Console ready.'}</div>
            </>
          )}
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
  const [authInitialMode, setAuthInitialMode] = useState('signin')
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
  const textAreaRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  // Boot / background controls
  const [bootState, setBootState] = useState('off') // 'off' | 'powering' | 'on'
  const [enableMotionBg, setEnableMotionBg] = useState(false)

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

  // ✅ Make /?showPricing=true open pricing modal
  useEffect(() => {
    const showPricing = searchParams?.get('showPricing')
    if (showPricing === 'true') {
      setShowPricingModal(true)
    }
  }, [searchParams])

  // Boot: skip if already powered (per-tab)
  useEffect(() => {
    try {
      if (!BOOT_ONCE_PER_TAB) return
      const v = sessionStorage.getItem('plm_booted')
      if (v === '1') {
        setBootState('on')
        setEnableMotionBg(true)
      }
    } catch {
      // ignore
    }
  }, [])

  // Body background class
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('ui-enterprise-bg')
    return () => {
      document.body.classList.remove('ui-enterprise-bg')
    }
  }, [])

  // Load session + subscription + accept terms enforcement
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

      // ✅ Enforce Accept Terms before app usage
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        const accepted = !!(profile?.accepted_terms && profile?.accepted_privacy)

        if (!accepted) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('Policy check error', e)
        setHasActiveSubscription(false)
        setIsLoading(false)
        router.replace('/accept-terms')
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
  }, [supabase, searchParams, router])

  // ✅ UnicornStudio background loader (delayed until powered on)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!enableMotionBg) return

    const existing = document.querySelector('script[data-unicornstudio="1"]')
    if (existing) return

    if (!window.UnicornStudio) window.UnicornStudio = { isInitialized: false }

    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js'
    s.async = true
    s.dataset.unicornstudio = '1'
    s.onload = () => {
      try {
        if (!window.UnicornStudio?.isInitialized && window.UnicornStudio?.init) {
          window.UnicornStudio.init()
          window.UnicornStudio.isInitialized = true
        }
      } catch (e) {
        console.error('UnicornStudio init failed', e)
      }
    }
    ;(document.head || document.body).appendChild(s)
  }, [enableMotionBg])

  // User menu close handlers
  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  // Boot power behavior (haptic + subtle chime)
  const playBootFX = () => {
    try {
      if (navigator?.vibrate) navigator.vibrate(18)
    } catch {
      // ignore
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(196, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(392, ctx.currentTime + 0.14)

      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.24)

      setTimeout(() => {
        try {
          ctx.close()
        } catch {
          // ignore
        }
      }, 350)
    } catch {
      // ignore
    }
  }

  const handlePower = () => {
    if (bootState !== 'off') return
    setBootState('powering')
    setEnableMotionBg(true)
    playBootFX()
    try {
      if (BOOT_ONCE_PER_TAB) sessionStorage.setItem('plm_booted', '1')
    } catch {
      // ignore
    }
  }

  // When powered and loading finishes, fade into UI
  useEffect(() => {
    if (bootState !== 'powering') return
    if (isLoading) return
    const t = setTimeout(() => setBootState('on'), 520)
    return () => clearTimeout(t)
  }, [bootState, isLoading])

  const handleCheckout = async (priceId, planName) => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setShowPricingModal(false)
        setAuthInitialMode('signup')
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

  const isAuthenticated = !!session

  return (
    <>
      {/* Boot overlay (power button) */}
      <BootOverlay state={bootState} isLoading={isLoading} onPower={handlePower} />

      {/* ✅ Motion Chrome (behind everything) */}
      {enableMotionBg && (
        <div id="ui-motion-bg" aria-hidden="true">
          <div
            data-us-project={UNICORN_PROJECT_ID}
            // Performance tuning (big stutter killer on iOS):
            data-us-fps="24"
            data-us-scale="0.72"
            data-us-dpi="1"
            data-us-interaction="false"
          />
        </div>
      )}

      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
        }

        /* ======= BACKGROUND (stable + premium) ======= */
        body.ui-enterprise-bg {
          overflow: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.94);
          --ui-vignette: 0.92;
          --ui-grid: 0.06;
          --ui-grid-on: 0.14;
        }

        /* Frosted glass helper (Backseasy-inspired) */
        .ui-frost {
          backdrop-filter: blur(10px) saturate(115%);
          -webkit-backdrop-filter: blur(10px) saturate(115%);
          background-color: rgba(12, 14, 18, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.38);
          background-image: linear-gradient(to top right, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0));
          background-size: cover;
          background-repeat: no-repeat;
        }

        /* UnicornStudio layer */
        #ui-motion-bg {
          position: fixed;
          inset: 0;
          z-index: -30;
          pointer-events: none;
          overflow: hidden;
          transform: translate3d(0, 0, 0);
          will-change: transform;
          contain: paint;
        }
        #ui-motion-bg [data-us-project] {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          /* IMPORTANT: removing full-screen filters reduces iOS jitter a lot */
          opacity: 0.78;
        }

        /* subtle light shaping (keeps the “Amex black” focus) */
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: -20;
          pointer-events: none;
          background:
            radial-gradient(1100px 520px at 50% -10%, rgba(255, 255, 255, 0.12), transparent 60%),
            radial-gradient(900px 700px at 20% 0%, rgba(255, 255, 255, 0.055), transparent 62%),
            radial-gradient(900px 700px at 85% 0%, rgba(255, 255, 255, 0.045), transparent 64%);
          opacity: 0.95;
          transform: translate3d(0, 0, 0);
        }

        /* vignette */
        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: -10;
          pointer-events: none;
          background: radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.74) 70%);
          opacity: var(--ui-vignette);
          transform: translate3d(0, 0, 0);
        }

        /* iOS/Safari: extra smoothing */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          #ui-motion-bg {
            display: none;
          }
          * {
            scroll-behavior: auto !important;
            animation: none !important;
            transition: none !important;
          }
        }

        :root {
          scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
          scrollbar-width: thin;
        }
        ::-webkit-scrollbar {
          width: 9px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        .ui-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(7, 8, 11, 0.52);
          backdrop-filter: blur(14px) saturate(115%);
          -webkit-backdrop-filter: blur(14px) saturate(115%);
        }

        .ui-logo {
          display: inline-flex;
          align-items: baseline;
          gap: 0;
          user-select: none;
        }
        .ui-logo-protocol {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: rgba(255, 255, 255, 0.92);
        }
        .ui-logo-lm {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: rgba(255, 255, 255, 0.92);
        }
        @media (min-width: 640px) {
          .ui-logo-protocol,
          .ui-logo-lm {
            font-size: 16px;
          }
        }

        .ui-shell {
          border-radius: 22px;
          overflow: hidden;
          position: relative;
        }

        .ui-hero {
          padding: 32px;
          position: relative;
          z-index: 1;
        }

        /* subtle purple black-hole accent */
        .ui-blackhole {
          position: absolute;
          right: -120px;
          top: -120px;
          width: 420px;
          height: 420px;
          pointer-events: none;
          opacity: 0.32;
          filter: blur(0.2px);
        }
        .ui-blackhole::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 1) 0 28%, transparent 29%),
            radial-gradient(circle at 50% 50%, rgba(166, 110, 255, 0.0) 0 34%, rgba(166, 110, 255, 0.75) 48%, rgba(255, 255, 255, 0.25) 55%, rgba(166, 110, 255, 0) 68%),
            conic-gradient(from 0deg, rgba(166, 110, 255, 0) 0 40%, rgba(210, 160, 255, 0.55) 52%, rgba(166, 110, 255, 0) 70% 100%);
          box-shadow: 0 0 120px rgba(150, 90, 255, 0.35);
          animation: uiHoleSpin 6.4s linear infinite;
        }
        .ui-blackhole::after {
          content: '';
          position: absolute;
          left: -30%;
          top: 50%;
          width: 160%;
          height: 18px;
          transform: translateY(-50%) rotate(-12deg);
          background: linear-gradient(90deg, transparent, rgba(190, 140, 255, 0.15), rgba(255, 255, 255, 0.32), rgba(190, 140, 255, 0.15), transparent);
          filter: blur(0.6px);
          opacity: 0.8;
        }
        @keyframes uiHoleSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .ui-title {
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.05;
          letter-spacing: -0.05em;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.96);
        }

        .ui-subtitle {
          font-size: 16px;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 10px;
          max-width: 70ch;
        }

        .ui-body {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.62);
          max-width: 78ch;
        }

        .ui-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .ui-section-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
        }

        .ui-section {
          padding: 28px 32px;
          position: relative;
          z-index: 1;
        }

        .ui-final {
          padding: 28px 32px 26px;
          position: relative;
          z-index: 1;
        }

        .ui-finalinner {
          display: flex;
          gap: 18px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        .ui-h2 {
          font-size: 20px;
          letter-spacing: -0.02em;
          color: rgba(255, 255, 255, 0.94);
          margin-bottom: 8px;
        }

        .ui-p {
          font-size: 13px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.62);
          max-width: 72ch;
        }

        .ui-featuregrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 980px) {
          .ui-featuregrid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .ui-stepcard {
          border-radius: 16px;
          padding: 12px;
        }

        .ui-stephead {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .ui-stepicon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.78);
          flex-shrink: 0;
        }
        .ui-stepicon svg {
          width: 18px;
          height: 18px;
          display: block;
        }

        .ui-steptitle {
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.92);
        }

        .ui-stepbody {
          font-size: 12px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.62);
        }

        .ui-faq {
          margin-top: 12px;
          border-radius: 16px;
          overflow: hidden;
        }

        .ui-faqitem {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ui-faqitem:first-child {
          border-top: none;
        }

        .ui-faqbtn {
          width: 100%;
          text-align: left;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: transparent;
          color: rgba(255, 255, 255, 0.92);
          outline: none;
        }

        .ui-faqbtn:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .ui-faqq {
          font-size: 12px;
          font-weight: 720;
          color: rgba(255, 255, 255, 0.9);
        }

        .ui-faqchev {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.7);
          transition: transform 140ms ease;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .ui-faqchev.is-open {
          transform: rotate(180deg);
        }

        .ui-faqpanel {
          max-height: 0px;
          overflow: hidden;
          transition: max-height 180ms ease;
        }
        .ui-faqpanel.is-open {
          max-height: 240px;
        }

        .ui-faqa {
          padding: 0 12px 12px;
          font-size: 12px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.62);
        }

        .ui-footerline {
          padding: 14px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
        }

        .ui-btn {
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease,
            color 120ms ease, opacity 120ms ease;
          user-select: none;
        }

        .ui-btn-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .ui-btn:hover {
          transform: scale(1.02);
        }
        .ui-btn:active {
          transform: scale(1.01);
        }

        .ui-btn-primary {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }
        .ui-btn-primary:hover {
          box-shadow: 0 26px 80px rgba(0, 0, 0, 0.58);
        }

        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .ui-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .ui-btn:focus-visible,
        .ui-icon-btn:focus-visible,
        .ui-faqbtn:focus-visible,
        .ui-input:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.22);
          outline-offset: 2px;
        }

        .ui-icon-btn {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(255, 255, 255, 0.82);
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
        }
        .ui-icon-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.95);
          transform: scale(1.02);
        }

        .ui-backdrop {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ui-modal {
          border-radius: 18px;
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.75);
        }

        .ui-modal-anim {
          animation: uiPop 180ms ease-out both;
          transform-origin: 50% 40%;
        }
        @keyframes uiPop {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .ui-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.94);
          outline: none;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }
        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .ui-input:focus {
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
        }

        .ui-toast {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
        }
        .ui-toast-ok {
          border-color: rgba(34, 197, 94, 0.35);
        }
        .ui-toast-err {
          border-color: rgba(239, 68, 68, 0.35);
        }
        .ui-toasticon {
          margin-top: 1px;
          color: rgba(255, 255, 255, 0.75);
        }
        .ui-toasttext {
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.7);
        }

        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-pricewrap {
          border-radius: 16px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }

        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 700;
        }

        .ui-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
        }

        /* chat bubbles are intentionally “open space” */
        .ui-bubble,
        .ui-bubble-user {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .ui-bubble-user {
          color: rgba(255, 255, 255, 0.94) !important;
          font-weight: 650;
        }

        .ui-chatimgwrap {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .ui-chatimg {
          display: block;
          width: 100%;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          max-height: 280px;
          object-fit: contain;
        }

        .ui-thinking {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .ui-emptywrap {
          border-radius: 18px;
          padding: 16px;
          max-width: 520px;
          width: 100%;
        }

        .ui-attachpill {
          border-radius: 14px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .ui-spinner {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.18);
          border-top-color: rgba(0, 0, 0, 0.65);
          animation: spin 700ms linear infinite;
        }
        .ui-spinner-lg {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.16);
          border-top-color: rgba(255, 255, 255, 0.75);
          animation: spin 700ms linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ======= BOOT OVERLAY (GPU grid + power button) ======= */
        .ui-boot {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: grid;
          place-items: center;
          background: rgba(5, 6, 8, 0.94);
        }

        .ui-boot-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, var(--ui-grid)) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, var(--ui-grid)) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.95;
          transform: translate3d(0, 0, 0);
          transition: filter 520ms ease, opacity 520ms ease;
          filter: brightness(0.9);
          mask-image: radial-gradient(circle at 50% 45%, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.2) 68%, rgba(0, 0, 0, 0) 92%);
        }

        .ui-boot.is-powering .ui-boot-grid {
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, var(--ui-grid-on)) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, var(--ui-grid-on)) 1px, transparent 1px);
          filter: brightness(1.06);
        }

        .ui-boot-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 45%, transparent 0%, rgba(0, 0, 0, 0.72) 70%);
          opacity: 0.9;
          pointer-events: none;
        }

        .ui-boot-center {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .ui-powerbtn {
          width: 92px;
          height: 92px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: rgba(255, 255, 255, 0.9);
          position: relative;
          transition: transform 180ms ease;
        }
        .ui-powerbtn:hover {
          transform: scale(1.03);
        }

        .ui-powerbtn-ring {
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
          opacity: 0.9;
        }

        .ui-powerbtn.is-on .ui-powerbtn-ring {
          border-color: rgba(210, 160, 255, 0.38);
          box-shadow:
            0 0 0 1px rgba(210, 160, 255, 0.16) inset,
            0 0 44px rgba(170, 110, 255, 0.18);
          animation: uiPulse 1.15s ease-in-out infinite;
        }

        @keyframes uiPulse {
          0% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.85;
          }
        }

        .ui-powerbtn-icon {
          display: grid;
          place-items: center;
        }

        .ui-boottext {
          text-align: center;
          line-height: 1.3;
        }
        .ui-bootline1 {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.86);
        }
        .ui-bootline2 {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      {/* NOTE: we still render the page behind the boot overlay so session loads in the background */}
      <div className="h-[100dvh] min-h-0 flex flex-col">
        <header className="sticky top-0 z-40 flex-shrink-0 ui-header">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`ui-logo ${outfit.className}`}>
                  <span className="ui-logo-protocol">protocol</span>
                  <span className="ui-logo-lm">LM</span>
                </div>

                <div className="flex flex-col leading-tight">
                  <span className={`text-[12px] text-white/80 ${inter.className}`}>Washtenaw Compliance Database</span>
                  <span className={`text-[12px] text-white/55 ${inter.className}`}>Additional Counties Coming 2026</span>
                </div>

                {hasActiveSubscription && (
                  <span className={`hidden sm:inline-flex text-[11px] text-white/45 ${inter.className}`}>Active · site license</span>
                )}
              </div>

              <div className={`absolute left-1/2 -translate-x-1/2 hidden md:block text-[12px] text-white/65 ${inter.className}`}>
                Made in Washtenaw County for Washtenaw County.
              </div>

              <div className="flex items-center gap-2">
                {!isAuthenticated ? (
                  <button
                    onClick={() => {
                      setAuthInitialMode('signin')
                      setShowAuthModal(true)
                    }}
                    className="ui-btn ui-btn-secondary"
                  >
                    <span className="ui-btn-inner">Sign in</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleNewChat} className="ui-btn ui-btn-secondary hidden sm:inline-flex items-center gap-2">
                      <Icons.Plus />
                      <span className="ui-btn-inner" style={{ gap: 8 }}>
                        New chat
                      </span>
                    </button>

                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu((v) => !v)}
                        className="ui-icon-btn"
                        aria-label="User menu"
                        title={session?.user?.email || 'User'}
                      >
                        <span className="text-xs font-semibold">{session?.user?.email?.[0]?.toUpperCase() || 'U'}</span>
                      </button>

                      {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 ui-modal ui-frost overflow-hidden">
                          <div className="px-3 pt-3 pb-2 text-[11px] text-white/40">Press Esc to close</div>
                          <button
                            onClick={() => {
                              setShowPricingModal(true)
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <Icons.Settings />
                            <span>Subscription</span>
                          </button>
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-white/5 transition-colors"
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

            <div className={`md:hidden pt-2 text-center text-[12px] text-white/65 ${inter.className}`}>
              Made in Washtenaw County for Washtenaw County.
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col">
          {!isAuthenticated ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LandingPage
                onShowPricing={() => setShowPricingModal(true)}
                onShowAuth={() => {
                  setAuthInitialMode('signin')
                  setShowAuthModal(true)
                }}
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
                    <div className="ui-emptywrap ui-frost text-left">
                      <div className="ui-emptyicon" aria-hidden="true">
                        <Icons.Shield />
                      </div>
                      <div className={`ui-emptytitle ${inter.className}`}>Upload a photo or ask a question.</div>
                      <div className={`ui-emptytext ${inter.className}`}>
                        Use photo checks to spot likely issues fast—or search the Washtenaw-backed database when you need a clear answer.
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-btn ui-btn-secondary">
                          <span className="ui-btn-inner">
                            <Icons.Camera />
                            Attach photo
                          </span>
                        </button>

                        <button type="button" onClick={() => textAreaRef.current?.focus()} className="ui-btn ui-btn-secondary">
                          <span className="ui-btn-inner">Ask a question</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] ui-bubble ${msg.role === 'user' ? 'ui-bubble-user' : ''}`}>
                          {msg.image && (
                            <div className="ui-chatimgwrap">
                              <img src={msg.image} alt="Uploaded" className="ui-chatimg" />
                            </div>
                          )}

                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="ui-thinking flex gap-2 items-center">
                              <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0.24s' }} />
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
                <div
                  className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3"
                  style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
                >
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 ui-attachpill ui-frost text-[12px]">
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="ui-icon-btn !w-10 !h-10"
                        aria-label="Remove image"
                        title="Remove"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />

                    <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-icon-btn" aria-label="Attach image">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        ref={textAreaRef}
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
                      />

                      <button
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`ui-icon-btn ${(!input.trim() && !selectedImage) || isSending ? 'opacity-40 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="ui-spinner-lg" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center text-white/40 ${inter.className}`}>
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
