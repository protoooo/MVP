'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
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
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md ui-modal p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/65 ${inter.className}`}>
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
            <label className="block text-xs font-semibold text-white/70 mb-2">Email</label>
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
              <label className="block text-xs font-semibold text-white/70 mb-2">Password</label>
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isLoaded} className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs rounded-lg px-3 py-2 ui-toast ${message.startsWith('Error') ? 'ui-toast-err' : 'ui-toast-ok'}`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/70">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-white/70 hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-white/70 hover:text-white">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/70 hover:text-white">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/70 hover:text-white">
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
    <div className="fixed inset-0 z-[900] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-xl ui-modal p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="ui-icon-btn absolute right-6 top-6" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-6">
          <div className={`ui-tag ${inter.className}`}>Single site license</div>
          <h3 className={`text-2xl font-semibold text-white mb-2 tracking-tight ${outfit.className}`}>protocolLM Access</h3>
          <p className={`text-sm text-white/70 ${inter.className}`}>
            A calm, inspection-grade console. Includes chat + photo scanning.
          </p>
        </div>

        <div className="ui-pricewrap p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-semibold text-white tracking-tight ${outfit.className}`}>$200</span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">/ month</span>
              </div>
              <p className={`text-xs text-white/65 mt-2 ${inter.className}`}>
                Includes roughly <span className="font-semibold text-white">2,600 monthly checks</span>. Text = 1 check; photo = 2.
              </p>
            </div>

            <div className={`ui-badge ${inter.className}`}>
              <Icons.Shield />
              Premium tier
            </div>
          </div>

          <div className="ui-divider my-5" />

          <ul className="text-xs text-white/75 space-y-2">
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

            <p className={`text-[11px] text-white/55 text-center ${inter.className}`}>
              Built to feel like a black card product: quiet visuals, clear outputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const heroRef = useRef(null)

  const faqs = useMemo(
    () => [
      {
        q: 'Is this made for Washtenaw County specifically?',
        a: 'Yes. It’s tuned for Washtenaw County operators and grounded in the Michigan Food Code + local guidance used during inspections.',
      },
      {
        q: 'Do I need this every day?',
        a: 'Not necessarily. Most teams use it when training, tightening routines, or verifying “are we actually OK?” before an inspection window.',
      },
      {
        q: 'How should my team use photo scans?',
        a: 'Snap a walk-in, prep line, or dish area. You’ll get a short list of likely risks to verify—then convert the important ones into a close/open checklist.',
      },
      {
        q: 'Does it replace a health inspector?',
        a: 'No—think “inspection-grade second set of eyes.” It helps you catch common issues and get rulebook-backed answers fast.',
      },
    ],
    []
  )

  const [openFaq, setOpenFaq] = useState(0)

  // Subtle “card moves alone” parallax for the main hero card
  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || 0
        const p = Math.max(-18, Math.min(18, y * -0.03))
        el.style.setProperty('--ui-parallax', `${p}px`)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="ui-landing">
      <section className="ui-section ui-section-hero">
        <div ref={heroRef} className="ui-heroCard ui-reveal" data-reveal>
          <div className="ui-kickers">
            <span className={`ui-kicker ${inter.className}`}>
              <Icons.Shield /> Inspection-grade
            </span>
            <span className={`ui-kicker-muted ${inter.className}`}>Washtenaw County operators · premium posture</span>
          </div>

          <h1 className={`ui-title ${outfit.className}`}>Compliance that feels like a console.</h1>

          <p className={`ui-subtitle ${inter.className}`}>
            Quiet visuals. Clear outputs. Photo risk scans, rulebook-backed answers, and fast close/open checklists—without digging through manuals.
          </p>

          <div className="ui-cta-row">
            <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
              Start trial
            </button>
            <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
              Sign in
            </button>
          </div>

          <div className={`ui-trust ${inter.className}`}>
            <span className="ui-trust-item">
              <Icons.Lock /> Secure by design
            </span>
            <span className="ui-dot" />
            <span className="ui-trust-item">
              <Icons.Spark /> Operator-ready
            </span>
            <span className="ui-dot" />
            <span className="ui-trust-item">
              <Icons.Shield /> Built for audits
            </span>
          </div>
        </div>
      </section>

      <section className="ui-section">
        <div className="ui-sectionHead ui-reveal" data-reveal>
          <div className={`ui-eyebrow ${inter.className}`}>Capabilities</div>
          <h2 className={`ui-h2 ${outfit.className}`}>Everything you need. Nothing you don’t.</h2>
          <p className={`ui-lead ${inter.className}`}>
            The point is speed + certainty—calm workflows that keep you inspection-ready.
          </p>
        </div>

        <div className="ui-cardGrid">
          <div className="ui-card ui-reveal" data-reveal>
            <div className="ui-cardTop">
              <div className="ui-cardIcon">
                <Icons.Camera />
              </div>
              <div>
                <div className={`ui-cardTitle ${inter.className}`}>Photo risk scan</div>
                <div className={`ui-cardBody ${inter.className}`}>
                  Upload a walk-in or line photo. Get a tight list of likely issues to verify—fast.
                </div>
              </div>
            </div>
          </div>

          <div className="ui-card ui-reveal" data-reveal>
            <div className="ui-cardTop">
              <div className="ui-cardIcon">
                <Icons.Spark />
              </div>
              <div>
                <div className={`ui-cardTitle ${inter.className}`}>Grounded answers</div>
                <div className={`ui-cardBody ${inter.className}`}>
                  Ask normal questions like “How should we store raw poultry?” and get rulebook-backed guidance.
                </div>
              </div>
            </div>
          </div>

          <div className="ui-card ui-reveal" data-reveal>
            <div className="ui-cardTop">
              <div className="ui-cardIcon">
                <Icons.Check />
              </div>
              <div>
                <div className={`ui-cardTitle ${inter.className}`}>Action checklist</div>
                <div className={`ui-cardBody ${inter.className}`}>
                  Convert concerns into a short close/open list your lead can run—today.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-section">
        <div className="ui-split">
          <div className="ui-reveal" data-reveal>
            <div className={`ui-eyebrow ${inter.className}`}>Workflow</div>
            <h2 className={`ui-h2 ${outfit.className}`}>A black-card vibe for real ops.</h2>
            <p className={`ui-lead ${inter.className}`}>
              Less chaos. More clarity. Use it before a rush, after a new hire, or when you want to tighten the line.
            </p>

            <div className="ui-steps">
              <div className="ui-step">
                <div className="ui-stepNum">01</div>
                <div>
                  <div className={`ui-stepTitle ${inter.className}`}>Scan or ask</div>
                  <div className={`ui-stepBody ${inter.className}`}>Photo scan for risks, or ask a question in plain language.</div>
                </div>
              </div>

              <div className="ui-step">
                <div className="ui-stepNum">02</div>
                <div>
                  <div className={`ui-stepTitle ${inter.className}`}>Verify the list</div>
                  <div className={`ui-stepBody ${inter.className}`}>You get a short list of likely issues—tight, not fluffy.</div>
                </div>
              </div>

              <div className="ui-step">
                <div className="ui-stepNum">03</div>
                <div>
                  <div className={`ui-stepTitle ${inter.className}`}>Turn it into actions</div>
                  <div className={`ui-stepBody ${inter.className}`}>Convert the important items into a close/open checklist.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ui-sideCard ui-reveal" data-reveal>
            <div className={`ui-sideTag ${inter.className}`}>Included</div>
            <ul className={`ui-sideList ${inter.className}`}>
              <li>
                <span className="ui-sideDot" /> Text + photo checks
              </li>
              <li>
                <span className="ui-sideDot" /> One site license per restaurant
              </li>
              <li>
                <span className="ui-sideDot" /> 7-day trial · cancel anytime
              </li>
              <li>
                <span className="ui-sideDot" /> Fast, grounded responses
              </li>
            </ul>

            <div className="ui-sideBtns">
              <button onClick={onShowPricing} className="ui-btn ui-btn-primary w-full">
                Start trial
              </button>
              <button onClick={onShowAuth} className="ui-btn ui-btn-secondary w-full">
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-section">
        <div className="ui-sectionHead ui-reveal" data-reveal>
          <div className={`ui-eyebrow ${inter.className}`}>FAQ</div>
          <h2 className={`ui-h2 ${outfit.className}`}>Short answers. No fluff.</h2>
        </div>

        <div className="ui-faq">
          {faqs.map((item, i) => {
            const open = openFaq === i
            return (
              <div key={i} className={`ui-faqItem ${open ? 'is-open' : ''} ui-reveal`} data-reveal>
                <button
                  className={`ui-faqQ ${inter.className}`}
                  onClick={() => setOpenFaq((v) => (v === i ? -1 : i))}
                  aria-expanded={open}
                >
                  <span>{item.q}</span>
                  <span className="ui-faqChevron">{open ? '–' : '+'}</span>
                </button>
                <div className="ui-faqA" style={{ maxHeight: open ? 220 : 0 }}>
                  <div className={`ui-faqAText ${inter.className}`}>{item.a}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="ui-section ui-section-bottom">
        <div className="ui-ready ui-reveal" data-reveal>
          <div className={`ui-eyebrow ${inter.className}`}>Ready</div>
          <h2 className={`ui-h2 ${outfit.className}`}>Make inspections boring again.</h2>
          <p className={`ui-lead ${inter.className}`}>
            Start the trial, run a scan in your walk-in, and keep the checklist on a manager clipboard.
          </p>

          <div className="ui-cta-row">
            <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
              Start trial
            </button>
            <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
              Sign in
            </button>
          </div>
        </div>

        <footer className="ui-footer">
          <div className="ui-footerLinks">
            <Link href="/terms" className="hover:text-white/80">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white/80">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-white/80">
              Contact
            </Link>
          </div>
          <div className={`ui-footnote ${inter.className}`}>
            protocolLM may make mistakes. Confirm critical decisions with official regulations and your local health department.
          </div>
        </footer>
      </section>
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

  // ✅ Background + iOS-safe layering (no more body ::after overlay)
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('ui-enterprise-bg')
    return () => {
      document.body.classList.remove('ui-enterprise-bg')
      document.body.classList.remove('ui-appmode')
    }
  }, [])

  // ✅ Only lock body scroll in app/chat mode (fixes iPad landing weirdness)
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (session) document.body.classList.add('ui-appmode')
    else document.body.classList.remove('ui-appmode')
  }, [session])

  // Reveal animations (subtle)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const els = Array.from(document.querySelectorAll('[data-reveal]'))
    if (els.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('ui-reveal-in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '80px' }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [session, isLoading])

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
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
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
          -webkit-text-size-adjust: 100%;
        }

        body.ui-enterprise-bg {
          background: #050608;
          color: rgba(255, 255, 255, 0.92);
        }

        /* Only lock scroll in app mode (chat) */
        body.ui-appmode {
          overflow: hidden;
        }

        /* ✅ iPad-safe background layer BEHIND content (no body ::after overlay) */
        .ui-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(900px 520px at 50% 0%, rgba(255, 255, 255, 0.10), transparent 62%),
            radial-gradient(900px 520px at 18% 12%, rgba(0, 255, 200, 0.05), transparent 62%),
            radial-gradient(900px 520px at 85% 12%, rgba(120, 90, 255, 0.06), transparent 62%),
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 9px);
          opacity: 0.95;
          filter: saturate(110%);
        }

        .ui-stage {
          position: relative;
          z-index: 1;
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

        /* Header */
        .ui-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(5, 6, 8, 0.62);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .ui-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.40);
        }

        /* Buttons */
        .ui-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
          user-select: none;
          white-space: nowrap;
        }
        .ui-btn:active {
          transform: translateY(1px);
        }

        .ui-btn-primary {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.55);
        }
        .ui-btn-primary:hover {
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.65);
        }

        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }
        .ui-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.20);
        }

        .ui-icon-btn {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.86);
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
        }
        .ui-icon-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.20);
          color: rgba(255, 255, 255, 0.98);
        }

        /* Modals / panels */
        .ui-modal {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(6, 7, 9, 0.88);
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
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
        }
        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }
        .ui-input:focus {
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.04);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.06);
        }

        .ui-toast {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
        }
        .ui-toast-ok {
          border-color: rgba(34, 197, 94, 0.35);
        }
        .ui-toast-err {
          border-color: rgba(239, 68, 68, 0.35);
        }

        /* Pricing premium surfaces */
        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.78);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-pricewrap {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }
        .ui-pricewrap::before {
          content: '';
          position: absolute;
          inset: -40% -30%;
          background:
            radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.10), transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(0, 255, 200, 0.06), transparent 55%),
            radial-gradient(circle at 60% 80%, rgba(120, 90, 255, 0.06), transparent 55%);
          pointer-events: none;
        }

        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.80);
          font-size: 12px;
          font-weight: 700;
        }

        .ui-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.10);
        }

        /* Landing layout */
        .ui-landing {
          width: 100%;
          max-width: 72rem;
          margin: 0 auto;
          padding: 26px 16px 0;
        }

        .ui-section {
          padding: 36px 0;
        }
        .ui-section-hero {
          padding-top: 22px;
        }
        .ui-section-bottom {
          padding-bottom: 40px;
        }

        .ui-heroCard {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025)),
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 1px, transparent 1px, transparent 10px);
          box-shadow: 0 55px 170px rgba(0, 0, 0, 0.75);
          padding: 26px 22px 20px;
          transform: translate3d(0, var(--ui-parallax, 0px), 0);
          will-change: transform;
        }
        .ui-heroCard::before {
          /* “liquid glass” motion only on the card */
          content: '';
          position: absolute;
          inset: -60% -40%;
          background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.16) 42%, transparent 60%);
          opacity: 0.22;
          transform: translate3d(-40%, 0, 0);
          animation: uiSheen 7.5s ease-in-out infinite;
          pointer-events: none;
          mix-blend-mode: overlay;
        }
        @keyframes uiSheen {
          0% {
            transform: translate3d(-45%, 0, 0) rotate(0.001deg);
          }
          50% {
            transform: translate3d(45%, 0, 0) rotate(0.001deg);
          }
          100% {
            transform: translate3d(-45%, 0, 0) rotate(0.001deg);
          }
        }

        .ui-kickers {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }

        .ui-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.86);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .ui-kicker-muted {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.70);
        }

        .ui-title {
          font-size: clamp(30px, 4vw, 56px);
          line-height: 1.02;
          letter-spacing: -0.05em;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.98);
          position: relative;
          z-index: 1;
        }

        .ui-subtitle {
          font-size: 14px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.76);
          max-width: 72ch;
          position: relative;
          z-index: 1;
        }

        .ui-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
          position: relative;
          z-index: 1;
        }

        .ui-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.66);
          position: relative;
          z-index: 1;
        }
        .ui-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.02);
        }
        .ui-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        .ui-sectionHead {
          margin-bottom: 16px;
        }
        .ui-eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.62);
          font-weight: 800;
          margin-bottom: 8px;
        }
        .ui-h2 {
          font-size: clamp(22px, 2.6vw, 34px);
          letter-spacing: -0.04em;
          color: rgba(255, 255, 255, 0.96);
          margin-bottom: 8px;
        }
        .ui-lead {
          font-size: 13px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.72);
          max-width: 75ch;
        }

        .ui-cardGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 14px;
        }
        @media (min-width: 920px) {
          .ui-cardGrid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }

        .ui-card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
          padding: 16px;
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }
        .ui-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.20);
          background: rgba(255, 255, 255, 0.04);
        }

        .ui-cardTop {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .ui-cardIcon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.90);
          flex: 0 0 auto;
        }
        .ui-cardTitle {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.92);
          margin-bottom: 6px;
        }
        .ui-cardBody {
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.70);
        }

        .ui-split {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: start;
        }
        @media (min-width: 980px) {
          .ui-split {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }

        .ui-steps {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }
        .ui-step {
          display: flex;
          gap: 12px;
          padding: 12px 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.02);
        }
        .ui-stepNum {
          font-size: 11px;
          letter-spacing: 0.18em;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.62);
          padding-top: 2px;
        }
        .ui-stepTitle {
          font-size: 12px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .ui-stepBody {
          font-size: 12px;
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.70);
        }

        .ui-sideCard {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
          padding: 16px;
          box-shadow: 0 30px 100px rgba(0, 0, 0, 0.65);
          position: sticky;
          top: 92px;
        }
        .ui-sideTag {
          display: inline-flex;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.70);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 999px;
          padding: 6px 10px;
          margin-bottom: 12px;
        }
        .ui-sideList {
          list-style: none;
          padding: 0;
          margin: 0 0 14px;
          display: grid;
          gap: 10px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 12px;
        }
        .ui-sideDot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.25);
          margin-right: 10px;
          transform: translateY(1px);
        }
        .ui-sideBtns {
          display: grid;
          gap: 10px;
        }

        .ui-faq {
          display: grid;
          gap: 10px;
          margin-top: 10px;
        }
        .ui-faqItem {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }
        .ui-faqQ {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 14px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.88);
        }
        .ui-faqChevron {
          color: rgba(255, 255, 255, 0.60);
          font-weight: 900;
          font-size: 18px;
        }
        .ui-faqA {
          overflow: hidden;
          transition: max-height 220ms ease;
        }
        .ui-faqAText {
          padding: 0 14px 14px;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.72);
        }

        .ui-ready {
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 30px 120px rgba(0, 0, 0, 0.65);
          padding: 18px;
        }

        .ui-footer {
          padding: 26px 0 34px;
          text-align: center;
          color: rgba(255, 255, 255, 0.55);
        }
        .ui-footerLinks {
          display: flex;
          gap: 18px;
          justify-content: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          margin-bottom: 10px;
        }
        .ui-footnote {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.44);
          max-width: 85ch;
          margin: 0 auto;
        }

        /* Reveal animation */
        .ui-reveal {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 420ms ease, transform 420ms ease;
        }
        .ui-reveal.ui-reveal-in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Chat bubbles — tool-like */
        .ui-bubble {
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.92);
        }
        .ui-bubble-user {
          background: rgba(255, 255, 255, 0.92);
          color: #000;
          border-color: rgba(255, 255, 255, 0.22);
        }

        .ui-empty {
          color: rgba(255, 255, 255, 0.70);
        }
      `}</style>

      <div className="ui-bg" aria-hidden="true" />
      <div className="ui-stage">
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

        {/* HEADER (sticky on BOTH landing + app) */}
        <header className="sticky top-0 z-40 ui-header">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`ui-brand ${outfit.className}`}>
                <span className="text-white/92 text-[12px] font-semibold tracking-[0.14em] uppercase">protocolLM</span>
              </div>
              {hasActiveSubscription && (
                <span className={`hidden sm:inline-flex text-[11px] text-white/65 ${inter.className}`}>Active · site license</span>
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
                      className="ui-icon-btn"
                      aria-label="User menu"
                      title={session?.user?.email || 'User'}
                    >
                      <span className="text-xs font-semibold">{session.user.email?.[0]?.toUpperCase() || 'U'}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-52 ui-modal overflow-hidden">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
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
        </header>

        {/* CONTENT */}
        {!isAuthenticated ? (
          <main className="pb-10">
            <LandingPage onShowPricing={() => setShowPricingModal(true)} onShowAuth={() => setShowAuthModal(true)} />
          </main>
        ) : (
          <main className="h-[100dvh] min-h-0 flex flex-col">
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
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" style={{ animationDelay: '0.24s' }} />
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
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[12px] text-white/75">
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="ui-icon-btn !w-8 !h-8" aria-label="Remove image">
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
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`ui-input flex-1 max-h-32 min-h-[42px] resize-none ${inter.className}`}
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
                        className={`ui-icon-btn ${(!input.trim() && !selectedImage) || isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center text-white/50 ${inter.className}`}>
                    protocolLM may make mistakes. Confirm critical decisions with official regulations and your local health department.
                  </p>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </>
  )
}
