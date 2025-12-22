// app/page.js
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal' // ✅ using external PricingModal component

const ibmSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
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
        d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.4-2.4 1a8.6 8.6 0 0 0-1.3-.8l-.4-2.6H10.1l-.4 2.6c-.46.2-.9.46-1.3.8l-2.4-1-2 3.4 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.4 2.4-1c.4.34.84.6 1.3.8l.4 2.6h4.8l.4-2.6c.46-.2.9-.46 1.3-.8l2.4 1 2-3.4-2-1.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Document: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h8M8 17h8M8 9h5" strokeLinecap="round" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
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
    <div className={`${ibmSans.className} landing-root`} aria-label="protocolLM landing">
      <header className="landing-topbar">
        <div className="plm-brand-wrap">
          <BrandLink variant="landing" />
        </div>

        <nav className="landing-top-actions" aria-label="Top actions">
          <button onClick={onShowAuth} className="btn-nav" type="button">
            Sign in
          </button>
          <button onClick={onShowPricing} className="btn-primary" type="button">
            Start trial
          </button>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-grid">
            <div className="landing-left">
              <div className={`kicker ${ibmMono.className}`}>
                Washtenaw County • Food Safety • Compliance Assistant
              </div>

              <h1 className="landing-h1">Photo cross-checks, backed by local rules.</h1>

              <p className="landing-subhead">
                Take a picture. Get a direct, regulation-grounded checklist of what’s wrong and what to do next — written
                like an inspector, delivered like a clipboard.
              </p>

              <div className="landing-callouts">
                <div className="callout">
                  <span className="callout-ic">
                    <Icons.Camera />
                  </span>
                  <div className="callout-body">
                    <div className="callout-title">Fastest path: photo</div>
                    <div className="callout-text">Attach a kitchen photo for the quickest, most concrete guidance.</div>
                  </div>
                </div>

                <div className="callout">
                  <span className="callout-ic">
                    <Icons.Document />
                  </span>
                  <div className="callout-body">
                    <div className="callout-title">Grounded answers</div>
                    <div className="callout-text">Designed around county documentation and standard food code practice.</div>
                  </div>
                </div>

                <div className="callout">
                  <span className="callout-ic">
                    <Icons.Check />
                  </span>
                  <div className="callout-body">
                    <div className="callout-title">Corrective action first</div>
                    <div className="callout-text">Minimal fluff: “this is the issue → this is the fix.”</div>
                  </div>
                </div>
              </div>

              <div className="landing-meta">
                <div className={`meta-row ${ibmMono.className}`}>
                  Prepared to scale across <span className="meta-strong">1,166</span> Washtenaw establishments.
                </div>
                <div className={`meta-row ${ibmMono.className}`}>
                  Built for operators, managers, and line staff — quick checks during real service.
                </div>
              </div>

              <div className="landing-actions">
                <button onClick={onShowPricing} className="btn-primary btn-primary-lg" type="button">
                  Start trial
                </button>
                <button onClick={onShowAuth} className="btn-secondary btn-secondary-lg" type="button">
                  Sign in
                </button>
              </div>
            </div>

            <div className="landing-right" aria-label="Example output preview">
              <div className="clipboard">
                <div className="clipboard-clip" aria-hidden="true" />
                <div className={`clipboard-head ${ibmMono.className}`}>
                  <span className="chip">PHOTO CHECK</span>
                  <span className="chip subtle">WASHTENAW</span>
                </div>

                <div className="clipboard-body">
                  <div className="spec">
                    <div className={`spec-k ${ibmMono.className}`}>Area</div>
                    <div className="spec-v">Cold holding / prep</div>
                    <div className={`spec-k ${ibmMono.className}`}>Finding</div>
                    <div className="spec-v">High-risk condition detected in the image context.</div>
                    <div className={`spec-k ${ibmMono.className}`}>Corrective action</div>
                    <div className="spec-v">Immediate, step-by-step fix with a re-check path.</div>
                  </div>

                  <div className="divider" />

                  <div className="mini-table" role="table" aria-label="Checklist preview">
                    <div className={`mini-th ${ibmMono.className}`}>Checklist</div>
                    <div className="mini-row">
                      <span className="dot" aria-hidden="true" />
                      <span>Identify the specific item(s) / surface(s) in frame</span>
                    </div>
                    <div className="mini-row">
                      <span className="dot" aria-hidden="true" />
                      <span>State the requirement in plain, operator language</span>
                    </div>
                    <div className="mini-row">
                      <span className="dot" aria-hidden="true" />
                      <span>Give a corrective action + “verify” step</span>
                    </div>
                  </div>

                  <div className={`clipboard-foot ${ibmMono.className}`}>
                    Tip: photo checks work best on close, well-lit shots (one problem per photo).
                  </div>
                </div>
              </div>

              <div className={`landing-smallprint ${ibmMono.className}`}>
                No scare tactics. Just clear findings and clean fixes.
              </div>
            </div>
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
        <div className={`modal-card ${ibmSans.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <div className="modal-header">
            <h2 className={`modal-title ${ibmMono.className}`}>
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
      <div className={`loading-screen ${ibmSans.className}`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
          <div className={`loading-caption ${ibmMono.className}`}>
            {loadingStage === 'auth' ? 'AUTH' : loadingStage === 'subscription' ? 'LICENSE' : 'READY'}
          </div>
        </div>
      </div>
    )
  }

  const nudgeCamera = isAuthenticated && messages.length === 0 && !selectedImage

  return (
    <>
      <style jsx global>{`
        :root {
          /* Base (light stainless) */
          --bg-0: #f6f7f9;
          --bg-1: #ffffff;
          --bg-2: #f1f3f6;
          --bg-3: #e8ecf2;

          --ink-0: #0b1220;
          --ink-1: #1c2a3a;
          --ink-2: #4b5b70;
          --ink-3: #7a889b;

          /* Accent (clean government blue) */
          --accent: #0b4aa2;
          --accent-hover: #083b82;
          --accent-dim: rgba(11, 74, 162, 0.12);

          /* Borders / chrome */
          --border-subtle: rgba(11, 18, 32, 0.10);
          --border-default: rgba(11, 18, 32, 0.14);

          --shadow-1: 0 10px 30px rgba(11, 18, 32, 0.08);
          --shadow-2: 0 18px 60px rgba(11, 18, 32, 0.12);

          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-full: 9999px;
        }

        html,
        body {
          height: 100%;
          margin: 0;
          background: var(--bg-0);
          background-color: var(--bg-0);
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior-y: none;
        }

        /* Subtle, non-gradient identity pattern (SVG) */
        html[data-view='landing'] body {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Cg fill='none' stroke='%230b1220' stroke-opacity='0.06'%3E%3Cpath d='M0 16H64M0 32H64M0 48H64'/%3E%3Cpath d='M16 0V64M32 0V64M48 0V64'/%3E%3C/g%3E%3C/svg%3E");
          background-size: 64px 64px;
        }

        html[data-view='chat'] body {
          background-image: none;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
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
          filter: saturate(1.05);
        }

        .loading-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .loading-bar {
          width: 120px;
          height: 2px;
          background: rgba(11, 18, 32, 0.14);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .loading-bar-fill {
          height: 100%;
          width: 30%;
          background: var(--accent);
          animation: loading-slide 1s ease-in-out infinite;
        }

        .loading-caption {
          font-size: 11px;
          letter-spacing: 0.18em;
          color: var(--ink-3);
          text-transform: uppercase;
          user-select: none;
        }

        @keyframes loading-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        /* App */
        .app-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: transparent;
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
          font-weight: 600;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        /* Buttons */
        .btn-nav {
          height: 38px;
          padding: 0 12px;
          background: transparent;
          color: var(--ink-2);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
          font-family: inherit;
        }

        .btn-nav:hover {
          color: var(--ink-0);
          background: rgba(11, 18, 32, 0.03);
          border-color: rgba(11, 18, 32, 0.06);
        }

        .btn-primary {
          height: 38px;
          padding: 0 14px;
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
          font-family: inherit;
          box-shadow: 0 8px 20px rgba(11, 74, 162, 0.18);
        }

        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-secondary {
          height: 38px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.85);
          color: var(--ink-0);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
          font-family: inherit;
        }

        .btn-secondary:hover {
          background: #fff;
          border-color: rgba(11, 18, 32, 0.2);
          transform: translateY(-1px);
        }

        .btn-primary-lg,
        .btn-secondary-lg {
          height: 44px;
          font-size: 14px;
          padding: 0 16px;
        }

        /* Landing */
        .landing-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: transparent;
        }

        .landing-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(16px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) 14px
            max(24px, env(safe-area-inset-left));
          background: rgba(246, 247, 249, 0.86);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(11, 18, 32, 0.08);
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .landing-main {
          flex: 1;
          display: flex;
          align-items: stretch;
        }

        .landing-hero {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 24px 96px;
        }

        .landing-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 22px;
          align-items: start;
        }

        .kicker {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
          padding: 10px 12px;
          border: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(255, 255, 255, 0.75);
          border-radius: var(--radius-full);
          width: fit-content;
        }

        .landing-h1 {
          margin: 16px 0 0;
          font-size: 44px;
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 700;
          color: var(--ink-0);
        }

        .landing-subhead {
          margin: 14px 0 0;
          font-size: 16px;
          line-height: 1.65;
          color: var(--ink-2);
          max-width: 56ch;
        }

        .landing-callouts {
          margin-top: 22px;
          display: grid;
          gap: 10px;
        }

        .callout {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px 14px;
          border: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(255, 255, 255, 0.9);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-1);
        }

        .callout-ic {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid rgba(11, 18, 32, 0.12);
          color: var(--accent);
          background: rgba(11, 74, 162, 0.06);
          flex-shrink: 0;
        }

        .callout-title {
          font-weight: 700;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.3;
        }

        .callout-text {
          margin-top: 4px;
          color: var(--ink-2);
          font-size: 13px;
          line-height: 1.5;
        }

        .landing-meta {
          margin-top: 16px;
          display: grid;
          gap: 6px;
        }

        .meta-row {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        .meta-strong {
          color: var(--ink-0);
          font-weight: 700;
        }

        .landing-actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .landing-right {
          position: sticky;
          top: 88px;
        }

        .clipboard {
          border: 1px solid rgba(11, 18, 32, 0.14);
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.96);
          box-shadow: var(--shadow-2);
          overflow: hidden;
        }

        .clipboard-clip {
          height: 10px;
          background: rgba(11, 18, 32, 0.10);
        }

        .clipboard-head {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(11, 18, 32, 0.10);
        }

        .chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          padding: 7px 10px;
          border-radius: var(--radius-full);
          background: rgba(11, 74, 162, 0.10);
          color: var(--accent);
          border: 1px solid rgba(11, 74, 162, 0.18);
          font-weight: 700;
        }

        .chip.subtle {
          background: rgba(11, 18, 32, 0.06);
          color: var(--ink-2);
          border-color: rgba(11, 18, 32, 0.12);
        }

        .clipboard-body {
          padding: 14px;
        }

        .spec {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: 10px 12px;
          align-items: start;
        }

        .spec-k {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
          padding-top: 3px;
        }

        .spec-v {
          color: var(--ink-1);
          font-size: 13px;
          line-height: 1.5;
        }

        .divider {
          height: 1px;
          background: rgba(11, 18, 32, 0.10);
          margin: 14px 0;
        }

        .mini-th {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 10px;
        }

        .mini-row {
          display: grid;
          grid-template-columns: 10px 1fr;
          gap: 10px;
          align-items: start;
          padding: 8px 0;
          border-top: 1px dashed rgba(11, 18, 32, 0.10);
          color: var(--ink-2);
          font-size: 13px;
          line-height: 1.5;
        }

        .mini-row:first-of-type {
          border-top: none;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(11, 74, 162, 0.28);
          margin-top: 5px;
        }

        .clipboard-foot {
          margin-top: 12px;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-3);
          border-top: 1px solid rgba(11, 18, 32, 0.10);
          padding-top: 12px;
        }

        .landing-smallprint {
          margin-top: 10px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-3);
          text-align: right;
        }

        /* Footer links */
        .plm-footer-links {
          position: fixed;
          bottom: max(16px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
          background: rgba(246, 247, 249, 0.72);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(11, 18, 32, 0.08);
          padding: 10px 12px;
          border-radius: var(--radius-full);
        }

        .plm-footer-link {
          color: var(--ink-2);
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover {
          color: var(--ink-0);
        }
        .plm-footer-sep {
          color: rgba(11, 18, 32, 0.26);
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
          background: #fff;
          border: 1px solid rgba(11, 18, 32, 0.16);
          border-radius: var(--radius-lg);
          padding: 26px;
          box-shadow: var(--shadow-2);
          color: var(--ink-0);
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
          border: 1px solid transparent;
          color: var(--ink-2);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .modal-close:hover {
          color: var(--ink-0);
          background: rgba(11, 18, 32, 0.04);
          border-color: rgba(11, 18, 32, 0.10);
        }

        .modal-header {
          margin-bottom: 18px;
        }

        .modal-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: var(--ink-0);
          letter-spacing: 0.08em;
          text-transform: uppercase;
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
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          background: rgba(241, 243, 246, 0.9);
          border: 1px solid rgba(11, 18, 32, 0.16);
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-input::placeholder {
          color: rgba(11, 18, 32, 0.42);
        }
        .form-input:focus {
          border-color: rgba(11, 74, 162, 0.55);
          box-shadow: 0 0 0 4px rgba(11, 74, 162, 0.10);
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
          font-weight: 700;
          letter-spacing: 0.16em;
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
          border: 1px solid rgba(0, 0, 0, 0.08);
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
          border: 2px solid rgba(255, 255, 255, 0.34);
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
          background: rgba(241, 243, 246, 0.9);
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--ink-2);
          text-align: center;
          margin-top: 14px;
        }

        .modal-message.ok {
          color: #0f766e;
          border-color: rgba(15, 118, 110, 0.22);
          background: rgba(15, 118, 110, 0.06);
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
          color: var(--ink-1);
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .modal-link:hover {
          color: var(--ink-0);
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
          color: rgba(11, 18, 32, 0.58) !important;
        }

        /* ✅ Pricing feature rows (FIX spacing between ✓ and text) */
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
          height: 100dvh;
          overflow: hidden;
          background: var(--bg-0);
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root {
            height: -webkit-fill-available;
          }
        }

        .chat-shell {
          max-width: 980px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
        }

        .chat-topbar {
          width: 100%;
          padding: 14px 24px;
          padding-left: max(24px, env(safe-area-inset-left));
          padding-right: max(24px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(11, 18, 32, 0.08);
          background: rgba(246, 247, 249, 0.88);
          backdrop-filter: blur(8px);
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ✅ Settings gear dropdown */
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
          border-radius: var(--radius-sm);
          color: var(--ink-2);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .chat-settings-btn:hover {
          color: var(--ink-0);
          background: #fff;
          border-color: rgba(11, 18, 32, 0.18);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: #fff;
          border: 1px solid rgba(11, 18, 32, 0.16);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: var(--shadow-2);
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
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .chat-settings-item:hover {
          background: rgba(11, 18, 32, 0.04);
          border-color: rgba(11, 18, 32, 0.08);
        }

        .chat-settings-sep {
          height: 1px;
          background: rgba(11, 18, 32, 0.10);
          margin: 6px 2px;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 24px 22px;
          background: transparent;
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty-state {
          width: 100%;
          max-width: 780px;
          border: 1px solid rgba(11, 18, 32, 0.10);
          background: rgba(255, 255, 255, 0.86);
          border-radius: var(--radius-lg);
          padding: 20px 18px;
          box-shadow: var(--shadow-1);
        }

        .chat-empty-title {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin: 0 0 10px;
        }

        .chat-empty-text {
          font-size: 14px;
          color: var(--ink-2);
          line-height: 1.6;
          margin: 0;
        }

        .chat-history {
          max-width: 780px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding-top: 16px;
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
          max-width: 76%;
          font-size: 15px;
          line-height: 1.75;
          display: block;
        }

        /* No bubble fills. Just ink. */
        .chat-bubble-user {
          color: var(--ink-0);
        }
        .chat-bubble-assistant {
          color: var(--ink-2);
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 12px;
          display: inline-block;
          border: 1px solid rgba(11, 18, 32, 0.14);
          background: rgba(241, 243, 246, 0.9);
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
          border-top: 1px solid rgba(11, 18, 32, 0.08);
          background: rgba(246, 247, 249, 0.92);
          backdrop-filter: blur(8px);
        }

        .chat-input-inner {
          max-width: 780px;
          margin: 0 auto;
          padding: 14px 24px 22px;
          padding-bottom: max(22px, env(safe-area-inset-bottom));
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(11, 18, 32, 0.12);
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
          font-size: 12px;
          color: var(--ink-2);
        }

        .chat-attachment-icon {
          color: var(--accent);
          display: flex;
        }

        .chat-attachment-remove {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-3);
          cursor: pointer;
        }

        .chat-attachment-remove:hover {
          color: var(--ink-0);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        /* Camera button: stainless, with a subtle “nudge” only when chat is empty */
        .chat-camera-btn {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(11, 18, 32, 0.16);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background 0.15s ease;
          box-shadow: 0 10px 18px rgba(11, 18, 32, 0.06);
        }

        .chat-camera-btn:hover {
          border-color: rgba(11, 74, 162, 0.35);
          box-shadow: 0 0 0 4px rgba(11, 74, 162, 0.10), 0 12px 22px rgba(11, 18, 32, 0.08);
          transform: translateY(-1px);
          background: #fff;
        }

        .chat-camera-btn.nudge {
          border-color: rgba(11, 74, 162, 0.35);
          animation: camera-breathe 2.4s ease-in-out infinite;
        }

        @keyframes camera-breathe {
          0%,
          100% {
            box-shadow: 0 10px 18px rgba(11, 18, 32, 0.06);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(11, 74, 162, 0.10), 0 14px 26px rgba(11, 18, 32, 0.08);
          }
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(11, 18, 32, 0.16);
          border-radius: var(--radius-md);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          min-width: 0;
          box-shadow: 0 10px 18px rgba(11, 18, 32, 0.06);
        }

        .chat-input-wrapper:focus-within {
          border-color: rgba(11, 74, 162, 0.40);
          box-shadow: 0 0 0 4px rgba(11, 74, 162, 0.10), 0 12px 22px rgba(11, 18, 32, 0.08);
          background: #fff;
        }

        .chat-textarea {
          flex: 1;
          min-height: 46px;
          max-height: 160px;
          padding: 13px 14px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: rgba(11, 18, 32, 0.42);
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
          color: rgba(11, 18, 32, 0.44);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .chat-send-btn:hover:not(:disabled) {
          color: var(--accent);
        }
        .chat-send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(11, 18, 32, 0.20);
          border-top-color: var(--accent);
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        .chat-hints {
          margin-top: 10px;
          display: flex;
          justify-content: flex-start;
        }

        .chat-hint-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          color: var(--ink-2);
          font-size: 12px;
          line-height: 1.4;
        }

        .chat-hint-link:hover {
          color: var(--ink-0);
        }

        .chat-hint-ic {
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid rgba(11, 18, 32, 0.12);
          color: var(--accent);
          background: rgba(11, 74, 162, 0.06);
          flex-shrink: 0;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: rgba(11, 18, 32, 0.52);
          margin-top: 14px;
        }

        /* Responsive */
        @media (max-width: 920px) {
          .landing-grid {
            grid-template-columns: 1fr;
          }
          .landing-right {
            position: relative;
            top: 0;
          }
          .landing-smallprint {
            text-align: left;
          }
        }

        @media (max-width: 768px) {
          .landing-topbar {
            padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px
              max(16px, env(safe-area-inset-left));
          }

          .landing-hero {
            padding: 20px 16px 110px;
          }

          .landing-h1 {
            font-size: 34px;
          }

          .plm-brand-mark {
            width: 60px;
            height: 60px;
          }
          .plm-brand-text {
            font-size: 18px;
          }

          .chat-topbar {
            padding: 12px 16px;
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
            padding-top: max(12px, env(safe-area-inset-top));
          }

          .chat-messages {
            padding: 0 16px 18px;
          }

          .chat-input-inner {
            padding: 12px 16px 18px;
            padding-bottom: max(18px, env(safe-area-inset-bottom));
          }

          .chat-bubble {
            max-width: 88%;
          }

          .plm-footer-links {
            left: 16px;
            transform: none;
          }
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 22px 18px;
          }

          .plm-brand-mark {
            width: 55px;
            height: 55px;
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
            <div className={`${ibmSans.className} chat-root`}>
              <div className="chat-shell">
                <header className="chat-topbar">
                  <BrandLink variant="chat" />

                  <nav className="chat-top-actions" aria-label="Chat actions">
                    {session && subscription && (
                      <div
                        className={ibmMono.className}
                        style={{
                          marginRight: '10px',
                          padding: '7px 10px',
                          borderRadius: '999px',
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          background:
                            subscription.status === 'trialing' ? 'rgba(11, 74, 162, 0.10)' : 'rgba(15, 118, 110, 0.08)',
                          color: subscription.status === 'trialing' ? '#0b4aa2' : '#0f766e',
                          border: `1px solid ${
                            subscription.status === 'trialing' ? 'rgba(11, 74, 162, 0.18)' : 'rgba(15, 118, 110, 0.18)'
                          }`,
                        }}
                      >
                        {subscription.status === 'trialing' ? 'Trial' : 'Pro'}
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

                <div ref={scrollRef} onScroll={handleScroll} className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}>
                  {messages.length === 0 ? (
                    <div className="chat-empty-state">
                      <div className={`chat-empty-title ${ibmMono.className}`}>Ready</div>
                      <p className="chat-empty-text">
                        Ask a question about Washtenaw County food safety — or attach a photo for the fastest, most concrete cross-check.
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
                        <button onClick={() => setSelectedImage(null)} className="chat-attachment-remove" aria-label="Remove" type="button">
                          <Icons.X />
                        </button>
                      </div>
                    )}

                    <div className="chat-input-row">
                      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`chat-camera-btn ${nudgeCamera ? 'nudge' : ''}`}
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

                    {messages.length === 0 && !selectedImage && (
                      <div className="chat-hints">
                        <button
                          type="button"
                          className={`chat-hint-link ${ibmMono.className}`}
                          onClick={() => fileInputRef.current?.click()}
                          aria-label="Attach a photo for a cross-check"
                        >
                          <span className="chat-hint-ic" aria-hidden="true">
                            <Icons.Camera />
                          </span>
                          <span>PHOTO CHECK IS FASTEST • ATTACH A PHOTO</span>
                        </button>
                      </div>
                    )}

                    <p className="chat-disclaimer">
                      protocolLM is a compliance assistant. For critical decisions, verify with official regulations and on-site conditions.
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
