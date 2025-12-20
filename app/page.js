// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// eslint-disable-next-line no-unused-vars
const isAdmin = false

const Icons = {
  Camera: () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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
  Sparkle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
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
  'Welcome to protocolLM.',
  'Catch violations before they cost you.',
  'Upload a photo — check compliance fast.',
  'Ask about Washtenaw County regulations.',
]

function useConsoleTypewriter(lines) {
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    let lineIndex = 0
    let charIndex = 0
    let buffer = ''
    let printed = []
    let timeoutId = null

    const rand = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
    const isPunc = (ch) => ['.', ',', '!', '?', ':', ';'].includes(ch)
    const isLongPunc = (ch) => ['.', '!', '?'].includes(ch)

    const schedule = (ms) => {
      timeoutId = setTimeout(step, ms)
    }

    const step = () => {
      if (cancelled) return

      const current = lines[lineIndex] || ''
      const ch = current[charIndex]

      if (lineIndex >= lines.length) {
        setDone(true)
        return
      }

      if (charIndex >= current.length) {
        printed = [...printed, buffer]
        buffer = ''
        charIndex = 0
        lineIndex += 1
        setOutput(printed.join('\n'))

        if (lineIndex >= lines.length) {
          setDone(true)
          return
        }

        return schedule(rand(650, 900))
      }

      buffer += ch
      charIndex += 1
      setOutput([...printed, buffer].join('\n'))

      let delay = rand(55, 95)
      if (ch === '—') delay += rand(120, 220)
      if (isPunc(ch)) delay += rand(140, 260)
      if (isLongPunc(ch)) delay += rand(180, 320)
      if (ch === ' ' && Math.random() < 0.12) delay += rand(40, 90)

      schedule(delay)
    }

    schedule(650)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lines])

  return { output, done }
}

function RotatingDocPill({ items, intervalMs = 2200 }) {
  const [idx, setIdx] = useState(0)

  const maxLen = useMemo(() => {
    if (!items?.length) return 0
    return items.reduce((m, s) => Math.max(m, (s || '').length), 0)
  }, [items])

  useEffect(() => {
    if (!items?.length) return
    const t = setInterval(() => setIdx((v) => (v + 1) % items.length), intervalMs)
    return () => clearInterval(t)
  }, [items, intervalMs])

  if (!items?.length) return null

  return (
    <div className="doc-pill-wrap" aria-hidden="true">
      <div className="doc-pill" style={{ ['--doc-pill-item-width']: `${maxLen}ch` }}>
        <span className="doc-pill-icon">
          <Icons.Sparkle />
        </span>
        <span className="doc-pill-label">Indexed</span>
        <span className="doc-pill-divider" />
        <span key={idx} className="doc-pill-item" title={items[idx]}>
          {items[idx]}
        </span>
      </div>
    </div>
  )
}

function BrandLink({ variant = 'landing' }) {
  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={32} height={32} priority />
        </span>
        <span className="plm-brand-text">protocolLM</span>
      </span>
    </Link>
  )
}

function FooterLinks({ variant = 'landing' }) {
  return (
    <div className={`plm-footer-links ${variant === 'chat' ? 'chat' : 'landing'} ${ibmMono.className}`}>
      <Link className="plm-footer-link" href="/terms">
        Terms
      </Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/privacy">
        Privacy
      </Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/contact">
        Contact
      </Link>
    </div>
  )
}

function MobileLandingActions({ onShowPricing, onShowAuth }) {
  return (
    <div className={`landing-mobile-actions ${ibmMono.className}`}>
      <button type="button" className="mob-cta ghost" onClick={onShowPricing}>
        Pricing
      </button>
      <button type="button" className="mob-cta primary" onClick={onShowPricing}>
        Start trial
      </button>
      <button type="button" className="mob-cta ghost" onClick={onShowAuth}>
        Sign in
      </button>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const { output: typewriter, done: typewriterDone } = useConsoleTypewriter(TYPEWRITER_LINES)
  const [showPricingMenu, setShowPricingMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setShowPricingMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  return (
    <div className={`${ibmMono.className} landing-root`}>
      {/* Gradient mesh background */}
      <div className="landing-gradient-bg" />
      <div className="landing-grid-overlay" />

      {/* Top bar */}
      <header className="landing-topbar">
        <div className="plm-brand-wrap">
          <BrandLink variant="landing" />
        </div>

        <div className="landing-top-center">
          <RotatingDocPill items={DEMO_DOCUMENTS} />
        </div>

        <nav className="landing-top-actions desktop-only">
          <div className="pricing-menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className="btn-nav ghost"
              onClick={() => setShowPricingMenu((v) => !v)}
              aria-expanded={showPricingMenu}
            >
              Pricing
            </button>

            {showPricingMenu && (
              <div className="pricing-dropdown">
                <div className="pricing-dropdown-header">
                  <span className="pricing-dropdown-title">protocolLM</span>
                  <span className="pricing-dropdown-badge">Pro</span>
                </div>
                <div className="pricing-dropdown-amount">
                  <span className="currency">$</span>
                  <span className="amount">100</span>
                  <span className="period">/mo</span>
                </div>
                <p className="pricing-dropdown-note">7-day free trial · Cancel anytime</p>
                <button
                  type="button"
                  className="btn-primary block"
                  onClick={() => {
                    setShowPricingMenu(false)
                    onShowPricing()
                  }}
                >
                  Start free trial
                </button>
              </div>
            )}
          </div>

          <button onClick={onShowPricing} className="btn-primary" type="button">
            Start trial
          </button>

          <button onClick={onShowAuth} className="btn-nav ghost" type="button">
            Sign in
          </button>
        </nav>
      </header>

      {/* Main hero */}
      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-terminal">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
              <span className="terminal-title">protocolLM</span>
            </div>
            <div className="terminal-body">
              <pre className="terminal-output">
                {typewriter}
                {typewriterDone && <span className="cursor-block">▌</span>}
              </pre>
            </div>
          </div>

          <div className="hero-cta-row desktop-only">
            <button onClick={onShowPricing} className="btn-hero-primary" type="button">
              <span>Start 7-day free trial</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={onShowAuth} className="btn-hero-secondary" type="button">
              Sign in
            </button>
          </div>
        </div>
      </main>

      <MobileLandingActions onShowPricing={onShowPricing} onShowAuth={onShowAuth} />
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
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="modal-header">
            <h2 className="modal-title">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className="modal-subtitle">
              {mode === 'signin' && 'Sign in to your compliance console'}
              {mode === 'signup' && 'Start your 7-day free trial'}
              {mode === 'reset' && "We'll send you reset instructions"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="form-input"
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-input"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="form-toggle-vis">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !isLoaded} className="btn-submit">
              {loading && <span className="spinner" />}
              <span>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}</span>
            </button>
          </form>

          {message && <div className={`modal-message ${messageKind}`}>{message}</div>}

          <div className="modal-footer">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className="modal-link">
                  Forgot password?
                </button>
                <button type="button" onClick={() => setMode('signup')} className="modal-link">
                  Create an account
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
      <div className="modal-container modal-container-lg" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card pricing-modal ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="pricing-modal-header">
            <div className="pricing-badge-row">
              <span className="pricing-badge">Pro</span>
            </div>
            <h2 className="pricing-modal-title">protocolLM</h2>
            <p className="pricing-modal-desc">Full compliance suite for food service</p>
          </div>

          <div className="pricing-modal-price">
            <span className="price-currency">$</span>
            <span className="price-value">100</span>
            <span className="price-period">/month</span>
          </div>

          <ul className="pricing-features">
            <li><span className="check">✓</span> Unlimited photo compliance checks</li>
            <li><span className="check">✓</span> Full Washtenaw County database</li>
            <li><span className="check">✓</span> Real-time regulation updates</li>
            <li><span className="check">✓</span> Priority support</li>
          </ul>

          <div className="pricing-modal-buttons">
            <button onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')} disabled={!!loading} className="btn-pricing-primary" type="button">
              {loading === 'monthly' && <span className="spinner" />}
              <span>Start 7-day free trial</span>
            </button>

            <button onClick={() => onCheckout(ANNUAL_PRICE, 'annual')} disabled={!!loading} className="btn-pricing-secondary" type="button">
              {loading === 'annual' && <span className="spinner" />}
              <span>Annual — $1,000/year</span>
              <span className="save-badge">Save $200</span>
            </button>
          </div>

          <p className="pricing-modal-terms">
            7-day free trial · Cancel anytime · One license per location
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
  const [loadingStage, setLoadingStage] = useState('auth')
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
  }, [scrollToBottom])

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
        setLoadingStage('auth')
        const { data } = await supabase.auth.getSession()
        setLoadingStage('subscription')
        await loadSessionAndSub(data.session || null)
        setLoadingStage('ready')
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

    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto'
    }

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
      <div className={`loading-screen ${ibmMono.className}`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={48} height={48} priority />
          </div>
          <div className="loading-spinner" />
          <span className="loading-text">
            {loadingStage === 'auth' && 'Authenticating…'}
            {loadingStage === 'subscription' && 'Loading subscription…'}
            {loadingStage === 'ready' && 'Almost ready…'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        /* ==========================================================================
           Design System: IBM Retro × Stripe 2025
           Electric blue accent from logo (#4A7CFF range)
           ========================================================================== */
        :root {
          /* Core palette */
          --bg-0: #08090c;
          --bg-1: #0d0f14;
          --bg-2: #12151c;
          --bg-3: #181c26;
          
          /* Text */
          --ink-0: #f4f4f8;
          --ink-1: #c4c7d4;
          --ink-2: #8a8fa3;
          --ink-3: #5c6178;
          
          /* Accent - Electric blue from logo */
          --accent: #4a7cff;
          --accent-glow: rgba(74, 124, 255, 0.35);
          --accent-subtle: rgba(74, 124, 255, 0.12);
          --accent-hover: #5d8aff;
          
          /* Borders */
          --border-subtle: rgba(255, 255, 255, 0.06);
          --border-default: rgba(255, 255, 255, 0.1);
          --border-accent: rgba(74, 124, 255, 0.3);
          --border-glow: rgba(74, 124, 255, 0.5);
          
          /* Shadows */
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.5);
          --shadow-glow: 0 0 40px rgba(74, 124, 255, 0.15);
          
          /* Radii */
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
          --radius-full: 9999px;
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        html, body {
          height: 100%;
          width: 100%;
          margin: 0;
          background-color: var(--bg-0);
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        @supports (overflow: clip) {
          html, body { overflow-x: clip; }
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
          pointer-events: none;
        }

        @supports (-webkit-touch-callout: none) {
          html { height: -webkit-fill-available; }
          body { min-height: -webkit-fill-available; }
        }

        body {
          position: relative;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        a, button, input, textarea {
          -webkit-tap-highlight-color: transparent;
        }

        :focus, :focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        button:focus, input:focus, textarea:focus {
          outline: none;
        }

        ::selection {
          background: var(--accent-subtle);
          color: var(--ink-0);
        }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* ==========================================================================
           Loading Screen
           ========================================================================== */
        .loading-screen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-0);
          z-index: 9999;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .loading-logo {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .loading-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 20px var(--accent-glow)); }
          50% { filter: drop-shadow(0 0 40px var(--accent-glow)); }
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border-default);
          border-top-color: var(--accent);
          border-radius: var(--radius-full);
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ==========================================================================
           App Container
           ========================================================================== */
        .app-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
        }

        /* ==========================================================================
           Brand
           ========================================================================== */
        .plm-brand-wrap {
          display: flex;
          align-items: center;
        }

        .plm-brand {
          color: var(--ink-0);
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.02em;
          font-size: 18px;
          padding: 8px 10px;
          border-radius: var(--radius-md);
          display: inline-flex;
          align-items: center;
          transition: background 0.2s ease;
        }

        .plm-brand:hover {
          background: var(--accent-subtle);
        }

        .plm-brand-inner {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .plm-brand-mark {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .plm-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .plm-brand-text {
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        /* ==========================================================================
           Landing Page
           ========================================================================== */
        .landing-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
          overflow: hidden;
        }

        .landing-gradient-bg {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-subtle), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(74, 124, 255, 0.08), transparent),
            radial-gradient(ellipse 50% 30% at 0% 100%, rgba(74, 124, 255, 0.05), transparent);
          pointer-events: none;
        }

        .landing-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
          pointer-events: none;
          opacity: 0.5;
        }

        /* Topbar */
        .landing-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: max(16px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 16px max(20px, env(safe-area-inset-left));
          z-index: 10;
        }

        .landing-top-center {
          justify-self: center;
        }

        .landing-top-actions {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .desktop-only {
          display: flex;
        }

        /* Navigation buttons */
        .btn-nav {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          padding: 0 14px;
          background: transparent;
          color: var(--ink-1);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn-nav:hover {
          color: var(--ink-0);
          background: var(--accent-subtle);
        }

        .btn-nav.ghost {
          color: var(--ink-2);
        }

        .btn-nav.ghost:hover {
          color: var(--ink-0);
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          padding: 0 16px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: 0 2px 8px rgba(74, 124, 255, 0.3);
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(74, 124, 255, 0.4);
        }

        .btn-primary.block {
          width: 100%;
        }

        /* Pricing dropdown */
        .pricing-menu-wrapper {
          position: relative;
        }

        .pricing-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 260px;
          background: var(--bg-2);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-lg), var(--shadow-glow);
          animation: dropdown-in 0.2s ease;
        }

        @keyframes dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pricing-dropdown-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .pricing-dropdown-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-0);
          letter-spacing: -0.01em;
        }

        .pricing-dropdown-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent);
          background: var(--accent-subtle);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .pricing-dropdown-amount {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 8px;
        }

        .pricing-dropdown-amount .currency {
          font-size: 16px;
          color: var(--ink-2);
          font-weight: 500;
        }

        .pricing-dropdown-amount .amount {
          font-size: 36px;
          font-weight: 800;
          color: var(--ink-0);
          letter-spacing: -0.03em;
          font-family: ${outfit.style.fontFamily};
        }

        .pricing-dropdown-amount .period {
          font-size: 14px;
          color: var(--ink-2);
          margin-left: 2px;
        }

        .pricing-dropdown-note {
          font-size: 12px;
          color: var(--ink-2);
          margin: 0 0 16px;
        }

        /* Doc pill */
        .doc-pill-wrap {
          display: flex;
          justify-content: center;
        }

        .doc-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: var(--bg-2);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-sm), 0 0 20px rgba(74, 124, 255, 0.1);
        }

        .doc-pill-icon {
          color: var(--accent);
          display: flex;
          animation: sparkle-rotate 4s linear infinite;
        }

        @keyframes sparkle-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .doc-pill-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .doc-pill-divider {
          width: 1px;
          height: 12px;
          background: var(--border-default);
        }

        .doc-pill-item {
          font-size: 12px;
          color: var(--ink-1);
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          animation: pill-fade 2200ms ease both;
        }

        @keyframes pill-fade {
          0% { opacity: 0; transform: translateY(4px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }

        /* Hero */
        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 24px 80px;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          max-width: 640px;
          width: 100%;
        }

        /* Terminal card */
        .hero-terminal {
          width: 100%;
          background: var(--bg-1);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 18px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border-subtle);
        }

        .terminal-dot {
          width: 12px;
          height: 12px;
          border-radius: var(--radius-full);
        }

        .terminal-dot.red { background: #ff5f57; }
        .terminal-dot.yellow { background: #febc2e; }
        .terminal-dot.green { background: #28c840; }

        .terminal-title {
          margin-left: auto;
          font-size: 12px;
          font-weight: 500;
          color: var(--ink-2);
          letter-spacing: 0.05em;
        }

        .terminal-body {
          padding: 24px;
          min-height: 180px;
        }

        .terminal-output {
          margin: 0;
          font-size: 15px;
          line-height: 1.7;
          color: var(--ink-1);
          white-space: pre-wrap;
        }

        .cursor-block {
          display: inline-block;
          color: var(--accent);
          animation: cursor-blink 1s steps(2) infinite;
        }

        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }

        /* Hero CTAs */
        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 48px;
          padding: 0 24px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(74, 124, 255, 0.4);
        }

        .btn-hero-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(74, 124, 255, 0.5);
        }

        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          height: 48px;
          padding: 0 24px;
          background: transparent;
          color: var(--ink-1);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn-hero-secondary:hover {
          color: var(--ink-0);
          border-color: var(--border-accent);
          background: var(--accent-subtle);
        }

        /* Mobile actions */
        .landing-mobile-actions {
          position: absolute;
          bottom: calc(max(20px, env(safe-area-inset-bottom)) + 52px);
          left: 50%;
          transform: translateX(-50%);
          display: none;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--bg-2);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-full);
          box-shadow: var(--shadow-md);
          z-index: 10;
        }

        .mob-cta {
          height: 36px;
          padding: 0 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--ink-1);
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .mob-cta:hover {
          color: var(--ink-0);
        }

        .mob-cta.primary {
          background: var(--accent);
          color: white;
        }

        .mob-cta.primary:hover {
          background: var(--accent-hover);
        }

        /* Footer links */
        .plm-footer-links {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 20px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          z-index: 10;
        }

        .plm-footer-links.landing {
          bottom: max(20px, env(safe-area-inset-bottom));
        }

        .plm-footer-links.chat {
          position: static;
          transform: none;
          margin: 12px auto 0;
        }

        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.2s ease;
        }

        .plm-footer-link:hover {
          color: var(--ink-0);
        }

        .plm-footer-sep {
          color: var(--ink-3);
        }

        /* ==========================================================================
           Modals
           ========================================================================== */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fade-in 0.2s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          width: 100%;
          max-width: 400px;
          animation: modal-up 0.25s ease;
        }

        .modal-container-lg {
          max-width: 440px;
        }

        @keyframes modal-up {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-card {
          position: relative;
          background: var(--bg-1);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-xl);
          padding: 32px;
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--ink-2);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          color: var(--ink-0);
          border-color: var(--border-default);
        }

        .modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
          color: var(--ink-0);
        }

        .modal-subtitle {
          font-size: 14px;
          color: var(--ink-2);
          margin: 0;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: var(--bg-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--ink-0);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s ease;
        }

        .form-input::placeholder {
          color: var(--ink-3);
        }

        .form-input:focus {
          border-color: var(--accent);
        }

        .form-input-wrap {
          position: relative;
        }

        .form-toggle-vis {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--ink-2);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
        }

        .form-toggle-vis:hover {
          color: var(--ink-0);
        }

        .btn-submit {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .modal-message {
          padding: 12px 16px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--ink-1);
          text-align: center;
          margin-top: 16px;
        }

        .modal-message.ok {
          border-color: rgba(40, 200, 64, 0.4);
          color: #28c840;
        }

        .modal-message.err {
          border-color: rgba(255, 95, 87, 0.4);
          color: #ff5f57;
        }

        .modal-footer {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .modal-link {
          background: none;
          border: none;
          font-size: 13px;
          color: var(--ink-2);
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s ease;
        }

        .modal-link:hover {
          color: var(--ink-0);
        }

        .modal-link strong {
          color: var(--accent);
          font-weight: 600;
        }

        /* Pricing modal */
        .pricing-modal {
          text-align: center;
        }

        .pricing-modal-header {
          margin-bottom: 20px;
        }

        .pricing-badge-row {
          margin-bottom: 8px;
        }

        .pricing-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          background: var(--accent-subtle);
          padding: 4px 12px;
          border-radius: var(--radius-full);
        }

        .pricing-modal-title {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
          color: var(--ink-0);
        }

        .pricing-modal-desc {
          font-size: 14px;
          color: var(--ink-2);
          margin: 0;
        }

        .pricing-modal-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 2px;
          margin: 24px 0;
        }

        .price-currency {
          font-size: 20px;
          color: var(--ink-2);
          font-weight: 500;
        }

        .price-value {
          font-size: 56px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--ink-0);
          font-family: ${outfit.style.fontFamily};
        }

        .price-period {
          font-size: 16px;
          color: var(--ink-2);
          margin-left: 4px;
        }

        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          text-align: left;
        }

        .pricing-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: 14px;
          color: var(--ink-1);
          border-bottom: 1px solid var(--border-subtle);
        }

        .pricing-features li:last-child {
          border-bottom: none;
        }

        .pricing-features .check {
          color: var(--accent);
          font-weight: 600;
        }

        .pricing-modal-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .btn-pricing-primary,
        .btn-pricing-secondary {
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .btn-pricing-primary {
          background: var(--accent);
          color: white;
          border: none;
        }

        .btn-pricing-primary:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-pricing-secondary {
          background: transparent;
          color: var(--ink-0);
          border: 1px solid var(--border-default);
        }

        .btn-pricing-secondary:hover:not(:disabled) {
          border-color: var(--border-accent);
          background: var(--accent-subtle);
        }

        .btn-pricing-primary:disabled,
        .btn-pricing-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .save-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #28c840;
          background: rgba(40, 200, 64, 0.15);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        .pricing-modal-terms {
          font-size: 12px;
          color: var(--ink-3);
          margin: 0;
        }

        /* ==========================================================================
           Chat Interface
           ========================================================================== */
        .chat-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--bg-0);
          position: relative;
        }

        .chat-topbar {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 16px 20px;
          padding-left: max(20px, env(safe-area-inset-left));
          padding-right: max(20px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 0 20px 24px;
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 400px;
        }

        .chat-empty-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-subtle);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-xl);
          color: var(--accent);
          margin-bottom: 20px;
          box-shadow: 0 0 40px rgba(74, 124, 255, 0.2);
        }

        .chat-empty-icon svg {
          width: 36px;
          height: 36px;
        }

        .chat-empty-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink-0);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
        }

        .chat-empty-desc {
          font-size: 14px;
          color: var(--ink-2);
          margin: 0;
          line-height: 1.6;
        }

        .chat-history {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 16px;
        }

        .chat-message {
          display: flex;
          width: 100%;
        }

        .chat-message-user {
          justify-content: flex-end;
        }

        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 85%;
          padding: 14px 18px;
          border-radius: var(--radius-lg);
          font-size: 14px;
          line-height: 1.65;
        }

        .chat-bubble-user {
          background: var(--accent);
          color: white;
          border-bottom-right-radius: var(--radius-sm);
        }

        .chat-bubble-assistant {
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          color: var(--ink-1);
          border-bottom-left-radius: var(--radius-sm);
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 300px;
          object-fit: contain;
        }

        .chat-thinking {
          color: var(--ink-2);
          font-style: italic;
        }

        /* Chat input area */
        .chat-input-area {
          flex-shrink: 0;
          background: linear-gradient(to top, var(--bg-0) 80%, transparent);
          padding-top: 24px;
        }

        .chat-input-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px 20px;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: var(--bg-2);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }

        .chat-attachment-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--ink-1);
        }

        .chat-attachment-icon {
          color: var(--accent);
        }

        .chat-attachment-remove {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--ink-2);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chat-attachment-remove:hover {
          color: var(--ink-0);
          border-color: var(--border-default);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .chat-camera-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-subtle);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(74, 124, 255, 0.15);
        }

        .chat-camera-btn:hover {
          background: var(--accent);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(74, 124, 255, 0.4);
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          background: var(--bg-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 4px 4px 4px 16px;
          transition: border-color 0.2s ease;
        }

        .chat-input-wrapper:focus-within {
          border-color: var(--accent);
        }

        .chat-textarea {
          flex: 1;
          min-height: 40px;
          max-height: 160px;
          padding: 10px 0;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
        }

        .chat-textarea::placeholder {
          color: var(--ink-3);
        }

        .chat-textarea:focus {
          outline: none;
        }

        .chat-send-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .chat-send-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: var(--ink-3);
          margin-top: 12px;
        }

        /* ==========================================================================
           Responsive
           ========================================================================== */
        @media (max-width: 768px) {
          .landing-topbar {
            grid-template-columns: 1fr;
            padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left));
          }

          .landing-top-center {
            display: none;
          }

          .desktop-only {
            display: none !important;
          }

          .landing-mobile-actions {
            display: flex;
          }

          .landing-hero {
            padding: 100px 20px 100px;
          }

          .terminal-output {
            font-size: 14px;
          }

          .plm-brand {
            font-size: 16px;
          }

          .plm-brand-mark {
            width: 32px;
            height: 32px;
          }

          .chat-topbar {
            padding: 12px 16px;
          }

          .chat-messages {
            padding: 0 16px 20px;
          }

          .chat-input-inner {
            padding: 0 16px 16px;
          }

          .chat-bubble {
            max-width: 90%;
          }
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 24px 20px;
          }

          .pricing-modal-price .price-value {
            font-size: 48px;
          }
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
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div className="app-container">
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!isAuthenticated ? (
            <LandingPage
              onShowPricing={() => setShowPricingModal(true)}
              onShowAuth={() => {
                setAuthInitialMode('signin')
                setShowAuthModal(true)
              }}
            />
          ) : (
            <div className={`${ibmMono.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />

                <nav className="chat-top-actions">
                  {hasActiveSubscription && (
                    <button onClick={handleManageBilling} className="btn-nav ghost" type="button">
                      Billing
                    </button>
                  )}
                  <button onClick={handleSignOut} className="btn-nav ghost" type="button">
                    Log out
                  </button>
                </nav>
              </header>

              <div ref={scrollRef} onScroll={handleScroll} className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}>
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <div className="chat-empty-icon">
                      <Icons.Camera />
                    </div>
                    <h2 className="chat-empty-title">Upload a photo for instant compliance check</h2>
                    <p className="chat-empty-desc">
                      Snap a photo of your kitchen, storage, or prep area. Our AI will identify potential violations before your next inspection.
                    </p>
                  </div>
                ) : (
                  <div className="chat-history">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
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
                      <div className="chat-attachment-info">
                        <span className="chat-attachment-icon"><Icons.Camera /></span>
                        <span>Image ready</span>
                      </div>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="chat-attachment-remove"
                        aria-label="Remove"
                        type="button"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="chat-input-row">
                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

                    <button onClick={() => fileInputRef.current?.click()} className="chat-camera-btn" aria-label="Upload photo" type="button">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="chat-input-wrapper">
                      <textarea
                        ref={textAreaRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value)
                          if (textAreaRef.current) {
                            textAreaRef.current.style.height = 'auto'
                            textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 160)}px`
                          }
                        }}
                        placeholder="Ask about regulations or describe what you see…"
                        rows={1}
                        className="chat-textarea"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />

                      <button type="submit" disabled={(!input.trim() && !selectedImage) || isSending} className="chat-send-btn" aria-label="Send">
                        {isSending ? <div className="chat-send-spinner" /> : <Icons.ArrowUp />}
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
