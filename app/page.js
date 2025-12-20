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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
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
          <Image src={appleIcon} alt="" width={64} height={64} priority />
        </span>
        <span className="plm-brand-text">protocolLM</span>
      </span>
    </Link>
  )
}

function FooterLinks() {
  return (
    <div className={`plm-footer-links ${ibmMono.className}`}>
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
      <div className="landing-bg" />

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
              className="btn-nav"
              onClick={() => setShowPricingMenu((v) => !v)}
              aria-expanded={showPricingMenu}
            >
              Pricing
            </button>

            {showPricingMenu && (
              <div className="pricing-dropdown">
                <div className="pricing-dropdown-amount">
                  <span className="currency">$</span>
                  <span className="amount">100</span>
                  <span className="period">/month</span>
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

          <button onClick={onShowAuth} className="btn-nav" type="button">
            Sign in
          </button>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-terminal">
            <div className="terminal-header">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
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
      <FooterLinks />
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
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
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
                Already have an account? Sign in
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
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card pricing-modal ${ibmMono.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="pricing-modal-price">
            <span className="price-currency">$</span>
            <span className="price-value">100</span>
            <span className="price-period">/month</span>
          </div>

          <div className="pricing-modal-buttons">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading}
              className="btn-pricing-primary"
              type="button"
            >
              {loading === 'monthly' && <span className="spinner" />}
              <span>Start 7-day free trial</span>
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading}
              className="btn-pricing-secondary"
              type="button"
            >
              {loading === 'annual' && <span className="spinner" />}
              <span>Annual — $1,000/year</span>
              <span className="save-badge">Save $200</span>
            </button>
          </div>

          <p className="pricing-modal-terms">7-day free trial · Cancel anytime · One license per location</p>
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
            <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        /* ==========================================================================
           protocolLM Design System
           ========================================================================== */
        :root {
          --bg-0: #09090b;
          --bg-1: #0c0c0e;
          --bg-2: #131316;
          --bg-3: #1a1a1f;

          --ink-0: #fafafa;
          --ink-1: #a0a0a8;
          --ink-2: #636369;
          --ink-3: #3f3f46;

          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --accent-dim: rgba(59, 130, 246, 0.1);

          --border-subtle: rgba(255, 255, 255, 0.05);
          --border-default: rgba(255, 255, 255, 0.08);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-full: 9999px;
        }

        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          height: 100%;
          margin: 0;
          background: var(--bg-0);
          background-color: var(--bg-0);
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior-y: none;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
        }

        @supports (-webkit-touch-callout: none) {
          html { height: -webkit-fill-available; }
          body { min-height: -webkit-fill-available; }
        }

        a, button, input, textarea { -webkit-tap-highlight-color: transparent; }
        :focus { outline: none; }

        ::selection {
          background: var(--accent-dim);
          color: var(--ink-0);
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-full);
        }

        /* ==========================================================================
           Loading
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
          gap: 32px;
        }

        .loading-logo {
          width: 64px;
          height: 64px;
        }

        .loading-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .loading-bar {
          width: 100px;
          height: 2px;
          background: var(--bg-3);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .loading-bar-fill {
          height: 100%;
          width: 30%;
          background: var(--accent);
          animation: loading-slide 1s ease-in-out infinite;
        }

        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }

        /* ==========================================================================
           App
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
        .plm-brand {
          color: var(--ink-0);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .plm-brand:hover { opacity: 0.7; }

        .plm-brand-inner {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .plm-brand-mark {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .plm-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .plm-brand-text {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        /* ==========================================================================
           Landing
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

        .landing-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59, 130, 246, 0.06), transparent 70%);
          pointer-events: none;
        }

        .landing-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: max(20px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) 20px max(24px, env(safe-area-inset-left));
          z-index: 10;
        }

        .landing-top-center { justify-self: center; }
        .landing-top-actions {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .desktop-only { display: flex; }

        .btn-nav {
          height: 36px;
          padding: 0 14px;
          background: transparent;
          color: var(--ink-1);
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.15s ease;
          font-family: inherit;
        }

        .btn-nav:hover { color: var(--ink-0); }

        .btn-primary {
          height: 36px;
          padding: 0 16px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .btn-primary:hover { background: var(--accent-hover); }
        .btn-primary.block { width: 100%; }

        .pricing-menu-wrapper { position: relative; }

        .pricing-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 240px;
          background: var(--bg-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 20px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
          animation: dropdown-in 0.15s ease;
        }

        @keyframes dropdown-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
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
        }

        .pricing-dropdown-amount .amount {
          font-size: 32px;
          font-weight: 700;
          color: var(--ink-0);
          letter-spacing: -0.03em;
          font-family: ${outfit.style.fontFamily};
        }

        .pricing-dropdown-amount .period {
          font-size: 14px;
          color: var(--ink-2);
        }

        .pricing-dropdown-note {
          font-size: 12px;
          color: var(--ink-2);
          margin: 0 0 16px;
        }

        /* Doc pill */
        .doc-pill-wrap { display: flex; justify-content: center; }

        .doc-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
        }

        .doc-pill-icon {
          color: var(--accent);
          display: flex;
        }

        .doc-pill-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .doc-pill-divider {
          width: 1px;
          height: 10px;
          background: var(--border-subtle);
        }

        .doc-pill-item {
          font-size: 11px;
          color: var(--ink-1);
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          animation: pill-fade 2200ms ease both;
        }

        @keyframes pill-fade {
          0% { opacity: 0; transform: translateY(3px); }
          12% { opacity: 1; transform: translateY(0); }
          88% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-3px); }
        }

        /* Hero */
        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 140px 24px 100px;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          max-width: 560px;
          width: 100%;
        }

        .hero-terminal {
          width: 100%;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 14px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border-subtle);
        }

        .terminal-dot {
          width: 10px;
          height: 10px;
          border-radius: var(--radius-full);
        }

        .terminal-dot.red { background: #ff5f57; }
        .terminal-dot.yellow { background: #febc2e; }
        .terminal-dot.green { background: #28c840; }

        .terminal-body {
          padding: 24px;
          min-height: 160px;
        }

        .terminal-output {
          margin: 0;
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink-1);
          white-space: pre-wrap;
        }

        .cursor-block {
          color: var(--accent);
          animation: blink 1s steps(2) infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 44px;
          padding: 0 20px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }

        .btn-hero-primary:hover { background: var(--accent-hover); }

        .btn-hero-secondary {
          height: 44px;
          padding: 0 20px;
          background: transparent;
          color: var(--ink-1);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
          font-family: inherit;
        }

        .btn-hero-secondary:hover {
          color: var(--ink-0);
          border-color: var(--ink-3);
        }

        /* Mobile actions */
        .landing-mobile-actions {
          position: absolute;
          bottom: calc(max(20px, env(safe-area-inset-bottom)) + 44px);
          left: 50%;
          transform: translateX(-50%);
          display: none;
          align-items: center;
          gap: 4px;
          padding: 4px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          z-index: 10;
        }

        .mob-cta {
          height: 34px;
          padding: 0 14px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--ink-1);
          font-family: inherit;
          transition: color 0.15s ease;
        }

        .mob-cta:hover { color: var(--ink-0); }

        .mob-cta.primary {
          background: var(--accent);
          color: #fff;
        }

        .mob-cta.primary:hover { background: var(--accent-hover); }

        /* Footer links */
        .plm-footer-links {
          position: absolute;
          bottom: max(20px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover { color: var(--ink-0); }
        .plm-footer-sep { color: var(--ink-3); }

        /* ==========================================================================
           Modals
           ========================================================================== */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fade-in 0.15s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-container {
          width: 100%;
          max-width: 360px;
          animation: modal-up 0.2s ease;
        }

        @keyframes modal-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-card {
          position: relative;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 28px;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-2);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: color 0.15s ease;
        }

        .modal-close:hover { color: var(--ink-0); }

        .modal-header { margin-bottom: 24px; }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--ink-0);
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
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .form-input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease;
        }

        .form-input::placeholder { color: var(--ink-3); }
        .form-input:focus { border-color: var(--accent); }

        .form-input-wrap { position: relative; }

        .form-toggle-vis {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--ink-2);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
        }

        .form-toggle-vis:hover { color: var(--ink-0); }

        .btn-submit {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .modal-message {
          padding: 10px 12px;
          background: var(--bg-2);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--ink-1);
          text-align: center;
          margin-top: 16px;
        }

        .modal-message.ok { color: #22c55e; }
        .modal-message.err { color: #ef4444; }

        .modal-footer {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .modal-link {
          background: none;
          border: none;
          font-size: 13px;
          color: var(--ink-2);
          cursor: pointer;
          font-family: inherit;
        }

        .modal-link:hover { color: var(--ink-0); }

        /* Pricing modal */
        .pricing-modal { text-align: center; }

        .pricing-modal-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 2px;
          margin-bottom: 28px;
        }

        .price-currency {
          font-size: 20px;
          color: var(--ink-2);
        }

        .price-value {
          font-size: 56px;
          font-weight: 700;
          color: var(--ink-0);
          letter-spacing: -0.04em;
          font-family: ${outfit.style.fontFamily};
        }

        .price-period {
          font-size: 16px;
          color: var(--ink-2);
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
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .btn-pricing-primary {
          background: var(--accent);
          color: #fff;
          border: none;
        }

        .btn-pricing-primary:hover:not(:disabled) { background: var(--accent-hover); }

        .btn-pricing-secondary {
          background: transparent;
          color: var(--ink-0);
          border: 1px solid var(--border-default);
        }

        .btn-pricing-secondary:hover:not(:disabled) { border-color: var(--ink-3); }

        .btn-pricing-primary:disabled,
        .btn-pricing-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

        .save-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
          padding: 3px 6px;
          border-radius: 4px;
        }

        .pricing-modal-terms {
          font-size: 11px;
          color: var(--ink-3);
          margin: 0;
        }

        /* ==========================================================================
           Chat
           ========================================================================== */
        .chat-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--bg-0);

          /* ✅ Fix “wonky”/white overscroll by forcing a contained viewport */
          height: 100dvh;
          overflow: hidden;
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root { height: -webkit-fill-available; }
        }

        .chat-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          padding-left: max(24px, env(safe-area-inset-left));
          padding-right: max(24px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 24px 32px;

          /* ✅ Make sure the scroll area never reveals “white” behind */
          background: var(--bg-0);
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty-state {
          text-align: center;
          max-width: 400px;
        }

        .chat-empty-text {
          font-size: 15px;
          color: var(--ink-2);
          line-height: 1.6;
          margin: 0;
        }

        .chat-history {
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 32px;
          padding-top: 16px;
          padding-bottom: 6px;
        }

        .chat-message {
          display: flex;
          width: 100%;
          align-items: flex-start;
        }

        .chat-message-user { justify-content: flex-end; }
        .chat-message-assistant { justify-content: flex-start; }

        .chat-bubble {
          max-width: 75%;
          font-size: 15px;
          line-height: 1.7;
          display: block;
        }

        .chat-bubble-user { color: var(--ink-0); }
        .chat-bubble-assistant { color: var(--ink-1); }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 12px;
          display: inline-block;
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 280px;
          object-fit: contain;
        }

        /* ✅ Replaces the inline <span style={{whiteSpace:'pre-wrap'}} ...> with a real block */
        .chat-content {
          display: block;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chat-thinking {
          display: block;
          color: var(--ink-2);
          font-style: italic;
        }

        /* Chat input */
        .chat-input-area {
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-0);
        }

        .chat-input-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 16px 24px 24px;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-2);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--ink-1);
        }

        .chat-attachment-icon { color: var(--accent); display: flex; }

        .chat-attachment-remove {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-2);
          cursor: pointer;
        }

        .chat-attachment-remove:hover { color: var(--ink-0); }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        /* Camera button - subtle glow on hover only */
        .chat-camera-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chat-camera-btn:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: border-color 0.15s ease;
          min-width: 0;
        }

        .chat-input-wrapper:focus-within {
          border-color: var(--accent);
        }

        .chat-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 160px;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder { color: var(--ink-3); }
        .chat-textarea:focus { outline: none; }

        .chat-send-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-2);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .chat-send-btn:hover:not(:disabled) { color: var(--accent); }
        .chat-send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--accent);
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: var(--ink-3);
          margin-top: 14px;
        }

        /* ==========================================================================
           Responsive
           ========================================================================== */
        @media (max-width: 768px) {
          .landing-topbar {
            grid-template-columns: 1fr;
            padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 16px max(16px, env(safe-area-inset-left));
          }

          .landing-top-center { display: none; }
          .desktop-only { display: none !important; }
          .landing-mobile-actions { display: flex; }

          .landing-hero { padding: 120px 20px 120px; }
          .terminal-output { font-size: 13px; }

          .plm-brand-mark { width: 48px; height: 48px; }
          .plm-brand-text { font-size: 17px; }

          /* ✅ Replace chat mobile CSS blocks (tight + stable + safe area aware) */
          .chat-topbar {
            padding: 12px 16px;
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
            padding-top: max(12px, env(safe-area-inset-top));
          }

          .chat-messages {
            padding: 0 16px calc(24px + env(safe-area-inset-bottom));
          }

          .chat-input-inner {
            padding: 12px 16px 18px;
            padding-bottom: max(18px, env(safe-area-inset-bottom));
          }

          .chat-bubble { max-width: 85%; }
        }

        @media (max-width: 480px) {
          .modal-card { padding: 24px 20px; }
          .price-value { font-size: 48px; }
          .plm-brand-mark { width: 44px; height: 44px; }
          .plm-brand-text { font-size: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
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
                    <button onClick={handleManageBilling} className="btn-nav" type="button">
                      Billing
                    </button>
                  )}
                  <button onClick={handleSignOut} className="btn-nav" type="button">
                    Log out
                  </button>
                </nav>
              </header>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}
              >
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <p className="chat-empty-text">
                      Upload a photo or ask a question about Washtenaw County food safety regulations.
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
                            <div className="chat-thinking">Analyzing…</div>
                          ) : (
                            <div className="chat-content">{msg.content}</div>
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
                      <span className="chat-attachment-icon">
                        <Icons.Camera />
                      </span>
                      <span>Image attached</span>
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="chat-camera-btn"
                      aria-label="Upload photo"
                      type="button"
                    >
                      <Icons.Camera />
                    </button>

                    <div className="chat-input-wrapper">
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
                        placeholder="Ask a question…"
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
                        type="button"
                        onClick={handleSend}
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className="chat-send-btn"
                        aria-label="Send"
                      >
                        {isSending ? <div className="chat-send-spinner" /> : <Icons.ArrowUp />}
                      </button>
                    </div>
                  </div>

                  <p className="chat-disclaimer">
                    protocolLM may make mistakes. Verify critical decisions with official regulations.
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
