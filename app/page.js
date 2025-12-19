// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'] })

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// eslint-disable-next-line no-unused-vars
const isAdmin = false

const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
  Shield: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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

const DEMO_DOCUMENTS = [
  'Washtenaw County Enforcement Actions',
  'Washtenaw County Violation Types',
  'Washtenaw County Food Allergy Information',
  'Washtenaw County Inspection Program',
  'Food Labeling Guide',
  'Food Temperatures',
  'Internal Cooking Temperatures',
  'FDA Food Code',
  'MI Modified Food Code',
  'MCL Act 92 of 2000',
  'Inspection Report Types',
  'Date Marking Guide',
  'Cross Contamination',
  'Cooling Foods',
  'Sanitation Standards',
  'Fat, Oil, and Grease Control',
  'New Business Information Packet',
  'Norovirus Environmental Cleaning',
  'Procedures for the Michigan Food Code',
  'Retail Food Establishments Emergency Action Plan',
  'Summary Chart for Minimum Cooking Food Temperatures',
  'USDA Safe Minimum Internal Temperature Chart',
]

const TYPEWRITER_LINES = [
  'Welcome to Protocol LM.',
  'Where you catch violations before they cost you.',
  'Upload an image to check compliance in seconds.',
  'Ask anything about Washtenaw County food safety and regulations.',
]

function FooterLinks({ variant = 'landing' }) {
  return (
    <div className={variant === 'chat' ? 'plm-footer plm-footer-chat' : 'plm-footer'}>
      <Link href="/terms" className="plm-footer-link">
        TERMS
      </Link>
      <span className="plm-footer-sep">·</span>
      <Link href="/privacy" className="plm-footer-link">
        PRIVACY
      </Link>
      <span className="plm-footer-sep">·</span>
      <Link href="/contact" className="plm-footer-link">
        CONTACT
      </Link>
    </div>
  )
}

function useConsoleTypewriter(lines) {
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let isCancelled = false
    let lineIndex = 0
    let charIndex = 0
    let buffer = ''
    let printed = []
    let deleting = false
    let deleteCountdown = 0
    let mistakesUsed = 0
    const mistakeLimit = 1
    let timeoutId

    const schedule = (delay) => {
      timeoutId = setTimeout(step, delay)
    }

    const step = () => {
      if (isCancelled) return
      const current = lines[lineIndex]

      if (!deleting) {
        const allowMistake = mistakesUsed < mistakeLimit
        const makeMistake = allowMistake && Math.random() < 0.04 && charIndex > 4 && charIndex < current.length - 6

        if (makeMistake) {
          mistakesUsed += 1
          const alphabet = 'abcdefghijklmnopqrstuvwxyz'
          const wrongChar = alphabet[Math.floor(Math.random() * alphabet.length)]
          buffer += wrongChar
          deleteCountdown = 1
          deleting = true
          setOutput([...printed, buffer].join('\n'))
          return schedule(90 + Math.random() * 40)
        }

        buffer += current[charIndex]
        charIndex += 1
        setOutput([...printed, buffer].join('\n'))

        if (charIndex === current.length) {
          printed = [...printed, buffer]
          buffer = ''
          charIndex = 0
          lineIndex += 1
          mistakesUsed = 0

          if (lineIndex >= lines.length) {
            setOutput(printed.join('\n'))
            setDone(true)
            return
          }
          return schedule(400)
        }

        return schedule(28 + Math.random() * 18)
      }

      buffer = buffer.slice(0, -1)
      deleteCountdown -= 1
      setOutput([...printed, buffer].join('\n'))

      if (deleteCountdown <= 0) deleting = false
      schedule(40 + Math.random() * 50)
    }

    schedule(400)

    return () => {
      isCancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines])

  return { output, done }
}

function SmartProgress({ active, mode = 'text', requestKey = 0 }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('Starting…')

  const refs = useRef({ pct: 0, timer: null, startedAt: 0, hideTimer: null })

  const cfg = useMemo(() => {
    return mode === 'vision' ? { baseCap: 88, finalCap: 94, k: 0.03 } : { baseCap: 90, finalCap: 96, k: 0.04 }
  }, [mode])

  useEffect(() => {
    if (refs.current.hideTimer) {
      clearTimeout(refs.current.hideTimer)
      refs.current.hideTimer = null
    }

    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ? 'Uploading image…' : 'Sending…')

      refs.current.pct = 0
      refs.current.startedAt = Date.now()

      if (refs.current.timer) clearInterval(refs.current.timer)

      refs.current.timer = setInterval(() => {
        const elapsed = (Date.now() - refs.current.startedAt) / 1000

        const cap = elapsed < 1.5 ? cfg.baseCap - 8 : elapsed < 4 ? cfg.baseCap : cfg.finalCap
        const next = refs.current.pct + (cap - refs.current.pct) * cfg.k
        refs.current.pct = Math.max(refs.current.pct, next)

        const pctInt = Math.min(99, Math.floor(refs.current.pct))
        setProgress(pctInt)

        const p = pctInt
        if (p < 15) setPhase(mode === 'vision' ? 'Analyzing image…' : 'Reading question…')
        else if (p < 45) setPhase('Searching Washtenaw excerpts…')
        else if (p < 70) setPhase('Cross-checking requirements…')
        else if (p < 90) setPhase('Building the best answer…')
        else setPhase('Finalizing…')
      }, 120)

      return () => {
        if (refs.current.timer) clearInterval(refs.current.timer)
        refs.current.timer = null
      }
    }

    if (!active && visible) {
      if (refs.current.timer) clearInterval(refs.current.timer)
      refs.current.timer = null

      setProgress(100)
      setPhase('Done')

      refs.current.hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 350)

      return () => {
        if (refs.current.hideTimer) clearTimeout(refs.current.hideTimer)
        refs.current.hideTimer = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, requestKey, cfg, mode, visible])

  if (!visible) return null

  return (
    <div className="smart-progress">
      <div className={`smart-progress-header ${ibmMono.className}`}>
        <span className="smart-progress-phase">{phase}</span>
        <span className="smart-progress-pct">{progress}%</span>
      </div>
      <div className="smart-progress-track">
        <div className="smart-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const { output: typewriter, done: typewriterDone } = useConsoleTypewriter(TYPEWRITER_LINES)

  // 2x is enough once the scroll track is correctly structured.
  const documentScrollRows = useMemo(() => [...DEMO_DOCUMENTS, ...DEMO_DOCUMENTS], [])
  const [showPricingMenu, setShowPricingMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setShowPricingMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className={`${ibmMono.className} ibm-landing`}>
      <div className="ibm-landing-topbar">
        <div className="ibm-brand" aria-label="protocolLM">
          protocolLM
        </div>

        <div className="ibm-top-actions">
          <div className="pricing-menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className="ibm-cta small secondary"
              onClick={() => setShowPricingMenu((v) => !v)}
              aria-expanded={showPricingMenu}
            >
              Pricing
            </button>
            {showPricingMenu && (
              <div className="pricing-menu">
                <div className="pricing-menu-title">protocolLM access</div>
                <div className="pricing-menu-price">$100 / month</div>
                <div className="pricing-menu-meta">7-day free trial · Cancel anytime</div>
                <button
                  type="button"
                  className="ibm-cta small block"
                  onClick={() => {
                    setShowPricingMenu(false)
                    onShowPricing()
                  }}
                >
                  Start trial
                </button>
              </div>
            )}
          </div>

          <button onClick={onShowPricing} className="ibm-cta small" type="button">
            Start trial
          </button>

          <button onClick={onShowAuth} className="ibm-cta small secondary" type="button">
            Sign in
          </button>
        </div>
      </div>

      <div className="ibm-landing-bg" />

      <div className="ibm-landing-grid">
        <section className="ibm-console-text">
          <pre className="ibm-console-type">
            {typewriter}
            {typewriterDone && <span className="type-cursor">▌</span>}
          </pre>
        </section>

        <section className="ibm-doc-card" aria-label="Document index">
          <div className="ibm-doc-window">
            <div className="ibm-doc-gradient" />
            <div className="ibm-doc-scroll">
              <div className="ibm-doc-scroll-track animate-doc-scroll">
                {documentScrollRows.map((doc, idx) => (
                  <div key={`${doc}-${idx}`} className="ibm-doc-row">
                    <span className="ibm-doc-dot" />
                    <span className="ibm-doc-name" title={doc}>
                      {doc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ibm-doc-footer">Indexed docs · Washtenaw focus</div>
        </section>
      </div>

      <FooterLinks variant="landing" />
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
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
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
        }, 2000)
      } else if (mode === 'signup') {
        setMessageKind('ok')
        setMessage('Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <Icons.X />
          </button>

          <div className="modal-header">
            <h2 className="modal-title">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className="modal-subtitle">
              {mode === 'signin' && 'Sign in to access your compliance console'}
              {mode === 'signup' && 'Start your 7-day free trial today'}
              {mode === 'reset' && "Enter your email and we'll send reset instructions"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-field">
              <label className="form-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
                required
                className="form-input"
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-field">
                <label className="form-label">Password</label>
                <div className="form-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="form-input"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="form-toggle">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !isLoaded} className="btn-form-submit">
              {loading && <span className="btn-spinner" />}
              <span className="btn-label">{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</span>
            </button>
          </form>

          {message && <div className={`modal-alert ${messageKind}`}>{message}</div>}

          <div className="modal-footer">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className="modal-link">
                  Forgot your password?
                </button>
                <button type="button" onClick={() => setMode('signup')} className="modal-link">
                  Need an account? <strong>Sign up free</strong>
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                Already have an account? <strong>Sign in</strong>
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                ← Back to sign in
              </button>
            )}
          </div>

          <RecaptchaBadge />
        </div>
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper modal-wrapper-lg" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close">
            <Icons.X />
          </button>

          <div className="modal-header">
            <h2 className="modal-title pricing-title">protocolLM access</h2>
          </div>

          <div className="pricing-modal-amount">
            <span className="pricing-currency">$</span>
            <span className="pricing-number-lg">100</span>
            <span className="pricing-period">/month</span>
          </div>

          <div className="pricing-modal-actions">
            <button onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')} disabled={!!loading} className="btn-pricing-modal-primary">
              {loading === 'monthly' && <span className="btn-spinner" />}
              <span className="btn-label">Start 7-day free trial</span>
            </button>

            <button onClick={() => onCheckout(ANNUAL_PRICE, 'annual')} disabled={!!loading} className="btn-pricing-modal-secondary">
              {loading === 'annual' && <span className="btn-spinner" />}
              <span className="btn-label">Annual plan · $1,000/year</span>
              <span className="btn-badge">Save $200</span>
            </button>
          </div>

          <p className="pricing-modal-note">
            <span>7-day free trial · Cancel anytime</span>
            <span className="pricing-note-break">One license per restaurant location</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const { isLoaded: captchaLoaded, executeRecaptcha } = useRecaptcha()

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

  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  const isAuthenticated = !!session

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) {
      splineContainer.style.display = isAuthenticated ? 'none' : 'block'
    }
  }, [isAuthenticated])

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

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
    if (shouldAutoScrollRef.current) requestAnimationFrame(() => scrollToBottom('auto'))
  }, [messages, scrollToBottom])

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

      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        if (!profile) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        const accepted = !!(profile?.accepted_terms && profile?.accepted_privacy)
        if (!accepted) {
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (profileError) {
          console.error('❌ Profile check error:', profileError)
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('❌ Policy check exception:', e)
        setHasActiveSubscription(false)
        setIsLoading(false)
        router.replace('/accept-terms')
        return
      }

      let active = false
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status,current_period_end')
          .eq('user_id', s.user.id)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub && sub.current_period_end) {
          const end = new Date(sub.current_period_end)
          if (end > new Date()) active = true
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

      if (!captchaLoaded) {
        alert('Security verification is still loading. Please try again in a moment.')
        return
      }

      setCheckoutLoading(planName)

      const captchaToken = await executeRecaptcha('checkout')
      if (!captchaToken || captchaToken === 'turnstile_unavailable') {
        throw new Error('Security verification failed. Please refresh and try again.')
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ priceId, captchaToken }),
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Checkout failed')

      if (payload.url) window.location.href = payload.url
      else throw new Error('No checkout URL returned')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast.textContent = 'Opening billing portal...'
      loadingToast.className = 'fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-lg z-[9999]'
      document.body.appendChild(loadingToast)

      const { data } = await supabase.auth.getSession()
      const accessToken = data?.session?.access_token

      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload.error || 'Failed to open billing portal')
        return
      }
      if (payload.url) window.location.href = payload.url
      else alert('No billing portal URL returned')
    } catch (error) {
      console.error('Billing portal error:', error)
      alert('Failed to open billing portal')
    } finally {
      try {
        if (loadingToast) document.body.removeChild(loadingToast)
      } catch {}
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

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage

    setSendMode(image ? 'vision' : 'text')
    setSendKey((k) => k + 1)

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
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner" />
          <span className={`loading-text ${ibmMono.className}`}>Loading protocolLM…</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        /* ==========================================================================
           protocolLM — Retro Console (IBM) + Clean Dark
           Fixes in this version:
           - HARD fix for iOS/desktop "white leak" (html bg + fixed viewport bg + overflow clamp)
           - protocolLM brand top-left (landing + chat)
           - Terms / Privacy / Contact footer (landing + chat)
           - Pricing: removed Site License pill + removed redundant Unlimited usage row
           - Removed dotted zero in 100
           - Auth modal: removed header icon + removed alert icons
           - Empty chat state now truly center-center
           - Removed green focus outline/box on textarea & buttons
           ========================================================================== */

        :root {
          --bg-0: #0e0e11;
          --bg-1: #121218;
          --bg-2: #15151a;
          --ink-0: #f2f2f2;
          --ink-1: #d9d9df;
          --ink-2: #b9b9c4;
          --line-0: #24242d;
          --line-1: #2a2a32;
          --line-2: #3a3a42;
          --shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        }

        *, *::before, *::after { box-sizing: border-box; }

        /* --- WHITE LEAK KILL SWITCH --- */
        html {
          height: 100%;
          background: var(--bg-0) !important;
          width: 100%;
          overscroll-behavior: none;
        }
        body {
          min-height: 100%;
          margin: 0;
          background: var(--bg-0) !important;
          color: var(--ink-0);
          width: 100%;
          overscroll-behavior: none;
          overflow-x: hidden;
          -webkit-tap-highlight-color: transparent;
        }
        /* fixed viewport background prevents Safari overscroll/underscroll from showing white */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
          pointer-events: none;
        }
        @supports (overflow: clip) {
          html, body { overflow-x: clip; }
        }

        ::selection { background: rgba(217, 217, 223, 0.18); color: var(--ink-0); }

        /* Scrollbar (subtle, non-blue) */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(217, 217, 223, 0.14); border-radius: 6px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(217, 217, 223, 0.2); }

        /* kill default focus outlines (your request) */
        :focus { outline: none; }
        :focus-visible { outline: none; }
        button:focus, button:focus-visible,
        textarea:focus, textarea:focus-visible,
        input:focus, input:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        /* Loading */
        .loading-screen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-0);
          z-index: 9999;
        }
        .loading-content { display: flex; flex-direction: column; align-items: center; gap: 14px; }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(217, 217, 223, 0.2);
          border-top-color: rgba(217, 217, 223, 0.7);
          border-radius: 999px;
          animation: spin 0.8s linear infinite;
        }
        .loading-text { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-1); }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* App shell */
        .app-container {
          min-height: 100svh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
          width: 100%;
        }

        /* Footer links */
        .plm-footer {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: max(16px, env(safe-area-inset-bottom));
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 10px 22px rgba(0,0,0,0.25);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-2);
          user-select: none;
        }
        .plm-footer-chat {
          position: static;
          transform: none;
          margin: 10px auto 0;
          width: fit-content;
          bottom: auto;
        }
        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
        }
        .plm-footer-link:hover { color: var(--ink-0); }
        .plm-footer-sep { opacity: 0.5; }

        /* ==========================================================================
           IBM Landing
           ========================================================================== */
        .ibm-landing {
          position: relative;
          padding: 34px 20px 74px;
          min-height: 100svh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-0);
          color: var(--ink-0);
          width: 100%;
          overflow: hidden;
        }

        .ibm-landing-topbar {
          position: absolute;
          top: 14px;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          z-index: 5;
          pointer-events: none;
        }

        .ibm-brand {
          pointer-events: auto;
          color: var(--ink-0);
          font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
          opacity: 0.95;
          user-select: none;
        }

        .ibm-top-actions { display: flex; gap: 10px; align-items: center; pointer-events: auto; }
        .pricing-menu-wrapper { position: relative; }

        .ibm-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 14px;
          background: var(--bg-2);
          color: var(--ink-0);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
          font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        }
        .ibm-cta:hover { transform: translateY(-1px); background: #1c1c22; border-color: #34343c; }
        .ibm-cta.secondary { background: transparent; color: var(--ink-1); }
        .ibm-cta.secondary:hover { color: var(--ink-0); background: rgba(255,255,255,0.04); }
        .ibm-cta.small { padding: 7px 11px; font-size: 11px; letter-spacing: 0.12em; border-radius: 9px; }
        .ibm-cta.block { width: 100%; }

        .pricing-menu {
          position: absolute;
          right: 0;
          margin-top: 8px;
          background: var(--bg-1);
          border: 1px solid var(--line-1);
          border-radius: 10px;
          padding: 10px;
          min-width: 220px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pricing-menu-title {
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-0);
          font-size: 11px;
        }
        .pricing-menu-price { font-size: 16px; font-weight: 800; color: var(--ink-0); }
        .pricing-menu-meta { color: var(--ink-2); font-size: 11px; line-height: 1.4; }

        .ibm-landing-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(48, 48, 54, 0.26), transparent 52%),
            radial-gradient(circle at 80% 0%, rgba(48, 48, 54, 0.18), transparent 44%),
            linear-gradient(90deg, rgba(14, 14, 17, 0.98) 0%, rgba(16, 16, 20, 0.95) 100%);
          pointer-events: none;
        }

        .ibm-landing-grid {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1180px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          align-items: stretch;
        }

        .ibm-console-text {
          padding: 18px;
          min-height: 340px;
          display: flex;
          align-items: center;
        }
        .ibm-console-type {
          margin: 0;
          white-space: pre-wrap;
          color: #e2e8f5;
          font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          line-height: 1.45;
          font-size: 15px;
        }
        .type-cursor { display: inline-block; width: 10px; animation: cursor-blink 1s steps(2, end) infinite; }
        @keyframes cursor-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }

        .ibm-doc-card {
          background: var(--bg-1);
          border: 1px solid var(--line-0);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ibm-doc-window {
          position: relative;
          background: #0d0d12;
          border: 1px solid var(--line-1);
          border-radius: 12px;
          overflow: hidden;
          height: 320px;
        }

        .ibm-doc-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #0d0d12 0%, transparent 16%, transparent 84%, #0d0d12 100%);
          z-index: 2;
          pointer-events: none;
        }

        .ibm-doc-scroll {
          position: absolute;
          inset: 12px;
          overflow: hidden;
          padding-right: 8px;
        }
        .ibm-doc-scroll-track {
          display: flex;
          flex-direction: column;
          gap: 10px;
          will-change: transform;
        }

        .ibm-doc-row {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--ink-0);
          font-size: 13px;
          letter-spacing: -0.01em;
          font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          min-height: 22px;
        }

        .ibm-doc-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--ink-2);
        }

        .ibm-doc-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .animate-doc-scroll { animation: doc-scroll 20s linear infinite; }
        @keyframes doc-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        .ibm-doc-footer {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-2);
          opacity: 0.9;
          padding: 2px 2px 0;
        }

        @media (max-width: 768px) {
          .ibm-landing { padding: 32px 16px 58px; }
          .ibm-landing-grid { grid-template-columns: 1fr; }
          .ibm-brand { font-size: 16px; }
        }

        /* ==========================================================================
           Modals
           ========================================================================== */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.62);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 200ms ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .modal-wrapper { width: 100%; max-width: 420px; animation: modalUp 240ms ease; }
        .modal-wrapper-lg { max-width: 480px; }
        @keyframes modalUp { from { opacity: 0; transform: translateY(12px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .modal-card {
          position: relative;
          background: var(--bg-1);
          border: 1px solid var(--line-1);
          border-radius: 16px;
          box-shadow: 0 16px 50px rgba(0, 0, 0, 0.55);
          padding: 28px;
          overflow: hidden;
          color: var(--ink-0);
        }
        @media (max-width: 480px) { .modal-card { padding: 22px 18px; } }

        .modal-close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1c1c22;
          border: 1px solid var(--line-1);
          border-radius: 9px;
          color: var(--ink-1);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          z-index: 10;
        }
        .modal-close-btn:hover { background: #22222a; color: var(--ink-0); border-color: #34343c; }

        .modal-header { text-align: center; margin-bottom: 18px; }
        .modal-title { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 6px; color: var(--ink-0); }
        .modal-subtitle { font-size: 13px; color: var(--ink-1); line-height: 1.55; margin: 0; }

        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .form-field { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: #1a1a20;
          border: 1px solid var(--line-1);
          border-radius: 10px;
          color: var(--ink-0);
          font-size: 14px;
        }
        .form-input::placeholder { color: rgba(217,217,223,0.45); }
        .form-input:focus { border-color: #34343c; }

        .form-input-group { position: relative; }
        .form-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--ink-2);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .form-toggle:hover { color: var(--ink-0); }

        .btn-form-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 44px;
          background: #2a2a32;
          color: var(--ink-0);
          border: 1px solid #34343c;
          border-radius: 10px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .btn-form-submit:hover:not(:disabled) { background: #34343c; transform: translateY(-1px); }
        .btn-form-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: rgba(255,255,255,0.8);
          border-radius: 999px;
          animation: spin 0.6s linear infinite;
        }

        .modal-alert {
          padding: 12px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          margin-top: 14px;
          font-size: 13px;
          color: var(--ink-1);
          line-height: 1.5;
          text-align: center;
        }
        .modal-alert.ok { border-color: rgba(16,185,129,0.35); }
        .modal-alert.err { border-color: rgba(239,68,68,0.35); }

        .modal-footer { margin-top: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .modal-link {
          background: none;
          border: none;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: var(--ink-2);
          cursor: pointer;
        }
        .modal-link:hover { color: var(--ink-0); }
        .modal-link strong { color: var(--ink-0); font-weight: 800; }

        /* Pricing modal */
        .pricing-title { text-transform: lowercase; }
        .pricing-modal-amount { display: flex; align-items: baseline; justify-content: center; gap: 4px; margin: 10px 0 18px; }
        .pricing-currency { font-size: 16px; color: var(--ink-2); }
        .pricing-number-lg {
          font-size: 56px;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--ink-0);
          /* remove dotted/slashed zero features */
          font-feature-settings: "zero" 0;
          font-variant-numeric: tabular-nums;
        }
        .pricing-period { font-size: 13px; color: var(--ink-2); margin-left: 4px; }

        .pricing-modal-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
        .btn-pricing-modal-primary,
        .btn-pricing-modal-secondary {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 10px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }
        .btn-pricing-modal-primary {
          background: #2a2a32;
          border: 1px solid #34343c;
          color: var(--ink-0);
        }
        .btn-pricing-modal-primary:hover:not(:disabled) { background: #34343c; transform: translateY(-1px); }
        .btn-pricing-modal-secondary {
          background: transparent;
          border: 1px solid var(--line-1);
          color: var(--ink-0);
        }
        .btn-pricing-modal-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.04); border-color: #34343c; }
        .btn-pricing-modal-primary:disabled,
        .btn-pricing-modal-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-badge {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 900;
          color: var(--ink-0);
          background: #2a2a32;
          border: 1px solid #34343c;
          padding: 3px 8px;
          border-radius: 8px;
        }

        .pricing-modal-note {
          text-align: center;
          font-size: 11px;
          color: var(--ink-2);
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 0;
        }
        .pricing-note-break { color: rgba(217,217,223,0.75); }

        /* ==========================================================================
           Chat
           ========================================================================== */
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--bg-0);
          color: var(--ink-0);
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .chat-container::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.02),
            rgba(255,255,255,0.02) 1px,
            rgba(0,0,0,0) 3px,
            rgba(0,0,0,0) 6px
          );
          opacity: 0.35;
          mix-blend-mode: overlay;
        }

        .chat-topbar {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 14px 16px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          position: relative;
          z-index: 2;
        }

        .chat-brand {
          color: var(--ink-0);
          font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
          opacity: 0.95;
          user-select: none;
        }

        .chat-top-actions { display: flex; align-items: center; gap: 10px; }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 10px 16px 16px;
          gap: 14px;
          position: relative;
          z-index: 2;
          -webkit-overflow-scrolling: touch;
        }
        .chat-messages.is-empty {
          justify-content: center; /* center-center empty state */
        }

        .chat-empty-content {
          max-width: 560px;
          width: 100%;
          text-align: center;
          border: 1px dashed var(--line-1);
          border-radius: 12px;
          padding: 18px 18px 16px;
          background: rgba(255,255,255,0.02);
        }
        .chat-empty-title {
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 900;
          color: var(--ink-0);
          margin: 0 0 8px;
        }
        .chat-empty-text {
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-1);
          margin: 0;
        }

        .chat-history {
          max-width: 820px;
          margin: 0 auto;
          width: 100%;
          padding: 12px 6px 10px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: transparent;
        }

        .chat-message { display: flex; width: 100%; }
        .chat-message-user { justify-content: flex-end; }
        .chat-message-assistant { justify-content: flex-start; }

        .chat-bubble {
          max-width: 92%;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.65;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--ink-0);
        }
        .chat-bubble-user {
          background: rgba(255,255,255,0.03);
          border-style: dashed;
          border-color: rgba(217,217,223,0.25);
        }
        .chat-bubble-assistant {
          border-left: 3px solid rgba(217,217,223,0.22);
        }

        .chat-bubble-image {
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 10px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        .chat-thinking { color: var(--ink-2); font-style: italic; }

        .chat-input-area {
          flex-shrink: 0;
          background: var(--bg-0);
          border-top: 1px solid var(--line-1);
          box-shadow: 0 -12px 28px rgba(0,0,0,0.35);
          position: relative;
          z-index: 3;
        }

        .chat-input-inner {
          max-width: 820px;
          margin: 0 auto;
          padding: 14px 16px 18px;
          padding-bottom: max(14px, env(safe-area-inset-bottom));
        }

        .smart-progress { padding: 0 4px 12px; }
        .smart-progress-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .smart-progress-phase { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }
        .smart-progress-pct { font-size: 11px; font-variant-numeric: tabular-nums; color: var(--ink-0); }
        .smart-progress-track { height: 3px; background: rgba(217,217,223,0.18); border-radius: 2px; overflow: hidden; }
        .smart-progress-bar { height: 100%; background: rgba(217,217,223,0.65); border-radius: 2px; transition: width 150ms linear; }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--bg-1);
          border: 1px dashed rgba(217,217,223,0.25);
          border-radius: 12px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-1);
          margin-bottom: 10px;
        }

        .chat-input-row { display: flex; align-items: center; gap: 10px; }

        .chat-btn-icon {
          width: 44px;
          height: 44px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-1);
          border: 1px solid var(--line-1);
          border-radius: 12px;
          color: var(--ink-1);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .chat-btn-icon:hover {
          transform: translateY(-1px);
          background: #1c1c22;
          border-color: #34343c;
          color: var(--ink-0);
        }

        .chat-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 160px;
          padding: 12px 4px;
          background: transparent;
          border: none;
          border-bottom: 1px dashed rgba(217,217,223,0.25);
          border-radius: 0;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.5;
          resize: none;
          outline: none;
          box-shadow: none;
          transition: border-color 0.15s ease;
          font-family: inherit;
          caret-color: var(--ink-0); /* no weird green caret */
        }
        .chat-textarea::placeholder { color: rgba(217,217,223,0.38); }
        .chat-textarea:focus { border-color: rgba(217,217,223,0.55); }

        .chat-send-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2a2a32;
          border: 1px solid #34343c;
          border-radius: 12px;
          color: var(--ink-0);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) { background: #34343c; transform: translateY(-1px); }
        .chat-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .chat-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(217,217,223,0.25);
          border-top-color: rgba(217,217,223,0.8);
          border-radius: 999px;
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          margin-top: 10px;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.06em;
          color: rgba(217,217,223,0.55);
        }

        @media (max-width: 640px) {
          .chat-input-inner { padding: 12px 14px 14px; }
          .chat-history { padding: 10px 4px 10px; }
          .chat-bubble { max-width: 92%; }
          .chat-brand { font-size: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} initialMode={authInitialMode} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="app-container">
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>
          {!isAuthenticated ? (
            <LandingPage
              onShowPricing={() => setShowPricingModal(true)}
              onShowAuth={() => {
                setAuthInitialMode('signin')
                setShowAuthModal(true)
              }}
            />
          ) : (
            <div className={`${ibmMono.className} chat-container`}>
              <div className="chat-topbar">
                <div className="chat-brand" aria-label="protocolLM">
                  protocolLM
                </div>

                <div className="chat-top-actions">
                  {hasActiveSubscription && (
                    <button onClick={handleManageBilling} className="ibm-cta small secondary" type="button">
                      Billing
                    </button>
                  )}
                  <button onClick={handleSignOut} className="ibm-cta small secondary" type="button">
                    Log out
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`chat-messages ${messages.length === 0 ? 'is-empty' : ''}`}
              >
                {messages.length === 0 ? (
                  <div className="chat-empty-content">
                    <h2 className="chat-empty-title">Upload a photo or ask a question</h2>
                    <p className="chat-empty-text">
                      One-click photo checks for likely issues, or query the Washtenaw-focused database for a clear answer.
                    </p>
                  </div>
                ) : (
                  <div className="chat-history">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
                      >
                        <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                          {msg.image && (
                            <div className="chat-bubble-image">
                              <img src={msg.image} alt="Uploaded" />
                            </div>
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <span className="chat-thinking">Analyzing…</span>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="chat-input-area">
                <div className="chat-input-inner">
                  <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                  {selectedImage && (
                    <div className="chat-attachment">
                      <Icons.Camera />
                      <span>Image attached</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="chat-btn-icon"
                        style={{ width: 32, height: 32, borderRadius: 10 }}
                        aria-label="Remove"
                        type="button"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="chat-input-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />

                    <button onClick={() => fileInputRef.current?.click()} className="chat-btn-icon" aria-label="Attach image" type="button">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: 10 }}>
                      <textarea
                        ref={textAreaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className="chat-textarea"
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
                        className="chat-send-btn"
                        aria-label="Send"
                      >
                        {isSending ? <div className="chat-spinner" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className="chat-disclaimer">protocolLM may make mistakes. Verify critical decisions with official regulations.</p>
                  <FooterLinks variant="chat" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
