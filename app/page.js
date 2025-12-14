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
      q: 'How often should my team use it?',
      a: 'Smart teams run quick checks before health inspection windows (usually 9am-2pm weekdays), after training new staff, and whenever something looks "off" during a shift. Takes 30 seconds per check.',
    },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-10">
      <div className="max-w-6xl w-full">
        <div className="ui-shell">
          <section className="ui-hero">
            <h1 className={`ui-title ${outfit.className}`}>Compliance Console</h1>

            <p className={`ui-subtitle ${inter.className}`}>Train faster. Avoid violations. Pass inspections.</p>

            <p className={`ui-body ${inter.className}`}>
              Take a photo of any station—coolers, prep tables, dish area—and get instant violation alerts before the inspector arrives.
              Plus, search Washtenaw County regulations instantly when your team has questions.
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
              <div className="ui-stepcard">
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

              <div className="ui-stepcard">
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
            <div className="ui-faq">
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

          <section className="ui-section">
            <h2 className={`ui-h2 ${outfit.className}`}>Built for Washtenaw County</h2>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ui-stepcard">
                  <div className="text-center py-2">
                    <div className={`text-3xl font-bold text-white mb-1 ${outfit.className}`}>1,353</div>
                    <div className={`text-xs text-white/60 uppercase tracking-wider ${inter.className}`}>Regulation Chunks Embedded</div>
                  </div>
                </div>

                <div className="ui-stepcard">
                  <div className="text-center py-2">
                    <div className={`text-3xl font-bold text-white mb-1 ${outfit.className}`}>100%</div>
                    <div className={`text-xs text-white/60 uppercase tracking-wider ${inter.className}`}>Washtenaw County Focused</div>
                  </div>
                </div>

                <div className="ui-stepcard">
                  <div className="text-center py-2">
                    <div className={`text-3xl font-bold text-white mb-1 ${outfit.className}`}>10 sec</div>
                    <div className={`text-xs text-white/60 uppercase tracking-wider ${inter.className}`}>Average Check Time</div>
                  </div>
                </div>
              </div>

              <div className="ui-stepcard p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/15 border border-white/10 flex items-center justify-center">
                    <Icons.Shield />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-base font-bold text-white mb-2 ${outfit.className}`}>First 100 Restaurants Get Priority Support</h3>
                    <p className={`text-sm leading-relaxed text-white/70 ${inter.className}`}>
                      As an early adopter, you'll get direct access to our team, free training sessions for your staff, and input on new
                      features. We're building this with Washtenaw County operators, for Washtenaw County operators.
                    </p>
                  </div>
                </div>
              </div>

              <div className="ui-stepcard p-6 border-dashed opacity-70">
                <div className="text-center py-4">
                  <p className={`text-sm text-white/50 italic ${inter.className}`}>“Testimonials from Ann Arbor restaurants coming soon”</p>
                  <p className={`text-xs text-white/40 mt-2 ${inter.className}`}>Be one of the first to try protocolLM and share your experience</p>
                </div>
              </div>
            </div>
          </section>

          <div className="ui-section-divider" />

          <section className="ui-final">
            <div className="ui-finalinner">
              <div>
                <h3 className={`ui-h2 ${outfit.className}`}>Start Your 7-Day Trial Today</h3>
                <p className={`ui-p ${inter.className}`}>
                  No credit card required. Takes 2 minutes to set up. Start catching violations before the inspector does.
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

// ✅ Claude AuthModal (full)
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
        setMessage('✅ Check your email for reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else if (mode === 'signup') {
        setMessageKind('ok')
        setMessage('✅ Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else {
        setMessageKind('ok')
        setMessage('✅ Signed in. Redirecting…')
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
      <div className="w-full max-w-md ui-modal ui-modal-anim p-6" onClick={(e) => e.stopPropagation()}>
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
          <div
            className={`mt-4 ui-toast ${
              messageKind === 'err' ? 'ui-toast-err' : messageKind === 'ok' ? 'ui-toast-ok' : ''
            }`}
          >
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
      <div className="w-full max-w-xl ui-modal ui-modal-anim p-6 relative" onClick={(e) => e.stopPropagation()}>
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

        <div className="ui-pricewrap p-6">
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
    const showPricing = searchParams?.get('showPricing')
    if (showPricing === 'true') setShowPricingModal(true)
  }, [searchParams])

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

      // ✅ only force accept-terms if profile exists and says NOT accepted
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        const accepted = !!(profile?.accepted_terms && profile?.accepted_privacy)
        if (profile && !accepted) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('Policy check error', e)
        // fail-open: do NOT block user on accept-terms if query fails
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

          if (sub?.current_period_end) {
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
  }, [supabase, router])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false)
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
      if (payload.url) window.location.href = payload.url
      else throw new Error('No checkout URL returned')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
      setCheckoutLoading(null)
    }
  }

  // ✅ Billing portal button (for active subscribers)
  const handleManageBilling = async () => {
    let toastEl = null
    try {
      setShowUserMenu(false)

      if (typeof document !== 'undefined') {
        toastEl = document.createElement('div')
        toastEl.textContent = 'Opening billing portal...'
        toastEl.className = 'ui-floating-toast'
        document.body.appendChild(toastEl)
      }

      const { data } = await supabase.auth.getSession()
      const headers = { 'Content-Type': 'application/json' }
      if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`

      const res = await fetch('/api/create-portal-session', { method: 'POST', headers })
      const payload = await res.json().catch(() => ({}))

      if (toastEl && typeof document !== 'undefined' && document.body.contains(toastEl)) document.body.removeChild(toastEl)

      if (!res.ok) {
        alert(payload.error || 'Failed to open billing portal')
        return
      }

      if (!payload.url) {
        alert('Failed to open billing portal')
        return
      }

      window.location.href = payload.url
    } catch (e) {
      console.error('Billing portal error:', e)
      if (toastEl && typeof document !== 'undefined' && document.body.contains(toastEl)) document.body.removeChild(toastEl)
      alert('Failed to open billing portal')
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
        updated[updated.length - 1] = { role: 'assistant', content: data.message || 'No response.' }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${error.message}` }
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
        <div className="ui-spinner-lg" aria-label="Loading" />
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        :root {
          --bg0: #05050b;
          --bg1: #070814;
          --glass: rgba(255, 255, 255, 0.06);
          --glass2: rgba(255, 255, 255, 0.09);
          --line: rgba(255, 255, 255, 0.12);
          --line2: rgba(255, 255, 255, 0.16);
          --text: rgba(255, 255, 255, 0.92);
          --muted: rgba(255, 255, 255, 0.55);
          --muted2: rgba(255, 255, 255, 0.4);
          --shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
          --shadow2: 0 14px 36px rgba(0, 0, 0, 0.45);
          --r: 22px;
        }

        html,
        body {
          height: 100%;
          background: var(--bg0);
        }

        .ui-enterprise-bg {
          background: radial-gradient(1200px 600px at 20% -10%, rgba(102, 51, 255, 0.18), transparent 60%),
            radial-gradient(900px 600px at 95% 0%, rgba(0, 255, 200, 0.1), transparent 55%),
            radial-gradient(1000px 700px at 60% 120%, rgba(0, 140, 255, 0.14), transparent 55%),
            linear-gradient(180deg, var(--bg0), var(--bg1));
          color: var(--text);
        }

        /* subtle tacky grid */
        .ui-enterprise-bg:before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.22;
          background-image: linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(900px 600px at 50% 10%, black 50%, transparent 100%);
          z-index: 0;
        }

        /* floating ribbon glow */
        .ui-enterprise-bg:after {
          content: '';
          position: fixed;
          inset: -200px;
          pointer-events: none;
          background: conic-gradient(
            from 120deg at 50% 40%,
            rgba(102, 51, 255, 0.18),
            rgba(0, 255, 200, 0.08),
            rgba(0, 140, 255, 0.14),
            rgba(255, 120, 0, 0.06),
            rgba(102, 51, 255, 0.18)
          );
          filter: blur(80px);
          opacity: 0.25;
          animation: uiGlow 18s linear infinite;
          z-index: 0;
        }

        @keyframes uiGlow {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(40px, -30px, 0) rotate(180deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(360deg);
          }
        }

        /* Shell */
        .ui-shell {
          position: relative;
          z-index: 1;
          border-radius: calc(var(--r) + 6px);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: var(--shadow);
          overflow: hidden;
          backdrop-filter: blur(18px);
        }

        .ui-shell:before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(900px 500px at 20% 0%, rgba(255, 255, 255, 0.08), transparent 60%),
            radial-gradient(700px 450px at 90% 10%, rgba(255, 255, 255, 0.06), transparent 55%);
          opacity: 0.8;
        }

        /* Header */
        .ui-header {
          position: relative;
          z-index: 10;
          background: rgba(8, 9, 18, 0.42);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ui-logo {
          display: inline-flex;
          align-items: baseline;
          gap: 0;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
        }
        .ui-logo-protocol {
          letter-spacing: -0.02em;
          font-weight: 800;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.95);
        }
        .ui-logo-lm {
          letter-spacing: -0.02em;
          font-weight: 800;
          font-size: 14px;
          color: rgba(180, 220, 255, 0.95);
        }

        /* Buttons */
        .ui-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease,
            opacity 160ms ease;
          user-select: none;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
        }
        .ui-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: var(--shadow2);
        }
        .ui-btn:active {
          transform: translateY(0px);
        }

        .ui-btn-primary {
          background: linear-gradient(135deg, rgba(100, 140, 255, 0.35), rgba(102, 51, 255, 0.25));
          border-color: rgba(170, 200, 255, 0.22);
        }
        .ui-btn-primary:hover {
          background: linear-gradient(135deg, rgba(110, 150, 255, 0.42), rgba(120, 70, 255, 0.3));
          border-color: rgba(190, 220, 255, 0.32);
        }
        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .ui-btn-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 20px;
        }

        .ui-icon-btn {
          width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.85);
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }
        .ui-icon-btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .ui-avatar-btn {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(80, 120, 255, 0.12));
          color: rgba(255, 255, 255, 0.9);
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* User menu */
        .ui-usermenu {
          position: absolute;
          right: 0;
          top: 52px;
          width: 260px;
          border-radius: 18px;
          background: rgba(10, 12, 22, 0.6);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: var(--shadow2);
          overflow: hidden;
          z-index: 50;
        }
        .ui-menuheader {
          padding: 12px 12px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
        }
        .ui-useremail {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.86);
          word-break: break-word;
        }
        .ui-userstatus {
          margin-top: 4px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.55);
        }
        .ui-menuitem {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.84);
          background: transparent;
          border: 0;
          cursor: pointer;
          transition: background 140ms ease;
        }
        .ui-menuitem:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .ui-menuitem-logout {
          color: rgba(255, 170, 170, 0.95);
        }
        .ui-menuitem-icon {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
        }
        .ui-menudivider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 6px 0;
        }
        .ui-menufooter {
          padding: 10px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
        }
        .ui-menuhelp {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Hero + sections */
        .ui-hero {
          padding: 28px 22px 10px;
          position: relative;
          z-index: 1;
        }
        .ui-title {
          font-size: clamp(32px, 4.2vw, 46px);
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.05;
        }
        .ui-subtitle {
          margin-top: 10px;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.66);
        }
        .ui-body {
          margin-top: 14px;
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.72);
          max-width: 60ch;
        }
        .ui-cta-row {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ui-section-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 18px 0;
        }
        .ui-section {
          padding: 0 22px 18px;
        }
        .ui-h2 {
          font-size: 18px;
          letter-spacing: -0.02em;
          color: rgba(255, 255, 255, 0.92);
        }
        .ui-p {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.7);
          max-width: 60ch;
        }

        /* feature cards */
        .ui-featuregrid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 12px;
        }
        @media (min-width: 640px) {
          .ui-featuregrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .ui-stepcard {
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 18px 55px rgba(0, 0, 0, 0.35);
          position: relative;
          overflow: hidden;
        }
        .ui-stepcard:before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(600px 220px at 10% 0%, rgba(255, 255, 255, 0.07), transparent 60%),
            radial-gradient(500px 240px at 80% 20%, rgba(255, 255, 255, 0.05), transparent 60%);
          opacity: 0.9;
        }
        .ui-stephead {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 14px 8px;
          position: relative;
          z-index: 1;
        }
        .ui-stepicon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(140, 190, 255, 0.06));
          color: rgba(255, 255, 255, 0.9);
        }
        .ui-steptitle {
          font-weight: 700;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
        }
        .ui-stepbody {
          padding: 0 14px 14px;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.68);
          position: relative;
          z-index: 1;
        }

        /* FAQ */
        .ui-faq {
          margin-top: 10px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
        }
        .ui-faqitem + .ui-faqitem {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ui-faqbtn {
          width: 100%;
          padding: 12px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: transparent;
          border: 0;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.9);
        }
        .ui-faqq {
          text-align: left;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.86);
          font-weight: 600;
        }
        .ui-faqchev {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: transform 160ms ease;
          color: rgba(255, 255, 255, 0.75);
        }
        .ui-faqchev.is-open {
          transform: rotate(180deg);
        }
        .ui-faqpanel {
          max-height: 0;
          overflow: hidden;
          transition: max-height 220ms ease;
        }
        .ui-faqpanel.is-open {
          max-height: 240px;
        }
        .ui-faqa {
          padding: 0 12px 12px;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.66);
        }

        /* Footerline */
        .ui-footerline {
          padding: 14px 22px 18px;
          color: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          text-align: center;
        }

        /* Final CTA */
        .ui-final {
          padding: 0 22px 22px;
        }
        .ui-finalinner {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(135deg, rgba(90, 130, 255, 0.14), rgba(255, 255, 255, 0.04));
          padding: 18px;
          display: flex;
          gap: 14px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }

        /* Modals */
        .ui-backdrop {
          background: rgba(0, 0, 0, 0.66);
          backdrop-filter: blur(10px);
        }
        .ui-modal {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(10, 12, 22, 0.62);
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
        }
        .ui-modal-anim {
          animation: uiPop 180ms ease-out both;
        }
        @keyframes uiPop {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* inputs */
        .ui-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          padding: 12px 12px;
          outline: none;
          transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }
        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .ui-input:focus {
          border-color: rgba(170, 200, 255, 0.35);
          box-shadow: 0 0 0 4px rgba(100, 140, 255, 0.12);
          background: rgba(255, 255, 255, 0.07);
        }

        /* Pricing bits */
        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          padding: 6px 10px;
          border-radius: 999px;
        }
        .ui-pricewrap {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
        }
        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-weight: 600;
        }
        .ui-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Chat */
        .ui-emptywrap {
          max-width: 520px;
          padding: 22px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: var(--shadow2);
        }
        .ui-emptyicon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.9);
        }
        .ui-emptytitle {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
        }
        .ui-emptytext {
          margin-top: 6px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.55;
        }

        .ui-bubble {
          border-radius: 18px;
          padding: 12px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.86);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
          line-height: 1.55;
          font-size: 13.5px;
        }
        .ui-bubble-user {
          background: linear-gradient(135deg, rgba(90, 130, 255, 0.18), rgba(255, 255, 255, 0.05));
          border-color: rgba(170, 200, 255, 0.18);
        }

        .ui-chatimgwrap {
          margin-bottom: 8px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.3);
        }
        .ui-chatimg {
          width: 100%;
          height: auto;
          display: block;
        }

        .ui-attachpill {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          padding: 6px 10px;
          color: rgba(255, 255, 255, 0.75);
        }

        /* Toast + spinners */
        .ui-toast {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.8);
        }
        .ui-toast-err {
          border-color: rgba(255, 120, 120, 0.24);
          background: rgba(255, 120, 120, 0.08);
        }
        .ui-toast-ok {
          border-color: rgba(120, 255, 180, 0.22);
          background: rgba(120, 255, 180, 0.07);
        }
        .ui-toasticon {
          width: 34px;
          height: 34px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ui-toasttext {
          font-size: 13px;
          line-height: 1.4;
        }

        .ui-spinner,
        .ui-spinner-lg {
          display: inline-block;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: rgba(255, 255, 255, 0.85);
          animation: uiSpin 0.9s linear infinite;
        }
        .ui-spinner {
          width: 16px;
          height: 16px;
        }
        .ui-spinner-lg {
          width: 28px;
          height: 28px;
          border-width: 3px;
        }
        @keyframes uiSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .ui-floating-toast {
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 9999;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(10, 12, 22, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(16px);
          color: rgba(255, 255, 255, 0.86);
          box-shadow: var(--shadow2);
          font-size: 13px;
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

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
                        className="ui-avatar-btn"
                        aria-label="User menu"
                        title={session?.user?.email || 'User'}
                      >
                        <span>{session?.user?.email?.[0]?.toUpperCase() || 'U'}</span>
                      </button>

                      {showUserMenu && (
                        <div className="ui-usermenu">
                          <div className="ui-menuheader">
                            <div className={`ui-useremail ${inter.className}`}>{session?.user?.email || 'Signed in'}</div>
                            <div className={`ui-userstatus ${inter.className}`}>{hasActiveSubscription ? '● Active Premium' : 'Free Account'}</div>
                          </div>

                          <div>
                            {hasActiveSubscription ? (
                              <button onClick={handleManageBilling} className={`ui-menuitem ${inter.className}`}>
                                <span className="ui-menuitem-icon">
                                  <Icons.Settings />
                                </span>
                                <span>Manage Billing</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowPricingModal(true)
                                  setShowUserMenu(false)
                                }}
                                className={`ui-menuitem ${inter.className}`}
                              >
                                <span className="ui-menuitem-icon">
                                  <Icons.Settings />
                                </span>
                                <span>Start Trial / Upgrade</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                window.open('/privacy', '_blank')
                                setShowUserMenu(false)
                              }}
                              className={`ui-menuitem ${inter.className}`}
                            >
                              <span className="ui-menuitem-icon">
                                <Icons.Shield />
                              </span>
                              <span>Privacy & Security</span>
                            </button>

                            <div className="ui-menudivider" />

                            <button
                              onClick={() => {
                                setShowUserMenu(false)
                                handleSignOut()
                              }}
                              className={`ui-menuitem ui-menuitem-logout ${inter.className}`}
                            >
                              <span className="ui-menuitem-icon">
                                <Icons.LogOut />
                              </span>
                              <span>Sign Out</span>
                            </button>
                          </div>

                          <div className="ui-menufooter">
                            <div className={`ui-menuhelp ${inter.className}`}>Press ESC to close</div>
                          </div>
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
                    <div className="ui-emptywrap text-left">
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
                    <div className="mb-2 inline-flex items-center gap-2 ui-attachpill text-[12px]">
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="ui-icon-btn !w-10 !h-10" aria-label="Remove image" title="Remove">
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
