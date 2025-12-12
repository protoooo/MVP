'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M5 14l.8 2.6L8.5 17l-2.7.9L5 20l-.8-2.1L1.5 17l2.7-.4L5 14z" />
    </svg>
  ),
}

/**
 * UI/UX-only landing behavior:
 * - Big “Liquid Glass” card stays visually independent (sticky + subtle drift).
 * - Top header stays fixed, bottom landing bar stays fixed.
 * - No functional / data / auth changes.
 */
function LandingPage({ onShowPricing, onShowAuth, scrollElRef }) {
  const shellRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const scroller = scrollElRef?.current
    const shell = shellRef.current
    if (!scroller || !shell) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

    const update = () => {
      rafRef.current = null

      // Use scroll to move the *light* and apply micro drift/tilt. Card itself is sticky (independent).
      const t = clamp(scroller.scrollTop, 0, 1200)
      const p = clamp(t / 900, 0, 1)

      // micro motion: feels like an object under glass, not content moving
      const driftY = (p * 10).toFixed(2) // px
      const tiltX = (p * 1.4).toFixed(3) // deg
      const tiltY = (p * -0.9).toFixed(3) // deg

      // Move a specular highlight across the glass (Apple-esque)
      const sheenX = (20 + p * 60).toFixed(2) // %
      const sheenY = (8 + p * 18).toFixed(2) // %

      shell.style.setProperty('--lg-drift-y', `${driftY}px`)
      shell.style.setProperty('--lg-tilt-x', `${tiltX}deg`)
      shell.style.setProperty('--lg-tilt-y', `${tiltY}deg`)
      shell.style.setProperty('--lg-sheen-x', `${sheenX}%`)
      shell.style.setProperty('--lg-sheen-y', `${sheenY}%`)

      shell.style.boxShadow = `0 40px 120px rgba(0,0,0,0.72), 0 ${22 + p * 10}px ${60 + p * 50}px rgba(0,0,0,0.55)`
    }

    const onScroll = () => {
      if (rafRef.current != null) return
      rafRef.current = window.requestAnimationFrame(update)
    }

    update()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [scrollElRef])

  return (
    <div className="ui-landing-stage">
      {/* Spacer above gives scroll room while card remains visually “separate” */}
      <div className="ui-landing-spacer" aria-hidden="true" />

      <div className="ui-landing-stickwrap">
        <div ref={shellRef} className="ui-shell ui-shell--liquid ui-shell--sticky">
          <div className="ui-hero">
            <div className="ui-kickers">
              <span className={`ui-kicker ${inter.className}`}>
                <Icons.Shield /> Inspection-grade
              </span>
              <span className={`ui-kicker-muted ${inter.className}`}>Michigan-first · enterprise posture</span>
            </div>

            <h1 className={`ui-title ${outfit.className}`}>Inspection-grade compliance, operationalized.</h1>

            <p className={`ui-subtitle ${inter.className}`}>
              Serious answers grounded in Michigan Food Code and Washtenaw guidance. Photo risk scans, concise checklists, and a workflow
              your team can run without guesswork.
            </p>

            <div className="ui-cta-row">
              <button onClick={onShowPricing} className="ui-btn ui-btn-primary">
                Start trial
              </button>
              <button onClick={onShowAuth} className="ui-btn ui-btn-secondary">
                Sign in
              </button>
            </div>

            <div className={`ui-trust ${inter.className}`}>
              <span className="ui-trust-item">
                <Icons.Lock /> Secure by design
              </span>
              <span className="ui-dot" />
              <span className="ui-trust-item">
                <Icons.Spark /> Operator-focused
              </span>
              <span className="ui-dot" />
              <span className="ui-trust-item">
                <Icons.Shield /> Built for audits
              </span>
            </div>
          </div>

          <div className="ui-specgrid">
            <div className="ui-spec">
              <div className={`ui-spec-title ${inter.className}`}>Photo risk scan</div>
              <div className={`ui-spec-body ${inter.className}`}>Upload a walk-in or line photo. Verify the likely issues fast.</div>
            </div>

            <div className="ui-spec">
              <div className={`ui-spec-title ${inter.className}`}>Grounded answers</div>
              <div className={`ui-spec-body ${inter.className}`}>Ask normal questions. Get rulebook-backed guidance you can cite.</div>
            </div>

            <div className="ui-spec">
              <div className={`ui-spec-title ${inter.className}`}>Action checklist</div>
              <div className={`ui-spec-body ${inter.className}`}>Convert concerns into a short open/close list your lead can run today.</div>
            </div>
          </div>

          <div className={`ui-footerline ${inter.className}`}>One site license per restaurant · 7-day trial · Cancel anytime</div>
        </div>
      </div>

      {/* Footer is real content that scrolls “behind” the sticky card */}
      <footer className="ui-landing-footer text-xs">
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/terms" className="hover:text-white/75 text-white/55">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white/75 text-white/55">
            Privacy
          </Link>
          <Link href="/contact" className="hover:text-white/75 text-white/55">
            Contact
          </Link>
        </div>
        <div className={`mt-3 text-center text-white/40 ${inter.className}`}>Built for operators. Not for hobbyists.</div>
      </footer>

      {/* Spacer below gives more scroll so you can feel the card independence */}
      <div className="ui-landing-spacer ui-landing-spacer--bottom" aria-hidden="true" />
    </div>
  )
}

function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { isLoaded, executeRecaptcha } = useRecaptcha()

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken) {
        setMessage('Error: Security verification failed. Please try again.')
        return
      }

      let endpoint = ''
      const body = { email, captchaToken }

      if (mode === 'reset') {
        endpoint = '/api/auth/reset-password'
      } else {
        body.password = password
        endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(`Error: ${data.error || 'Authentication failed'}`)
        return
      }

      if (mode === 'reset') {
        setMessage('✓ Check your email for password reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else if (mode === 'signup') {
        setMessage('✓ Account created. Check your email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else {
        setMessage('✓ Signed in. Redirecting…')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 600)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Error: Unexpected issue. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md ui-modal p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className={`text-lg font-semibold text-white tracking-tight mb-1 ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs text-white/60 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="ui-icon-btn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className={`ui-input ${inter.className}`}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`ui-input pr-16 ${inter.className}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isLoaded} className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs rounded-lg px-3 py-2 ui-toast ${message.startsWith('Error') ? 'ui-toast-err' : 'ui-toast-ok'}`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/70">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full text-white/70 hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full text-white/70 hover:text-white">
                Need an account? <span className="font-semibold">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/70 hover:text-white">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="text-white/70 hover:text-white">
              Back to sign in
            </button>
          )}
        </div>

        <RecaptchaBadge />
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[900] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-xl ui-modal p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="ui-icon-btn absolute right-6 top-6" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-6">
          <div className={`ui-tag ${inter.className}`}>Enterprise • Single site license</div>
          <h3 className={`text-2xl font-semibold text-white mb-2 tracking-tight ${outfit.className}`}>protocolLM Access</h3>
          <p className={`text-sm text-white/60 ${inter.className}`}>For operators who want inspection-grade confidence. Includes full chat + photo scanning.</p>
        </div>

        <div className="ui-pricewrap p-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-semibold text-white tracking-tight ${outfit.className}`}>$200</span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">/ month</span>
              </div>
              <p className={`text-xs text-white/55 mt-2 ${inter.className}`}>
                Includes roughly <span className="font-semibold text-white">2,600 monthly checks</span>. Text questions count as one check; photo analyses count as two.
              </p>
            </div>

            <div className={`ui-badge ${inter.className}`}>
              <Icons.Shield />
              Premium tier
            </div>
          </div>

          <div className="ui-divider my-5" />

          <ul className="text-xs text-white/70 space-y-2">
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Text + photo compliance checks</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>Grounded in Michigan Food Code &amp; Washtenaw guidance</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>One restaurant site license</span>
            </li>
            <li className="flex items-start gap-2">
              <Icons.Check />
              <span>7-day free trial · cancel anytime</span>
            </li>
          </ul>

          <div className="space-y-3 pt-5">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className="ui-btn ui-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? 'Processing…' : 'Start $200/mo trial'}
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="ui-btn ui-btn-secondary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'annual' ? 'Processing…' : 'Annual · save 15%'}
            </button>

            <p className={`text-[11px] text-white/45 text-center ${inter.className}`}>Not for hobbyists. Built for real operators who want inspection-ready workflows.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const [currentChatId, setCurrentChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const [showUserMenu, setShowUserMenu] = useState(false)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const userMenuRef = useRef(null)

  // Landing scroll container ref (for sticky card lighting/micro motion)
  const landingScrollRef = useRef(null)

  const shouldAutoScrollRef = useRef(true)

  const scrollToBottom = (behavior = 'auto') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 120
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < threshold
  }

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom('auto'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [messages])

  useEffect(() => {
    let isMounted = true

    async function loadSessionAndSub(s) {
      if (!isMounted) return
      setSession(s)

      if (!s) {
        setHasActiveSubscription(false)
        setShowPricingModal(false)
        setIsLoading(false)
        return
      }

      let active = false
      try {
        if (s.user.email === ADMIN_EMAIL) {
          active = true
        } else {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status,current_period_end')
            .eq('user_id', s.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()

          if (sub && sub.current_period_end) {
            const end = new Date(sub.current_period_end)
            if (end > new Date()) active = true
          }
        }
      } catch (e) {
        console.error('Subscription check error', e)
      }

      if (!isMounted) return
      setHasActiveSubscription(active)
      setIsLoading(false)
    }

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        await loadSessionAndSub(data.session || null)
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
  }, [supabase, searchParams])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('ui-enterprise-bg')
    return () => {
      document.body.classList.remove('ui-enterprise-bg')
    }
  }, [])

  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCheckout = async (priceId, planName) => {
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setShowPricingModal(false)
        setShowAuthModal(true)
        return
      }
      if (!priceId) {
        alert('Invalid price selected.')
        return
      }

      setCheckoutLoading(planName)

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Checkout failed')
      }

      const payload = await res.json()
      if (payload.url) {
        window.location.href = payload.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + (error.message || 'Unknown error'))
      setCheckoutLoading(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('Sign out error', e)
    } finally {
      setMessages([])
      setCurrentChatId(null)
      router.replace('/')
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null)
    shouldAutoScrollRef.current = true
    requestAnimationFrame(() => scrollToBottom('auto'))
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage

    const newUserMessage = { role: 'user', content: question, image }
    setMessages((prev) => [...prev, newUserMessage, { role: 'assistant', content: '' }])
    setInput('')
    setSelectedImage(null)
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
        updated[updated.length - 1] = {
          role: 'assistant',
          content: data.message || 'No response.',
        }
        return updated
      })
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${error.message}`,
        }
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
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
        }

        body.ui-enterprise-bg {
          overflow: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.92);
        }

        /* Background: calm, premium, no grid */
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1100px 520px at 50% -10%, rgba(255, 255, 255, 0.13), transparent 56%),
            radial-gradient(980px 560px at 18% 6%, rgba(0, 255, 200, 0.085), transparent 58%),
            radial-gradient(980px 560px at 86% 8%, rgba(120, 90, 255, 0.085), transparent 60%),
            radial-gradient(900px 900px at 50% 72%, rgba(255, 255, 255, 0.035), transparent 62%),
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.016) 0px, rgba(255, 255, 255, 0.016) 1px, transparent 1px, transparent 10px);
          opacity: 1;
          mask-image: radial-gradient(circle at 50% 20%, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0));
        }

        /* Vignette */
        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.64) 74%);
          opacity: 0.96;
        }

        ::-webkit-scrollbar {
          width: 9px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.14);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Header (fixed feel) */
        .ui-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(5, 6, 8, 0.68);
          backdrop-filter: blur(18px) saturate(1.2);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
        }

        .ui-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
        }

        /* Landing scroll stage */
        .ui-landing-stage {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 18px 14px;
        }

        /* Create scroll space so sticky card feels “independent” */
        .ui-landing-spacer {
          height: clamp(24px, 6vh, 70px);
        }
        .ui-landing-spacer--bottom {
          height: clamp(120px, 18vh, 220px);
        }

        /* The sticky wrapper keeps the card visible while other content scrolls */
        .ui-landing-stickwrap {
          position: sticky;
          top: calc(72px + 10px); /* header height + breathing room */
          z-index: 5;
          display: flex;
          justify-content: center;
        }

        /* Footer scrolls beneath the card */
        .ui-landing-footer {
          margin-top: 18px;
          padding: 18px 10px 0;
        }

        /* Premium “Apple-esque” Liquid Glass shell */
        .ui-shell {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          width: min(980px, 100%);
        }

        .ui-shell--liquid {
          /* CSS vars controlled by JS */
          --lg-drift-y: 0px;
          --lg-tilt-x: 0deg;
          --lg-tilt-y: 0deg;
          --lg-sheen-x: 35%;
          --lg-sheen-y: 12%;

          transform: translate3d(0, var(--lg-drift-y), 0) rotateX(var(--lg-tilt-x)) rotateY(var(--lg-tilt-y));
          transform-style: preserve-3d;
          will-change: transform, box-shadow;

          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(22px) saturate(1.3);
          -webkit-backdrop-filter: blur(22px) saturate(1.3);
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.72);

          /* subtle internal contrast to make it easy to see */
          outline: 1px solid rgba(0, 0, 0, 0.38);
          outline-offset: -2px;
        }

        /* Specular highlight + edge glow */
        .ui-shell--liquid::before {
          content: '';
          position: absolute;
          inset: -1px;
          pointer-events: none;
          background:
            radial-gradient(900px 340px at var(--lg-sheen-x) var(--lg-sheen-y), rgba(255, 255, 255, 0.20), transparent 58%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), transparent 34%),
            radial-gradient(700px 420px at 18% 12%, rgba(0, 255, 200, 0.06), transparent 60%),
            radial-gradient(700px 420px at 86% 12%, rgba(120, 90, 255, 0.06), transparent 60%);
          opacity: 0.95;
          mix-blend-mode: screen;
        }

        /* Noise + inner rim light (keeps it “real glass”, not flat) */
        .ui-shell--liquid::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 36%),
            radial-gradient(1200px 520px at 50% 0%, rgba(255, 255, 255, 0.06), transparent 62%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E");
          background-size: auto, auto, 160px 160px;
          opacity: 0.22;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05),
            inset 0 0 0 1px rgba(0, 0, 0, 0.25);
        }

        .ui-hero {
          padding: clamp(18px, 2.6vw, 28px) clamp(16px, 2.4vw, 22px) 18px;
          position: relative;
          z-index: 1;
        }

        .ui-kickers {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 14px;
        }

        .ui-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.05);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.86);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
        }

        .ui-kicker-muted {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }

        .ui-title {
          font-size: clamp(30px, 4vw, 56px);
          line-height: 1.02;
          letter-spacing: -0.05em;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
        }

        .ui-subtitle {
          font-size: 14px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.74);
          max-width: 72ch;
        }

        .ui-cta-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        .ui-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }

        .ui-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
        }

        .ui-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        /* Spec grid */
        .ui-specgrid {
          display: grid;
          grid-template-columns: 1fr;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          position: relative;
          z-index: 1;
        }

        .ui-spec {
          padding: 18px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ui-spec:first-child {
          border-top: none;
        }

        .ui-spec-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.94);
          margin-bottom: 6px;
        }

        .ui-spec-body {
          font-size: 12px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.68);
          max-width: 76ch;
        }

        @media (min-width: 920px) {
          .ui-specgrid {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .ui-spec {
            border-top: none;
            border-left: 1px solid rgba(255, 255, 255, 0.08);
          }
          .ui-spec:first-child {
            border-left: none;
          }
        }

        .ui-footerline {
          padding: 14px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.52);
          font-size: 12px;
          position: relative;
          z-index: 1;
        }

        /* Buttons */
        .ui-btn {
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
          user-select: none;
        }

        .ui-btn:active {
          transform: translateY(1px);
        }

        .ui-btn-primary {
          background: #ffffff;
          color: #000000;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }

        .ui-btn-primary:hover {
          box-shadow: 0 26px 80px rgba(0, 0, 0, 0.58);
        }

        .ui-btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .ui-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .ui-icon-btn {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.84);
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
        }

        .ui-icon-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.96);
        }

        /* Modals / panels */
        .ui-modal {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(6, 7, 9, 0.86);
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(18px) saturate(1.2);
          -webkit-backdrop-filter: blur(18px) saturate(1.2);
        }

        .ui-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.94);
          outline: none;
          transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }

        .ui-input::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }

        .ui-input:focus {
          border-color: rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.06);
        }

        .ui-toast {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
        }

        .ui-toast-ok {
          border-color: rgba(34, 197, 94, 0.35);
        }

        .ui-toast-err {
          border-color: rgba(239, 68, 68, 0.35);
        }

        /* Pricing surfaces */
        .ui-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.78);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 800;
          width: fit-content;
        }

        .ui-pricewrap {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.016));
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
          position: relative;
          overflow: hidden;
        }

        .ui-pricewrap::before {
          content: '';
          position: absolute;
          inset: -40% -30%;
          background:
            radial-gradient(circle at 25% 20%, rgba(255, 255, 255, 0.12), transparent 45%),
            radial-gradient(circle at 80% 20%, rgba(0, 255, 200, 0.07), transparent 55%),
            radial-gradient(circle at 60% 80%, rgba(120, 90, 255, 0.07), transparent 55%);
          pointer-events: none;
        }

        .ui-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-weight: 700;
        }

        .ui-divider {
          height: 1px;
          width: 100%;
          background: rgba(255, 255, 255, 0.09);
        }

        /* Chat bubbles — tool-like */
        .ui-bubble {
          border-radius: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
        }

        .ui-bubble-user {
          background: rgba(255, 255, 255, 0.94);
          color: #000;
          border-color: rgba(255, 255, 255, 0.22);
        }

        .ui-empty {
          color: rgba(255, 255, 255, 0.62);
        }

        /* Fixed bottom bar for landing (top+bottom fixed, middle scroll) */
        .ui-landing-bottombar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(5, 6, 8, 0.58);
          backdrop-filter: blur(20px) saturate(1.25);
          -webkit-backdrop-filter: blur(20px) saturate(1.25);
        }

        .ui-landing-bottombar-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 14px;
          padding-bottom: max(10px, env(safe-area-inset-bottom));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .ui-landing-bottombar-note {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.50);
          line-height: 1.3;
        }

        @media (max-width: 520px) {
          .ui-landing-bottombar-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .ui-landing-bottombar-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .ui-landing-bottombar-note {
            text-align: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
          }
          .ui-shell--liquid {
            transform: none !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="h-[100dvh] min-h-0 flex flex-col">
        {/* Top header stays fixed */}
        <header className="sticky top-0 z-50 flex-shrink-0 ui-header">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`ui-brand ${outfit.className}`}>
                <span className="text-white/92 text-[12px] font-semibold tracking-[0.14em] uppercase">protocolLM</span>
              </div>
              {hasActiveSubscription && (
                <span className={`hidden sm:inline-flex text-[11px] text-white/55 ${inter.className}`}>Active · site license</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className="ui-btn ui-btn-secondary">
                    Sign in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className="ui-btn ui-btn-primary">
                    Start trial
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleNewChat} className="ui-btn ui-btn-secondary hidden sm:inline-flex items-center gap-2">
                    <Icons.Plus />
                    New chat
                  </button>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="ui-icon-btn"
                      aria-label="User menu"
                      title={session?.user?.email || 'User'}
                    >
                      <span className="text-xs font-semibold">{session.user.email?.[0]?.toUpperCase() || 'U'}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-52 ui-modal overflow-hidden">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/75 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Icons.Settings />
                          <span>Subscription</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-white/5 transition-colors"
                        >
                          <Icons.LogOut />
                          <span>Log out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col">
          {!isAuthenticated ? (
            <>
              {/* Middle scroll area (between fixed top + fixed bottom) */}
              <div
                ref={landingScrollRef}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{
                  overscrollBehavior: 'contain',
                  scrollbarGutter: 'stable',
                  paddingBottom: 'calc(88px + env(safe-area-inset-bottom))', // room for bottom bar
                }}
              >
                <LandingPage onShowPricing={() => setShowPricingModal(true)} onShowAuth={() => setShowAuthModal(true)} scrollElRef={landingScrollRef} />
              </div>

              {/* Fixed bottom bar */}
              <div className="ui-landing-bottombar">
                <div className="ui-landing-bottombar-inner">
                  <div className={`ui-landing-bottombar-note ${inter.className}`}>
                    Inspection workflows for operators. Grounded, auditable output.
                  </div>
                  <div className="ui-landing-bottombar-actions flex gap-2">
                    <button onClick={() => setShowAuthModal(true)} className="ui-btn ui-btn-secondary">
                      Sign in
                    </button>
                    <button onClick={() => setShowPricingModal(true)} className="ui-btn ui-btn-primary">
                      Start trial
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable', paddingBottom: '2px' }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center px-4">
                    <div className="max-w-xl text-center">
                      <p className={`text-sm leading-relaxed ui-empty ${inter.className}`}>
                        Ask about Michigan Food Code requirements, Washtenaw enforcement actions, or attach a photo for an inspection-grade risk scan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ui-bubble ${msg.role === 'user' ? 'ui-bubble-user' : ''}`}>
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="mb-3 rounded-xl border border-white/10 max-h-64 object-contain bg-black/30"
                            />
                          )}
                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-white/35 animate-bounce" style={{ animationDelay: '0.24s' }} />
                            </div>
                          ) : (
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 ui-header border-t border-white/10">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[12px] text-white/70">
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="ui-icon-btn !w-8 !h-8" aria-label="Remove image">
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-icon-btn" aria-label="Attach image">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`ui-input flex-1 max-h-32 min-h-[42px] resize-none ${inter.className}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />

                      <button
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className={`ui-icon-btn ${(!input.trim() && !selectedImage) || isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center text-white/40 ${inter.className}`}>
                    protocolLM may make mistakes. Confirm critical decisions with official regulations and your local health department.
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
