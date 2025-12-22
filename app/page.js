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
import PricingModal from '@/components/PricingModal'

const ibmSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

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
  Gear: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 13.5c.04-.5.04-1 0-1.5l2-1.5-2-3.4-2.4 1a8.6 8.6 0 0 0-1.3-.8l-.4-2.6H10.1l-.4 2.6c-.46.2-.9.46-1.3.8l-2.4-1-2 3.4 2 1.5c-.04.5-.04 1 0 1.5l-2 1.5 2 3.4 2.4-1c.4.34.84.6 1.3.8l.4 2.6h4.8l.4-2.6c.46-.2.9-.46 1.3-.8l2.4 1 2-3.4-2-1.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Image: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
}

function BrandLink({ variant = 'landing' }) {
  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={40} height={40} priority />
        </span>
        <span className="plm-brand-text">protocolLM</span>
      </span>
    </Link>
  )
}

function FooterLinks() {
  return (
    <div className={`plm-footer-links ${ibmMono.className}`}>
      <Link className="plm-footer-link" href="/terms">Terms</Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/privacy">Privacy</Link>
      <span className="plm-footer-sep">·</span>
      <Link className="plm-footer-link" href="/contact">Contact</Link>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${ibmSans.className} landing-root`}>
      <header className="landing-topbar">
        <BrandLink variant="landing" />
        <nav className="landing-nav">
          <button onClick={onShowAuth} className="nav-link" type="button">Sign in</button>
          <button onClick={onShowPricing} className="btn-primary" type="button">Start free trial</button>
        </nav>
      </header>

      <main className="landing-main">
        <div className="landing-content">
          <div className="landing-badge">
            <Icons.Shield />
            <span>Washtenaw County Health Code Compliance</span>
          </div>
          
          <h1 className="landing-headline">
            Catch violations<br />before inspectors do.
          </h1>
          
          <p className="landing-subhead">
            Upload a photo of your kitchen. Get instant feedback on health code issues with plain-language fixes.
          </p>

          <div className="landing-actions">
            <button onClick={onShowPricing} className="btn-primary btn-lg" type="button">
              Start 7-day free trial
            </button>
          </div>

          <div className="landing-features">
            <div className="feature-item">
              <span className="feature-check"><Icons.Check /></span>
              <span>Photo analysis in seconds</span>
            </div>
            <div className="feature-item">
              <span className="feature-check"><Icons.Check /></span>
              <span>Michigan food code reference</span>
            </div>
            <div className="feature-item">
              <span className="feature-check"><Icons.Check /></span>
              <span>Plain-language explanations</span>
            </div>
          </div>
        </div>

        <div className="landing-visual">
          <div className="visual-card">
            <div className="visual-header">
              <div className="visual-status">
                <span className="status-dot"></span>
                <span>Analysis complete</span>
              </div>
            </div>
            <div className="visual-body">
              <div className="visual-finding">
                <div className="finding-label">Issue detected</div>
                <div className="finding-text">Raw chicken stored above ready-to-eat items</div>
              </div>
              <div className="visual-finding">
                <div className="finding-label">Code reference</div>
                <div className="finding-text">Michigan Food Code 3-302.11</div>
              </div>
              <div className="visual-finding">
                <div className="finding-label">Fix</div>
                <div className="finding-text">Move raw proteins to lowest shelf. Store ready-to-eat items above.</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FooterLinks />
    </div>
  )
}

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
        setMessage('Security verification failed. Please try again.')
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
        setMessage('Signed in successfully.')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 450)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessageKind('err')
      setMessage('Something went wrong. Please try again.')
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
                placeholder="you@restaurant.com"
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
                <button type="button" onClick={() => setMode('reset')} className="modal-link">Forgot password?</button>
                <button type="button" onClick={() => setMode('signup')} className="modal-link">Create an account</button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">Already have an account?</button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">Back to sign in</button>
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

  useEffect(() => {
    const handleUpgradeEvent = () => setShowMultiLocationModal(true)
    window.addEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
    return () => window.removeEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
  }, [])

  useEffect(() => {
    const handleOpenMultiLocationPurchase = () => setShowMultiLocationPurchaseModal(true)
    window.addEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
    return () => window.removeEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
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

  const handleCheckout = useCallback(
    async (priceId, planName) => {
      try {
        if (!priceId) {
          alert('Invalid price selected.')
          return
        }

        const validPrices = [UNLIMITED_MONTHLY].filter(Boolean)
        if (validPrices.length > 0 && !validPrices.includes(priceId)) {
          console.error('Invalid price ID:', priceId)
          alert('Invalid plan selected.')
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
          alert('Please verify your email first.')
          setShowPricingModal(false)
          router.push('/verify-email')
          return
        }

        if (!captchaLoaded) {
          alert('Security verification loading. Please try again.')
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
            alert('Please verify your email first.')
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
        alert('Checkout failed: ' + (error.message || 'Unknown error'))
      } finally {
        setCheckoutLoading(null)
      }
    },
    [supabase, captchaLoaded, executeRecaptcha, router]
  )

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

      try {
        if (!s.user.email_confirmed_at) {
          setSubscription(null)
          setHasActiveSubscription(false)
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

        if (profileError || !profile) {
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
        console.error('Policy check error:', e)
        setSubscription(null)
        setHasActiveSubscription(false)
        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)
        setIsLoading(false)
        router.replace('/accept-terms')
        return
      }

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

      if (!subData) {
        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)
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
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })

      let res = await doPost()
      if (res.status === 405) res = await doGet()

      const data = await res.json().catch(() => null)
      if (!res.ok || !data) return null

      return data.locationCheck || data
    } catch (e) {
      logger.warn('Location check fetch failed', e)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!isAuthenticated || !session?.user?.id || !subscription) return

      const lc = await fetchLocationCheckFromServer(session)
      if (cancelled) return
      if (!lc) return

      logger.info('License validated', {
        userId: session.user.id,
        uniqueLocationsUsed: lc.uniqueLocationsUsed,
      })

      setLocationCheck(lc)
    }

    run()
    return () => { cancelled = true }
  }, [isAuthenticated, session, subscription, fetchLocationCheckFromServer])

  const handleManageBilling = async () => {
    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast.textContent = 'Opening billing...'
      loadingToast.className = 'toast-loading'
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
          throw new Error('Subscription required.')
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
            <Image src={appleIcon} alt="protocolLM" width={48} height={48} priority />
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
          --white: #ffffff;
          --gray-50: #f8fafc;
          --gray-100: #f1f5f9;
          --gray-200: #e2e8f0;
          --gray-300: #cbd5e1;
          --gray-400: #94a3b8;
          --gray-500: #64748b;
          --gray-600: #475569;
          --gray-700: #334155;
          --gray-800: #1e293b;
          --gray-900: #0f172a;
          
          --blue-50: #eff6ff;
          --blue-100: #dbeafe;
          --blue-200: #bfdbfe;
          --blue-500: #3b82f6;
          --blue-600: #2563eb;
          --blue-700: #1d4ed8;
          
          --steel-50: #f0f4f8;
          --steel-100: #d9e2ec;
          --steel-200: #bcccdc;
          --steel-500: #627d98;
          --steel-600: #486581;
          --steel-700: #334e68;
          --steel-800: #243b53;
          --steel-900: #102a43;
          
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 12px;
          
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        html, body {
          height: 100%;
          margin: 0;
          background: var(--white);
          color: var(--gray-900);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        @supports (-webkit-touch-callout: none) {
          html { height: -webkit-fill-available; }
          body { min-height: -webkit-fill-available; }
        }

        a, button, input, textarea {
          -webkit-tap-highlight-color: transparent;
        }

        :focus { outline: none; }
        :focus-visible { outline: 2px solid var(--blue-500); outline-offset: 2px; }

        ::selection {
          background: var(--blue-100);
          color: var(--gray-900);
        }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--gray-100); }
        ::-webkit-scrollbar-thumb { background: var(--gray-300); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--gray-400); }

        /* Loading */
        .loading-screen {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--white);
          z-index: 9999;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .loading-logo {
          width: 48px;
          height: 48px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .loading-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .loading-bar {
          width: 120px;
          height: 3px;
          background: var(--gray-200);
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-bar-fill {
          height: 100%;
          width: 40%;
          background: var(--blue-500);
          animation: loading-slide 1.2s ease-in-out infinite;
        }

        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }

        /* App container */
        .app-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--white);
        }

        /* Brand */
        .plm-brand {
          color: var(--gray-900);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: opacity 0.2s ease;
        }

        .plm-brand:hover { opacity: 0.8; }

        .plm-brand-inner {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .plm-brand-mark {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
        }

        .plm-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .plm-brand-text {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--steel-900);
        }

        /* Landing */
        .landing-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--white);
        }

        .landing-topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--gray-200);
          z-index: 100;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-link {
          height: 40px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          background: transparent;
          border: none;
          color: var(--gray-600);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.15s ease;
          font-family: inherit;
        }

        .nav-link:hover { color: var(--gray-900); }

        .btn-primary {
          height: 40px;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--blue-600);
          color: var(--white);
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          font-family: inherit;
        }

        .btn-primary:hover { background: var(--blue-700); }
        .btn-primary:active { transform: scale(0.98); }

        .btn-lg {
          height: 48px;
          padding: 0 28px;
          font-size: 15px;
          border-radius: var(--radius-lg);
        }

        /* Landing main */
        .landing-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 120px 48px 80px;
        }

        .landing-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .landing-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: var(--blue-50);
          border: 1px solid var(--blue-200);
          border-radius: 100px;
          color: var(--blue-700);
          font-size: 13px;
          font-weight: 500;
          width: fit-content;
        }

        .landing-badge svg {
          flex-shrink: 0;
        }

        .landing-headline {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--steel-900);
          margin: 0;
        }

        .landing-subhead {
          font-size: 18px;
          line-height: 1.6;
          color: var(--gray-600);
          margin: 0;
          max-width: 480px;
        }

        .landing-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .landing-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--gray-700);
        }

        .feature-check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: var(--blue-50);
          border-radius: 50%;
          color: var(--blue-600);
        }

        /* Visual card */
        .landing-visual {
          display: flex;
          justify-content: center;
        }

        .visual-card {
          width: 100%;
          max-width: 420px;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .visual-header {
          padding: 16px 20px;
          background: var(--steel-50);
          border-bottom: 1px solid var(--gray-200);
        }

        .visual-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--steel-700);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          animation: status-pulse 2s ease-in-out infinite;
        }

        @keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .visual-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .visual-finding {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .finding-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gray-500);
        }

        .finding-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--gray-800);
        }

        /* Footer */
        .plm-footer-links {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 10;
        }

        .plm-footer-link {
          color: var(--gray-500);
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          transition: color 0.15s ease;
        }

        .plm-footer-link:hover { color: var(--gray-700); }
        .plm-footer-sep { color: var(--gray-300); }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.6);
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
          max-width: 400px;
          animation: modal-up 0.2s ease;
        }

        @keyframes modal-up {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-card {
          position: relative;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: 32px;
          box-shadow: var(--shadow-lg);
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
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: color 0.15s ease, background 0.15s ease;
        }

        .modal-close:hover {
          color: var(--gray-600);
          background: var(--gray-100);
        }

        .modal-header { margin-bottom: 24px; }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: var(--gray-900);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--gray-700);
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: var(--white);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          color: var(--gray-900);
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-input::placeholder { color: var(--gray-400); }
        .form-input:focus {
          border-color: var(--blue-500);
          box-shadow: 0 0 0 3px var(--blue-100);
        }

        .form-input-wrap { position: relative; }

        .form-toggle-vis {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--gray-500);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
        }

        .form-toggle-vis:hover { color: var(--gray-700); }

        .btn-submit {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--blue-600);
          color: var(--white);
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) { background: var(--blue-700); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: var(--white);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .modal-message {
          padding: 12px 14px;
          background: var(--gray-100);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--gray-600);
          text-align: center;
          margin-top: 16px;
        }

        .modal-message.ok { background: #dcfce7; color: #166534; }
        .modal-message.err { background: #fee2e2; color: #991b1b; }

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
          color: var(--blue-600);
          cursor: pointer;
          font-family: inherit;
          font-weight: 500;
        }

        .modal-link:hover { color: var(--blue-700); text-decoration: underline; }

        /* Chat */
        .chat-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--gray-50);
          height: 100dvh;
          overflow: hidden;
        }

        .chat-topbar {
          width: 100%;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--white);
          border-bottom: 1px solid var(--gray-200);
          flex-shrink: 0;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-status-badge {
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .chat-status-badge.trial {
          background: var(--blue-50);
          color: var(--blue-700);
          border: 1px solid var(--blue-200);
        }

        .chat-status-badge.pro {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .chat-settings-wrap { position: relative; }

        .chat-settings-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          color: var(--gray-500);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .chat-settings-btn:hover {
          color: var(--gray-700);
          background: var(--gray-100);
          border-color: var(--gray-300);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          padding: 6px;
          box-shadow: var(--shadow-lg);
          z-index: 50;
        }

        .chat-settings-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--gray-700);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .chat-settings-item:hover { background: var(--gray-100); }

        .chat-settings-sep {
          height: 1px;
          background: var(--gray-200);
          margin: 6px 0;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px;
          background: var(--gray-50);
        }

        .chat-messages.empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        .chat-empty-state {
          text-align: center;
          max-width: 400px;
        }

        .chat-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--blue-50);
          border-radius: 50%;
          color: var(--blue-500);
        }

        .chat-empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 8px;
        }

        .chat-empty-text {
          font-size: 14px;
          color: var(--gray-600);
          line-height: 1.6;
          margin: 0;
        }

        .chat-empty-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--gray-600);
          margin-top: 8px;
        }

        .chat-empty-hint svg {
          color: var(--blue-500);
          flex-shrink: 0;
        }

        .chat-history {
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .chat-message {
          display: flex;
          width: 100%;
        }

        .chat-message-user { justify-content: flex-end; }
        .chat-message-assistant { justify-content: flex-start; }

        .chat-bubble {
          max-width: 75%;
          font-size: 14px;
          line-height: 1.6;
          padding: 14px 18px;
          border-radius: var(--radius-lg);
        }

        .chat-bubble-user {
          background: var(--blue-600);
          color: var(--white);
          border-bottom-right-radius: 4px;
        }

        .chat-bubble-assistant {
          background: var(--white);
          color: var(--gray-800);
          border: 1px solid var(--gray-200);
          border-bottom-left-radius: 4px;
        }

        .chat-bubble-image {
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: 12px;
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 280px;
          object-fit: contain;
        }

        .chat-content {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .chat-thinking {
          color: var(--gray-500);
          font-style: italic;
        }

        .chat-input-area {
          flex-shrink: 0;
          background: var(--white);
          border-top: 1px solid var(--gray-200);
        }

        .chat-input-inner {
          max-width: 760px;
          margin: 0 auto;
          padding: 16px 24px 24px;
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--blue-50);
          border: 1px solid var(--blue-200);
          border-radius: var(--radius-md);
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--blue-700);
        }

        .chat-attachment-icon {
          display: flex;
          color: var(--blue-500);
        }

        .chat-attachment-remove {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--blue-500);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: background 0.15s ease;
        }

        .chat-attachment-remove:hover {
          background: var(--blue-100);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .chat-camera-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--white);
          border: 2px solid var(--blue-500);
          border-radius: var(--radius-md);
          color: var(--blue-500);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
          position: relative;
        }

        .chat-camera-btn:hover {
          background: var(--blue-50);
          border-color: var(--blue-600);
          color: var(--blue-600);
        }

        .chat-camera-btn::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: calc(var(--radius-md) + 4px);
          border: 2px solid transparent;
          transition: border-color 0.15s ease;
        }

        .chat-camera-btn:focus-visible::after {
          border-color: var(--blue-300);
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--white);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chat-input-wrapper:focus-within {
          border-color: var(--blue-500);
          box-shadow: 0 0 0 3px var(--blue-100);
        }

        .chat-textarea {
          flex: 1;
          min-height: 48px;
          max-height: 160px;
          padding: 14px 16px;
          background: transparent;
          border: none;
          color: var(--gray-900);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
        }

        .chat-textarea::placeholder { color: var(--gray-400); }
        .chat-textarea:focus { outline: none; }

        .chat-send-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .chat-send-btn:hover:not(:disabled) { color: var(--blue-500); }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .chat-send-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--gray-300);
          border-top-color: var(--blue-500);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 12px;
        }

        .toast-loading {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          background: var(--gray-900);
          color: var(--white);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          z-index: 9999;
          box-shadow: var(--shadow-lg);
        }

        /* Responsive */
        @media (max-width: 968px) {
          .landing-main {
            grid-template-columns: 1fr;
            gap: 48px;
            padding: 100px 24px 60px;
          }

          .landing-visual {
            order: -1;
          }

          .visual-card {
            max-width: 100%;
          }

          .landing-headline {
            font-size: 36px;
          }

          .landing-content {
            text-align: center;
            align-items: center;
          }

          .landing-features {
            align-items: center;
          }
        }

        @media (max-width: 640px) {
          .landing-topbar {
            padding: 12px 16px;
          }

          .landing-headline {
            font-size: 28px;
          }

          .landing-subhead {
            font-size: 16px;
          }

          .landing-main {
            padding: 88px 16px 48px;
          }

          .chat-topbar {
            padding: 12px 16px;
          }

          .chat-messages {
            padding: 16px;
          }

          .chat-input-inner {
            padding: 12px 16px 20px;
          }

          .chat-bubble {
            max-width: 85%;
          }

          .plm-footer-links {
            bottom: 16px;
          }

          .plm-brand-mark {
            width: 32px;
            height: 32px;
          }

          .plm-brand-text {
            font-size: 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
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
            <div className={`${ibmSans.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions">
                  {session && subscription && (
                    <div className={`chat-status-badge ${subscription.status === 'trialing' ? 'trial' : 'pro'}`}>
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
                      <div className="chat-settings-menu">
                        <button
                          type="button"
                          className="chat-settings-item"
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
                          onClick={() => {
                            setShowSettingsMenu(false)
                            handleSignOut()
                          }}
                        >
                          Sign out
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
                    <div className="chat-empty-icon">
                      <Icons.Shield />
                    </div>
                    <h2 className="chat-empty-title">Ready for analysis</h2>
                    <p className="chat-empty-text">
                      Ask a question about Washtenaw County food safety regulations, or upload a photo for instant feedback.
                    </p>
                    <div className="chat-empty-hint">
                      <Icons.Camera />
                      <span>Tap the camera button to analyze your kitchen</span>
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
                      aria-label="Upload photo for analysis"
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
                        placeholder="Ask about food safety regulations…"
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
