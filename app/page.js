// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Public_Sans, JetBrains_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal' // ✅ using external PricingModal component

const uiSans = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const uiMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

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
        d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.4-2.4 1a8.6 8.6 0 0 0-1.3-.8l-.4-2.6H10.1l-.4 2.6c-.46.2-.9.46-1.3.8l-2.4-1-2 3.4 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.4 2.4-1c.4.34.84.6 1.3.8l.4 2.6h4.8l.4-2.6c.46-.2 1-.46 1.3-.8l2.4 1 2-3.4-2-1.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

/* -------------------------------------------------------------------------- */
/* Brand + footer                                                               */
/* -------------------------------------------------------------------------- */

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
    <div className={`plm-footer-links ${uiMono.className}`}>
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

/* -------------------------------------------------------------------------- */
/* Landing: “government defense / clipboard extension”                          */
/* - No demo chat (removed)                                                     */
/* - Short, direct: problem → solution                                          */
/* - Monochrome + steel + controlled blue                                       */
/* -------------------------------------------------------------------------- */

function IsoClipboardMark() {
  // Monochrome, isometric-ish, “case file / clipboard” line art.
  // No gradients. Stroke only.
  return (
    <svg className="iso-mark" viewBox="0 0 420 300" fill="none" aria-hidden="true">
      {/* base plate */}
      <path d="M94 98 232 40l140 58-138 60L94 98Z" stroke="currentColor" strokeWidth="2" />
      <path d="M94 98v128l140 58V158L94 98Z" stroke="currentColor" strokeWidth="2" />
      <path d="M374 98v128l-140 58V158l140-60Z" stroke="currentColor" strokeWidth="2" />
      {/* clipboard clip */}
      <path d="M204 72l28-12 34 14-28 12-34-14Z" stroke="currentColor" strokeWidth="2" />
      <path d="M204 72v18l34 14V86l-34-14Z" stroke="currentColor" strokeWidth="2" />
      <path d="M266 74v18l-28 12V86l28-12Z" stroke="currentColor" strokeWidth="2" />

      {/* “photo frame” on the board */}
      <path d="M164 132l92-40 96 40-92 40-96-40Z" stroke="currentColor" strokeWidth="2" />
      <path d="M164 132v70l96 40v-70l-96-40Z" stroke="currentColor" strokeWidth="2" />
      <path d="M352 132v70l-92 40v-70l92-40Z" stroke="currentColor" strokeWidth="2" />
      {/* tiny camera glyph inside */}
      <path
        d="M236 168l12-5 13 6-12 5-13-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M241 172v10l13 6v-10l-13-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M261 169v10l-7 3v-10l7-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M249.5 180.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="2" />

      {/* “checklist lines” */}
      <path d="M128 174l10-4 10 4-10 4-10-4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M152 184l44-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M152 202l52-22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M152 220l38-16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${uiSans.className} landing-root`}>
      <header className="landing-topbar">
        <div className="plm-brand-wrap">
          <BrandLink variant="landing" />
        </div>

        <nav className="landing-top-actions" aria-label="Top actions">
          <button onClick={onShowAuth} className="btn-ghost" type="button">
            Sign in
          </button>
          <button onClick={onShowPricing} className="btn-primary" type="button">
            Start trial
          </button>
        </nav>
      </header>

      <main className="landing-main" aria-label="protocolLM landing">
        <section className="gov-hero" aria-label="Summary">
          <div className="gov-hero-left">
            <div className={`gov-kicker ${uiMono.className}`}>WASHTENAW COUNTY · FOOD SAFETY COMPLIANCE</div>

            <h1 className="gov-title">Catch violations early.</h1>

            <p className="gov-subtitle">
              protocolLM turns photos and questions into clear, source-backed fixes — so operators can correct issues before the
              inspection.
            </p>

            <div className="gov-brief">
              <div className="gov-brief-row">
                <div className={`gov-label ${uiMono.className}`}>Problem</div>
                <div className="gov-text">Rules are long. Staff turnover is real. The inspector is not.</div>
              </div>
              <div className="gov-brief-row">
                <div className={`gov-label ${uiMono.className}`}>Solution</div>
                <div className="gov-text">One tool: take a photo or ask a question. Get the fix — in plain language.</div>
              </div>
            </div>

            <div className="gov-actions">
              <button className="btn-primary btn-lg" onClick={onShowPricing} type="button">
                Start trial
              </button>
              <button className="btn-ghost btn-lg" onClick={onShowAuth} type="button">
                Sign in
              </button>
            </div>

            <div className="gov-features" aria-label="Capabilities">
              <div className="gov-feature">
                <div className={`gov-feature-title ${uiMono.className}`}>PHOTO CHECK</div>
                <div className="gov-feature-body">Snap a station, cooler, sink, sanitizer setup — get likely violations + what to do next.</div>
              </div>
              <div className="gov-feature">
                <div className={`gov-feature-title ${uiMono.className}`}>QUESTION CHECK</div>
                <div className="gov-feature-body">Date marking, cooling, reheating, handwashing, sanitizer, temps, storage — quick answers.</div>
              </div>
              <div className="gov-feature">
                <div className={`gov-feature-title ${uiMono.className}`}>SOURCE DISCIPLINE</div>
                <div className="gov-feature-body">Built to stay grounded in local rules and official references — not “vibes.”</div>
              </div>
            </div>

            <div className={`gov-footnote ${uiMono.className}`}>
              Designed like compliance software: minimal, readable, operational.
            </div>
          </div>

          <div className="gov-hero-right" aria-label="Visual identity">
            <div className="gov-panel">
              <div className={`gov-panel-head ${uiMono.className}`}>
                FIELD CLIPBOARD · IMAGE ANALYSIS READY
              </div>

              <div className="gov-panel-body">
                <div className="gov-iso">
                  <IsoClipboardMark />
                </div>

                <div className="gov-panel-lines">
                  <div className="gov-line">
                    <span className={`gov-chip ${uiMono.className}`}>CAPTURE</span>
                    <span className="gov-line-text">Photo → structured findings</span>
                  </div>
                  <div className="gov-line">
                    <span className={`gov-chip ${uiMono.className}`}>CROSS-CHECK</span>
                    <span className="gov-line-text">Local docs → practical fixes</span>
                  </div>
                  <div className="gov-line">
                    <span className={`gov-chip ${uiMono.className}`}>CORRECT</span>
                    <span className="gov-line-text">Next steps → faster compliance</span>
                  </div>
                </div>

                <div className={`gov-panel-note ${uiMono.className}`}>
                  Tip: Photo checks are the fastest path to useful results.
                </div>
              </div>
            </div>
          </div>
        </section>

        <FooterLinks />
      </main>
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
        <div className={`${uiSans.className} modal-card`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="modal-header">
            <div className={`modal-eyebrow ${uiMono.className}`}>SECURE ACCESS</div>
            <h2 className="modal-title">
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label className={`form-label ${uiMono.className}`}>Email</label>
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
                <label className={`form-label ${uiMono.className}`}>Password</label>
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
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={`form-toggle-vis ${uiMono.className}`}>
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

  // ✅ Subtle camera nudge (UI only)
  const [cameraNudge, setCameraNudge] = useState(false)

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

  // ✅ UI-only: nudge camera gently on first empty screen (not obnoxious)
  useEffect(() => {
    if (!isAuthenticated) return
    if (messages.length !== 0) return

    try {
      const used = window.localStorage.getItem('plm_camera_used')
      if (used) return
      setCameraNudge(true)
      const t = setTimeout(() => setCameraNudge(false), 5500)
      return () => clearTimeout(t)
    } catch {
      // ignore
    }
  }, [isAuthenticated, messages.length])

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

      logger.info('License validated', {
        userId: session.user.id,
        uniqueLocationsUsed: lc.uniqueLocationsUsed,
        locationFingerprint: lc.locationFingerprint?.substring(0, 8) + '***',
      })

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

  const handleCameraClick = useCallback(() => {
    try {
      window.localStorage.setItem('plm_camera_used', '1')
    } catch {
      // ignore
    }
    setCameraNudge(false)
    fileInputRef.current?.click()
  }, [])

  if (isLoading) {
    return (
      <div className={`${uiSans.className} loading-screen`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
          </div>
          <div className={`loading-label ${uiMono.className}`}>INITIALIZING</div>
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
          /* Stainless / paper */
          --bg-0: #f3f5f7; /* app background */
          --bg-1: #ffffff; /* panels */
          --bg-2: #eef1f4; /* inputs */
          --bg-3: #e5e9ef; /* rails */

          /* Ink (monochrome, “defense”) */
          --ink-0: #0b1220;
          --ink-1: #1a2636;
          --ink-2: #4a5566;
          --ink-3: #6b778a;

          /* Controlled blue (not “SaaS gradient blue”) */
          --accent: #0b5bd3;
          --accent-hover: #084aa9;
          --accent-dim: rgba(11, 91, 211, 0.14);

          --border-subtle: rgba(11, 18, 32, 0.12);
          --border-default: rgba(11, 18, 32, 0.18);

          --shadow-soft: 0 14px 40px rgba(11, 18, 32, 0.12);
          --shadow-tight: 0 10px 24px rgba(11, 18, 32, 0.12);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-full: 9999px;
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
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: var(--bg-0);
          z-index: -1;
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
          background: rgba(11, 18, 32, 0.18);
          border-radius: var(--radius-full);
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
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
          gap: 18px;
        }

        .loading-logo {
          width: 64px;
          height: 64px;
          filter: saturate(1);
        }

        .loading-label {
          font-size: 11px;
          letter-spacing: 0.18em;
          color: var(--ink-2);
        }

        .loading-bar {
          width: 140px;
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
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(420%);
          }
        }

        /* App wrapper */
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
          opacity: 0.78;
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

        /* Buttons (defense / gov style) */
        .btn-primary,
        .btn-ghost {
          height: 36px;
          padding: 0 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
          font-family: inherit;
        }

        .btn-primary {
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(11, 91, 211, 0.65);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.18) inset;
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          border-color: rgba(8, 74, 169, 0.9);
        }

        .btn-primary:active {
          transform: translateY(1px);
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid var(--border-default);
          color: var(--ink-1);
        }

        .btn-ghost:hover {
          border-color: rgba(11, 18, 32, 0.28);
          background: rgba(255, 255, 255, 0.6);
        }

        .btn-lg {
          height: 44px;
          padding: 0 16px;
          font-size: 14px;
          border-radius: 10px;
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
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(18px, env(safe-area-inset-top)) max(22px, env(safe-area-inset-right)) 14px
            max(22px, env(safe-area-inset-left));
          background: rgba(243, 245, 247, 0.84);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(11, 18, 32, 0.08);
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .landing-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 22px;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
        }

        .gov-hero {
          flex: 1;
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          align-items: start;
          padding: 18px 0 64px;
        }

        .gov-hero-left,
        .gov-hero-right {
          min-width: 0;
        }

        .gov-kicker {
          font-size: 11px;
          letter-spacing: 0.16em;
          color: var(--ink-2);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .gov-title {
          margin: 0 0 10px;
          font-size: 42px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--ink-0);
        }

        .gov-subtitle {
          margin: 0 0 16px;
          font-size: 16px;
          line-height: 1.55;
          color: var(--ink-1);
          max-width: 56ch;
        }

        .gov-brief {
          border: 1px solid var(--border-subtle);
          background: var(--bg-1);
          border-radius: var(--radius-lg);
          padding: 14px 14px;
          box-shadow: var(--shadow-soft);
        }

        .gov-brief-row {
          display: grid;
          grid-template-columns: 92px 1fr;
          gap: 12px;
          padding: 10px 10px;
          border-radius: 12px;
        }

        .gov-brief-row + .gov-brief-row {
          border-top: 1px solid rgba(11, 18, 32, 0.08);
        }

        .gov-label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-2);
          padding-top: 2px;
        }

        .gov-text {
          font-size: 14px;
          line-height: 1.55;
          color: var(--ink-1);
        }

        .gov-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 14px;
          margin-bottom: 14px;
        }

        .gov-features {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 10px;
          max-width: 62ch;
        }

        .gov-feature {
          border: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(255, 255, 255, 0.72);
          border-radius: 14px;
          padding: 12px 12px;
        }

        .gov-feature-title {
          font-size: 11px;
          letter-spacing: 0.16em;
          color: var(--ink-2);
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .gov-feature-body {
          font-size: 14px;
          line-height: 1.5;
          color: var(--ink-1);
        }

        .gov-footnote {
          margin-top: 12px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        .gov-panel {
          border: 1px solid var(--border-default);
          background: var(--bg-1);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-tight);
        }

        .gov-panel-head {
          padding: 12px 14px;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-2);
          background: rgba(11, 18, 32, 0.03);
          border-bottom: 1px solid rgba(11, 18, 32, 0.10);
        }

        .gov-panel-body {
          padding: 14px 14px 14px;
        }

        .gov-iso {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 6px 2px;
          color: rgba(11, 18, 32, 0.78);
        }

        .iso-mark {
          width: 100%;
          max-width: 420px;
          height: auto;
          transform-origin: center;
          animation: iso-float 4.8s ease-in-out infinite;
        }

        @keyframes iso-float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .gov-panel-lines {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .gov-line {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 10px;
          border: 1px solid rgba(11, 18, 32, 0.10);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
        }

        .gov-chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 6px 8px;
          border-radius: 999px;
          border: 1px solid rgba(11, 18, 32, 0.16);
          color: var(--ink-1);
          background: rgba(243, 245, 247, 0.9);
          white-space: nowrap;
        }

        .gov-line-text {
          font-size: 13px;
          color: var(--ink-1);
        }

        .gov-panel-note {
          margin-top: 10px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        /* Footer links */
        .plm-footer-links {
          position: fixed;
          bottom: max(16px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 14px;
          z-index: 10;
          opacity: 0.9;
        }

        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover {
          color: var(--ink-0);
        }

        .plm-footer-sep {
          color: rgba(11, 18, 32, 0.28);
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(11, 18, 32, 0.72);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fade-in 0.15s ease;
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
          animation: modal-up 0.2s ease;
        }

        @keyframes modal-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-card {
          position: relative;
          background: var(--bg-1);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--radius-lg);
          padding: 26px;
          box-shadow: 0 22px 70px rgba(11, 18, 32, 0.35);
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
          background: transparent;
          border: 1px solid rgba(11, 18, 32, 0.10);
          color: var(--ink-2);
          cursor: pointer;
          border-radius: 10px;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .modal-close:hover {
          color: var(--ink-0);
          background: rgba(11, 18, 32, 0.04);
        }

        .modal-header {
          margin-bottom: 18px;
        }

        .modal-eyebrow {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-2);
          margin-bottom: 8px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 750;
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
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-2);
          font-weight: 700;
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          background: var(--bg-2);
          border: 1px solid rgba(11, 18, 32, 0.14);
          border-radius: 10px;
          color: var(--ink-0);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-input::placeholder {
          color: rgba(11, 18, 32, 0.45);
        }

        .form-input:focus {
          border-color: rgba(11, 91, 211, 0.55);
          box-shadow: 0 0 0 4px var(--accent-dim);
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
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
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
          gap: 8px;
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(11, 91, 211, 0.65);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          margin-top: 6px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
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
          background: rgba(11, 18, 32, 0.04);
          border: 1px solid rgba(11, 18, 32, 0.10);
          border-radius: 12px;
          font-size: 13px;
          color: var(--ink-1);
          text-align: center;
          margin-top: 14px;
        }

        .modal-message.ok {
          color: #067647;
          border-color: rgba(6, 118, 71, 0.25);
          background: rgba(6, 118, 71, 0.06);
        }

        .modal-message.err {
          color: #b42318;
          border-color: rgba(180, 35, 24, 0.22);
          background: rgba(180, 35, 24, 0.06);
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
          font-size: 13px;
          color: var(--ink-0);
          cursor: pointer;
          font-family: inherit;
          opacity: 0.86;
        }

        .modal-link:hover {
          opacity: 1;
        }

        /* ✅ Turnstile/Recaptcha line -> one line (shrink only enough) */
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
          color: rgba(11, 18, 32, 0.55) !important;
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
          max-width: 980px;
          margin: 0 auto;
          padding: 16px 22px;
          padding-left: max(22px, env(safe-area-inset-left));
          padding-right: max(22px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Settings menu */
        .chat-settings-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .chat-settings-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: 12px;
          color: var(--ink-1);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .chat-settings-btn:hover {
          border-color: rgba(11, 18, 32, 0.22);
          background: rgba(255, 255, 255, 0.95);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          background: var(--bg-1);
          border: 1px solid rgba(11, 18, 32, 0.14);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: var(--shadow-tight);
          animation: dropdown-in 0.15s ease;
          z-index: 50;
        }

        @keyframes dropdown-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
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
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .chat-settings-item:hover {
          background: rgba(11, 18, 32, 0.04);
          border-color: rgba(11, 18, 32, 0.10);
        }

        .chat-settings-sep {
          height: 1px;
          background: rgba(11, 18, 32, 0.10);
          margin: 6px 2px;
        }

        /* Messages area as a “case file” */
        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 22px 18px;
        }

        .chat-file {
          max-width: 980px;
          margin: 0 auto;
          background: var(--bg-1);
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-soft);
          overflow: hidden;
        }

        .chat-file-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(11, 18, 32, 0.03);
        }

        .chat-file-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .chat-file-kicker {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .chat-file-sub {
          font-size: 13px;
          color: var(--ink-1);
          line-height: 1.35;
        }

        .chat-file-body {
          padding: 14px 14px 10px;
        }

        .chat-empty {
          padding: 10px 0 2px;
          display: grid;
          gap: 10px;
        }

        .chat-empty-card {
          border: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(255, 255, 255, 0.75);
          border-radius: 14px;
          padding: 12px 12px;
        }

        .chat-empty-title {
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-2);
          margin-bottom: 6px;
        }

        .chat-empty-text {
          font-size: 14px;
          color: var(--ink-1);
          line-height: 1.55;
          margin: 0;
          max-width: 78ch;
        }

        .chat-history {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 6px 0 4px;
        }

        .chat-entry {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 12px;
          align-items: start;
          padding: 10px 10px;
          border-radius: 14px;
          border: 1px solid rgba(11, 18, 32, 0.08);
          background: rgba(255, 255, 255, 0.72);
        }

        .chat-entry.role-user {
          border-left: 3px solid rgba(11, 18, 32, 0.22);
        }

        .chat-entry.role-assistant {
          border-left: 3px solid rgba(11, 91, 211, 0.45);
        }

        .chat-role {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-2);
          padding-top: 2px;
          white-space: nowrap;
        }

        .chat-body {
          min-width: 0;
          font-size: 14px;
          line-height: 1.65;
          color: var(--ink-0);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chat-body.assistant {
          color: var(--ink-1);
        }

        .chat-thinking {
          color: var(--ink-2);
          font-style: italic;
        }

        .chat-bubble-image {
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 10px;
          border: 1px solid rgba(11, 18, 32, 0.12);
          background: rgba(243, 245, 247, 0.9);
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        /* Input area as “clipboard footer” */
        .chat-input-area {
          flex-shrink: 0;
          padding: 0 22px 18px;
        }

        .chat-input-inner {
          max-width: 980px;
          margin: 0 auto;
        }

        .chat-input-shell {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(11, 18, 32, 0.14);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          overflow: hidden;
        }

        .chat-input-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(11, 18, 32, 0.03);
        }

        .chat-input-label {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-2);
        }

        .chat-input-hint {
          font-size: 12px;
          color: var(--ink-2);
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: rgba(11, 18, 32, 0.03);
          border: 1px solid rgba(11, 18, 32, 0.10);
          border-radius: 12px;
          margin: 12px 12px 0;
          font-size: 12px;
          color: var(--ink-1);
          width: calc(100% - 24px);
          justify-content: space-between;
        }

        .chat-attachment-left {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .chat-attachment-icon {
          color: var(--accent);
          display: flex;
        }

        .chat-attachment-remove {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid rgba(11, 18, 32, 0.12);
          color: var(--ink-2);
          cursor: pointer;
          border-radius: 10px;
        }

        .chat-attachment-remove:hover {
          color: var(--ink-0);
          border-color: rgba(11, 18, 32, 0.22);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 12px;
        }

        /* Camera button (subtle emphasis, not obnoxious) */
        .chat-camera-btn {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(243, 245, 247, 0.9);
          border: 1px solid rgba(11, 91, 211, 0.35);
          border-radius: 14px;
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          position: relative;
        }

        .chat-camera-btn:hover {
          border-color: rgba(11, 91, 211, 0.55);
          box-shadow: 0 0 0 4px var(--accent-dim);
          background: #ffffff;
        }

        .chat-camera-btn.nudge::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 18px;
          border: 1px solid rgba(11, 91, 211, 0.22);
          animation: nudge-ring 1.6s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes nudge-ring {
          0% {
            opacity: 0.0;
            transform: scale(0.98);
          }
          30% {
            opacity: 0.55;
          }
          70% {
            opacity: 0.15;
            transform: scale(1.06);
          }
          100% {
            opacity: 0.0;
            transform: scale(1.08);
          }
        }

        .chat-nudge-pill {
          position: absolute;
          left: 0;
          top: -36px;
          transform: translateX(-2px);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(11, 18, 32, 0.14);
          color: var(--ink-1);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 11px;
          letter-spacing: 0.02em;
          box-shadow: 0 10px 24px rgba(11, 18, 32, 0.10);
          white-space: nowrap;
        }

        .chat-nudge-pill b {
          color: var(--accent);
          font-weight: 800;
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--bg-2);
          border: 1px solid rgba(11, 18, 32, 0.14);
          border-radius: 14px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          min-width: 0;
          overflow: hidden;
        }

        .chat-input-wrapper:focus-within {
          border-color: rgba(11, 91, 211, 0.55);
          box-shadow: 0 0 0 4px var(--accent-dim);
          background: rgba(255, 255, 255, 0.95);
        }

        .chat-textarea {
          flex: 1;
          min-height: 46px;
          max-height: 160px;
          padding: 12px 14px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.45;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: rgba(11, 18, 32, 0.45);
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
          color: rgba(11, 18, 32, 0.55);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .chat-send-btn:hover:not(:disabled) {
          color: var(--accent);
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
          font-size: 11px;
          color: rgba(11, 18, 32, 0.55);
          margin: 10px 12px 12px;
        }

        /* Responsive */
        @media (max-width: 980px) {
          .gov-hero {
            grid-template-columns: 1fr;
            padding-bottom: 110px;
          }
          .plm-footer-links {
            position: static;
            transform: none;
            left: auto;
            bottom: auto;
            margin: 10px auto 0;
            padding: 0 10px 18px;
          }
        }

        @media (max-width: 768px) {
          .landing-main {
            padding: 16px;
          }

          .gov-title {
            font-size: 36px;
          }

          .gov-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .gov-actions .btn-lg {
            width: 100%;
          }

          .chat-topbar {
            padding: 12px 16px;
          }

          .chat-messages {
            padding: 0 16px 16px;
          }

          .chat-input-area {
            padding: 0 16px 16px;
          }

          .chat-entry {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .chat-role {
            order: 0;
          }

          .chat-body {
            order: 1;
          }

          .plm-brand-mark {
            width: 52px;
            height: 52px;
          }
        }

        @media (max-width: 480px) {
          .gov-title {
            font-size: 32px;
          }

          .modal-card {
            padding: 22px 18px;
          }
        }
      `}</style>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authInitialMode}
        selectedPriceId={selectedPriceId}
      />

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

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
            <div className={`${uiSans.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions" aria-label="Chat actions">
                  {session && subscription && (
                    <div
                      className={uiMono.className}
                      style={{
                        marginRight: '10px',
                        padding: '6px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        background: subscription.status === 'trialing' ? 'rgba(11, 91, 211, 0.08)' : 'rgba(6, 118, 71, 0.07)',
                        color: subscription.status === 'trialing' ? 'rgba(11, 91, 211, 0.95)' : 'rgba(6, 118, 71, 0.95)',
                        border: `1px solid ${subscription.status === 'trialing' ? 'rgba(11, 91, 211, 0.18)' : 'rgba(6, 118, 71, 0.18)'}`,
                      }}
                    >
                      {subscription.status === 'trialing' ? 'Trial' : 'Active'}
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
              </header>

              <div ref={scrollRef} onScroll={handleScroll} className="chat-messages">
                <div className="chat-file">
                  <div className="chat-file-head">
                    <div className="chat-file-title">
                      <div className={`chat-file-kicker ${uiMono.className}`}>CASE FILE</div>
                      <div className="chat-file-sub">Washtenaw County food safety · photo checks + Q&A</div>
                    </div>
                    <div className={`chat-file-kicker ${uiMono.className}`} style={{ color: 'rgba(11,18,32,0.45)' }}>
                      OPERATIONAL VIEW
                    </div>
                  </div>

                  <div className="chat-file-body">
                    {messages.length === 0 ? (
                      <div className="chat-empty">
                        <div className="chat-empty-card">
                          <div className={`chat-empty-title ${uiMono.className}`}>Photo check</div>
                          <p className="chat-empty-text">
                            Use the camera button to attach a photo. protocolLM will identify likely violations and the corrective steps.
                          </p>
                        </div>
                        <div className="chat-empty-card">
                          <div className={`chat-empty-title ${uiMono.className}`}>Question check</div>
                          <p className="chat-empty-text">
                            Ask about cooling, reheating, date marking, sanitizer strength, hand sinks, storage, temps — and get concise guidance.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="chat-history">
                        {messages.map((msg, idx) => (
                          <div key={idx} className={`chat-entry ${msg.role === 'user' ? 'role-user' : 'role-assistant'}`}>
                            <div className={`chat-role ${uiMono.className}`}>{msg.role === 'user' ? 'Operator' : 'protocolLM'}</div>

                            <div className={`chat-body ${msg.role === 'assistant' ? 'assistant' : ''}`}>
                              {msg.image && (
                                <div className="chat-bubble-image">
                                  <img src={msg.image} alt="Uploaded" />
                                </div>
                              )}

                              {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                                <div className="chat-thinking">Analyzing…</div>
                              ) : (
                                msg.content
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="chat-input-area">
                <div className="chat-input-inner">
                  <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                  <div className="chat-input-shell">
                    <div className="chat-input-topline">
                      <div className={`chat-input-label ${uiMono.className}`}>INPUT</div>
                      <div className="chat-input-hint">Attach a photo for fastest results. Or ask a direct question.</div>
                    </div>

                    {selectedImage && (
                      <div className="chat-attachment">
                        <span className="chat-attachment-left">
                          <span className="chat-attachment-icon">
                            <Icons.Camera />
                          </span>
                          <span>Image attached</span>
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
                      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

                      <button
                        onClick={handleCameraClick}
                        className={`chat-camera-btn ${cameraNudge ? 'nudge' : ''}`}
                        aria-label="Upload photo"
                        type="button"
                      >
                        {cameraNudge && <div className={`chat-nudge-pill ${uiSans.className}`}>Try <b>Photo</b> check</div>}
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

                    <p className="chat-disclaimer">protocolLM may make mistakes. Verify critical decisions with official regulations.</p>
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
