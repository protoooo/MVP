// app/page.js
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import MultiLocationBanner from '@/components/MultiLocationBanner'
import MultiLocationUpgradeModal from '@/components/MultiLocationUpgradeModal'
import MultiLocationPurchaseModal from '@/components/MultiLocationPurchaseModal'
import PricingModal from '@/components/PricingModal'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'] })

// ✅ SINGLE PLAN - Unlimited monthly only
const UNLIMITED_MONTHLY = process.env.NEXT_PUBLIC_STRIPE_PRICE_UNLIMITED_MONTHLY

// lightweight logger
const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

const Icons = {
  Camera: () => (
    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
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
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Gear: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <span className="plm-footer-sep">/</span>
      <Link className="plm-footer-link" href="/privacy">
        Privacy
      </Link>
      <span className="plm-footer-sep">/</span>
      <Link className="plm-footer-link" href="/contact">
        Contact
      </Link>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className={`${inter.className} landing-root`}>
      <header className="landing-topbar">
        <BrandLink variant="landing" />
        <nav className="landing-nav">
          <button onClick={onShowAuth} className="btn-ghost" type="button">
            Log in
          </button>
          <button onClick={onShowPricing} className="btn-solid" type="button">
            Start Trial
          </button>
        </nav>
      </header>

      <main className="landing-hero">
        <div className="hero-container">
          <div className="hero-badge">Washtenaw County Standard</div>
          <h1 className="hero-title">
            Health compliance.<br />
            Extensions of your clipboard.
          </h1>
          <p className="hero-sub">
            This is the problem: Violations happen when you aren't looking.<br />
            This is the fix: Snap a photo. Identify the issue. Solve it before the inspection.
          </p>

          <div className="hero-actions">
            <button className="btn-solid large" onClick={onShowPricing}>
              Start Free Trial
            </button>
            <p className="hero-caption">
              Trusted methodology. No scare tactics. Just results.
            </p>
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
        setMessage('Security check failed.')
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
        setMessage('Reset instructions sent to email.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else if (mode === 'signup') {
        setMessageKind('ok')
        setMessage('Account created. Please verify your email.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2000)
      } else {
        setMessageKind('ok')
        setMessage('Authenticating...')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 450)
      }
    } catch (error) {
      setMessageKind('err')
      setMessage('System error. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-card ${inter.className}`}>
          <div className="modal-top">
             <h2 className="modal-title">
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'New Account'}
              {mode === 'reset' && 'Reset Password'}
            </h2>
            <button onClick={onClose} className="modal-close" aria-label="Close">
              <Icons.X />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
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
                    required
                    className="form-input"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="form-toggle-vis">
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !isLoaded} className="btn-full">
              {loading ? 'Processing...' : (mode === 'signin' ? 'Access Account' : mode === 'signup' ? 'Create Account' : 'Send Link')}
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
                  No account? Create one
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                Have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="modal-link">
                Return to sign in
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
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const textAreaRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const settingsRef = useRef(null)

  const isAuthenticated = !!session

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

  useEffect(() => {
    const handleUpgradeEvent = () => setShowMultiLocationModal(true)
    const handleOpenMultiLocationPurchase = () => setShowMultiLocationPurchaseModal(true)
    window.addEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
    window.addEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
    return () => {
      window.removeEventListener('openMultiLocationUpgrade', handleUpgradeEvent)
      window.removeEventListener('openMultiLocationPurchase', handleOpenMultiLocationPurchase)
    }
  }, [])

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
          alert('Please verify your email before starting a trial.')
          setShowPricingModal(false)
          router.push('/verify-email')
          return
        }

        if (!captchaLoaded) {
          alert('Security verification loading. Try again.')
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
            router.push('/verify-email')
            return
          }
          if (payload.code === 'ALREADY_SUBSCRIBED') {
            setShowPricingModal(false)
            return
          }
          throw new Error(payload.error || 'Checkout failed')
        }

        if (payload.url) {
          window.location.href = payload.url
        }
      } catch (error) {
        console.error('Checkout error:', error)
        alert('Failed: ' + (error.message || 'Unknown error'))
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
        setIsLoading(false)
        return
      }

      try {
        if (!s.user.email_confirmed_at) {
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

        if (profileError || !profile || !profile.accepted_terms) {
          setSubscription(null)
          setHasActiveSubscription(false)
          setIsLoading(false)
          router.replace('/accept-terms')
          return
        }
      } catch (e) {
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
      }

      const checkoutParam = searchParams?.get('checkout')
      const showPricingParam = searchParams?.get('showPricing')

      if (!subData && !checkoutParam && showPricingParam !== 'true') {
        setShowPricingModal(true)
        setHasActiveSubscription(false)
      }

      setIsLoading(false)
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        await loadSessionAndSub(data.session || null)
      } catch (e) {
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
    if (!checkoutPlan || isLoading) return
    if (checkoutPlan && isAuthenticated && !hasActiveSubscription && !subscription) {
      handleCheckout(checkoutPlan, 'auto')
      if (typeof window !== 'undefined') window.history.replaceState({}, '', '/')
    }
  }, [searchParams, isAuthenticated, hasActiveSubscription, subscription, handleCheckout, isLoading])

  const fetchLocationCheckFromServer = useCallback(async (sess) => {
    try {
      const token = sess?.access_token
      if (!token) return null
      const res = await fetch('/api/license/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })
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
      if (cancelled || !lc) return
      setLocationCheck(lc)
    }
    run()
    return () => { cancelled = true }
  }, [isAuthenticated, session, subscription, fetchLocationCheckFromServer])

  const handleManageBilling = async () => {
    let loadingToast = null
    try {
      loadingToast = document.createElement('div')
      loadingToast.textContent = 'Redirecting to billing...'
      loadingToast.style.cssText = 'position:fixed;top:16px;right:16px;background:#0f172a;color:white;padding:8px 16px;border-radius:6px;z-index:9999;font-family:sans-serif;font-size:14px;'
      document.body.appendChild(loadingToast)

      const { data } = await supabase.auth.getSession()
      const accessToken = data?.session?.access_token
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      })
      const payload = await res.json()
      if (payload.url) window.location.href = payload.url
    } catch (error) {
      alert('Failed to open billing portal')
    } finally {
      if (loadingToast) document.body.removeChild(loadingToast)
    }
  }

  const handleSignOut = async () => {
    try {
      setShowSettingsMenu(false)
      setLocationCheck(null)
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
          .insert({ user_id: session.user.id, title: (question || 'New chat').slice(0, 40) })
          .select().single()
        if (created) {
          activeChatId = created.id
          setCurrentChatId(created.id)
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newUserMessage], image, chatId: activeChatId }),
      })

      if (!res.ok) {
        if (res.status === 402) setShowPricingModal(true)
        throw new Error('Processing failed.')
      }

      const data = await res.json()
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: data.message || 'No response.' }
        return updated
      })
    } catch (error) {
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
    } catch {
      alert('Image processing error.')
    }
  }

  if (isLoading) {
    return (
      <div className={`loading-screen ${inter.className}`}>
        <Image src={appleIcon} alt="" width={48} height={48} />
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          /* Clean Blue & Stainless Theme */
          --bg-page: #ffffff;
          --bg-sidebar: #f8fafc;
          --bg-input: #ffffff;
          --bg-panel: #f1f5f9;
          
          --ink-primary: #0f172a;   /* Slate 900 */
          --ink-secondary: #475569; /* Slate 600 */
          --ink-muted: #94a3b8;     /* Slate 400 */
          
          --border-main: #e2e8f0;    /* Slate 200 */
          --border-strong: #cbd5e1;  /* Slate 300 - Stainless look */
          
          --accent: #2563eb;         /* Royal Blue */
          --accent-hover: #1d4ed8;
          --accent-light: #eff6ff;
          
          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
        }

        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          height: 100%;
          margin: 0;
          background: var(--bg-page);
          color: var(--ink-primary);
          font-family: ${inter.style.fontFamily}, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        a, button { -webkit-tap-highlight-color: transparent; }
        button { font-family: inherit; cursor: pointer; }
        :focus { outline: none; }

        /* LOADING */
        .loading-screen {
          position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          background: var(--bg-page); z-index: 9999;
        }

        /* LANDING */
        .landing-root {
          min-height: 100vh; display: flex; flex-direction: column;
          background: var(--bg-page);
        }

        .landing-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px; max-width: 1200px; margin: 0 auto; width: 100%;
        }

        .plm-brand {
          display: flex; align-items: center; gap: 12px; text-decoration: none;
          color: var(--ink-primary); transition: opacity 0.2s;
        }
        .plm-brand:hover { opacity: 0.8; }
        .plm-brand-mark { width: 42px; height: 42px; }
        .plm-brand-mark img { width: 100%; height: 100%; object-fit: contain; }
        .plm-brand-text { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }

        .landing-nav { display: flex; gap: 12px; }
        
        .btn-ghost {
          background: transparent; border: none; color: var(--ink-secondary);
          font-weight: 500; font-size: 14px; padding: 8px 16px;
        }
        .btn-ghost:hover { color: var(--ink-primary); }

        .btn-solid {
          background: var(--ink-primary); color: white; border: none;
          padding: 0 20px; height: 40px; border-radius: var(--radius-sm);
          font-weight: 600; font-size: 14px; transition: background 0.2s;
        }
        .btn-solid:hover { background: #000; }
        .btn-solid.large { height: 48px; padding: 0 32px; font-size: 16px; background: var(--accent); }
        .btn-solid.large:hover { background: var(--accent-hover); }

        .landing-hero {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 24px; text-align: center;
        }

        .hero-container { max-width: 800px; width: 100%; }
        
        .hero-badge {
          display: inline-block; padding: 6px 12px; border-radius: 99px;
          background: var(--accent-light); color: var(--accent);
          font-size: 12px; font-weight: 700; text-transform: uppercase;
          margin-bottom: 24px; letter-spacing: 0.05em;
        }

        .hero-title {
          font-size: 48px; line-height: 1.1; font-weight: 800; letter-spacing: -0.03em;
          color: var(--ink-primary); margin: 0 0 24px 0;
        }

        .hero-sub {
          font-size: 18px; line-height: 1.6; color: var(--ink-secondary);
          max-width: 600px; margin: 0 auto 48px;
        }

        .hero-actions { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .hero-caption { font-size: 13px; color: var(--ink-muted); margin: 0; }

        /* FOOTER */
        .plm-footer-links {
          display: flex; justify-content: center; gap: 16px; padding: 40px;
          color: var(--ink-muted); font-size: 12px; text-transform: uppercase;
        }
        .plm-footer-link { color: var(--ink-secondary); text-decoration: none; }
        .plm-footer-link:hover { text-decoration: underline; }

        /* AUTH MODAL */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(8px);
          z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: fadein 0.2s ease;
        }
        .modal-container { width: 100%; max-width: 400px; }
        .modal-card {
          background: white; border: 1px solid var(--border-strong);
          border-radius: var(--radius-lg); padding: 32px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1);
        }
        .modal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .modal-title { margin: 0; font-size: 20px; font-weight: 700; }
        .modal-close { background: none; border: none; color: var(--ink-muted); }
        .modal-close:hover { color: var(--ink-primary); }

        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--ink-secondary); letter-spacing: 0.05em; }
        .form-input {
          height: 42px; padding: 0 12px; border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm); font-size: 15px; color: var(--ink-primary);
          background: var(--bg-input); transition: border-color 0.15s;
        }
        .form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
        .form-input-wrap { position: relative; }
        .form-toggle-vis {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 11px; font-weight: 700; color: var(--ink-secondary);
        }
        .btn-full {
          width: 100%; height: 42px; background: var(--accent); color: white; border: none;
          border-radius: var(--radius-sm); font-weight: 600; font-size: 14px; margin-top: 8px;
        }
        .btn-full:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-full:disabled { opacity: 0.7; }
        
        .modal-message { padding: 10px; border-radius: var(--radius-sm); font-size: 13px; text-align: center; margin-top: 16px; }
        .modal-message.info { display: none; }
        .modal-message.err { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
        .modal-message.ok { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }

        .modal-footer { margin-top: 24px; text-align: center; display: flex; flex-direction: column; gap: 12px; }
        .modal-link { background: none; border: none; font-size: 13px; color: var(--ink-secondary); text-decoration: underline; }
        
        /* CHAT INTERFACE - Clipboard Style */
        .chat-root { display: flex; flex-direction: column; height: 100vh; background: var(--bg-page); }
        
        .chat-topbar {
          flex-shrink: 0; height: 64px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; border-bottom: 1px solid var(--border-main); background: var(--bg-page);
        }
        
        .chat-sub-badge {
          padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; background: var(--bg-panel); color: var(--ink-secondary);
          border: 1px solid var(--border-main); margin-right: 12px;
        }
        .chat-sub-badge.pro { color: #15803d; background: #dcfce7; border-color: #bbf7d0; }

        .chat-settings-wrap { position: relative; }
        .chat-settings-btn {
          width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
          color: var(--ink-secondary); border-radius: var(--radius-sm); transition: background 0.15s;
          border: none; background: transparent;
        }
        .chat-settings-btn:hover { background: var(--bg-panel); color: var(--ink-primary); }
        
        .chat-settings-menu {
          position: absolute; top: 100%; right: 0; width: 200px; margin-top: 8px;
          background: white; border: 1px solid var(--border-main); border-radius: var(--radius-md);
          box-shadow: var(--shadow-md); padding: 6px; z-index: 100;
        }
        .chat-settings-item {
          display: block; width: 100%; text-align: left; padding: 8px 12px;
          background: transparent; border: none; font-size: 13px; color: var(--ink-primary);
          border-radius: var(--radius-sm);
        }
        .chat-settings-item:hover { background: var(--bg-panel); }

        .chat-messages {
          flex: 1; overflow-y: auto; padding: 24px; scroll-behavior: smooth;
        }
        
        .chat-empty-state {
          height: 100%; display: flex; align-items: center; justify-content: center;
          color: var(--ink-muted); font-size: 14px;
        }
        
        .chat-history { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        
        .chat-message { display: flex; width: 100%; }
        .chat-message-user { justify-content: flex-end; }
        .chat-message-assistant { justify-content: flex-start; }
        
        .chat-bubble {
          max-width: 80%; padding: 16px 20px; border-radius: var(--radius-sm);
          font-size: 15px; line-height: 1.6; position: relative;
        }
        
        /* User: Clean Blue Card */
        .chat-bubble-user {
          background: var(--accent-light); color: var(--ink-primary);
          border: 1px solid #dbeafe;
        }
        
        /* Assistant: White Paper / Clipboard look */
        .chat-bubble-assistant {
          background: white; color: var(--ink-primary);
          border: 1px solid var(--border-strong);
          box-shadow: var(--shadow-sm);
        }
        
        .chat-content { white-space: pre-wrap; word-break: break-word; }
        .chat-bubble-image img {
          max-width: 100%; max-height: 300px; border-radius: 4px; border: 1px solid var(--border-main); display: block; margin-bottom: 12px;
        }

        /* INPUT AREA - Form Footer Style */
        .chat-input-area {
          flex-shrink: 0; background: var(--bg-page);
          border-top: 1px solid var(--border-main);
          padding: 20px 24px 32px;
        }
        
        .chat-input-inner { max-width: 720px; margin: 0 auto; position: relative; }
        
        .chat-attachment-pill {
          display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px;
          background: var(--bg-panel); border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm); font-size: 12px; color: var(--ink-primary);
          margin-bottom: 12px;
        }
        .chat-attachment-remove { border: none; background: none; color: var(--ink-secondary); }

        .chat-input-row { display: flex; align-items: flex-end; gap: 12px; }
        
        /* Camera Button - The "Draw" */
        .chat-camera-btn {
          width: 48px; height: 48px; border-radius: var(--radius-sm);
          background: white; border: 1px solid var(--border-strong);
          color: var(--accent); display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
        }
        .chat-camera-btn:hover {
          border-color: var(--accent); background: var(--accent-light);
          transform: translateY(-1px);
        }

        .chat-input-wrapper {
          flex: 1; display: flex; align-items: flex-end;
          border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
          background: white; min-height: 48px; transition: border-color 0.2s;
        }
        .chat-input-wrapper:focus-within { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
        
        .chat-textarea {
          flex: 1; border: none; background: transparent; padding: 14px;
          font-size: 15px; max-height: 160px; resize: none; color: var(--ink-primary);
        }
        
        .chat-send-btn {
          width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
          border: none; background: transparent; color: var(--ink-secondary);
        }
        .chat-send-btn:hover:not(:disabled) { color: var(--accent); }
        .chat-send-btn:disabled { color: var(--border-main); }
        
        .chat-disclaimer {
          text-align: center; font-size: 11px; color: var(--ink-muted);
          margin-top: 12px;
        }

        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 768px) {
          .hero-title { font-size: 32px; }
          .hero-sub { font-size: 16px; }
          .chat-bubble { max-width: 90%; }
          .chat-camera-btn { width: 44px; height: 44px; }
          .chat-input-wrapper { min-height: 44px; }
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
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {session && subscription && (
                    <div className={`chat-sub-badge ${subscription.status === 'active' ? 'pro' : ''}`}>
                      {subscription.status === 'trialing' ? 'Trial' : 'Pro License'}
                    </div>
                  )}
                  <div className="chat-settings-wrap" ref={settingsRef}>
                    <button
                      className="chat-settings-btn"
                      onClick={() => setShowSettingsMenu((v) => !v)}
                      aria-label="Settings"
                    >
                      <Icons.Gear />
                    </button>
                    {showSettingsMenu && (
                      <div className="chat-settings-menu">
                        <button
                          className="chat-settings-item"
                          onClick={() => {
                            setShowSettingsMenu(false)
                            hasActiveSubscription ? handleManageBilling() : setShowPricingModal(true)
                          }}
                        >
                          {hasActiveSubscription ? 'Billing Portal' : 'Upgrade License'}
                        </button>
                        <button
                          className="chat-settings-item"
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
                </div>
              </header>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`chat-messages ${messages.length === 0 ? 'empty' : ''}`}
              >
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <p style={{ maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
                      Ready for inspection.<br/>
                      Upload a photo of your prep area, sink, or storage to detect violations.
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
                              <img src={msg.image} alt="Evidence" />
                            </div>
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <span style={{color: 'var(--ink-muted)'}}>Analyzing compliance...</span>
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
                    <div className="chat-attachment-pill">
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="chat-attachment-remove">
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
                      title="Analyze Photo"
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
                        placeholder="Describe the issue or ask a regulation question..."
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
                         <Icons.ArrowUp />
                      </button>
                    </div>
                  </div>

                  <p className="chat-disclaimer">
                    protocolLM assists with compliance but is not a substitute for official Health Department inspection.
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
