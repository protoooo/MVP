// app/page.client.js
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
import PricingModal from '@/components/PricingModal' // ✅ using external PricingModal component

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
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
    <div className={`${ibmMono.className} landing-root`}>
      <div className="landing-bg" />

      <header className="landing-topbar">
        <div className="plm-brand-wrap">
          <BrandLink variant="landing" />
        </div>

        <nav className="landing-top-actions" aria-label="Top actions">
          <button onClick={onShowAuth} className="btn-nav landing-signin-btn" type="button">
            Sign in
          </button>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <div className="hero-kicker">Multi-location ready</div>

          <div className="hero-headings">
            <h1 className="hero-title">Take photos to catch violations.</h1>
            <p className="hero-support">
              Helps your team stay on top of Washtenaw County regulations and policies.
            </p>
          </div>

          <div className="hero-cta-row">
            <div className="hero-arrow-text">Get started in minutes</div>
            <div className="hero-arrow" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <button className="btn-primary hero-cta" onClick={onShowPricing} type="button">
              Start trial
            </button>
          </div>
        </div>
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
  const [preferredLocationCount, setPreferredLocationCount] = useState(2)

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

  // ✅ NEW: Listen for auth modal open events
  useEffect(() => {
    const handleOpenAuthModal = (event) => {
      const { mode } = event.detail || {}
      console.log('Opening auth modal, mode:', mode)
      setAuthInitialMode(mode || 'signin')
      setShowAuthModal(true)
    }

    window.addEventListener('openAuthModal', handleOpenAuthModal)

    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal)
    }
  }, [])

  // ✅ NEW: Check for pending multi-location purchase after auth
  useEffect(() => {
    async function checkPendingPurchase() {
      // Only run when user is authenticated
      if (!isAuthenticated) return

      const pending = sessionStorage.getItem('pendingMultiLocationPurchase')
      if (!pending) return

      const storedCount = Number(sessionStorage.getItem('pendingLocationCount')) || 2
      const resolvedCount = Math.min(50, Math.max(2, storedCount))
      setPreferredLocationCount(resolvedCount)

      console.log('Found pending multi-location purchase, authenticated:', isAuthenticated)

      // Clear the flag
      sessionStorage.removeItem('pendingMultiLocationPurchase')
      sessionStorage.removeItem('pendingLocationCount')

      // Wait a bit for subscription check to complete
      setTimeout(() => {
        console.log('Opening multi-location modal, hasSubscription:', hasActiveSubscription)

        if (hasActiveSubscription) {
          // Existing subscriber -> upgrade flow
          window.dispatchEvent(
            new CustomEvent('openMultiLocationUpgrade', {
              detail: { currentLocations: 2 },
            })
          )
        } else {
          // New user -> purchase flow
          window.dispatchEvent(
            new CustomEvent('openMultiLocationPurchase', {
              detail: { preferredCount: resolvedCount },
            })
          )
        }
      }, 500)
    }

    checkPendingPurchase()
  }, [isAuthenticated, hasActiveSubscription])

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
    const handleOpenMultiLocationPurchase = (event) => {
      const count = event?.detail?.preferredCount
      if (count) {
        setPreferredLocationCount(Math.min(50, Math.max(2, Number(count))))
      }
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
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.06);
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
          opacity: 0.7;
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

        .desktop-only {
          display: flex;
        }
        .mobile-only {
          display: none;
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
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: max(20px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) 20px
            max(24px, env(safe-area-inset-left));
          z-index: 10;
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .landing-top-actions-desktop {
          display: flex;
          align-items: center;
          gap: 4px;
        }

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

        .btn-nav:hover {
          color: var(--ink-0);
        }

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

        .btn-primary:hover {
          background: var(--accent-hover);
        }

        .btn-primary.cta-pulse {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.35);
          animation: cta-pulse 1.6s ease-in-out infinite;
        }

        @keyframes cta-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.35);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
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
          gap: 20px;
          max-width: 720px;
          width: 100%;
        }

        .hero-kicker {
          padding: 8px 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--ink-1);
          border-radius: var(--radius-full);
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 600;
        }

        .hero-headings {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hero-title {
          font-size: clamp(28px, 5vw, 40px);
          font-weight: 800;
          color: var(--ink-0);
          letter-spacing: -0.03em;
          margin: 0;
        }

        .hero-support {
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          color: var(--ink-2);
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          justify-content: center;
          flex-wrap: nowrap;
          flex-direction: row;
        }

        .hero-cta {
          position: relative;
          padding: 0 18px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border-radius: var(--radius-full);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.18);
        }

        .hero-cta::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: var(--radius-full);
          padding: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.35), rgba(255,255,255,0.15));
          background-size: 200% 200%;
          animation: hero-trace 3s linear infinite;
          mask: 
            linear-gradient(#000 0 0) content-box, 
            linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          pointer-events: none;
        }

        @keyframes hero-trace {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }

        .hero-arrow-text {
          white-space: nowrap;
          color: var(--ink-1);
          font-size: 14px;
          font-weight: 600;
        }

        .hero-arrow {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 24px;
          color: var(--accent);
        }

        .hero-arrow span {
          display: block;
          width: 12px;
          height: 12px;
          border-bottom: 3px solid currentColor;
          border-right: 3px solid currentColor;
          transform: rotate(45deg);
          margin: -4px;
          animation: hero-arrow-animate 1.8s infinite;
        }

        .hero-arrow span:nth-child(2) {
          animation-delay: -0.2s;
        }

        .hero-arrow span:nth-child(3) {
          animation-delay: -0.4s;
        }

        @keyframes hero-arrow-animate {
          0% {
            opacity: 0;
            transform: rotate(45deg) translateX(-10px);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(45deg) translateX(10px);
          }
        }

        .mobile-start {
          width: 100%;
          display: none;
        }

        .mobile-start .btn-primary {
          width: 100%;
          justify-content: center;
          height: 46px;
          font-size: 15px;
          border-radius: var(--radius-full);
        }

        .terminal-dot {
          width: 10px;
          height: 10px;
          border-radius: var(--radius-full);
        }

        .terminal-dot.red {
          background: #ff5f57;
        }
        .terminal-dot.yellow {
          background: #febc2e;
        }
        .terminal-dot.green {
          background: #28c840;
        }

        /* Landing demo window */
        .landing-demo-window {
          width: 100%;
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.55);
        }

        .landing-demo-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 14px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border-subtle);
        }

        .landing-demo-body {
          padding: 18px;
        }

        .landing-demo-messages {
          height: 240px;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 8px 6px 12px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.02);
        }

        .landing-demo-messages::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }

        .landing-demo-row {
          display: flex;
          width: 100%;
          margin: 10px 0;
        }

        .landing-demo-row.is-assistant {
          justify-content: flex-start;
        }

        .landing-demo-row.is-user {
          justify-content: flex-end;
        }

        /* ✅ UPDATED: no fill, no border — just font color difference */
        .landing-demo-bubble {
          max-width: min(560px, 82%);
          padding: 0;
          border: none;
          border-radius: 0;
          line-height: 1.55;
          font-size: 14px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          background: transparent;
        }

        .landing-demo-bubble.assistant {
          background: transparent;
          color: var(--ink-1);
          border: none;
        }

        .landing-demo-bubble.user {
          background: transparent;
          color: var(--ink-0);
          border: none;
        }

        .landing-demo-inputArea {
          margin-top: 14px;
        }

        /* ✅ NO blue rectangle border (ever) */
        .landing-demo-inputWrap {
          display: flex;
          align-items: stretch;
          gap: 10px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 10px;
        }

        /* ✅ Prevent any focus-within accent border on the demo */
        .landing-demo-inputWrap:focus-within {
          border-color: var(--border-subtle);
          box-shadow: none;
        }

        .landing-demo-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 120px;
          padding: 10px 10px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
          outline: none;
        }

        .landing-demo-textarea:focus {
          outline: none;
        }

        .landing-demo-send {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          color: var(--ink-2);
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .landing-demo-send.active {
          background: var(--accent);
          border-color: rgba(59, 130, 246, 0.6);
          color: white;
        }

        .landing-demo-send:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }

        .landing-demo-send.active:hover {
          background: var(--accent-hover);
        }

        .landing-demo-hint {
          margin-top: 8px;
          padding-left: 4px;
          font-size: 11px;
          color: var(--ink-3);
          letter-spacing: 0.02em;
          user-select: none;
        }

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

        .plm-footer-link:hover {
          color: var(--ink-0);
        }
        .plm-footer-sep {
          color: var(--ink-3);
        }

        /* Modals */
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
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          width: 100%;
          max-width: 360px;
          animation: modal-up 0.2s ease;
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

        .modal-close:hover {
          color: var(--ink-0);
        }

        .modal-header {
          margin-bottom: 24px;
        }

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

        /* ✅ Email/Password label text to white */
        .form-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--ink-0);
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
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
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
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .btn-submit:disabled {
          opacity: 0.5;
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
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--ink-1);
          text-align: center;
          margin-top: 16px;
        }

        .modal-message.ok {
          color: #22c55e;
        }
        .modal-message.err {
          color: #ef4444;
        }

        .modal-footer {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        /* ✅ Forgot password / Create account => white */
        .modal-link {
          background: none;
          border: none;
          font-size: 13px;
          color: var(--ink-0);
          cursor: pointer;
          font-family: inherit;
          opacity: 0.92;
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

        /* ✅ Settings gear dropdown */
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
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--ink-1);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .chat-settings-btn:hover {
          color: var(--ink-0);
          background: rgba(255, 255, 255, 0.04);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: var(--bg-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
          animation: dropdown-in 0.15s ease;
          z-index: 50;
        }

        .chat-settings-item {
          width: 100%;
          text-align: left;
          padding: 10px 10px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--ink-0);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .chat-settings-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .chat-settings-sep {
          height: 1px;
          background: var(--border-subtle);
          margin: 6px 2px;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 0 24px 32px;
          background: var(--bg-0);
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ✅ Slightly smaller so "regulations." doesn't get stranded */
        .chat-empty-text {
          font-size: 14px;
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
        .chat-message-user {
          justify-content: flex-end;
        }
        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 75%;
          font-size: 15px;
          line-height: 1.7;
          display: block;
        }

        .chat-bubble-user {
          color: var(--ink-0);
        }
        .chat-bubble-assistant {
          color: var(--ink-1);
        }

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
          color: var(--ink-2);
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

        /* ✅ Camera button: blue border */
        .chat-camera-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chat-camera-btn:hover {
          border-color: var(--accent-hover);
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
          font-size: 16px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: var(--ink-3);
        }
        .chat-textarea:focus {
          outline: none;
        }

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

        /* Responsive */
        @media (max-width: 768px) {
          .hero-cta-row {
            flex-direction: column;
            gap: 10px;
            align-items: center;
            text-align: center;
          }
          .hero-arrow-text {
            font-size: 13px;
          }
          .hero-arrow {
            order: 1;
          }
          .hero-cta {
            order: 2;
          }
          .hero-arrow-text {
            order: 0;
          }

          .hero-headings {
            text-align: center;
            align-items: center;
          }

          .landing-topbar {
            padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 16px
              max(16px, env(safe-area-inset-left));
            gap: 14px;
          }

          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex;
          }

          .landing-hero {
            padding: 120px 20px 120px;
          }

          .plm-brand-mark {
            width: 60px;
            height: 60px;
          }
          .plm-brand-text {
            font-size: 18px;
          }

          /* ✅ Sign-in as small white text on mobile */
          .landing-signin-btn {
            height: auto !important;
            padding: 0 !important;
            margin-right: 6px;
            transform: translateY(-1px);
            color: var(--ink-0) !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            letter-spacing: 0.04em !important;
            line-height: 1 !important;
          }

          .landing-demo-messages {
            height: 220px;
          }

          .landing-demo-bubble {
            font-size: 13px;
            max-width: 86%;
          }

          .mobile-start {
            display: flex;
          }

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

          .chat-bubble {
            max-width: 85%;
          }

          .chat-empty-text {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 24px 20px;
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
            <div className={`${ibmMono.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions" aria-label="Chat actions">
                  {session && subscription && (
                    <div
                      style={{
                        marginRight: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase',
                        background:
                          subscription.status === 'trialing' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        color: subscription.status === 'trialing' ? '#3b82f6' : '#22c55e',
                        border: `1px solid ${
                          subscription.status === 'trialing' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'
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
        initialLocationCount={preferredLocationCount}
      />
    </>
  )
}
