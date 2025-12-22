// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

const isAdmin = false

const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
}

function BrandLink({ variant = 'landing' }) {
  return (
    <Link href="/" className="plm-brand" aria-label="protocolLM home">
      <Image src={appleIcon} alt="" width={48} height={48} priority />
      <span className="plm-brand-text">protocolLM</span>
    </Link>
  )
}

function FooterLinks() {
  return (
    <div className="plm-footer">
      <Link href="/terms">Terms</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/contact">Contact</Link>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${inter.className} landing-root`}>
      <header className="landing-header">
        <BrandLink variant="landing" />
        <nav className="landing-nav">
          <button onClick={onShowAuth} className="btn-ghost">
            Sign in
          </button>
          <button onClick={onShowPricing} className="btn-primary">
            Start trial
          </button>
        </nav>
      </header>

      <main className="landing-main">
        <div className="landing-content">
          <h1 className="landing-title">
            Food safety compliance
            <br />
            made simple
          </h1>
          <p className="landing-subtitle">
            Snap a photo. Get instant violation checks. Stay compliant with Washtenaw County health code.
          </p>
          <button onClick={onShowPricing} className="btn-cta">
            Start free trial
          </button>
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
        <div className={`modal-card ${inter.className}`}>
          <button onClick={onClose} className="modal-close" aria-label="Close" type="button">
            <Icons.X />
          </button>

          <h2 className="modal-title">
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Reset password'}
          </h2>

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
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="form-toggle">
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
                  Create account
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                Already have an account?
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                Back to sign in
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

  const [locationCheck, setLocationCheck] = useState(null)
  const [showMultiLocationModal, setShowMultiLocationModal] = useState(false)
  const [showMultiLocationPurchaseModal, setShowMultiLocationPurchaseModal] = useState(false)

  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')
  const [showMenu, setShowMenu] = useState(false)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const menuRef = useRef(null)

  const isAuthenticated = !!session

  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target)) setShowMenu(false)
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
    const splineContainer = document.getElementById('plm-spline-bg')
    if (splineContainer) splineContainer.style.display = 'none'
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
        setLocationCheck(null)
        setShowMultiLocationModal(false)
        setShowMultiLocationPurchaseModal(false)
        setIsLoading(false)
        return
      }

      try {
        if (!s.user.email_confirmed_at) {
          console.log('❌ Email not verified - redirecting to verify page')
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
      loadingToast.className = 'toast'
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
      setShowMenu(false)
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
      <div className={`loading ${inter.className}`}>
        <Image src={appleIcon} alt="protocolLM" width={64} height={64} priority />
        <div className="loading-bar">
          <div className="loading-fill" />
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --steel: #e8eaed;
          --steel-dark: #d1d5db;
          --blue: #1e40af;
          --blue-light: #3b82f6;
          --blue-lighter: #60a5fa;
          --ink: #111827;
          --ink-light: #4b5563;
          --ink-lighter: #9ca3af;
          --border: #e5e7eb;
          --shadow: rgba(0, 0, 0, 0.1);
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          height: 100%;
          margin: 0;
          background: var(--steel);
          color: var(--ink);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        @supports (-webkit-touch-callout: none) {
          html {
            height: -webkit-fill-available;
          }
          body {
            min-height: -webkit-fill-available;
          }
        }

        ::selection {
          background: var(--blue-lighter);
          color: white;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--steel-dark);
          border-radius: 4px;
        }

        .loading {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          background: var(--steel);
        }

        .loading-bar {
          width: 120px;
          height: 3px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-fill {
          height: 100%;
          width: 30%;
          background: var(--blue);
          animation: loading 1s ease-in-out infinite;
        }

        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        .app-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        /* Brand */
        .plm-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--ink);
        }

        .plm-brand img {
          width: 48px;
          height: 48px;
        }

        .plm-brand-text {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        /* Landing */
        .landing-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--steel);
        }

        .landing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid var(--border);
          background: white;
        }

        .landing-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-ghost {
          height: 40px;
          padding: 0 16px;
          background: transparent;
          border: none;
          color: var(--ink-light);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 6px;
          font-family: inherit;
          transition: color 0.15s;
        }

        .btn-ghost:hover {
          color: var(--ink);
        }

        .btn-primary {
          height: 40px;
          padding: 0 20px;
          background: var(--blue);
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 6px;
          font-family: inherit;
          transition: background 0.15s;
        }

        .btn-primary:hover {
          background: var(--blue-light);
        }

        .landing-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }

        .landing-content {
          max-width: 640px;
          text-align: center;
        }

        .landing-title {
          font-size: 56px;
          font-weight: 700;
          line-height: 1.1;
          margin: 0 0 24px;
          color: var(--ink);
        }

        .landing-subtitle {
          font-size: 20px;
          line-height: 1.6;
          color: var(--ink-light);
          margin: 0 0 40px;
        }

        .btn-cta {
          height: 56px;
          padding: 0 32px;
          background: var(--blue);
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          font-family: inherit;
          transition: background 0.15s;
        }

        .btn-cta:hover {
          background: var(--blue-light);
        }

        .plm-footer {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 24px;
        }

        .plm-footer a {
          color: var(--ink-lighter);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }

        .plm-footer a:hover {
          color: var(--ink);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .modal-container {
          width: 100%;
          max-width: 400px;
        }

        .modal-card {
          position: relative;
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 20px 60px var(--shadow);
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
          color: var(--ink-lighter);
          cursor: pointer;
        }

        .modal-close:hover {
          color: var(--ink);
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px;
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
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
        }

        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          background: var(--steel);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--ink);
          font-size: 14px;
          font-family: inherit;
        }

        .form-input::placeholder {
          color: var(--ink-lighter);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--blue);
        }

        .form-input-wrap {
          position: relative;
        }

        .form-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--blue);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }

        .btn-submit {
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--blue);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          margin-top: 8px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--blue-light);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-message {
          padding: 12px;
          background: var(--steel);
          border-radius: 6px;
          font-size: 13px;
          text-align: center;
          margin-top: 16px;
        }

        .modal-message.ok {
          color: #059669;
        }

        .modal-message.err {
          color: #dc2626;
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
          color: var(--blue);
          cursor: pointer;
          font-family: inherit;
        }

        .modal-link:hover {
          text-decoration: underline;
        }

        /* Chat */
        .chat-root {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100dvh;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
          background: white;
        }

        .chat-menu-wrap {
          position: relative;
        }

        .chat-menu-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-light);
          cursor: pointer;
          border-radius: 6px;
        }

        .chat-menu-btn:hover {
          background: var(--steel);
        }

        .chat-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 12px 40px var(--shadow);
          z-index: 50;
        }

        .chat-menu-item {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: var(--ink);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          border-radius: 4px;
        }

        .chat-menu-item:hover {
          background: var(--steel);
        }

        .chat-menu-sep {
          height: 1px;
          background: var(--border);
          margin: 8px 0;
        }

        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px;
          background: var(--steel);
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty {
          font-size: 15px;
          color: var(--ink-light);
          text-align: center;
        }

        .chat-history {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .chat-message {
          display: flex;
        }

        .chat-message-user {
          justify-content: flex-end;
        }

        .chat-message-assistant {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 70%;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 15px;
          line-height: 1.6;
        }

        .chat-bubble-user {
          background: var(--blue);
          color: white;
        }

        .chat-bubble-assistant {
          background: white;
          color: var(--ink);
          border: 1px solid var(--border);
        }

        .chat-bubble-image {
          margin-bottom: 12px;
          border-radius: 8px;
          overflow: hidden;
        }

        .chat-bubble-image img {
          display: block;
          max-width: 100%;
          max-height: 280px;
        }

        .chat-content {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .chat-thinking {
          color: var(--ink-lighter);
          font-style: italic;
        }

        .chat-input-area {
          border-top: 1px solid var(--border);
          background: white;
          padding: 16px 24px;
        }

        .chat-input-inner {
          max-width: 800px;
          margin: 0 auto;
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--steel);
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 13px;
          color: var(--ink-light);
        }

        .chat-attachment-icon {
          color: var(--blue);
        }

        .chat-attachment-remove {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--ink-lighter);
          cursor: pointer;
        }

        .chat-attachment-remove:hover {
          color: var(--ink);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .chat-camera-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--steel);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--blue);
          cursor: pointer;
          flex-shrink: 0;
        }

        .chat-camera-btn:hover {
          background: var(--steel-dark);
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: var(--steel);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .chat-input-wrapper:focus-within {
          border-color: var(--blue);
        }

        .chat-textarea {
          flex: 1;
          min-height: 44px;
          max-height: 160px;
          padding: 12px;
          background: transparent;
          border: none;
          color: var(--ink);
          font-size: 14px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
        }

        .chat-textarea::placeholder {
          color: var(--ink-lighter);
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
          color: var(--blue);
          cursor: pointer;
        }

        .chat-send-btn:hover:not(:disabled) {
          color: var(--blue-light);
        }

        .chat-send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 12px;
          color: var(--ink-lighter);
          margin-top: 12px;
        }

        .toast {
          position: fixed;
          top: 24px;
          right: 24px;
          background: var(--ink);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 9999;
        }

        @media (max-width: 768px) {
          .landing-title {
            font-size: 40px;
          }

          .landing-subtitle {
            font-size: 18px;
          }

          .chat-bubble {
            max-width: 85%;
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
            <div className={`${inter.className} chat-root`}>
              <header className="chat-header">
                <BrandLink variant="chat" />
                <div className="chat-menu-wrap" ref={menuRef}>
                  <button
                    type="button"
                    className="chat-menu-btn"
                    onClick={() => setShowMenu((v) => !v)}
                    aria-label="Menu"
                  >
                    <Icons.Menu />
                  </button>

                  {showMenu && (
                    <div className="chat-menu">
                      <button
                        type="button"
                        className="chat-menu-item"
                        onClick={() => {
                          setShowMenu(false)
                          if (hasActiveSubscription) {
                            handleManageBilling()
                          } else {
                            setShowPricingModal(true)
                          }
                        }}
                      >
                        {hasActiveSubscription ? 'Manage Billing' : 'Start Trial'}
                      </button>

                      <div className="chat-menu-sep" />

                      <button
                        type="button"
                        className="chat-menu-item"
                        onClick={() => {
                          setShowMenu(false)
                          handleSignOut()
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </header>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}
              >
                {messages.length === 0 ? (
                  <div className="chat-empty">
                    Upload a photo or ask a question about Washtenaw County food safety regulations.
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
