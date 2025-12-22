// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal' // ✅ using external PricingModal component

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ✅ SINGLE PLAN - Unlimited monthly only
const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

// eslint-disable-next-line no-unused-vars
const isAdmin = false

// lightweight logger (keeps your original “logger.info” style expectations)
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
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
  Gear: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.4-2.4 1a8.6 8.6 0 0 0-1.3-.8l-.4-2.6H10.1l-.4 2.6c-.46.2-.9.46-1.3.8l-2.4-1-2 3.4 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.4 2.4-1c.4.34.84.6 1.3.8l.4 2.6h4.8l.4-2.6c.46-.2.9-.46 1.3-.8l2.4 1 2-3.4-2-1.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Doc: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
      <path d="M8 13h8M8 17h8M8 9h4" strokeLinecap="round" />
    </svg>
  ),
  Wrench: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M14.7 6.3a4.5 4.5 0 0 0-5.9 5.9L3 18v3h3l5.8-5.8a4.5 4.5 0 0 0 5.9-5.9l-2.1 2.1-2.8-2.8 1.9-2.3z"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z"
        strokeLinejoin="round"
      />
      <path d="M9.5 12l1.8 1.8L15.8 9.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
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

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className="landing-root">
      <header className="landing-topbar">
        <div className="plm-brand-wrap">
          <BrandLink variant="landing" />
        </div>

        <nav className="landing-top-actions" aria-label="Top actions">
          <button onClick={onShowPricing} className="btn-primary" type="button">
            Start trial
          </button>
          <button onClick={onShowAuth} className="btn-nav landing-signin-btn" type="button">
            Sign in
          </button>
        </nav>
      </header>

      <main className="landing-main" aria-label="protocolLM landing">
        <section className="gov-panel" aria-label="Product summary">
          <div className="gov-panel-clip" aria-hidden="true" />

          <div className="gov-kicker-row">
            <span className={`gov-kicker ${ibmMono.className}`}>
              <span className="gov-dot" aria-hidden="true" />
              WASHTENAW COUNTY · FOOD SERVICE · COMPLIANCE UTILITY
            </span>
          </div>

          <h1 className="gov-title">Plain-language compliance checks.</h1>

          <p className="gov-subtitle">
            Snap a photo or ask a question. protocolLM answers from the Washtenaw County guidance you’re held to.
          </p>

          <div className="gov-divider" role="separator" />

          <div className="gov-steps" aria-label="How it works">
            <div className="gov-step">
              <div className="gov-step-icon" aria-hidden="true">
                <Icons.Camera />
              </div>
              <div className="gov-step-body">
                <div className="gov-step-title">
                  Capture <span className={`gov-step-tag ${ibmMono.className}`}>PHOTO SCAN</span>
                </div>
                <div className="gov-step-text">Take a photo of prep, dish, storage, coolers, labels, sinks—anything.</div>
              </div>
            </div>

            <div className="gov-step">
              <div className="gov-step-icon" aria-hidden="true">
                <Icons.Doc />
              </div>
              <div className="gov-step-body">
                <div className="gov-step-title">
                  Cross-check <span className={`gov-step-tag ${ibmMono.className}`}>LOCAL DOCS</span>
                </div>
                <div className="gov-step-text">Flags likely issues and ties them back to local requirements.</div>
              </div>
            </div>

            <div className="gov-step">
              <div className="gov-step-icon" aria-hidden="true">
                <Icons.Wrench />
              </div>
              <div className="gov-step-body">
                <div className="gov-step-title">
                  Correct <span className={`gov-step-tag ${ibmMono.className}`}>FIX LIST</span>
                </div>
                <div className="gov-step-text">Clear steps your staff can do now—no fluff, no scare tactics.</div>
              </div>
            </div>
          </div>

          <div className="gov-divider" role="separator" />

          <div className="gov-actions">
            <div className="gov-action-preview" aria-label="Tool preview (non-interactive)">
              <button type="button" className="tool-btn tool-btn-camera" aria-label="Camera (preview)" disabled>
                <Icons.Camera />
                <span className={`tool-btn-label ${ibmMono.className}`}>SCAN</span>
              </button>

              <div className="tool-input-preview" aria-hidden="true">
                <span className={`tool-placeholder ${ibmMono.className}`}>Ask about temps, date marks, sanitizer, hand sinks…</span>
              </div>

              <button type="button" className="tool-btn tool-btn-send" aria-label="Send (preview)" disabled>
                <Icons.ArrowUp />
              </button>
            </div>

            <div className="gov-cta-row">
              <button className="btn-primary btn-primary-lg" onClick={onShowPricing} type="button">
                Start trial
              </button>
              <button className="btn-secondary btn-secondary-lg" onClick={onShowAuth} type="button">
                Sign in
              </button>
            </div>

            <div className={`gov-footnote ${ibmMono.className}`}>
              Built like a utility. Designed for busy operators. <span className="gov-footnote-sep">·</span> 1,166
              inspected establishments in Washtenaw County.
            </div>
          </div>
        </section>

        <section className="gov-statusbar" aria-label="Status bar">
          <div className={`gov-status-left ${ibmMono.className}`}>
            <span className="status-pill">
              <Icons.Shield /> VERIFIED FLOW · CSRF · TURNSTILE
            </span>
            <span className="status-sep">·</span>
            <span className="status-muted">No imagery. No hype. Just compliance.</span>
          </div>

          <div className={`gov-status-right ${ibmMono.className}`}>protocolLM · v1</div>
        </section>
      </main>

      <FooterLinks />
    </div>
  )
}

// ✅ UPDATED: accepts selectedPriceId and passes it on signup
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
        setMessage('Security verification failed. Please ensure Cloudflare Turnstile is allowed, then try again.')
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
        <div className="modal-card">
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="modal-header">
            <div className={`modal-kicker ${ibmMono.className}`}>ACCOUNT ACCESS</div>
            <h2 className="modal-title">
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label className={`form-label ${ibmMono.className}`}>Email</label>
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
                <label className={`form-label ${ibmMono.className}`}>Password</label>
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
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={`form-toggle-vis ${ibmMono.className}`}>
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !isLoaded} className="btn-submit">
              {loading && <span className="spinner" />}
              <span>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send link'}</span>
            </button>
          </form>

          {message && <div className={`modal-message ${messageKind} ${ibmMono.className}`}>{message}</div>}

          <div className="modal-footer">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className={`modal-link ${ibmMono.className}`}>
                  Forgot password?
                </button>
                <button type="button" onClick={() => setMode('signup')} className={`modal-link ${ibmMono.className}`}>
                  Create an account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className={`modal-link ${ibmMono.className}`}>
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className={`modal-link ${ibmMono.className}`}>
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

export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const { isLoaded: captchaLoaded, executeRecaptcha } = useRecaptcha()

  const [isLoading, setIsLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState('auth')
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscription, setSubscription] = useState(null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('signin')
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  // ✅ remember the selected Stripe price when user isn't logged in
  const [selectedPriceId, setSelectedPriceId] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  // ✅ NEW: multi-location license state + modal
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

  // ✅ Chat settings menu (gear dropdown)
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

  // ✅ NEW: Listen for multi-location upgrade events
  useEffect(() => {
    const handleUpgradeEvent = () => {
      setShowMultiLocationModal(true)
    }

    window.addEventListener('openMultiLocationUpgrade', handleUpgradeEvent)

    return () => {
      window.removeEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
    }
  }, [])

  // ✅ NEW: Listen for multi-location purchase modal trigger
  useEffect(() => {
    const handleOpenMultiLocationPurchase = () => {
      setShowMultiLocationPurchaseModal(true)
    }

    window.addEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)

    return () => {
      window.removeEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
    }
  }, [])

  // Set view attribute for CSS + optional spline container hiding
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) {
      splineContainer.style.display = isAuthenticated ? 'none' : 'block'
    }
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

  // ============================================================================
  // ✅ FIX 1: SECURE pricing modal auto-trigger (URL param)
  // Only show pricing via URL param if authenticated
  // ============================================================================
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

  // ============================================================================
  // ✅ FIX 2: Keep ONLY this handleCheckout (full validation + CAPTCHA + verification)
  // ============================================================================
  const handleCheckout = useCallback(
    async (priceId, planName) => {
      try {
        // ✅ SECURITY: Validate price ID
        if (!priceId) {
          alert('Invalid price selected.')
          return
        }

        // ✅ SECURITY: Verify priceId is one of the allowed values (single plan)
        const validPrices = [UNLIMITED_MONTHLY].filter(Boolean)
        if (validPrices.length > 0 && !validPrices.includes(priceId)) {
          console.error('Invalid price ID:', priceId)
          alert('Invalid plan selected. Please try again.')
          return
        }

        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          // ✅ Store selected plan before showing auth
          console.log('💾 Storing selected plan:', String(priceId).substring(0, 15) + '***')
          setSelectedPriceId(priceId)
          setShowPricingModal(false)
          setAuthInitialMode('signup')
          setShowAuthModal(true)
          return
        }

        // ✅ SECURITY: Check email is verified before allowing checkout
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

        // ✅ SECURITY: Handle specific error codes
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

  // ✅ CRITICAL: Main authentication and subscription check
  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setSubscription(null)
        setHasActiveSubscription(false)
        setShowPricingModal(false)

        // ✅ clear multi-location states on logout
        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)

        setIsLoading(false)
        return
      }

      // ✅ CRITICAL: Check if email is verified + terms accepted
      try {
        if (!s.user.email_confirmed_at) {
          console.log('❌ Email not verified - redirecting to verify page')
          setSubscription(null)
          setHasActiveSubscription(false)

          // ✅ clear multi-location states
          setLocationCheck(null)
          setShowMultiLocationModal(false)
          setShowMultiLocationPurchaseModal(false)

          setIsLoading(false)
          router.replace('/verify-email')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', s.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('❌ Profile check error:', profileError)
          setSubscription(null)
          setHasActiveSubscription(false)

          setLocationCheck(null)
          setShowMultiLocationModal(false)
          setShowMultiLocationPurchaseModal(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (!profile) {
          setSubscription(null)
          setHasActiveSubscription(false)

          setLocationCheck(null)
          setShowMultiLocationModal(false)
          setShowMultiLocationPurchaseModal(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        const accepted = !!(profile.accepted_terms && profile.accepted_privacy)
        if (!accepted) {
          setSubscription(null)
          setHasActiveSubscription(false)

          setLocationCheck(null)
          setShowMultiLocationModal(false)
          setShowMultiLocationPurchaseModal(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('❌ Policy check exception:', e)
        setSubscription(null)
        setHasActiveSubscription(false)

        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)

        setIsLoading(false)
        router.replace('/accept-terms')
        return
      }

      // ✅ CRITICAL: Check for active subscription
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
        const endDate =
          sub?.current_period_end ? new Date(sub.current_period_end) : sub?.trial_end ? new Date(sub.trial_end) : null

        if (endDate && endDate > now) active = true
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (!isMounted) return
      setSubscription(subData)
      setHasActiveSubscription(active)

      // ✅ if user lost subscription, clear location check so banner doesn't show incorrectly
      if (!subData) {
        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)
      }

      const checkoutParam = searchParams?.get('checkout')
      const showPricingParam = searchParams?.get('showPricing')

      if (s?.user) {
        console.log('🔐 Auth state:', {
          userId: String(s.user.id || '').substring(0, 8) + '***',
          emailVerified: !!s.user.email_confirmed_at,
          hasSubscription: !!subData,
          subscriptionStatus: subData?.status,
          trialEnd: subData?.trial_end ? new Date(subData.trial_end).toISOString() : null,
        })
      }

      if (!subData && !checkoutParam && showPricingParam !== 'true') {
        console.log('💳 No subscription found - showing pricing modal')
        setShowPricingModal(true)
        setHasActiveSubscription(false)
      }

      if (subData?.status === 'trialing' && subData?.trial_end) {
        const trialEnd = new Date(subData.trial_end)
        const now = new Date()

        if (trialEnd < now) {
          console.log('❌ Trial expired - showing pricing')
          if (!checkoutParam) setShowPricingModal(true)
          setHasActiveSubscription(false)
        } else {
          const hoursLeft = (trialEnd - now) / (1000 * 60 * 60)
          if (hoursLeft < 24 && hoursLeft > 0) {
            console.log(`⚠️ Trial ends in ${Math.round(hoursLeft)} hours`)
          }
        }
      }

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

  // ✅ FIXED: Auto-checkout after email verification / auth callback
  useEffect(() => {
    const checkoutPlan = searchParams?.get('checkout')
    if (!checkoutPlan) return
    if (isLoading) return

    if (checkoutPlan && isAuthenticated && !hasActiveSubscription && !subscription) {
      console.log('🛒 Auto-checkout triggered:', checkoutPlan.substring(0, 15) + '***')
      handleCheckout(checkoutPlan, 'auto')

      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/')
      }
    }
  }, [searchParams, isAuthenticated, hasActiveSubscription, subscription, handleCheckout, isLoading])

  // ============================================================================
  // ✅ NEW: Fetch multi-location “license/locationCheck” after auth + subscription exists
  // - This is intentionally non-blocking: it won’t affect isLoading
  // - It safely no-ops if your endpoint isn’t present yet
  // ============================================================================
  const fetchLocationCheckFromServer = useCallback(async (sess) => {
    try {
      const token = sess?.access_token
      const userId = sess?.user?.id
      if (!token || !userId) return null

      const doPost = async () =>
        fetch('/api/license/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
          credentials: 'include',
        })

      const doGet = async () =>
        fetch('/api/license/check', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        })

      let res = await doPost()
      if (res.status === 405) res = await doGet()

      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return null

      // support either { locationCheck: {...} } or direct object
      return data.locationCheck || data
    } catch (e) {
      logger.warn('Location check fetch failed', e)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      // only for authenticated users with an active/trialing subscription record
      if (!isAuthenticated || !session?.user?.id || !subscription) return

      const lc = await fetchLocationCheckFromServer(session)
      if (cancelled) return

      if (!lc) return

      // ✅ Step 3 behavior: log + store for banner
      logger.info('License validated', {
        userId: session.user.id,
        uniqueLocationsUsed: lc.uniqueLocationsUsed,
        locationFingerprint: lc.locationFingerprint?.substring(0, 8) + '***',
      })

      // Store location check for banner
      setLocationCheck(lc)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, session, subscription, fetchLocationCheckFromServer])

  const handleManageBilling = async () => {
    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast.textContent = 'Opening billing portal...'
      loadingToast.className = 'plm-toast'
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
      setShowSettingsMenu(false)

      // ✅ clear multi-location states immediately
      setLocationCheck(null)
      setShowMultiLocationModal(false)
      setShowMultiLocationPurchaseModal(false)

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

  // small derived flags for UI only
  const shouldNudgeScan = useMemo(() => {
    return isAuthenticated && messages.length === 0 && !selectedImage && !isSending
  }, [isAuthenticated, messages.length, selectedImage, isSending])

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
          </div>
          <div className="loading-bar" aria-label="Loading">
            <div className="loading-bar-fill" />
          </div>
          <div className={`loading-meta ${ibmMono.className}`}>INITIALIZING · {loadingStage.toUpperCase()}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          /* Stainless / government utility */
          --bg-0: #f3f5f7; /* page */
          --bg-1: #ffffff; /* panels */
          --bg-2: #eef1f4; /* wells */
          --bg-3: #e6ebf0; /* stronger well */

          --ink-0: #0b1220; /* primary text */
          --ink-1: #273043; /* secondary */
          --ink-2: #5d6678; /* muted */
          --ink-3: #8c95a6; /* faint */

          /* From your logo palette (dominant blues) */
          --accent: #2e66db;
          --accent-ink: #0a34a8;
          --accent-dim: rgba(46, 102, 219, 0.12);
          --accent-dim-2: rgba(46, 102, 219, 0.22);

          --border-subtle: rgba(11, 18, 32, 0.10);
          --border-default: rgba(11, 18, 32, 0.16);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-full: 9999px;

          --shadow-1: 0 10px 30px rgba(11, 18, 32, 0.08);
          --shadow-2: 0 18px 60px rgba(11, 18, 32, 0.10);

          /* “90s utility” bevel */
          --bevel-hi: rgba(255, 255, 255, 0.95);
          --bevel-lo: rgba(11, 18, 32, 0.14);
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          height: 100%;
          margin: 0;
          background: var(--bg-0);
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior-y: none;
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji',
            'Segoe UI Emoji';
        }

        @supports (-webkit-touch-callout: none) {
          html {
            height: -webkit-fill-available;
          }
          body {
            min-height: -webkit-fill-available;
          }
        }

        a,
        button,
        input,
        textarea {
          -webkit-tap-highlight-color: transparent;
        }
        :focus {
          outline: none;
        }

        ::selection {
          background: var(--accent-dim);
          color: var(--ink-0);
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(11, 18, 32, 0.14);
          border-radius: var(--radius-full);
        }

        /* tiny toast used by billing portal */
        .plm-toast {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 9999;
          background: var(--ink-0);
          color: #fff;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 12px;
          box-shadow: var(--shadow-1);
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

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 18px;
          text-align: center;
        }

        .loading-logo {
          width: 64px;
          height: 64px;
          filter: drop-shadow(0 10px 20px rgba(11, 18, 32, 0.18));
        }

        .loading-bar {
          width: 140px;
          height: 6px;
          background: var(--bg-3);
          border-radius: var(--radius-full);
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .loading-bar-fill {
          height: 100%;
          width: 30%;
          background: var(--accent);
          animation: loading-slide 1s ease-in-out infinite;
        }

        .loading-meta {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        @keyframes loading-slide {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(420%);
          }
        }

        /* App */
        .app-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
        }

        /* Brand */
        .plm-brand {
          color: var(--ink-0);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.15s ease;
        }

        .plm-brand:hover {
          opacity: 0.85;
        }

        .plm-brand-inner {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .plm-brand-mark {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
        }

        .plm-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .plm-brand-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        /* Buttons: government utility, not “SaaS pill” */
        .btn-nav {
          height: 34px;
          padding: 0 12px;
          background: transparent;
          color: var(--ink-1);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        }

        .btn-nav:hover {
          color: var(--ink-0);
          border-color: var(--border-subtle);
          background: rgba(255, 255, 255, 0.35);
        }

        .btn-primary {
          height: 34px;
          padding: 0 14px;
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(11, 18, 32, 0.18);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 0.08s ease, filter 0.12s ease;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .btn-primary:hover {
          filter: brightness(0.98);
        }

        .btn-primary:active {
          transform: translateY(1px);
        }

        .btn-primary-lg {
          height: 44px;
          padding: 0 16px;
          font-size: 14px;
        }

        .btn-secondary {
          height: 34px;
          padding: 0 14px;
          background: var(--bg-1);
          color: var(--ink-0);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: transform 0.08s ease, background 0.12s ease;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.75);
        }

        .btn-secondary:active {
          transform: translateY(1px);
        }

        .btn-secondary-lg {
          height: 44px;
          padding: 0 16px;
          font-size: 14px;
        }

        /* Footer links */
        .plm-footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 18px 16px;
          color: var(--ink-2);
        }

        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.12s ease;
        }

        .plm-footer-link:hover {
          color: var(--ink-0);
        }

        .plm-footer-sep {
          color: var(--ink-3);
        }

        /* Landing */
        .landing-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
        }

        .landing-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(18px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 14px
            max(20px, env(safe-area-inset-left));
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(6px);
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .landing-main {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          padding: 22px 20px 0;
          padding-left: max(20px, env(safe-area-inset-left));
          padding-right: max(20px, env(safe-area-inset-right));
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gov-panel {
          position: relative;
          background: var(--bg-1);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-2);
          overflow: hidden;

          /* 90s/defense bevel edges */
          box-shadow: var(--shadow-2), inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .gov-panel-clip {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 190px;
          height: 16px;
          background: var(--bg-3);
          border: 1px solid var(--border-subtle);
          border-top: 0;
          border-radius: 0 0 12px 12px;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .gov-kicker-row {
          padding: 22px 22px 0;
        }

        .gov-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .gov-dot {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          background: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }

        .gov-title {
          margin: 10px 22px 0;
          font-size: 30px;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: var(--ink-0);
          font-weight: 820;
        }

        .gov-subtitle {
          margin: 10px 22px 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--ink-1);
          max-width: 60ch;
        }

        .gov-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 18px 0;
        }

        .gov-steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          padding: 0 22px;
        }

        .gov-step {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 12px;
          align-items: start;
          padding: 12px 12px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: rgba(238, 241, 244, 0.65);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .gov-step-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          color: var(--accent-ink);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .gov-step-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--ink-0);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gov-step-tag {
          display: inline-flex;
          align-items: center;
          padding: 3px 7px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.7);
          color: var(--ink-2);
          font-size: 10px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .gov-step-text {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink-1);
        }

        .gov-actions {
          padding: 0 22px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .gov-action-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.75);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .tool-btn {
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--border-default);
          background: var(--bg-1);
          color: var(--ink-1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 10px;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
          cursor: default;
        }

        .tool-btn:disabled {
          opacity: 1;
        }

        .tool-btn-camera {
          color: var(--accent);
          border-color: rgba(46, 102, 219, 0.35);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(46, 102, 219, 0.15);
        }

        .tool-btn-label {
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .tool-input-preview {
          flex: 1;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-2);
          display: flex;
          align-items: center;
          padding: 0 12px;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
          min-width: 0;
        }

        .tool-placeholder {
          font-size: 11px;
          letter-spacing: 0.02em;
          color: var(--ink-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tool-btn-send {
          width: 44px;
          padding: 0;
          color: var(--ink-2);
        }

        .gov-cta-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .gov-footnote {
          font-size: 11px;
          letter-spacing: 0.04em;
          color: var(--ink-2);
        }

        .gov-footnote-sep {
          margin: 0 8px;
          color: var(--ink-3);
        }

        .gov-statusbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 4px 16px;
          color: var(--ink-2);
        }

        .gov-status-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.6);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
          font-size: 10px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--ink-1);
          white-space: nowrap;
        }

        .status-sep {
          color: var(--ink-3);
        }

        .status-muted {
          color: var(--ink-2);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 46vw;
        }

        .gov-status-right {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-2);
          white-space: nowrap;
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(11, 18, 32, 0.62);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fade-in 0.12s ease;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          width: 100%;
          max-width: 380px;
          animation: modal-up 0.16s ease;
        }

        @keyframes modal-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-card {
          position: relative;
          background: var(--bg-1);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 22px;
          box-shadow: var(--shadow-2);
          box-shadow: var(--shadow-2), inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          color: var(--ink-2);
          cursor: pointer;
          border-radius: 10px;
          transition: color 0.12s ease, background 0.12s ease;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .modal-close:hover {
          color: var(--ink-0);
          background: var(--bg-3);
        }

        .modal-header {
          margin-bottom: 16px;
          padding-right: 36px;
        }

        .modal-kicker {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-2);
          margin-bottom: 6px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 850;
          margin: 0;
          color: var(--ink-0);
          letter-spacing: -0.02em;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
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
          transition: border-color 0.12s ease, box-shadow 0.12s ease;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .form-input::placeholder {
          color: var(--ink-3);
        }

        .form-input:focus {
          border-color: rgba(46, 102, 219, 0.55);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo), 0 0 0 3px var(--accent-dim);
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
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .form-toggle-vis:hover {
          color: var(--ink-0);
        }

        .btn-submit {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(11, 18, 32, 0.18);
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.08s ease, filter 0.12s ease;
          margin-top: 6px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
        }

        .btn-submit:hover:not(:disabled) {
          filter: brightness(0.98);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(1px);
        }

        .btn-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-message {
          padding: 10px 12px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 11px;
          letter-spacing: 0.04em;
          text-align: center;
          margin-top: 14px;
        }

        .modal-message.ok {
          color: #0a7a3f;
        }
        .modal-message.err {
          color: #b42318;
        }

        .modal-footer {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .modal-link {
          background: none;
          border: none;
          font-size: 11px;
          color: var(--ink-1);
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .modal-link:hover {
          color: var(--ink-0);
        }

        /* Turnstile/Recaptcha badge: keep it tidy */
        .modal-card .recaptcha-badge,
        .modal-card .turnstile-badge,
        .modal-card .captcha-badge,
        .modal-card [data-turnstile-badge],
        .modal-card [data-recaptcha-badge] {
          font-size: 10px !important;
          white-space: nowrap !important;
          line-height: 1.2 !important;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          color: var(--ink-2) !important;
        }

        /* Pricing feature rows (kept for your external PricingModal styles that rely on these hooks) */
        .pricing-feature {
          display: grid;
          grid-template-columns: 16px 1fr;
          column-gap: 10px;
          align-items: start;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.92;
        }

        .pricing-feature-check {
          width: 16px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          line-height: 1;
          margin-top: 2px;
          font-size: 14px;
        }

        .pricing-feature-text {
          display: block;
          min-width: 0;
        }

        /* Chat */
        .chat-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--bg-0);
          height: 100dvh;
          overflow: hidden;
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root {
            height: -webkit-fill-available;
          }
        }

        .chat-topbar {
          width: 100%;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(6px);
        }

        .chat-topbar-inner {
          max-width: 980px;
          margin: 0 auto;
          padding: 14px 20px;
          padding-left: max(20px, env(safe-area-inset-left));
          padding-right: max(20px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .plan-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.7);
          color: var(--ink-1);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
          white-space: nowrap;
        }

        .plan-chip .plan-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }

        /* Settings gear dropdown */
        .chat-settings-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .chat-settings-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          color: var(--ink-2);
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .chat-settings-btn:hover {
          color: var(--ink-0);
          background: var(--bg-2);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          background: var(--bg-1);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: var(--shadow-1);
          animation: dropdown-in 0.12s ease;
          z-index: 50;
          box-shadow: var(--shadow-1), inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        @keyframes dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chat-settings-item {
          width: 100%;
          text-align: left;
          padding: 10px 10px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 10px;
          color: var(--ink-0);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .chat-settings-item:hover {
          background: var(--bg-2);
          border-color: var(--border-subtle);
        }

        .chat-settings-sep {
          height: 1px;
          background: var(--border-subtle);
          margin: 6px 2px;
        }

        .chat-shell {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 20px 22px;
          background: var(--bg-0);
        }

        .chat-history {
          max-width: 980px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-top: 16px;
          padding-bottom: 6px;
        }

        /* “Defense console” message format: label + content, no bubbles */
        .chat-line {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 14px;
          align-items: start;
        }

        .chat-label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-2);
          padding-top: 2px;
          white-space: nowrap;
        }

        .chat-label.user {
          color: var(--ink-1);
        }

        .chat-label.assistant {
          color: var(--accent-ink);
        }

        .chat-content {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-0);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chat-thinking {
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          display: inline-block;
          margin-bottom: 10px;
          border: 1px solid var(--border-subtle);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
          background: var(--bg-1);
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        .chat-empty-state {
          max-width: 980px;
          margin: 0 auto;
          padding: 22px 0 0;
        }

        .chat-empty-card {
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          background: var(--bg-1);
          box-shadow: var(--shadow-1), inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
          padding: 18px;
        }

        .chat-empty-title {
          font-size: 14px;
          font-weight: 850;
          letter-spacing: -0.01em;
          margin: 0;
          color: var(--ink-0);
        }

        .chat-empty-text {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-1);
          max-width: 70ch;
        }

        .chat-empty-hint {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(46, 102, 219, 0.35);
          background: rgba(46, 102, 219, 0.08);
          color: var(--ink-1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), inset 0 -1px 0 rgba(46, 102, 219, 0.12);
        }

        .chat-empty-hint .hint-label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        /* Input area: “clipboard extension” */
        .chat-input-area {
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(6px);
        }

        .chat-input-inner {
          max-width: 980px;
          margin: 0 auto;
          padding: 12px 20px 18px;
          padding-bottom: max(18px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--bg-1);
          border-radius: 12px;
          margin-bottom: 10px;
          font-size: 11px;
          color: var(--ink-1);
          border: 1px solid var(--border-subtle);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .chat-attachment-icon {
          color: var(--accent);
          display: flex;
        }

        .chat-attachment-remove {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          color: var(--ink-2);
          cursor: pointer;
          border-radius: 10px;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .chat-attachment-remove:hover {
          color: var(--ink-0);
          background: var(--bg-3);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        /* Camera button: “primary tool” without being obnoxious */
        .chat-camera-btn {
          height: 46px;
          min-width: 56px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--bg-1);
          border: 1px solid rgba(46, 102, 219, 0.35);
          border-radius: 12px;
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease, transform 0.08s ease;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(46, 102, 219, 0.12);
          position: relative;
        }

        .chat-camera-btn:hover {
          border-color: rgba(46, 102, 219, 0.55);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(46, 102, 219, 0.15),
            0 0 0 3px var(--accent-dim);
        }

        .chat-camera-btn:active {
          transform: translateY(1px);
        }

        .chat-camera-label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent-ink);
        }

        /* subtle “nudge” only when new + empty: faint scanning line */
        .chat-camera-btn[data-nudge='true']::after {
          content: '';
          position: absolute;
          inset: 6px;
          border-radius: 10px;
          pointer-events: none;
          border: 1px dashed rgba(46, 102, 219, 0.35);
          animation: nudgePulse 2.1s ease-in-out infinite;
        }

        @keyframes nudgePulse {
          0% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.75;
          }
          100% {
            opacity: 0.35;
          }
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--bg-1);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          transition: box-shadow 0.12s ease, border-color 0.12s ease;
          min-width: 0;
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo);
        }

        .chat-input-wrapper:focus-within {
          border-color: rgba(46, 102, 219, 0.55);
          box-shadow: inset 0 1px 0 var(--bevel-hi), inset 0 -1px 0 var(--bevel-lo), 0 0 0 3px var(--accent-dim);
        }

        .chat-textarea {
          flex: 1;
          min-height: 46px;
          max-height: 180px;
          padding: 12px 12px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: var(--ink-3);
        }

        .chat-textarea:focus {
          outline: none;
        }

        .chat-send-btn {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-2);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.12s ease;
        }

        .chat-send-btn:hover:not(:disabled) {
          color: var(--accent-ink);
        }

        .chat-send-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(11, 18, 32, 0.18);
          border-top-color: var(--accent);
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 10px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--ink-2);
          margin-top: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .plm-brand-mark {
            width: 52px;
            height: 52px;
          }
          .plm-brand-text {
            font-size: 17px;
          }

          .gov-title {
            font-size: 26px;
          }

          .gov-subtitle {
            font-size: 14px;
          }

          .chat-line {
            grid-template-columns: 86px 1fr;
            gap: 12px;
          }

          .status-muted {
            max-width: 40vw;
          }
        }

        @media (max-width: 480px) {
          .landing-topbar {
            padding: max(14px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 12px
              max(14px, env(safe-area-inset-left));
          }

          .landing-main {
            padding: 18px 14px 0;
          }

          .gov-kicker-row {
            padding: 20px 16px 0;
          }

          .gov-title {
            margin: 10px 16px 0;
            font-size: 24px;
          }

          .gov-subtitle {
            margin: 10px 16px 0;
          }

          .gov-steps {
            padding: 0 16px;
          }

          .gov-actions {
            padding: 0 16px 16px;
          }

          .gov-cta-row {
            flex-direction: column;
          }

          .btn-primary-lg,
          .btn-secondary-lg {
            width: 100%;
          }

          .chat-topbar-inner {
            padding: 12px 14px;
          }

          .chat-messages {
            padding: 0 14px 18px;
          }

          .chat-input-inner {
            padding: 10px 14px 14px;
            padding-bottom: max(14px, env(safe-area-inset-bottom));
          }

          .chat-camera-btn {
            min-width: 50px;
          }

          .chat-camera-label {
            display: none;
          }

          .status-muted {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
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
            <div className="chat-root">
              <header className="chat-topbar">
                <div className="chat-topbar-inner">
                  <BrandLink variant="chat" />

                  <nav className="chat-top-actions" aria-label="Chat actions">
                    {session && subscription && (
                      <div className={`plan-chip ${ibmMono.className}`} aria-label="Plan status">
                        <span className="plan-dot" aria-hidden="true" />
                        {subscription.status === 'trialing' ? 'TRIAL' : 'PRO'}
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
                        <div className="chat-settings-menu" role="menu" aria-label="Settings menu">
                          <button
                            type="button"
                            className={`chat-settings-item ${ibmMono.className}`}
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
                            className={`chat-settings-item ${ibmMono.className}`}
                            role="menuitem"
                            onClick={() => {
                              setShowSettingsMenu(false)
                              handleSignOut()
                            }}
                          >
                            Log out
                          </button>
                        </div>
                      )}
                    </div>
                  </nav>
                </div>
              </header>

              <div className="chat-shell">
                <div ref={scrollRef} onScroll={handleScroll} className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className="chat-empty-card">
                        <p className="chat-empty-title">Start with a scan or a question.</p>
                        <p className="chat-empty-text">
                          Use the camera to cross-check a photo against Washtenaw County requirements, or type a question
                          (temps, date marking, sanitizer, hand sinks, storage, cleaning, inspections).
                        </p>

                        <div className="chat-empty-hint" aria-label="Scan hint">
                          <Icons.Camera />
                          <span className={`hint-label ${ibmMono.className}`}>TIP</span>
                          <span style={{ fontSize: 12, color: 'var(--ink-1)' }}>
                            Camera is fastest—scan first, then ask follow-ups.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chat-history">
                      {messages.map((msg, idx) => (
                        <div key={idx} className="chat-line">
                          <div
                            className={`chat-label ${ibmMono.className} ${msg.role === 'user' ? 'user' : 'assistant'}`}
                            aria-label={msg.role === 'user' ? 'User' : 'protocolLM'}
                          >
                            {msg.role === 'user' ? 'OPERATOR' : 'PROTOCOLLM'}
                          </div>

                          <div>
                            {msg.image && (
                              <div className="chat-bubble-image">
                                <img src={msg.image} alt="Uploaded" />
                              </div>
                            )}

                            {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                              <div className={`chat-thinking ${ibmMono.className}`}>ANALYZING…</div>
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
                        <span className={ibmMono.className} style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Image attached
                        </span>
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
                        data-nudge={shouldNudgeScan ? 'true' : 'false'}
                      >
                        <Icons.Camera />
                        <span className={`chat-camera-label ${ibmMono.className}`}>SCAN</span>
                      </button>

                      <div className="chat-input-wrapper">
                        <textarea
                          ref={textAreaRef}
                          value={input}
                          onChange={(e) => {
                            setInput(e.target.value)
                            if (textAreaRef.current) {
                              textAreaRef.current.style.height = 'auto'
                              textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 180)}px`
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

                    <p className={`chat-disclaimer ${ibmMono.className}`}>
                      Verify critical decisions with official regulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Multi-location warning banner */}
      {isAuthenticated && locationCheck && <MultiLocationBanner locationCheck={locationCheck} />}

      {/* Multi-location upgrade modal */}
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
