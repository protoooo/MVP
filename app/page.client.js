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
import PricingModal from '@/components/PricingModal'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

// eslint-disable-next-line no-unused-vars
const isAdmin = false

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
  ArrowRight: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
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
  Search: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14,2 14,8 20,8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
      <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
      <line x1="10" y1="9" x2="8" y2="9" strokeLinecap="round" />
    </svg>
  ),
  Upload: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,8 12,3 7,8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Scan: () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="12" x2="17" y2="12" strokeLinecap="round" />
    </svg>
  ),
}

function BrandLink({ variant = 'landing' }) {
  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={69} height={69} priority />
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
          <div className="hero-headings">
            <h1 className="hero-title">Catch Violations, Not Fines.</h1>
            <p className="hero-support">
              Take a photo or ask a question. Catch violations by simply taking pictures in your establishment, and get instant answers and guidance from Washtenaw County Food Safety Regulations.
            </p>
          </div>

          <div className="hero-cta-row">
            <div className="hero-arrow-text">Get started in minutes</div>
            <div className="hero-arrow-icon">
              <Icons.ArrowRight />
            </div>
            <button className="btn-primary hero-cta hero-cta-trace" onClick={onShowPricing} type="button">
              Start trial
            </button>
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

  const [selectedPriceId, setSelectedPriceId] = useState(null)

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
          alert('Invalid plan selected. Please try again.')
          return
        }

        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          console.log('💾 Storing selected plan:', String(priceId).substring(0, 15) + '***')
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

  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setSubscription(null)
        setHasActiveSubscription(false)
        setShowPricingModal(false)

        setIsLoading(false)
        return
      }

      try {
        if (!s.user.email_confirmed_at) {
          console.log('❌ Email not verified - redirecting to verify page')
          setSubscription(null)
          setHasActiveSubscription(false)

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

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        if (!profile) {
          setSubscription(null)
          setHasActiveSubscription(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }

        const accepted = !!(profile.accepted_terms && profile.accepted_privacy)
        if (!accepted) {
          setSubscription(null)
          setHasActiveSubscription(false)

          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
        console.error('❌ Policy check exception:', e)
        setSubscription(null)
        setHasActiveSubscription(false)

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

  // Parse response into structured sections for tool-like display
  const parseResponse = (content) => {
    if (!content) return null
    
    const sections = []
    const lines = content.split('\n')
    let currentSection = { type: 'text', content: [] }
    
    lines.forEach((line) => {
      const trimmed = line.trim()
      
      // Detect violation patterns
      if (trimmed.match(/^(violation|issue|problem|finding|concern)/i) || trimmed.match(/^[\d]+\.\s*(violation|issue)/i)) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { type: 'violation', content: [trimmed] }
      }
      // Detect compliance/good patterns
      else if (trimmed.match(/^(compliant|correct|good|proper|acceptable)/i) || trimmed.match(/✓|✔|✅/)) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { type: 'compliant', content: [trimmed] }
      }
      // Detect recommendation patterns
      else if (trimmed.match(/^(recommend|suggestion|action|fix|correct this by)/i)) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { type: 'recommendation', content: [trimmed] }
      }
      // Detect code/regulation references
      else if (trimmed.match(/^(section|code|regulation|§|\d+\.\d+)/i)) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { type: 'reference', content: [trimmed] }
      }
      else if (trimmed) {
        currentSection.content.push(trimmed)
      }
    })
    
    if (currentSection.content.length > 0) {
      sections.push(currentSection)
    }
    
    return sections.length > 0 ? sections : null
  }

  if (isLoading) {
    return (
      <div className={`loading-screen ${ibmMono.className}`}>
        <div className="loading-content">
          <div className="loading-logo">
            <Image src={appleIcon} alt="protocolLM" width={69} height={69} priority />
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
          --bg-4: #222228;

          --ink-0: #fafafa;
          --ink-1: #a0a0a8;
          --ink-2: #636369;
          --ink-3: #3f3f46;

          --accent: #3b82f6;
          --accent-hover: #2563eb;
          --accent-dim: rgba(59, 130, 246, 0.1);
          
          --success: #22c55e;
          --success-dim: rgba(34, 197, 94, 0.1);
          --warning: #f59e0b;
          --warning-dim: rgba(245, 158, 11, 0.1);
          --error: #ef4444;
          --error-dim: rgba(239, 68, 68, 0.1);

          --border-subtle: rgba(255, 255, 255, 0.05);
          --border-default: rgba(255, 255, 255, 0.08);
          --border-strong: rgba(255, 255, 255, 0.12);

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
          width: 69px;
          height: 69px;
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
          width: 69px;
          height: 69px;
          flex-shrink: 0;
        }

        .plm-brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .plm-brand-text {
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -0.02em;
          white-space: nowrap;
        }
        
        /* Chat brand - smaller */
        .chat-brand .plm-brand-mark {
          width: 36px;
          height: 36px;
        }
        
        .chat-brand .plm-brand-text {
          font-size: 16px;
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

        /* Sign-in button white on all devices */
        .landing-signin-btn {
          color: #fff !important;
          font-weight: 600 !important;
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

        /* Hero - TRUE CENTER */
        .landing-hero {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          min-height: 0;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          max-width: 720px;
          width: 100%;
          text-align: center;
        }

        .hero-headings {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
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
          line-height: 1.65;
          color: var(--ink-2);
          max-width: 52ch;
        }

        .hero-cta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          justify-content: center;
          flex-wrap: nowrap;
          flex-direction: row;
          margin-top: 8px;
        }

        .hero-arrow-text {
          white-space: nowrap;
          color: var(--ink-1);
          font-size: 14px;
          font-weight: 600;
        }

        .hero-arrow-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-2);
          flex-shrink: 0;
          animation: arrow-pulse 2s ease-in-out infinite;
        }

        @keyframes arrow-pulse {
          0%, 100% {
            opacity: 0.6;
            transform: translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateX(3px);
          }
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
          overflow: visible;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.18);
        }

        /* Subtle tracing animation for Start trial button */
        .hero-cta-trace {
          position: relative;
        }

        .hero-cta-trace::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: var(--radius-full);
          padding: 1px;
          background: conic-gradient(
            from var(--trace-angle, 0deg),
            transparent 0deg,
            transparent 30deg,
            rgba(255, 255, 255, 0.4) 60deg,
            rgba(255, 255, 255, 0.15) 90deg,
            transparent 120deg,
            transparent 360deg
          );
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          pointer-events: none;
          animation: trace-rotate 3s linear infinite;
        }

        @property --trace-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes trace-rotate {
          0% {
            --trace-angle: 0deg;
          }
          100% {
            --trace-angle: 360deg;
          }
        }

        /* Fallback for browsers that don't support @property */
        @supports not (background: conic-gradient(from var(--trace-angle, 0deg), red, blue)) {
          .hero-cta-trace::before {
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
            background-size: 200% 100%;
            animation: trace-slide 2s linear infinite;
          }
          
          @keyframes trace-slide {
            0% {
              background-position: -100% 0;
            }
            100% {
              background-position: 100% 0;
            }
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

        .landing-demo-inputWrap {
          display: flex;
          align-items: stretch;
          gap: 10px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 10px;
        }

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

        /* ===== TOOL/UTILITY CHAT INTERFACE ===== */
        
        .chat-root {
          flex: 1;
          display: grid;
          grid-template-rows: auto 1fr auto;
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

        /* Tool header */
        .tool-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          padding-left: max(20px, env(safe-area-inset-left));
          padding-right: max(20px, env(safe-area-inset-right));
          padding-top: max(12px, env(safe-area-inset-top));
          background: var(--bg-1);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        
        .tool-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .tool-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .tool-title-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--accent-dim);
          border-radius: var(--radius-sm);
          color: var(--accent);
        }
        
        .tool-title-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-0);
          letter-spacing: -0.01em;
        }
        
        .tool-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        
        .tool-status-badge.trial {
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .tool-status-badge.pro {
          background: var(--success-dim);
          color: var(--success);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        
        .tool-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .tool-header-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tool-settings-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .tool-icon-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--ink-2);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tool-icon-btn:hover {
          color: var(--ink-0);
          background: var(--bg-2);
          border-color: var(--border-subtle);
        }

        .tool-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: var(--bg-2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 6px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
          animation: dropdown-in 0.15s ease;
          z-index: 50;
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

        .tool-settings-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--ink-1);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .tool-settings-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--ink-0);
        }

        .tool-settings-sep {
          height: 1px;
          background: var(--border-subtle);
          margin: 4px 6px;
        }

        /* Main content area */
        .tool-main {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          background: var(--bg-0);
        }

        .tool-main.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Empty state - tool welcome */
        .tool-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }
        
        .tool-welcome-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          color: var(--accent);
          margin-bottom: 20px;
        }
        
        .tool-welcome-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--ink-0);
          margin: 0 0 8px;
        }
        
        .tool-welcome-desc {
          font-size: 14px;
          color: var(--ink-2);
          line-height: 1.6;
          margin: 0 0 24px;
        }
        
        .tool-welcome-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 280px;
        }
        
        .tool-action-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        
        .tool-action-card:hover {
          border-color: var(--accent);
          background: var(--bg-3);
        }
        
        .tool-action-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-dim);
          border-radius: var(--radius-sm);
          color: var(--accent);
          flex-shrink: 0;
        }
        
        .tool-action-content {
          flex: 1;
          min-width: 0;
        }
        
        .tool-action-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-0);
          margin: 0 0 2px;
        }
        
        .tool-action-desc {
          font-size: 12px;
          color: var(--ink-2);
          margin: 0;
        }

        /* Results/Analysis area */
        .tool-results {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          padding: 20px 24px 32px;
        }
        
        /* Analysis card (user submission) */
        .analysis-request {
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .analysis-request-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-2);
        }
        
        .analysis-request-icon {
          display: flex;
          align-items: center;
          color: var(--accent);
        }
        
        .analysis-request-image {
          border-radius: var(--radius-sm);
          overflow: hidden;
          margin-bottom: 12px;
          background: var(--bg-3);
        }
        
        .analysis-request-image img {
          display: block;
          max-width: 100%;
          max-height: 200px;
          object-fit: contain;
        }
        
        .analysis-request-text {
          font-size: 14px;
          color: var(--ink-0);
          line-height: 1.5;
        }
        
        /* Analysis result card */
        .analysis-result {
          background: var(--bg-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        
        .analysis-result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border-subtle);
        }
        
        .analysis-result-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--ink-1);
        }
        
        .analysis-result-icon {
          display: flex;
          align-items: center;
          color: var(--accent);
        }
        
        .analysis-result-timestamp {
          font-size: 11px;
          color: var(--ink-3);
        }
        
        .analysis-result-body {
          padding: 16px;
        }
        
        /* Structured result sections */
        .result-section {
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }
        
        .result-section:last-child {
          margin-bottom: 0;
        }
        
        .result-section.violation {
          background: var(--error-dim);
          border-left: 3px solid var(--error);
        }
        
        .result-section.compliant {
          background: var(--success-dim);
          border-left: 3px solid var(--success);
        }
        
        .result-section.recommendation {
          background: var(--warning-dim);
          border-left: 3px solid var(--warning);
        }
        
        .result-section.reference {
          background: var(--bg-3);
          border-left: 3px solid var(--ink-3);
        }
        
        .result-section.text {
          background: transparent;
          padding: 0;
          border: none;
        }
        
        .result-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .result-section-icon {
          display: flex;
          align-items: center;
        }
        
        .result-section.violation .result-section-icon {
          color: var(--error);
        }
        
        .result-section.compliant .result-section-icon {
          color: var(--success);
        }
        
        .result-section.recommendation .result-section-icon {
          color: var(--warning);
        }
        
        .result-section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        
        .result-section.violation .result-section-label {
          color: var(--error);
        }
        
        .result-section.compliant .result-section-label {
          color: var(--success);
        }
        
        .result-section.recommendation .result-section-label {
          color: var(--warning);
        }
        
        .result-section.reference .result-section-label {
          color: var(--ink-2);
        }
        
        .result-section-content {
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink-1);
        }
        
        .result-section.violation .result-section-content,
        .result-section.compliant .result-section-content,
        .result-section.recommendation .result-section-content {
          color: var(--ink-0);
        }
        
        /* Plain text result (fallback) */
        .result-text-plain {
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink-1);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        
        /* Loading state */
        .analysis-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
        }
        
        .analysis-loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        .analysis-loading-text {
          font-size: 13px;
          color: var(--ink-2);
        }

        /* Input area */
        .tool-input-area {
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-1);
        }

        .tool-input-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 16px 24px 20px;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
        }

        .tool-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--ink-1);
        }

        .tool-attachment-icon {
          color: var(--accent);
          display: flex;
        }

        .tool-attachment-remove {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-2);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all 0.15s ease;
        }

        .tool-attachment-remove:hover {
          color: var(--ink-0);
          background: var(--bg-3);
        }

        .tool-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .tool-upload-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-dim);
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .tool-upload-btn:hover {
          background: var(--accent);
          color: white;
        }

        .tool-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--bg-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: border-color 0.15s ease;
          min-width: 0;
        }

        .tool-input-wrapper:focus-within {
          border-color: var(--accent);
        }

        .tool-textarea {
          flex: 1;
          min-height: 48px;
          max-height: 160px;
          padding: 14px 16px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .tool-textarea::placeholder {
          color: var(--ink-3);
        }
        .tool-textarea:focus {
          outline: none;
        }

        .tool-submit-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .tool-submit-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        
        .tool-submit-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .tool-submit-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .tool-disclaimer {
          text-align: center;
          font-size: 11px;
          color: var(--ink-3);
          margin-top: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          /* Mobile CTA row - equal spacing with centered arrow */
          .hero-cta-row {
            flex-direction: column;
            gap: 0;
            align-items: center;
            text-align: center;
          }
          
          .hero-arrow-text {
            font-size: 13px;
            order: 0;
            margin-bottom: 10px;
          }
          
          .hero-arrow-icon {
            order: 1;
            transform: rotate(90deg);
            margin: 6px 0;
          }
          
          .hero-arrow-icon svg {
            width: 18px;
            height: 18px;
          }
          
          @keyframes arrow-pulse {
            0%, 100% {
              opacity: 0.6;
              transform: rotate(90deg) translateX(0);
            }
            50% {
              opacity: 1;
              transform: rotate(90deg) translateX(3px);
            }
          }
          
          .hero-cta {
            order: 2;
            margin-top: 10px;
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
            padding: 0 20px;
          }

          .plm-brand-mark {
            width: 64px;
            height: 64px;
          }
          .plm-brand-text {
            font-size: 19px;
          }

          .landing-signin-btn {
            height: auto !important;
            padding: 0 !important;
            margin-right: 6px;
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

          .tool-header {
            padding: 10px 16px;
            padding-top: max(10px, env(safe-area-inset-top));
          }
          
          .tool-title-text {
            font-size: 13px;
          }
          
          .tool-title-icon {
            width: 28px;
            height: 28px;
          }

          .tool-results {
            padding: 16px;
          }

          .tool-input-inner {
            padding: 12px 16px 16px;
            padding-bottom: max(16px, env(safe-area-inset-bottom));
          }
          
          .tool-welcome {
            padding: 32px 20px;
          }
          
          .tool-welcome-icon {
            width: 56px;
            height: 56px;
          }
          
          .tool-welcome-title {
            font-size: 16px;
          }
          
          .tool-action-card {
            padding: 12px 14px;
          }
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 24px 20px;
          }

          .plm-brand-mark {
            width: 59px;
            height: 59px;
          }
          .plm-brand-text {
            font-size: 18px;
          }
          
          .chat-brand .plm-brand-mark {
            width: 32px;
            height: 32px;
          }
          
          .chat-brand .plm-brand-text {
            font-size: 14px;
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
              {/* Tool Header */}
              <header className="tool-header">
                <div className="tool-header-left">
                  <div className="tool-title">
                    <div className="tool-title-icon">
                      <Icons.Shield />
                    </div>
                    <span className="tool-title-text">Compliance Scanner</span>
                  </div>
                  
                  {session && subscription && (
                    <div className={`tool-status-badge ${subscription.status === 'trialing' ? 'trial' : 'pro'}`}>
                      <span className="tool-status-dot" />
                      {subscription.status === 'trialing' ? 'Trial' : 'Pro'}
                    </div>
                  )}
                </div>
                
                <nav className="tool-header-actions" aria-label="Tool actions">
                  <div className="tool-settings-wrap" ref={settingsRef}>
                    <button
                      type="button"
                      className="tool-icon-btn"
                      onClick={() => setShowSettingsMenu((v) => !v)}
                      aria-expanded={showSettingsMenu}
                      aria-label="Settings"
                    >
                      <Icons.Gear />
                    </button>

                    {showSettingsMenu && (
                      <div className="tool-settings-menu" role="menu" aria-label="Settings menu">
                        <button
                          type="button"
                          className="tool-settings-item"
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
                          {hasActiveSubscription ? 'Manage Billing' : 'Upgrade Plan'}
                        </button>

                        <div className="tool-settings-sep" />

                        <button
                          type="button"
                          className="tool-settings-item"
                          role="menuitem"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            handleSignOut()
                          }}
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </nav>
              </header>

              {/* Main Content */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`tool-main ${messages.length === 0 ? 'empty' : ''}`}
              >
                {messages.length === 0 ? (
                  <div className="tool-welcome">
                    <div className="tool-welcome-icon">
                      <Icons.Scan />
                    </div>
                    <h2 className="tool-welcome-title">Food Safety Compliance Scanner</h2>
                    <p className="tool-welcome-desc">
                      Analyze photos or ask questions about Washtenaw County food safety regulations. Get instant compliance feedback.
                    </p>
                    <div className="tool-welcome-actions">
                      <div 
                        className="tool-action-card"
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="tool-action-icon">
                          <Icons.Upload />
                        </div>
                        <div className="tool-action-content">
                          <p className="tool-action-title">Upload Photo</p>
                          <p className="tool-action-desc">Scan for violations</p>
                        </div>
                      </div>
                      <div 
                        className="tool-action-card"
                        onClick={() => textAreaRef.current?.focus()}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="tool-action-icon">
                          <Icons.FileText />
                        </div>
                        <div className="tool-action-content">
                          <p className="tool-action-title">Ask a Question</p>
                          <p className="tool-action-desc">Query regulations</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="tool-results">
                    {messages.map((msg, idx) => {
                      if (msg.role === 'user') {
                        return (
                          <div key={idx} className="analysis-request">
                            <div className="analysis-request-header">
                              <span className="analysis-request-icon">
                                <Icons.Search />
                              </span>
                              <span>{msg.image ? 'Photo Analysis Request' : 'Regulation Query'}</span>
                            </div>
                            
                            {msg.image && (
                              <div className="analysis-request-image">
                                <img src={msg.image} alt="Submitted for analysis" />
                              </div>
                            )}
                            
                            {msg.content && (
                              <div className="analysis-request-text">{msg.content}</div>
                            )}
                          </div>
                        )
                      }
                      
                      // Assistant response
                      const isLoading = msg.content === '' && isSending && idx === messages.length - 1
                      const sections = parseResponse(msg.content)
                      
                      return (
                        <div key={idx} className="analysis-result">
                          <div className="analysis-result-header">
                            <div className="analysis-result-title">
                              <span className="analysis-result-icon">
                                <Icons.FileText />
                              </span>
                              <span>Analysis Results</span>
                            </div>
                          </div>
                          
                          <div className="analysis-result-body">
                            {isLoading ? (
                              <div className="analysis-loading">
                                <div className="analysis-loading-spinner" />
                                <span className="analysis-loading-text">Analyzing submission...</span>
                              </div>
                            ) : sections ? (
                              sections.map((section, sIdx) => (
                                <div key={sIdx} className={`result-section ${section.type}`}>
                                  {section.type !== 'text' && (
                                    <div className="result-section-header">
                                      <span className="result-section-icon">
                                        {section.type === 'violation' && <Icons.AlertTriangle />}
                                        {section.type === 'compliant' && <Icons.CheckCircle />}
                                        {section.type === 'recommendation' && <Icons.Sparkle />}
                                        {section.type === 'reference' && <Icons.FileText />}
                                      </span>
                                      <span className="result-section-label">
                                        {section.type === 'violation' && 'Violation Found'}
                                        {section.type === 'compliant' && 'Compliant'}
                                        {section.type === 'recommendation' && 'Recommendation'}
                                        {section.type === 'reference' && 'Regulation Reference'}
                                      </span>
                                    </div>
                                  )}
                                  <div className="result-section-content">
                                    {section.content.join('\n')}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="result-text-plain">{msg.content}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="tool-input-area">
                <div className="tool-input-inner">
                  <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                  {selectedImage && (
                    <div className="tool-attachment">
                      <span className="tool-attachment-icon">
                        <Icons.Camera />
                      </span>
                      <span>Photo ready for analysis</span>
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="tool-attachment-remove"
                        aria-label="Remove"
                        type="button"
                      >
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="tool-input-row">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="tool-upload-btn"
                      aria-label="Upload photo for analysis"
                      type="button"
                    >
                      <Icons.Upload />
                    </button>

                    <div className="tool-input-wrapper">
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
                        placeholder="Describe what you want to check or ask a question..."
                        rows={1}
                        className="tool-textarea"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={(!input.trim() && !selectedImage) || isSending}
                      className="tool-submit-btn"
                      aria-label="Submit for analysis"
                    >
                      {isSending ? <div className="tool-submit-spinner" /> : <Icons.ArrowUp />}
                    </button>
                  </div>

                  <p className="tool-disclaimer">
                    Results are AI-generated. Always verify with official Washtenaw County regulations.
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
