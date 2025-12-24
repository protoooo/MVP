// app/page.client.js
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { compressImage } from '@/lib/imageCompression'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import SmartProgress from '@/components/SmartProgress'
import PricingModal from '@/components/PricingModal'
import LiquidGlass from '@/components/ui/LiquidGlass'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

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
      <line x1="18" y1="6" x2="6" y1="18" />
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
  const isChat = variant === 'chat'
  return (
    <Link href="/" className={`plm-brand ${variant}`} aria-label="protocolLM home">
      <span className="plm-brand-inner">
        <span className="plm-brand-mark" aria-hidden="true">
          <Image src={appleIcon} alt="" width={69} height={69} priority />
        </span>
        {!isChat && <span className="plm-brand-text">protocolLM</span>}
      </span>
    </Link>
  )
}

function FooterLinks() {
  return (
    <div className={`plm-footer-links ${plusJakarta.className}`}>
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
    <div className={`${plusJakarta.className} landing-root`}>
      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="plm-brand-wrap">
            <BrandLink variant="landing" />
          </div>

          <nav className="landing-top-actions" aria-label="Top actions">
            <button onClick={onShowAuth} className="btn-nav landing-signin-btn" type="button">
              Sign in
            </button>
          </nav>
        </div>
      </header>

      <main className="landing-hero">
        <LiquidGlass variant="main" className="landing-hero-card">
          <div className="hero-content">
            <div className="hero-headings">
              <h1 className={`hero-title ${plusJakarta.className}`}>Catch Violations, Not Fines.</h1>
              <p className="hero-support">
                Take a photo or ask a question. Catch violations by simply taking pictures in your establishment, and get
                instant answers and guidance from Washtenaw County Food Safety Regulations.
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
        </LiquidGlass>
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
        <div className={`modal-card auth-modal glass-surface ${plusJakarta.className}`}>
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
              <div className="form-input-wrap">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="form-input"
                  autoComplete="username"
                  inputMode="email"
                  autoFocus
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="form-input"
                    autoComplete="current-password"
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

  // ✅ UPDATED: ensures we send the image data URL at top-level `image`,
  // and also include it inside the latest user message object.
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage || null

    setSendMode(image ? 'vision' : 'text')
    setSendKey((k) => k + 1)

    const newUserMessage = { role: 'user', content: question, image }

    const baseMessages = messages
    const outgoingMessages = [...baseMessages, newUserMessage]

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
          messages: outgoingMessages,
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
      <div className={`loading-screen ${plusJakarta.className}`}>
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
          --bg-0: rgba(5, 7, 13, 0.72);
          --bg-1: rgba(7, 10, 18, 0.78);
          --bg-2: rgba(9, 13, 22, 0.82);
          --bg-3: rgba(255, 255, 255, 0.1);

          --ink-0: #f6f9ff;
          --ink-1: rgba(240, 244, 255, 0.86);
          --ink-2: rgba(214, 222, 240, 0.76);
          --ink-3: rgba(178, 190, 215, 0.6);

          --accent: #5fa8ff;
          --accent-hover: #7bc2ff;
          --accent-dim: rgba(95, 168, 255, 0.2);

          --border-subtle: rgba(255, 255, 255, 0.18);
          --border-default: rgba(255, 255, 255, 0.32);

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
          background: transparent;
          background-color: transparent;
          color: var(--ink-0);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior-y: none;
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

        .loading-bar {
          width: 160px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          overflow: hidden;
          position: relative;
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

        .plm-brand-wrap {
          min-width: 0;
        }

        .plm-brand-text {
          font-size: 21px;
          font-weight: 600;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Chat brand: logo only (no text) + tighter sizing */
        .plm-brand.chat .plm-brand-inner {
          gap: 0;
        }
        .plm-brand.chat .plm-brand-mark {
          width: 56px;
          height: 56px;
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
          background: transparent;
          overflow: hidden;
          isolation: isolate;
        }

        .landing-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          padding: max(18px, env(safe-area-inset-top) + 8px) max(22px, env(safe-area-inset-right) + 8px) 0
            max(22px, env(safe-area-inset-left) + 8px);
        }

        .landing-topbar-inner {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: none;
          padding: 0;
        }

        .landing-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
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

        .landing-hero-card {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 40px 48px;
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

        /* NEW: header font via Outfit + darker legible color */
        .hero-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 800;
          color: rgba(15, 23, 42, 0.92);
          letter-spacing: -0.03em;
          margin: 0;
        }

        .hero-support {
          margin: 0;
          font-size: 16px;
          line-height: 1.65;
          color: rgba(30, 41, 59, 0.74);
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

        /* FIX: this was too light on the light hero card */
        .hero-arrow-text {
          white-space: nowrap;
          color: rgba(15, 23, 42, 0.82);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .hero-arrow-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          color: rgba(15, 23, 42, 0.72);
          border-radius: 9999px;
          border: 1px solid rgba(15, 23, 42, 0.18);
          background: rgba(255, 255, 255, 0.22);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 10px 26px rgba(5, 7, 13, 0.18);
          animation: arrow-pulse-alt 1.6s ease-in-out infinite;
        }

        @keyframes arrow-pulse-alt {
          0%,
          100% {
            transform: translateX(0);
            opacity: 0.65;
          }
          50% {
            transform: translateX(3px);
            opacity: 1;
          }
        }

        .hero-arrow-icon svg {
          width: 16px;
          height: 16px;
          stroke-width: 2.4;
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
          box-shadow: 0 12px 30px rgba(95, 168, 255, 0.24);
          transition: transform 0.12s ease;
        }

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
        }

        .hero-cta-trace::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: var(--radius-full);
          background: radial-gradient(circle at 30% 30%, rgba(95, 168, 255, 0.25), transparent 40%);
          opacity: 0.4;
          filter: blur(12px);
          pointer-events: none;
        }

        .hero-cta span {
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .hero-cta:hover {
          transform: translateY(-1px);
        }

        .hero-cta:active {
          transform: translateY(0);
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
          background: radial-gradient(120% 70% at 12% 10%, rgba(255, 255, 255, 0.08), transparent 50%),
            radial-gradient(120% 70% at 88% 0%, rgba(95, 168, 255, 0.12), transparent 52%),
            rgba(5, 7, 13, 0.7);
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
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
          border: 1px solid rgba(255, 255, 255, 0.26);
          border-radius: 20px;
          padding: 30px;
          background: linear-gradient(170deg, rgba(6, 11, 20, 0.9), rgba(10, 16, 26, 0.84));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 28px 76px rgba(5, 7, 13, 0.42);
          backdrop-filter: blur(20px) saturate(135%);
          -webkit-backdrop-filter: blur(20px) saturate(135%);
        }

        .modal-header {
          margin-bottom: 18px;
        }

        .modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--ink-0);
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

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .form-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: var(--radius-sm);
          padding: 0 10px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.48);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          overflow: hidden;
        }

        .form-input-wrap:focus-within {
          border-color: var(--accent);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 0 3px var(--accent-dim);
        }

        .form-input {
          width: 100%;
          height: 44px;
          background: transparent;
          border: none;
          color: var(--ink-0);
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          padding: 0 2px;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .form-input:focus {
          outline: none;
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0f172a;
          -webkit-box-shadow: 0 0 0px 1000px rgba(255, 255, 255, 0.14) inset;
          box-shadow: 0 0 0px 1000px rgba(255, 255, 255, 0.14) inset;
          transition: background-color 9999s ease-out 0s;
          caret-color: #0f172a;
        }

        .form-toggle-vis {
          background: none;
          border: none;
          color: var(--ink-1);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 6px;
          margin-right: -6px;
        }

        .form-toggle-vis:hover {
          color: var(--accent);
        }

        .btn-submit {
          margin-top: 4px;
          height: 46px;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 30px rgba(95, 168, 255, 0.24);
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .modal-message {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          line-height: 1.4;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
          color: var(--ink-0);
        }

        .modal-message.ok {
          color: #34d399;
          border-color: rgba(52, 211, 153, 0.35);
          background: rgba(52, 211, 153, 0.08);
        }

        .modal-message.err {
          color: #f87171;
          border-color: rgba(248, 113, 113, 0.35);
          background: rgba(248, 113, 113, 0.08);
        }

        .modal-footer {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          text-align: center;
        }

        .modal-link {
          background: none;
          border: none;
          color: var(--accent);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          text-decoration: none;
        }

        .modal-link:hover {
          color: var(--accent-hover);
        }

        .modal-footer .modal-link {
          color: var(--ink-1);
          font-weight: 600;
        }

        .modal-footer .modal-link:hover {
          color: var(--ink-0);
        }

        /* Auth modal refinements */
        .auth-modal {
          background: linear-gradient(165deg, rgba(10, 14, 26, 0.92), rgba(18, 25, 40, 0.88));
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.38),
            0 32px 80px rgba(5, 7, 13, 0.5);
        }

        .auth-modal .modal-title {
          font-size: 22px;
        }

        .auth-modal .form-group {
          gap: 8px;
        }

        .auth-modal .form-label {
          color: rgba(246, 249, 255, 0.82);
          letter-spacing: 0.05em;
        }

        .auth-modal .form-input-wrap {
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.26);
          padding: 0 12px;
        }

        .auth-modal .form-input-wrap:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }

        .auth-modal .form-input {
          height: 46px;
          color: var(--ink-0);
          font-size: 15px;
        }

        .auth-modal .form-input::placeholder {
          color: rgba(246, 249, 255, 0.7);
        }

        .auth-modal .btn-submit {
          height: 48px;
          border-radius: 12px;
          font-size: 15px;
        }

        .auth-modal .modal-footer .modal-link {
          color: var(--ink-1);
        }

        .auth-modal .modal-footer .modal-link:hover {
          color: var(--ink-0);
        }

        /* Pricing modal polish - align with info pages glass look */
        .pricing-modal {
          padding: 32px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 22px;
          max-width: 540px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.45),
            0 24px 70px rgba(5, 7, 13, 0.34);
          backdrop-filter: blur(16px) saturate(135%);
          -webkit-backdrop-filter: blur(16px) saturate(135%);
        }

        .pricing-container {
          max-width: 540px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 6px;
        }

        .pricing-header {
          text-align: center;
          margin-bottom: 22px;
        }

        .pricing-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink-0);
        }

        .pricing-card-shell {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 18px;
          padding: 28px;
          color: var(--ink-0);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.48),
            0 22px 60px rgba(5, 7, 13, 0.3);
        }

        .pricing-price-block {
          text-align: center;
          margin-bottom: 20px;
        }

        .pricing-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .pricing-price-figure {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .pricing-price-period {
          font-size: 16px;
          color: rgba(246, 249, 255, 0.7);
        }

        .pricing-subtitle {
          font-size: 13px;
          color: rgba(246, 249, 255, 0.82);
        }

        .pricing-cta {
          width: 100%;
          height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(120deg, #7bc2ff, #5fa8ff);
          color: #05070d;
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 9999px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 20px;
          box-shadow: 0 18px 44px rgba(95, 168, 255, 0.32);
          transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
        }

        .pricing-cta:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }

        .pricing-cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .pricing-features {
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pricing-feature {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: rgba(246, 249, 255, 0.88);
          line-height: 1.6;
        }

        .pricing-feature-check {
          color: var(--accent);
          font-weight: 700;
          margin-top: 1px;
        }

        .pricing-feature-text {
          flex: 1;
        }

        .pricing-note {
          margin-top: 18px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 14px;
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .pricing-note-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 8px;
        }

        .pricing-note-text {
          font-size: 13px;
          color: rgba(246, 249, 255, 0.84);
          line-height: 1.55;
          margin: 0;
        }

        .pricing-legal {
          font-size: 11px;
          color: rgba(246, 249, 255, 0.66);
          margin-top: 16px;
          text-align: center;
          line-height: 1.5;
        }

        .pricing-legal a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }

        /* Chat */
        .chat-root {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100dvh;
          height: 100svh;
          min-height: 100dvh;
          min-height: 100svh;
          max-height: 100svh;
          overflow: hidden;
        }

        @supports (-webkit-touch-callout: none) {
          .chat-root {
            height: -webkit-fill-available;
            min-height: -webkit-fill-available;
          }
        }

        /* TOP BAR: remove the black strip entirely (logo + gear float on background) */
        .chat-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 20;
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: max(14px, env(safe-area-inset-top) + 8px) max(18px, env(safe-area-inset-right) + 12px) 0
            max(18px, env(safe-area-inset-left) + 12px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        .chat-top-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .chat-settings-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .chat-settings-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          color: var(--ink-0);
          cursor: pointer;
          transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
        }

        .chat-settings-btn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.24);
        }

        .chat-settings-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: 0 16px 48px rgba(5, 7, 13, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
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

        /* Messages fill the screen; offset top so content doesn't sit under logo */
        .chat-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: calc(max(76px, env(safe-area-inset-top) + 76px)) 24px 12px;
          background: transparent;
        }

        .chat-messages.empty {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-empty-text {
          font-size: 14px;
          color: rgba(15, 23, 42, 0.7);
          line-height: 1.6;
          margin: 0;
          text-align: center;
          background: rgba(255, 255, 255, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.28);
          padding: 12px 14px;
          border-radius: 14px;
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
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
          color: rgba(15, 23, 42, 0.86);
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
          color: rgba(15, 23, 42, 0.7);
          font-style: italic;
        }

        /* BOTTOM BAR: remove the black strip; keep ONLY the glass dock */
        .chat-input-area {
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          background: transparent;
          border-top: none;
          z-index: 15;
        }

        .chat-input-inner {
          max-width: 840px;
          width: min(100%, 920px);
          margin: 0 auto;
          padding: 12px 24px;
          padding-bottom: calc(env(safe-area-inset-bottom) + 14px);
        }

        .chat-dock {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px 16px;
          border-radius: var(--radius-lg);
        }

        .chat-attachment {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.86);
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
          color: rgba(15, 23, 42, 0.72);
          cursor: pointer;
        }

        .chat-attachment-remove:hover {
          color: rgba(15, 23, 42, 0.9);
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .chat-camera-btn {
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          overflow: visible;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 10px 26px rgba(5, 7, 13, 0.18);
          backdrop-filter: blur(12px) saturate(120%);
          -webkit-backdrop-filter: blur(12px) saturate(120%);
        }

        .chat-camera-btn:hover {
          border-color: var(--accent-hover);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }

        .chat-input-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06));
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: var(--radius-md);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          min-width: 0;
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          min-height: 48px;
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
          color: rgba(15, 23, 42, 0.96);
          font-size: 16px;
          line-height: 1.4;
          resize: none;
          font-family: inherit;
          min-width: 0;
        }

        .chat-textarea::placeholder {
          color: rgba(15, 23, 42, 0.7);
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
          background: linear-gradient(125deg, #7bc2ff, #5fa8ff);
          border: 1px solid rgba(255, 255, 255, 0.42);
          color: #0b1220;
          cursor: pointer;
          flex-shrink: 0;
          border-radius: 12px;
          transition: transform 0.12s ease, filter 0.12s ease;
          box-shadow: 0 10px 28px rgba(95, 168, 255, 0.28);
        }

        .chat-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
        .chat-send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          box-shadow: none;
        }

        .chat-send-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border-subtle);
          border-top-color: var(--accent);
          border-radius: var(--radius-full);
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .chat-disclaimer {
          text-align: center;
          font-size: 11px;
          color: rgba(15, 23, 42, 0.72);
          margin-top: 8px;
        }

        /* Responsive */
        @media (max-width: 768px) {
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

          .chat-topbar {
            padding: max(12px, env(safe-area-inset-top) + 8px) max(14px, env(safe-area-inset-right) + 10px) 0
              max(14px, env(safe-area-inset-left) + 10px);
          }

          .chat-messages {
            padding: calc(max(70px, env(safe-area-inset-top) + 70px)) 16px 10px;
          }

          .chat-input-inner {
            padding: 10px 14px;
            padding-bottom: calc(env(safe-area-inset-bottom) + 12px);
          }

          .chat-dock {
            padding: 12px 12px;
            gap: 10px;
          }

          .chat-camera-btn,
          .chat-send-btn {
            width: 42px;
            height: 42px;
          }

          .chat-bubble {
            max-width: 85%;
          }

          .chat-empty-text {
            font-size: 13px;
          }

          .landing-topbar {
            padding: max(14px, env(safe-area-inset-top) + 6px) max(14px, env(safe-area-inset-right) + 6px) 0
              max(14px, env(safe-area-inset-left) + 6px);
            gap: 10px;
          }

          .landing-hero {
            padding: 0 20px;
          }

          .landing-hero-card {
            padding: 28px 24px;
          }

          .plm-brand-mark {
            width: 64px;
            height: 64px;
          }
          .plm-brand-text {
            font-size: 19px;
            max-width: 220px;
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

          .plm-brand.chat .plm-brand-mark {
            width: 54px;
            height: 54px;
          }

          .chat-input-inner {
            padding: 10px 12px;
          }

          .chat-dock {
            padding: 12px 10px;
          }

          .chat-camera-btn,
          .chat-send-btn {
            width: 40px;
            height: 40px;
          }

          .chat-textarea {
            font-size: 15px;
            padding: 10px 12px;
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
            <div className={`${plusJakarta.className} chat-root`}>
              <header className="chat-topbar">
                <BrandLink variant="chat" />
                <nav className="chat-top-actions" aria-label="Chat actions">
                  {/* Removed the Pro/Trial pill entirely */}
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
                    <p className="chat-empty-text">Upload a photo or ask a question about Washtenaw County food safety regulations.</p>
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
                  <LiquidGlass variant="main" className="chat-dock">
                    <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                    {selectedImage && (
                      <LiquidGlass variant="side" className="chat-attachment">
                        <span className="chat-attachment-icon">
                          <Icons.Camera />
                        </span>
                        <span>Image attached</span>
                        <button onClick={() => setSelectedImage(null)} className="chat-attachment-remove" aria-label="Remove" type="button">
                          <Icons.X />
                        </button>
                      </LiquidGlass>
                    )}

                    <div className="chat-input-row">
                      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />

                      <button onClick={() => fileInputRef.current?.click()} className="chat-camera-btn" aria-label="Upload photo" type="button">
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
                  </LiquidGlass>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
