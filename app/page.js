// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Public_Sans, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal' // ✅ using external PricingModal component

// ✅ “Gov + modern” typography (USWDS-adjacent)
const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
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
  Gear: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.4-2.4 1a8.6 8.6 0 0 0-1.3-.8l-.4-2.6H10.1l-.4 2.6c-.46.2-.9.46-1.3.8l-2.4-1-2 3.4 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.4 2.4-1c.4.34.84.6 1.3.8l.4 2.6h4.8l.4-2.6c.46-.2 0.9-.46 1.3-.8l2.4 1 2-3.4-2-1.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
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

/* ------------------------------------------
   Landing (NO demo chat) — “Clipboard extension”
------------------------------------------- */

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${publicSans.className} landing-root`}>
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
        <section className="landing-hero">
          <div className="landing-hero-left">
            <div className={`landing-kicker ${ibmMono.className}`}>
              Washtenaw County • Food safety compliance
            </div>

            <h1 className="landing-title">Compliance checks that feel like a clipboard.</h1>

            <p className="landing-subtitle">
              Take a photo or ask a question. protocolLM cross-checks against your local rules and returns clear, actionable fixes—without
              fluff.
            </p>

            <div className="landing-actions">
              <button className="btn-primary btn-lg" onClick={onShowPricing} type="button">
                Start 7-day trial
              </button>
              <button className="btn-ghost btn-lg" onClick={onShowAuth} type="button">
                Sign in
              </button>
            </div>

            <div className="landing-meta">
              <div className="meta-row">
                <span className="meta-dot" />
                <span>Built for daily station checks, manager walkthroughs, and training.</span>
              </div>
              <div className="meta-row">
                <span className="meta-dot" />
                <span>Designed to read like a report: problem → why it matters → what to do next.</span>
              </div>
              <div className="meta-row">
                <span className="meta-dot" />
                <span>Fastest path: use the camera button for a photo cross-check.</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-right" aria-hidden="false">
            <div className="sheet">
              <div className="sheet-top">
                <div className="sheet-title">Quick Check</div>
                <div className={`sheet-tag ${ibmMono.className}`}>
                  <span className="sheet-tag-icon">
                    <Icons.Camera />
                  </span>
                  Photo-first workflow
                </div>
              </div>

              <div className="sheet-section">
                <div className={`sheet-label ${ibmMono.className}`}>How it works</div>
                <ol className="sheet-steps">
                  <li>
                    <span className="step-bullet">1</span>
                    <span>Upload a photo of a station, sink, cooler, prep area, or chemical setup.</span>
                  </li>
                  <li>
                    <span className="step-bullet">2</span>
                    <span>Get likely issues in plain language with a fix list.</span>
                  </li>
                  <li>
                    <span className="step-bullet">3</span>
                    <span>Use the same screen for follow-ups and policy questions.</span>
                  </li>
                </ol>
              </div>

              <div className="sheet-divider" />

              <div className="sheet-section">
                <div className={`sheet-label ${ibmMono.className}`}>Typical photo checks</div>
                <div className="pill-grid">
                  <span className="pill">Hand sink access</span>
                  <span className="pill">Sanitizer setup</span>
                  <span className="pill">Date marking</span>
                  <span className="pill">Cold holding</span>
                  <span className="pill">Chemical labeling</span>
                  <span className="pill">Raw / ready storage</span>
                </div>
              </div>

              <div className="sheet-divider" />

              <div className="sheet-section">
                <div className={`sheet-label ${ibmMono.className}`}>Output style</div>
                <div className="sheet-lines">
                  <div className="sheet-line">
                    <span className="line-key">Finding</span>
                    <span className="line-val">What looks off</span>
                  </div>
                  <div className="sheet-line">
                    <span className="line-key">Why</span>
                    <span className="line-val">The risk in one sentence</span>
                  </div>
                  <div className="sheet-line">
                    <span className="line-key">Fix</span>
                    <span className="line-val">Concrete steps to correct</span>
                  </div>
                </div>
              </div>

              <div className="sheet-foot">
                <div className={`sheet-foot-note ${ibmMono.className}`}>
                  Start with a photo → faster answers, fewer back-and-forths.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-grid" aria-label="Key capabilities">
          <div className="card">
            <div className="card-head">
              <span className="card-ico" aria-hidden="true">
                <Icons.Camera />
              </span>
              <div className="card-title">Photo cross-check</div>
            </div>
            <div className="card-body">
              Upload a real kitchen photo and get a focused list of what to fix next—written for operators, not engineers.
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-ico" aria-hidden="true">
                <Icons.Check />
              </span>
              <div className="card-title">Clear, repeatable checks</div>
            </div>
            <div className="card-body">Use it like a daily clipboard: same stations, same expectations, consistent output.</div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-ico" aria-hidden="true">
                <Icons.Gear />
              </span>
              <div className="card-title">Policy Q&amp;A</div>
            </div>
            <div className="card-body">Ask quick questions during service. Keep the answer short, specific, and practical.</div>
          </div>
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
        <div className={`modal-card ${publicSans.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="modal-header">
            <div className={`modal-kicker ${ibmMono.className}`}>Account access</div>
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

  if (isLoading) {
    return (
      <div className={`loading-screen ${publicSans.className}`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
          </div>
          <div className={`loading-meta ${ibmMono.className}`}>
            {loadingStage === 'auth' ? 'AUTH' : loadingStage === 'subscription' ? 'SUBSCRIPTION' : 'READY'}
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
        </div>
      </div>
    )
  }

  const shouldNudgeCamera = messages.length === 0 && !selectedImage && !input && !isSending

  return (
    <>
      <style jsx global>{`
        :root {
          /* ✅ “Stainless steel” base */
          --bg-0: #f6f8fb; /* app background */
          --bg-1: #ffffff; /* paper */
          --bg-2: #eef2f7; /* field */
          --bg-3: #e3eaf3; /* dividers */

          --ink-0: #0b1220; /* primary text */
          --ink-1: #1f2a3a; /* strong secondary */
          --ink-2: #40536a; /* secondary */
          --ink-3: #6f8196; /* muted */

          /* ✅ Accent: set this to match your logo’s blue if needed */
          --accent: #0b5cab;
          --accent-hover: #094e92;
          --accent-dim: rgba(11, 92, 171, 0.12);

          --border-subtle: rgba(12, 22, 40, 0.12);
          --border-default: rgba(12, 22, 40, 0.18);

          --shadow-1: 0 1px 0 rgba(12, 22, 40, 0.04), 0 10px 24px rgba(12, 22, 40, 0.06);
          --shadow-2: 0 1px 0 rgba(12, 22, 40, 0.05), 0 18px 44px rgba(12, 22, 40, 0.08);

          --radius-sm: 10px;
          --radius-md: 14px;
          --radius-lg: 18px;
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
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(12, 22, 40, 0.14);
          border-radius: var(--radius-full);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(12, 22, 40, 0.2);
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

        .loading-meta {
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--ink-3);
          user-select: none;
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
          width: 160px;
          height: 2px;
          background: rgba(12, 22, 40, 0.12);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .loading-bar-fill {
          height: 100%;
          width: 30%;
          background: var(--accent);
          animation: loading-slide 1.05s ease-in-out infinite;
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
          opacity: 0.82;
        }

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
          font-weight: 700;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        /* Buttons */
        .btn-primary {
          height: 36px;
          padding: 0 14px;
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(0, 0, 0, 0);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
          font-family: inherit;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06), 0 10px 20px rgba(11, 92, 171, 0.14);
        }

        .btn-primary:active {
          transform: translateY(1px);
        }

        .btn-ghost {
          height: 36px;
          padding: 0 12px;
          background: transparent;
          color: var(--ink-2);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          font-family: inherit;
        }

        .btn-ghost:hover {
          background: rgba(12, 22, 40, 0.04);
          color: var(--ink-0);
          border-color: rgba(12, 22, 40, 0.08);
        }

        .btn-primary.btn-lg,
        .btn-ghost.btn-lg {
          height: 44px;
          padding: 0 16px;
          font-size: 14px;
        }

        /* Footer */
        .plm-footer-links {
          position: absolute;
          bottom: max(18px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 14px;
          z-index: 10;
        }

        .plm-footer-link {
          color: var(--ink-3);
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover {
          color: var(--ink-1);
        }
        .plm-footer-sep {
          color: rgba(12, 22, 40, 0.22);
        }

        /* Landing */
        .landing-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-0);
          overflow: hidden;
        }

        .landing-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(16px, env(safe-area-inset-top)) max(22px, env(safe-area-inset-right)) 12px
            max(22px, env(safe-area-inset-left));
          background: rgba(246, 248, 251, 0.86);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(12, 22, 40, 0.08);
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .landing-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 28px 22px 96px;
        }

        .landing-hero {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          align-items: start;
          padding-top: 10px;
        }

        .landing-kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-3);
          padding: 8px 10px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(12, 22, 40, 0.12);
          background: rgba(255, 255, 255, 0.62);
          width: fit-content;
        }

        .landing-title {
          margin: 16px 0 10px;
          font-size: 46px;
          line-height: 1.06;
          letter-spacing: -0.04em;
          color: var(--ink-0);
          font-weight: 800;
        }

        .landing-subtitle {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          color: var(--ink-2);
          max-width: 56ch;
        }

        .landing-actions {
          margin-top: 18px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .landing-meta {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(12, 22, 40, 0.10);
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 70ch;
        }

        .meta-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: var(--ink-2);
          font-size: 14px;
          line-height: 1.55;
        }

        .meta-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(12, 22, 40, 0.22);
          margin-top: 7px;
          flex-shrink: 0;
        }

        .sheet {
          background: var(--bg-1);
          border: 1px solid rgba(12, 22, 40, 0.14);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-2);
          overflow: hidden;
        }

        .sheet-top {
          padding: 16px 16px 12px;
          border-bottom: 1px solid rgba(12, 22, 40, 0.10);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: rgba(255, 255, 255, 0.92);
        }

        .sheet-title {
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink-0);
          font-size: 16px;
        }

        .sheet-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid rgba(11, 92, 171, 0.22);
          padding: 8px 10px;
          border-radius: var(--radius-full);
          white-space: nowrap;
        }

        .sheet-tag-icon {
          display: inline-flex;
        }

        .sheet-section {
          padding: 14px 16px;
        }

        .sheet-label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 10px;
        }

        .sheet-steps {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: var(--ink-2);
          font-size: 14px;
          line-height: 1.55;
        }

        .sheet-steps li {
          display: grid;
          grid-template-columns: 26px 1fr;
          gap: 10px;
          align-items: start;
        }

        .step-bullet {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(12, 22, 40, 0.06);
          border: 1px solid rgba(12, 22, 40, 0.12);
          font-weight: 800;
          color: var(--ink-1);
          font-size: 12px;
        }

        .sheet-divider {
          height: 1px;
          background: rgba(12, 22, 40, 0.10);
        }

        .pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          padding: 8px 10px;
          border-radius: var(--radius-full);
          background: rgba(12, 22, 40, 0.04);
          border: 1px solid rgba(12, 22, 40, 0.10);
          color: var(--ink-2);
          font-size: 13px;
          line-height: 1;
          white-space: nowrap;
        }

        .sheet-lines {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sheet-line {
          display: grid;
          grid-template-columns: 76px 1fr;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid rgba(12, 22, 40, 0.10);
          background: rgba(246, 248, 251, 0.7);
        }

        .line-key {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
          font-weight: 700;
        }

        .line-val {
          color: var(--ink-2);
          font-size: 13px;
        }

        .sheet-foot {
          padding: 14px 16px 16px;
          background: rgba(246, 248, 251, 0.62);
          border-top: 1px solid rgba(12, 22, 40, 0.10);
        }

        .sheet-foot-note {
          font-size: 11px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        .landing-grid {
          width: 100%;
          max-width: 1080px;
          margin: 22px auto 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .card {
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(12, 22, 40, 0.12);
          border-radius: var(--radius-lg);
          padding: 16px;
          box-shadow: var(--shadow-1);
          transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
        }

        .card:hover {
          transform: translateY(-1px);
          border-color: rgba(12, 22, 40, 0.18);
          background: rgba(255, 255, 255, 0.9);
        }

        .card-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .card-ico {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: rgba(11, 92, 171, 0.10);
          border: 1px solid rgba(11, 92, 171, 0.20);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-title {
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink-0);
        }

        .card-body {
          color: var(--ink-2);
          font-size: 14px;
          line-height: 1.55;
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(8, 12, 18, 0.62);
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
          animation: modal-up 0.18s ease;
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
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-lg);
          padding: 26px;
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.35);
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
          border: 1px solid rgba(12, 22, 40, 0.12);
          color: var(--ink-2);
          cursor: pointer;
          border-radius: 12px;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .modal-close:hover {
          color: var(--ink-0);
          background: rgba(12, 22, 40, 0.04);
          border-color: rgba(12, 22, 40, 0.18);
        }

        .modal-header {
          margin-bottom: 18px;
        }

        .modal-kicker {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 6px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 800;
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
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          background: var(--bg-2);
          border: 1px solid rgba(12, 22, 40, 0.14);
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-input::placeholder {
          color: rgba(64, 83, 106, 0.65);
        }

        .form-input:focus {
          border-color: rgba(11, 92, 171, 0.45);
          box-shadow: 0 0 0 4px rgba(11, 92, 171, 0.10);
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
          letter-spacing: 0.12em;
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
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 800;
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
          border: 2px solid rgba(255, 255, 255, 0.35);
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
          background: rgba(12, 22, 40, 0.04);
          border: 1px solid rgba(12, 22, 40, 0.10);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--ink-2);
          text-align: center;
          margin-top: 14px;
        }

        .modal-message.ok {
          color: #15803d;
          border-color: rgba(21, 128, 61, 0.22);
          background: rgba(21, 128, 61, 0.06);
        }
        .modal-message.err {
          color: #b91c1c;
          border-color: rgba(185, 28, 28, 0.22);
          background: rgba(185, 28, 28, 0.06);
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
          color: var(--ink-1);
          cursor: pointer;
          font-family: inherit;
          opacity: 0.9;
          font-weight: 700;
        }

        .modal-link:hover {
          opacity: 1;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* Turnstile badge line */
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
          color: rgba(64, 83, 106, 0.75) !important;
        }

        /* Pricing feature rows (spacing between ✓ and text) */
        .pricing-feature {
          display: grid;
          grid-template-columns: 16px 1fr;
          column-gap: 10px;
          align-items: start;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.96;
          color: var(--ink-2);
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
          font-family: inherit;
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
          padding: 12px 22px;
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
          gap: 8px;
        }

        /* Settings gear dropdown */
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
          background: rgba(255, 255, 255, 0.64);
          border: 1px solid rgba(12, 22, 40, 0.12);
          border-radius: 14px;
          color: var(--ink-2);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
        }

        .chat-settings-btn:hover {
          color: var(--ink-0);
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(12, 22, 40, 0.16);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          background: var(--bg-1);
          border: 1px solid rgba(12, 22, 40, 0.14);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: var(--shadow-2);
          animation: dropdown-in 0.14s ease;
          z-index: 50;
        }

        @keyframes dropdown-in {
          from {
            opacity: 0;
            transform: translateY(6px);
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
          border-radius: 12px;
          color: var(--ink-0);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .chat-settings-item:hover {
          background: rgba(12, 22, 40, 0.04);
          border-color: rgba(12, 22, 40, 0.10);
        }

        .chat-settings-sep {
          height: 1px;
          background: rgba(12, 22, 40, 0.10);
          margin: 6px 2px;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 22px 18px;
          background: var(--bg-0);
        }

        .chat-sheet {
          max-width: 980px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(12, 22, 40, 0.12);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-1);
          min-height: calc(100% - 4px);
          padding: 16px 16px;
        }

        .chat-messages.empty .chat-sheet {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty-state {
          width: 100%;
          max-width: 720px;
          text-align: left;
          padding: 6px 4px;
        }

        .chat-empty-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3);
          padding: 8px 10px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(12, 22, 40, 0.12);
          background: rgba(255, 255, 255, 0.7);
          width: fit-content;
          margin-bottom: 10px;
        }

        .chat-empty-title {
          margin: 0 0 6px;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--ink-0);
        }

        .chat-empty-text {
          font-size: 14px;
          color: var(--ink-2);
          line-height: 1.6;
          margin: 0;
          max-width: 66ch;
        }

        .chat-empty-hint {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(12, 22, 40, 0.10);
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          color: var(--ink-2);
          font-size: 13px;
          line-height: 1.55;
        }

        .hint-row {
          display: grid;
          grid-template-columns: 20px 1fr;
          gap: 10px;
          align-items: start;
        }

        .hint-ico {
          width: 20px;
          height: 20px;
          border-radius: 8px;
          background: rgba(11, 92, 171, 0.10);
          border: 1px solid rgba(11, 92, 171, 0.18);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        .chat-history {
          max-width: 860px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 26px;
          padding-top: 6px;
          padding-bottom: 6px;
        }

        .chat-message {
          display: flex;
          width: 100%;
          align-items: flex-start;
        }
        .chat-message-user {
          justify-content: flex-end;
        }
        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 78%;
          font-size: 15px;
          line-height: 1.75;
          display: block;
        }

        /* Minimal “report text” bubbles: no fills, just alignment + tone */
        .chat-bubble-user {
          color: var(--ink-0);
          font-weight: 650;
        }
        .chat-bubble-assistant {
          color: var(--ink-2);
          font-weight: 550;
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 12px;
          display: inline-block;
          border: 1px solid rgba(12, 22, 40, 0.12);
          background: rgba(255, 255, 255, 0.8);
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 280px;
          object-fit: contain;
        }

        .chat-content {
          display: block;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .chat-thinking {
          display: block;
          color: var(--ink-3);
          font-style: italic;
        }

        .chat-input-area {
          flex-shrink: 0;
          border-top: 1px solid rgba(12, 22, 40, 0.10);
          background: rgba(246, 248, 251, 0.82);
          backdrop-filter: blur(8px);
        }

        .chat-input-inner {
          max-width: 980px;
          margin: 0 auto;
          padding: 12px 22px 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(12, 22, 40, 0.12);
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
          font-size: 12px;
          color: var(--ink-2);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
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
          background: transparent;
          border: none;
          color: var(--ink-3);
          cursor: pointer;
          border-radius: 10px;
        }

        .chat-attachment-remove:hover {
          color: var(--ink-0);
          background: rgba(12, 22, 40, 0.04);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        /* Camera button: subtle “invitation” when empty (no new buttons) */
        .chat-camera-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(11, 92, 171, 0.26);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background 0.15s ease;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
          position: relative;
        }

        .chat-camera-btn:hover {
          border-color: rgba(11, 92, 171, 0.42);
          box-shadow: 0 0 0 4px rgba(11, 92, 171, 0.10), 0 1px 0 rgba(0, 0, 0, 0.03);
          background: rgba(255, 255, 255, 0.92);
        }

        .chat-camera-btn.nudge {
          animation: camera-nudge 1.9s ease-in-out infinite;
        }

        @keyframes camera-nudge {
          0%,
          100% {
            transform: translateY(0);
            box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
          }
          50% {
            transform: translateY(-1px);
            box-shadow: 0 0 0 6px rgba(11, 92, 171, 0.08), 0 1px 0 rgba(0, 0, 0, 0.03);
          }
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(12, 22, 40, 0.14);
          border-radius: var(--radius-md);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          min-width: 0;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
        }

        .chat-input-wrapper:focus-within {
          border-color: rgba(11, 92, 171, 0.40);
          box-shadow: 0 0 0 4px rgba(11, 92, 171, 0.10), 0 1px 0 rgba(0, 0, 0, 0.03);
          background: rgba(255, 255, 255, 0.92);
        }

        .chat-textarea {
          flex: 1;
          min-height: 48px;
          max-height: 160px;
          padding: 14px 14px;
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
          color: rgba(64, 83, 106, 0.62);
        }
        .chat-textarea:focus {
          outline: none;
        }

        .chat-send-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(64, 83, 106, 0.85);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s ease, transform 0.12s ease;
        }

        .chat-send-btn:hover:not(:disabled) {
          color: var(--accent);
        }
        .chat-send-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .chat-send-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(12, 22, 40, 0.18);
          border-top-color: var(--accent);
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: rgba(64, 83, 106, 0.72);
          margin-top: 10px;
        }

        /* Responsive */
        @media (max-width: 960px) {
          .landing-hero {
            grid-template-columns: 1fr;
          }
          .landing-title {
            font-size: 40px;
          }
          .landing-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .landing-main {
            padding: 18px 16px 96px;
          }

          .landing-title {
            font-size: 34px;
          }

          .plm-brand-mark {
            width: 58px;
            height: 58px;
          }
          .plm-brand-text {
            font-size: 18px;
          }

          .chat-topbar {
            padding: 10px 16px;
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
            padding-top: max(10px, env(safe-area-inset-top));
          }

          .chat-messages {
            padding: 0 16px 14px;
          }

          .chat-sheet {
            padding: 14px 12px;
          }

          .chat-input-inner {
            padding: 10px 16px 14px;
            padding-bottom: max(14px, env(safe-area-inset-bottom));
          }

          .chat-bubble {
            max-width: 88%;
          }
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 22px 18px;
          }

          .plm-brand-mark {
            width: 54px;
            height: 54px;
          }
          .plm-brand-text {
            font-size: 17px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          .chat-camera-btn.nudge {
            animation: none !important;
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
            <div className={`${publicSans.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions" aria-label="Chat actions">
                  {session && subscription && (
                    <div
                      className={ibmMono.className}
                      style={{
                        marginRight: '2px',
                        padding: '8px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '800',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        background: subscription.status === 'trialing' ? 'rgba(11, 92, 171, 0.10)' : 'rgba(21, 128, 61, 0.10)',
                        color: subscription.status === 'trialing' ? 'var(--accent)' : '#15803d',
                        border: `1px solid ${
                          subscription.status === 'trialing' ? 'rgba(11, 92, 171, 0.22)' : 'rgba(21, 128, 61, 0.22)'
                        }`,
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
                          {hasActiveSubscription ? 'Manage billing' : 'Start trial'}
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

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}
              >
                <div className="chat-sheet">
                  {messages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className={`chat-empty-eyebrow ${ibmMono.className}`}>
                        <span style={{ display: 'inline-flex' }}>
                          <Icons.Sparkle />
                        </span>
                        Ready for a check
                      </div>
                      <h2 className="chat-empty-title">Start with a photo, or ask a question.</h2>
                      <p className="chat-empty-text">
                        The camera button is the fastest way to use protocolLM. Upload a clear photo of the station and you’ll get a concise
                        fix list.
                      </p>

                      <div className="chat-empty-hint">
                        <div className="hint-row">
                          <span className="hint-ico" aria-hidden="true">
                            <Icons.Camera />
                          </span>
                          <span>
                            <strong style={{ color: 'var(--ink-0)' }}>Photo cross-check:</strong> closer + well-lit beats wide shots.
                          </span>
                        </div>
                        <div className="hint-row">
                          <span className="hint-ico" aria-hidden="true">
                            <Icons.Check />
                          </span>
                          <span>
                            <strong style={{ color: 'var(--ink-0)' }}>Q&amp;A:</strong> ask one station question at a time for the cleanest output.
                          </span>
                        </div>
                      </div>
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
                      className={`chat-camera-btn ${shouldNudgeCamera ? 'nudge' : ''}`}
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
