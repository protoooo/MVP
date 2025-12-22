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
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'] })

// ✅ SINGLE PLAN - Unlimited monthly only
const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

// eslint-disable-next-line no-unused-vars
const isAdmin = false

const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

/* ------------------------------------------
   ICONS - Clean, thin strokes for professional look
------------------------------------------- */
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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Gear: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Plus: () => (
    <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
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
    <div className={`plm-footer-links ${inter.className}`}>
      <Link className="plm-footer-link" href="/terms">Terms</Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/privacy">Privacy</Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/contact">Contact</Link>
    </div>
  )
}

/* ------------------------------------------
   NEW: "Inspection Card" Animation
   Replaces the hacker terminal with a clean,
   clipboard-style visual.
------------------------------------------- */
function LandingVisual() {
  const [stage, setStage] = useState(0) // 0: Scanning, 1: Found, 2: Report

  useEffect(() => {
    // A simple animation loop to demonstrate value
    const timer1 = setTimeout(() => setStage(1), 1500)
    const timer2 = setTimeout(() => setStage(2), 2800)
    return () => { clearTimeout(timer1); clearTimeout(timer2) }
  }, [])

  return (
    <div className="landing-card-window">
      {/* Abstract representation of a kitchen photo */}
      <div className="landing-image-placeholder">
        <div className="kitchen-blur-bg" />
        
        {/* Scanning Line */}
        {stage < 2 && <div className="scan-line" />}

        {/* Floating Tag (The "Issue") */}
        <div className={`issue-tag ${stage >= 1 ? 'visible' : ''}`}>
           <span className="issue-dot" />
           <span className="issue-text">Cold Holding Temp &gt; 41°F</span>
        </div>
      </div>

      {/* The "Report" sliding up */}
      <div className={`report-panel ${stage >= 2 ? 'visible' : ''}`}>
        <div className="report-header">
          <div className="report-icon"><Icons.Shield /></div>
          <span className="report-title">Compliance Check</span>
        </div>
        <div className="report-body">
          <p className="report-code">Washtenaw County Regulation 3-501.16</p>
          <p className="report-desc">TCS food must be maintained at 41°F or less. Move item to walk-in cooler immediately.</p>
        </div>
        <div className="report-status">
          <span className="status-badge">Action Required</span>
        </div>
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${inter.className} landing-root`}>
      <header className="landing-topbar">
        <BrandLink variant="landing" />
        <nav className="landing-top-actions">
           <div className="landing-top-actions-desktop desktop-only">
             <button onClick={onShowPricing} className="btn-primary" type="button">Start trial</button>
           </div>
          <button onClick={onShowAuth} className="btn-nav" type="button">Sign in</button>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-split">
          <div className="hero-text">
            <h1 className="hero-title">
              Confidence in<br />every shift.
            </h1>
            <p className="hero-subtitle">
              Your second set of eyes in the kitchen. 
              Snap a photo to catch health code risks before the inspector does. 
              Expertise on demand, based on Washtenaw County regulations.
            </p>
            <div className="hero-cta-row">
              <button className="btn-primary hero-btn" onClick={onShowPricing}>
                Start free trial
              </button>
              <div className="hero-trust">
                 <Icons.CheckCircle />
                 <span>Up-to-date Standards</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <LandingVisual />
          </div>
        </div>
      </main>

      <FooterLinks />
    </div>
  )
}

/* ------------------------------------------
   Auth Modal (Updated for Light Theme)
------------------------------------------- */
function AuthModal({ isOpen, onClose, initialMode = 'signin', selectedPriceId = null }) {
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
        setMessage('Security verification failed. Please ensure Cloudflare Turnstile is allowed.')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password

        if (mode === 'signup' && selectedPriceId) {
          body.selectedPriceId = selectedPriceId
        }

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
        <div className={`modal-card ${inter.className}`}>
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

/* ------------------------------------------
   Main Page Logic
------------------------------------------- */
export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const { isLoaded: captchaLoaded, executeRecaptcha } = useRecaptcha()

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('signin')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [selectedPriceId, setSelectedPriceId] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [locationCheck, setLocationCheck] = useState(null)
  const [showMultiLocationModal, setShowMultiLocationModal] = useState(false)
  const [showMultiLocationPurchaseModal, setShowMultiLocationPurchaseModal] = useState(false)

  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)

  const isAuthenticated = !!session
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const settingsRef = useRef(null)

  // Close settings menu on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!settingsRef.current) return
      if (!settingsRef.current.contains(e.target)) setShowSettingsMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  // Listen for multi-location upgrade events
  useEffect(() => {
    const handleUpgradeEvent = () => setShowMultiLocationModal(true)
    window.addEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
    return () => window.removeEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
  }, [])

  // Listen for multi-location purchase modal trigger
  useEffect(() => {
    const handleOpenMultiLocationPurchase = () => setShowMultiLocationPurchaseModal(true)
    window.addEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
    return () => window.removeEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
  }, [])

  // Set view attribute for CSS
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
  }, [isAuthenticated])

  // Auto-scroll helpers
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

  // Pricing URL param logic
  useEffect(() => {
    const showPricing = searchParams?.get('showPricing')
    const emailVerified = searchParams?.get('emailVerified')

    if (showPricing === 'true' && isAuthenticated) {
      if (hasActiveSubscription || subscription) {
        setShowPricingModal(false)
        if (emailVerified === 'true' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/')
        }
        return
      }

      if (!hasActiveSubscription && !subscription) {
        setShowPricingModal(true)
        if (emailVerified === 'true' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/')
        }
      }
    }
  }, [searchParams, isAuthenticated, hasActiveSubscription, subscription])

  // Checkout Handler
  const handleCheckout = useCallback(
    async (priceId, planName) => {
      try {
        if (!priceId) {
          alert('Invalid price selected.')
          return
        }

        const validPrices = [UNLIMITED_MONTHLY].filter(Boolean)
        if (validPrices.length > 0 && !validPrices.includes(priceId)) {
          alert('Invalid plan selected. Please try again.')
          return
        }

        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          setSelectedPriceId(priceId)
          setShowPricingModal(false)
          setAuthInitialMode('signup')
          setShowAuthModal(true)
          return
        }

        if (!data.session.user.email_confirmed_at) {
          alert('Please verify your email before starting a trial. Check your inbox.')
          setShowPricingModal(false)
          router.push('/verify-email')
          return
        }

        if (!captchaLoaded) {
          alert('Security verification is still loading. Please try again in a moment.')
          return
        }

        setCheckoutLoading(planName)

        const captchaToken = await executeRecaptcha('checkout')
        if (!captchaToken || captchaToken === 'turnstile_unavailable') {
          throw new Error('Security verification failed.')
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

        if (!res.ok) {
          if (payload.code === 'EMAIL_NOT_VERIFIED') {
            alert('Please verify your email before starting a trial.')
            router.push('/verify-email')
            return
          }
          if (payload.code === 'ALREADY_SUBSCRIBED') {
            alert('You already have an active subscription.')
            setShowPricingModal(false)
            return
          }
          throw new Error(payload.error || 'Checkout failed')
        }

        if (payload.url) {
          window.location.href = payload.url
        } else {
          throw new Error('No checkout URL returned')
        }
      } catch (error) {
        console.error('Checkout error:', error)
        alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
      } finally {
        setCheckoutLoading(null)
      }
    },
    [supabase, captchaLoaded, executeRecaptcha, router]
  )

  // Session & Subscription Loader
  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setSubscription(null)
        setHasActiveSubscription(false)
        setShowPricingModal(false)
        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)
        setIsLoading(false)
        return
      }

      // Check email verified & terms
      try {
        if (!s.user.email_confirmed_at) {
            // Logic handled in verify page usually, but we redirect here for safety
            setSubscription(null)
            setHasActiveSubscription(false)
            setIsLoading(false)
            router.replace('/verify-email')
            return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        if (!profile || !profile.accepted_terms || !profile.accepted_privacy) {
          setSubscription(null)
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error(e)
        router.replace('/accept-terms')
        return
      }

      // Subscription check
      let active = false
      let subData = null

      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status,current_period_end,trial_end,price_id,plan')
          .eq('user_id', s.user.id)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle()

        subData = sub || null
        const now = new Date()
        const endDate = sub?.current_period_end ? new Date(sub.current_period_end) : sub?.trial_end ? new Date(sub.trial_end) : null

        if (endDate && endDate > now) active = true
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (!isMounted) return
      setSubscription(subData)
      setHasActiveSubscription(active)

      if (!subData) {
        setLocationCheck(null)
        setShowMultiLocationModal(false)
      }

      const checkoutParam = searchParams?.get('checkout')
      const showPricingParam = searchParams?.get('showPricing')

      if (!subData && !checkoutParam && showPricingParam !== 'true') {
        setShowPricingModal(true)
        setHasActiveSubscription(false)
      }

      if (subData?.status === 'trialing' && subData?.trial_end) {
        const trialEnd = new Date(subData.trial_end)
        const now = new Date()
        if (trialEnd < now) {
          if (!checkoutParam) setShowPricingModal(true)
          setHasActiveSubscription(false)
        }
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
  }, [supabase, searchParams, router])

  // Auto-checkout after verify
  useEffect(() => {
    const checkoutPlan = searchParams?.get('checkout')
    if (!checkoutPlan) return
    if (isLoading) return

    if (checkoutPlan && isAuthenticated && !hasActiveSubscription && !subscription) {
      handleCheckout(checkoutPlan, 'auto')
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/')
      }
    }
  }, [searchParams, isAuthenticated, hasActiveSubscription, subscription, handleCheckout, isLoading])

  // Multi-location check
  const fetchLocationCheckFromServer = useCallback(async (sess) => {
    try {
      const token = sess?.access_token
      if (!token) return null

      // Try POST first
      let res = await fetch('/api/license/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })

      if (res.status === 405) {
         res = await fetch('/api/license/check', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
         })
      }

      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return null
      return data.locationCheck || data
    } catch (e) {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!isAuthenticated || !session?.user?.id || !subscription) return
      const lc = await fetchLocationCheckFromServer(session)
      if (cancelled) return
      if (lc) setLocationCheck(lc)
    }
    run()
    return () => { cancelled = true }
  }, [isAuthenticated, session, subscription, fetchLocationCheckFromServer])

  const handleManageBilling = async () => {
    // ... Toast logic ...
    try {
      const { data } = await supabase.auth.getSession()
      const accessToken = data?.session?.access_token
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload.error || 'Failed to open billing portal')
        return
      }
      if (payload.url) window.location.href = payload.url
    } catch (error) {
      alert('Failed to open billing portal')
    }
  }

  const handleSignOut = async () => {
    try {
      setShowSettingsMenu(false)
      setLocationCheck(null)
      setShowMultiLocationModal(false)
      await supabase.auth.signOut()
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

    if (textAreaRef.current) textAreaRef.current.style.height = 'auto'

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
          throw new Error('Subscription required.')
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Service unavailable.')
      }

      const data = await res.json()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.message || 'No response.' }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)
      const msg = String(error?.message || '')
      if (msg.includes('trial has ended') || msg.toLowerCase().includes('subscription')) {
        setShowPricingModal(true)
      }
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
      <div className={`loading-screen ${inter.className}`}>
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
        :root {
          /* STAINLESS & SANITIZER THEME (Light Mode) */
          --bg-0: #f1f5f9; /* Slate 100 - The "Countertop" base */
          --bg-1: #ffffff; /* Pure White - The "Clipboard/Paper" */
          --bg-2: #e2e8f0; /* Slate 200 - The "Steel" border */
          --bg-3: #cbd5e1; /* Slate 300 - Darker steel for active states */

          --ink-0: #0f172a; /* Slate 900 - High contrast text */
          --ink-1: #475569; /* Slate 600 - Secondary text */
          --ink-2: #94a3b8; /* Slate 400 - Placeholders */
          --ink-3: #cbd5e1; /* Slate 300 - Subtle details */

          --accent: #0284c7; /* Sky 600 - "Sanitizer Blue" - Professional, not toy-like */
          --accent-hover: #0369a1; /* Sky 700 */
          --accent-dim: rgba(2, 132, 199, 0.1);

          --danger: #ef4444; 
          --success: #10b981;

          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-full: 9999px;

          --shadow-card: 0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
          --shadow-float: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        *, *::before, *::after { box-sizing: border-box; }
        
        html, body {
          height: 100%;
          margin: 0;
          background: var(--bg-0);
          color: var(--ink-0);
          -webkit-font-smoothing: antialiased;
          overscroll-behavior-y: none;
        }

        @supports (-webkit-touch-callout: none) {
          html { height: -webkit-fill-available; }
          body { min-height: -webkit-fill-available; }
        }

        /* TYPOGRAPHY */
        body { font-family: var(--font-inter), sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        
        a, button, input, textarea { -webkit-tap-highlight-color: transparent; }
        :focus { outline: none; }
        ::selection { background: var(--accent-dim); color: var(--ink-0); }

        /* LOADING */
        .loading-screen {
            position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
            background: var(--bg-0); z-index: 9999;
        }
        .loading-content { display: flex; flex-direction: column; align-items: center; gap: 32px; }
        .loading-logo { width: 64px; height: 64px; }
        .loading-logo img { width: 100%; height: 100%; object-fit: contain; }
        .loading-bar { width: 100px; height: 2px; background: var(--bg-3); border-radius: var(--radius-full); overflow: hidden; }
        .loading-bar-fill { height: 100%; width: 30%; background: var(--accent); animation: loading-slide 1s ease-in-out infinite; }
        @keyframes loading-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }

        /* APP CONTAINER */
        .app-container { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: var(--bg-0); }

        /* BUTTONS - Professional/Standard */
        .btn-primary {
          height: 40px;
          padding: 0 20px;
          background: var(--ink-0); /* Black/Dark Slate buttons imply authority */
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-primary:hover {
          background: var(--accent);
          transform: translateY(-1px);
        }

        .btn-nav {
          height: 40px;
          padding: 0 16px;
          background: transparent;
          color: var(--ink-1);
          border: none;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-nav:hover { color: var(--ink-0); }

        /* LANDING LAYOUT */
        .landing-root {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
        }
        .landing-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          background: var(--bg-1);
          border-bottom: 1px solid var(--bg-2);
        }
        .landing-top-actions { display: flex; gap: 8px; }
        .desktop-only { display: flex; }

        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
        }

        .hero-split {
          max-width: 1000px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }

        .hero-title {
          font-size: 48px;
          line-height: 1.1;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink-0);
          margin: 0 0 24px;
        }

        .hero-subtitle {
          font-size: 18px;
          line-height: 1.6;
          color: var(--ink-1);
          margin: 0 0 32px;
          max-width: 440px;
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        
        .hero-trust {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink-1);
          font-size: 14px;
          font-weight: 500;
        }
        .hero-trust svg { color: var(--success); }

        /* LANDING VISUAL - The "Inspection Card" */
        .landing-card-window {
          position: relative;
          width: 100%;
          aspect-ratio: 4/5;
          max-width: 380px;
          background: var(--bg-1);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-float);
          overflow: hidden;
          border: 1px solid var(--bg-2);
          margin: 0 auto;
        }

        .landing-image-placeholder {
          height: 100%;
          background: var(--bg-0);
          position: relative;
        }
        
        /* Simulated blurred kitchen background */
        .kitchen-blur-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, #e2e8f0 0%, #cbd5e1 100%);
          opacity: 0.5;
        }
        
        .scan-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent);
          animation: scan 2s ease-in-out infinite;
          z-index: 10;
        }
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }

        .issue-tag {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.9);
          background: var(--bg-1);
          padding: 8px 12px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: var(--shadow-card);
          opacity: 0;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid var(--danger);
          color: var(--danger);
        }
        .issue-tag.visible {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        .issue-dot { width: 8px; height: 8px; background: var(--danger); border-radius: 50%; }
        .issue-text { font-size: 12px; font-weight: 600; }

        .report-panel {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: var(--bg-1);
          padding: 20px;
          border-top: 1px solid var(--bg-2);
          transform: translateY(100%);
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .report-panel.visible { transform: translateY(0); }

        .report-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .report-icon { color: var(--accent); }
        .report-title { font-size: 14px; font-weight: 600; color: var(--ink-0); }
        .report-body { font-size: 13px; color: var(--ink-1); line-height: 1.5; margin-bottom: 16px; }
        .report-code { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--ink-2); margin-bottom: 4px; }
        .status-badge {
            background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2;
            padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;
        }

        /* BRANDING */
        .plm-brand { display: inline-flex; align-items: center; text-decoration: none; color: var(--ink-0); transition: opacity 0.15s; }
        .plm-brand:hover { opacity: 0.7; }
        .plm-brand-inner { display: flex; align-items: center; gap: 12px; }
        .plm-brand-mark { width: 48px; height: 48px; flex-shrink: 0; }
        .plm-brand-mark img { width: 100%; height: 100%; object-fit: contain; }
        .plm-brand-text { font-weight: 600; font-size: 18px; letter-spacing: -0.02em; }

        /* FOOTER */
        .plm-footer-links {
          display: flex; align-items: center; gap: 16px; justify-content: center;
          padding: 24px; color: var(--ink-2);
        }
        .plm-footer-link {
          color: var(--ink-2); text-decoration: none; font-size: 12px;
          text-transform: uppercase; font-weight: 500; letter-spacing: 0.04em;
        }
        .plm-footer-link:hover { color: var(--ink-0); }
        .plm-footer-sep { color: var(--ink-3); }


        /* CHAT UI - THE CLIPBOARD/VIEWFINDER */
        .chat-root {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          background: var(--bg-0);
          overflow: hidden;
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root { height: -webkit-fill-available; }
        }

        .chat-topbar {
          background: var(--bg-1);
          border-bottom: 1px solid var(--bg-2);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .chat-top-actions { display: flex; align-items: center; gap: 8px; }

        .chat-settings-wrap { position: relative; }
        .chat-settings-btn {
          width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; border-radius: var(--radius-sm);
          color: var(--ink-1); cursor: pointer; transition: all 0.15s ease;
        }
        .chat-settings-btn:hover { color: var(--ink-0); background: var(--bg-0); }
        
        .chat-settings-menu {
          position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px;
          background: var(--bg-1); border: 1px solid var(--bg-2); border-radius: var(--radius-md);
          padding: 6px; box-shadow: var(--shadow-float); z-index: 50;
        }
        .chat-settings-item {
          width: 100%; text-align: left; padding: 10px; background: transparent; border: none;
          border-radius: var(--radius-sm); color: var(--ink-0); font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .chat-settings-item:hover { background: var(--bg-0); }
        .chat-settings-sep { height: 1px; background: var(--bg-2); margin: 4px 0; }

        .status-badge-header {
           display: flex; align-items: center; gap: 6px; padding: 4px 10px;
           background: #f0fdf4; border: 1px solid #dcfce7; borderRadius: 20px;
           color: #15803d; fontSize: 12px; fontWeight: 600;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }
        
        /* The Empty State Viewfinder */
        .chat-empty-container {
            flex: 1; display: flex; align-items: center; justify-content: center;
            flex-direction: column; color: var(--ink-2); min-height: 200px;
        }

        .viewfinder-trigger {
            width: 280px; height: 200px; border: 2px dashed var(--bg-3);
            border-radius: var(--radius-lg); display: flex; flex-direction: column;
            align-items: center; justify-content: center; background: transparent;
            cursor: pointer; transition: all 0.2s ease; position: relative; color: var(--ink-2);
        }
        .viewfinder-trigger:hover {
            border-color: var(--accent); background: rgba(255,255,255,0.5); color: var(--accent);
        }
        .viewfinder-icon { margin-bottom: 12px; }
        .viewfinder-label { font-size: 14px; font-weight: 500; }
        .viewfinder-sub { font-size: 12px; margin-top: 4px; opacity: 0.7; }

        /* Viewfinder corners */
        .corner {
            position: absolute; width: 16px; height: 16px;
            border-color: currentColor; border-style: solid; border-width: 0;
            transition: all 0.2s ease;
        }
        .tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; border-top-left-radius: var(--radius-lg); }
        .tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; border-top-right-radius: var(--radius-lg); }
        .bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; border-bottom-left-radius: var(--radius-lg); }
        .br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; border-bottom-right-radius: var(--radius-lg); }
        .viewfinder-trigger:hover .corner { border-color: var(--accent); width: 24px; height: 24px; }


        /* Messages as Cards */
        .chat-message { display: flex; width: 100%; }
        .chat-message.user { justify-content: flex-end; }
        .chat-message.assistant { justify-content: flex-start; }

        .chat-card {
            max-width: 680px;
            background: var(--bg-1);
            padding: 18px 22px;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-card);
            border: 1px solid var(--bg-2);
            font-size: 15px;
            line-height: 1.6;
            color: var(--ink-0);
        }
        .chat-card.user {
            background: var(--ink-0);
            color: white;
            border: none;
        }
        .chat-card img {
            border-radius: var(--radius-sm);
            margin-bottom: 12px;
            max-width: 100%;
            border: 1px solid var(--bg-2);
            display: block;
        }
        .chat-thinking { font-style: italic; color: var(--ink-2); }
        .chat-content { white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }

        /* Input Area - The "Tool" */
        .chat-input-area {
            background: var(--bg-1);
            border-top: 1px solid var(--bg-2);
            padding: 16px 24px;
            padding-bottom: max(24px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex; align-items: center; gap: 10px; padding: 8px 12px;
          background: var(--bg-0); border-radius: var(--radius-sm); margin-bottom: 12px;
          font-size: 12px; color: var(--ink-1);
        }
        .chat-attachment-icon { color: var(--accent); display: flex; }
        .chat-attachment-remove {
          width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
          background: transparent; border: none; color: var(--ink-2); cursor: pointer;
        }
        .chat-attachment-remove:hover { color: var(--ink-0); }

        .chat-input-wrapper {
            max-width: 760px; margin: 0 auto; display: flex; align-items: flex-end; gap: 8px;
            background: var(--bg-0); border: 1px solid var(--bg-2); border-radius: var(--radius-lg);
            padding: 6px; transition: border 0.2s ease, background 0.2s ease;
        }
        .chat-input-wrapper:focus-within { border-color: var(--accent); background: white; }

        .btn-attach {
            width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
            color: var(--ink-1); background: transparent; border: none; border-radius: var(--radius-sm);
            cursor: pointer; flex-shrink: 0;
        }
        .btn-attach:hover { background: var(--bg-2); color: var(--ink-0); }

        .chat-textarea {
            flex: 1; background: transparent; border: none; padding: 10px 4px;
            font-family: inherit; font-size: 15px; color: var(--ink-0); resize: none;
            max-height: 140px; min-width: 0;
        }
        .chat-textarea:focus { outline: none; }
        .chat-textarea::placeholder { color: var(--ink-3); }

        .btn-send {
            width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
            background: var(--ink-0); color: white; border: none; border-radius: var(--radius-sm);
            cursor: pointer; transition: background 0.2s; flex-shrink: 0; margin-bottom: 2px;
        }
        .btn-send:hover:not(:disabled) { background: var(--accent); }
        .btn-send:disabled { background: var(--bg-3); cursor: not-allowed; }

        .chat-send-spinner {
            width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
            border-radius: 50%; animation: spin 0.6s linear infinite;
        }

        /* MODALS */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .modal-container { width: 100%; max-width: 380px; animation: modal-up 0.2s ease; }
        @keyframes modal-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .modal-card {
            position: relative; background: var(--bg-1); border: 1px solid var(--bg-2);
            border-radius: var(--radius-lg); padding: 28px; box-shadow: var(--shadow-float);
        }
        .modal-close {
          position: absolute; top: 16px; right: 16px; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center; background: transparent;
          border: none; color: var(--ink-2); cursor: pointer; border-radius: var(--radius-sm);
        }
        .modal-close:hover { color: var(--ink-0); background: var(--bg-0); }

        .modal-title { font-size: 18px; font-weight: 600; margin: 0 0 24px; color: var(--ink-0); }
        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--ink-1); }
        .form-input {
          width: 100%; height: 42px; padding: 0 12px; background: var(--bg-0);
          border: 1px solid var(--bg-2); border-radius: var(--radius-sm);
          color: var(--ink-0); font-size: 14px; font-family: inherit; transition: border-color 0.15s ease;
        }
        .form-input:focus { border-color: var(--accent); background: white; }
        .form-input-wrap { position: relative; }
        .form-toggle-vis {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--ink-2); font-size: 11px;
          font-weight: 600; text-transform: uppercase; cursor: pointer;
        }
        .btn-submit {
          width: 100%; height: 42px; display: flex; align-items: center; justify-content: center;
          background: var(--ink-0); color: white; border: none; border-radius: var(--radius-sm);
          font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px;
        }
        .btn-submit:hover:not(:disabled) { background: var(--accent); }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner {
             width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.3);
             border-top-color: #fff; border-radius: var(--radius-full); animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .modal-message { padding: 10px 12px; background: var(--bg-0); border-radius: var(--radius-sm); font-size: 13px; text-align: center; margin-top: 16px; }
        .modal-message.ok { color: var(--success); }
        .modal-message.err { color: var(--danger); }
        .modal-footer { margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .modal-link { background: none; border: none; font-size: 13px; color: var(--ink-1); cursor: pointer; }
        .modal-link:hover { color: var(--ink-0); text-decoration: underline; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .landing-topbar { padding: 16px; }
          .desktop-only { display: none !important; }
          .hero-split { grid-template-columns: 1fr; gap: 40px; text-align: center; }
          .hero-title { font-size: 36px; }
          .hero-subtitle { margin-left: auto; margin-right: auto; }
          .hero-cta-row { justify-content: center; }
          .landing-card-window { max-width: 320px; }
          .landing-hero { padding: 40px 20px; }
          
          .chat-topbar { padding: 10px 16px; }
          .chat-messages { padding: 16px; }
          .chat-input-area { padding: 12px 16px 20px; }
          .chat-card { font-size: 14px; }
        }
      `}</style>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authInitialMode}
        selectedPriceId={selectedPriceId}
      />

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
                setSelectedPriceId(null)
                setAuthInitialMode('signin')
                setShowAuthModal(true)
              }}
            />
          ) : (
            <div className={`chat-root ${inter.className}`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions">
                  {session && subscription && (
                    <div className="status-badge-header">
                      <div style={{width:6, height:6, background:'#16a34a', borderRadius:'50%'}}></div>
                      <span>{subscription.status === 'trialing' ? 'Trial' : 'Active'}</span>
                    </div>
                  )}

                  <div className="chat-settings-wrap" ref={settingsRef}>
                    <button
                      type="button"
                      className="chat-settings-btn"
                      onClick={() => setShowSettingsMenu((v) => !v)}
                      aria-expanded={showSettingsMenu}
                      aria-label="Settings"
                    >
                      <Icons.Gear />
                    </button>

                    {showSettingsMenu && (
                      <div className="chat-settings-menu" role="menu">
                        <button
                          type="button"
                          className="chat-settings-item"
                          role="menuitem"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            if (hasActiveSubscription) {
                              handleManageBilling()
                            } else {
                              setShowPricingModal(true)
                            }
                          }}
                        >
                          {hasActiveSubscription ? 'Manage Billing' : 'Start Trial'}
                        </button>

                        <div className="chat-settings-sep" />

                        <button
                          type="button"
                          className="chat-settings-item"
                          role="menuitem"
                          style={{color: 'var(--danger)'}}
                          onClick={handleSignOut}
                        >
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                </nav>
              </header>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="chat-messages"
              >
                {messages.length === 0 ? (
                  <div className="chat-empty-container">
                     <button 
                        className="viewfinder-trigger"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Activate Camera"
                    >
                        <div className="corner tl"></div>
                        <div className="corner tr"></div>
                        <div className="corner bl"></div>
                        <div className="corner br"></div>
                        
                        <div className="viewfinder-icon"><Icons.Plus /></div>
                        <span className="viewfinder-label">Tap to Inspect</span>
                        <span className="viewfinder-sub">or ask a question below</span>
                    </button>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                        <div className={`chat-card ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                          {msg.image && <img src={msg.image} alt="Uploaded" />}
                          
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="chat-thinking">Analyzing compliance...</div>
                          ) : (
                            <div className="chat-content">{msg.content}</div>
                          )}
                        </div>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-input-area">
                <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                {selectedImage && (
                    <div className="chat-attachment">
                      <span className="chat-attachment-icon"><Icons.Camera /></span>
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="chat-attachment-remove"><Icons.X /></button>
                    </div>
                )}
                
                <div className="chat-input-wrapper">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept="image/*" 
                        style={{display:'none'}} 
                        onChange={handleImageChange}
                    />
                    
                    <button 
                        className="btn-attach" 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Upload photo"
                    >
                        <Icons.Camera />
                    </button>

                    <textarea
                        ref={textAreaRef}
                        className="chat-textarea"
                        placeholder="Ask a regulatory question..."
                        rows={1}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value)
                          if(textAreaRef.current) {
                             textAreaRef.current.style.height = 'auto'
                             textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 140)}px`
                          }
                        }}
                        onKeyDown={(e) => {
                           if(e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault()
                             handleSend(e)
                           }
                        }}
                    />

                    <button 
                        className="btn-send" 
                        type="button"
                        onClick={handleSend}
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        aria-label="Send"
                    >
                        {isSending ? <div className="chat-send-spinner" /> : <Icons.ArrowUp />}
                    </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {isAuthenticated && locationCheck && <MultiLocationBanner locationCheck={locationCheck} />}

      <MultiLocationUpgradeModal
        isOpen={showMultiLocationModal}
        onClose={() => setShowMultiLocationModal(false)}
        currentLocations={locationCheck?.uniqueLocationsUsed || 2}
        userId={session?.user?.id}
      />

      <MultiLocationPurchaseModal
        isOpen={showMultiLocationPurchaseModal}
        onClose={() => setShowMultiLocationPurchaseModal(false)}
        userId={session?.user?.id}
      />
    </>
  )
}
