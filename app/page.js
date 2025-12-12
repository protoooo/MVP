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
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const examples = [
    'We found raw chicken above ready-to-eat food — what’s the correct fix?',
    'What temperature does hot soup need to stay at during service?',
    'Can we store sanitizer spray bottles next to prep tables?',
    'Does Washtenaw require date marking for opened deli meats?',
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-4xl">
        <div className="vc-badge inline-flex items-center gap-2 mb-8">
          <span className="vc-dot" />
          <span className={`text-[11px] tracking-[0.22em] uppercase ${inter.className}`}>Compliance console</span>
        </div>

        <h1 className={`vc-hero text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight ${outfit.className}`}>
          Inspection support that feels like a tool.
        </h1>

        <p className={`mt-5 text-base sm:text-lg vc-muted max-w-2xl ${inter.className}`}>
          Ask the Michigan Food Code. Scan photos for likely violations. Grounded answers for Washtenaw County food service — fast, clear, and audit-friendly.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={onShowPricing} className={`vc-btn vc-btn-primary ${inter.className}`}>
            Start trial
          </button>
          <button onClick={onShowAuth} className={`vc-btn vc-btn-ghost ${inter.className}`}>
            Sign in
          </button>
        </div>

        <div className="mt-10 vc-divider" />

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className={`vc-kicker ${inter.className}`}>Photo checks</p>
            <p className={`vc-body ${inter.className}`}>Upload a walk-in or line photo and get a short list of likely risks to verify.</p>
          </div>
          <div>
            <p className={`vc-kicker ${inter.className}`}>Grounded answers</p>
            <p className={`vc-body ${inter.className}`}>Answers are based on your stored rule set — not vibes, not guessing.</p>
          </div>
          <div>
            <p className={`vc-kicker ${inter.className}`}>Fewer surprises</p>
            <p className={`vc-body ${inter.className}`}>Use it during prep, closing, and training to catch issues before inspection day.</p>
          </div>
        </div>

        <div className="mt-10 vc-divider" />

        <div className="mt-8">
          <p className={`text-sm vc-muted mb-3 ${inter.className}`}>Example questions your staff can ask:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((t) => (
              <span key={t} className={`vc-chip ${inter.className}`}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <footer className="mt-12 flex flex-col items-center gap-3">
          <p className={`text-xs vc-muted ${inter.className}`}>Washtenaw County today · Wayne + Oakland planned for 2026.</p>
          <div className="flex gap-5 text-xs">
            <Link href="/terms" className="vc-link">
              Terms
            </Link>
            <Link href="/privacy" className="vc-link">
              Privacy
            </Link>
            <Link href="/contact" className="vc-link">
              Contact
            </Link>
          </div>
        </footer>
      </div>
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
    <div className="fixed inset-0 z-[999] vc-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md vc-modal p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className={`text-lg font-semibold vc-text ${outfit.className}`}>
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'reset' && 'Reset password'}
            </h2>
            <p className={`text-xs vc-muted mt-1 ${inter.className}`}>
              {mode === 'signin' && 'Use your work email to continue.'}
              {mode === 'signup' && 'Best with an owner / GM email for your site.'}
              {mode === 'reset' && "We'll email you a reset link."}
            </p>
          </div>
          <button onClick={onClose} className="vc-iconbtn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium vc-muted mb-2 ${inter.className}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gm@restaurant.com"
              required
              className={`vc-input ${inter.className}`}
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className={`block text-xs font-medium vc-muted mb-2 ${inter.className}`}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`vc-input pr-12 ${inter.className}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`vc-link-btn ${inter.className}`}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isLoaded} className={`vc-btn vc-btn-primary w-full ${inter.className}`}>
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs rounded-lg px-3 py-2 border ${message.startsWith('Error') ? 'vc-alert-error' : 'vc-alert-ok'}`}>
            {message}
          </div>
        )}

        <div className={`mt-4 text-center space-y-1 text-xs ${inter.className}`}>
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="vc-link">
                Forgot password?
              </button>
              <div>
                <button type="button" onClick={() => setMode('signup')} className="vc-link">
                  Need an account? <span className="font-semibold">Sign up</span>
                </button>
              </div>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="vc-link">
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="vc-link">
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
    <div className="fixed inset-0 z-[900] vc-backdrop flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-lg vc-modal p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="vc-iconbtn absolute right-5 top-5" aria-label="Close pricing">
          <Icons.X />
        </button>

        <div className="mb-6">
          <p className={`text-[11px] tracking-[0.22em] uppercase vc-muted ${inter.className}`}>protocolLM</p>
          <h3 className={`text-xl font-semibold vc-text mt-2 ${outfit.className}`}>Compliance access</h3>
          <p className={`text-sm vc-muted mt-1 ${inter.className}`}>One site license per restaurant. 7-day free trial included.</p>
        </div>

        <div className="vc-panel p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-4xl font-semibold vc-text tracking-tight ${outfit.className}`}>$200</span>
            <span className={`text-xs uppercase tracking-[0.22em] vc-muted ${inter.className}`}>/ month</span>
          </div>

          <p className={`text-xs vc-muted ${inter.className}`}>
            Includes roughly <span className="vc-text font-medium">2,600 monthly checks</span> for a single restaurant. Text questions count as one check; photo
            analyses count as two.
          </p>

          <ul className={`text-xs mt-5 space-y-2 ${inter.className}`}>
            <li className="flex items-start gap-2 vc-text">
              <Icons.Check />
              <span>Text questions and photo uploads</span>
            </li>
            <li className="flex items-start gap-2 vc-text">
              <Icons.Check />
              <span>Grounded in Michigan Food Code &amp; Washtenaw guidance</span>
            </li>
            <li className="flex items-start gap-2 vc-text">
              <Icons.Check />
              <span>Built for one restaurant site license</span>
            </li>
            <li className="flex items-start gap-2 vc-text">
              <Icons.Check />
              <span>7-day free trial · cancel anytime</span>
            </li>
          </ul>

          <div className="space-y-3 pt-5">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className={`vc-btn vc-btn-primary w-full ${inter.className}`}
            >
              {loading === 'monthly' ? 'Processing…' : 'Start monthly trial'}
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className={`vc-btn vc-btn-secondary w-full ${inter.className}`}
            >
              {loading === 'annual' ? 'Processing…' : 'Yearly · save 15%'}
            </button>
          </div>
        </div>

        <p className={`mt-4 text-[11px] vc-muted ${inter.className}`}>
          You can upgrade, cancel, or change billing anytime from Subscription.
        </p>
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
      if (!active && searchParams.get('payment') === 'success') {
        setShowPricingModal(false)
      }
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
    document.body.classList.add('vc-bg')
    return () => {
      document.body.classList.remove('vc-bg')
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
      <div className="fixed inset-0 flex items-center justify-center vc-loading">
        <div className="w-8 h-8 rounded-full border border-white/15 border-t-white/70 animate-spin" />
      </div>
    )
  }

  const isAuthenticated = !!session

  const quickPrompts = [
    'What’s the correct order for storing raw meat in the walk-in?',
    'What should we do if the sanitizer bucket is too weak?',
    'Do we need date labels on opened deli turkey?',
  ]

  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
        }

        body.vc-bg {
          overflow: hidden;
          background: #000;
          color: rgba(255, 255, 255, 0.92);
        }

        /* Subtle Vercel-ish background */
        body.vc-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 20% 15%, rgba(59, 130, 246, 0.18), transparent 40%),
            radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.14), transparent 42%),
            radial-gradient(circle at 50% 85%, rgba(168, 85, 247, 0.10), transparent 46%),
            radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.06), transparent 55%);
          filter: saturate(1.05);
          opacity: 0.95;
        }

        body.vc-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 42px 42px;
          opacity: 0.12;
          mask-image: radial-gradient(circle at 50% 20%, black 0%, transparent 60%);
        }

        :root {
          --vc-bg: #000;
          --vc-text: rgba(255, 255, 255, 0.92);
          --vc-muted: rgba(255, 255, 255, 0.62);
          --vc-border: rgba(255, 255, 255, 0.10);
          --vc-border-2: rgba(255, 255, 255, 0.14);
          --vc-panel: rgba(255, 255, 255, 0.04);
          --vc-panel-2: rgba(255, 255, 255, 0.06);
          --vc-accent: rgba(255, 255, 255, 0.92);
          --vc-glow: rgba(255, 255, 255, 0.10);
        }

        .vc-text {
          color: var(--vc-text);
        }
        .vc-muted {
          color: var(--vc-muted);
        }

        .vc-loading {
          background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.06), transparent 55%), #000;
        }

        .vc-topbar {
          border-bottom: 1px solid var(--vc-border);
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .vc-logo {
          border: 1px solid var(--vc-border);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .vc-badge {
          border: 1px solid var(--vc-border);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--vc-muted);
        }
        .vc-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.06);
        }

        .vc-hero {
          color: var(--vc-text);
          line-height: 1.05;
        }

        .vc-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--vc-border), transparent);
        }

        .vc-kicker {
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.74);
          margin-bottom: 8px;
        }

        .vc-body {
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.62);
        }

        .vc-chip {
          border: 1px solid var(--vc-border);
          background: rgba(255, 255, 255, 0.03);
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.72);
        }

        .vc-link {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
        }
        .vc-link:hover {
          color: rgba(255, 255, 255, 0.92);
        }

        .vc-link-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }
        .vc-link-btn:hover {
          color: rgba(255, 255, 255, 0.88);
        }

        .vc-panel {
          border: 1px solid var(--vc-border);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
        }

        .vc-modal {
          border: 1px solid var(--vc-border-2);
          background: rgba(0, 0, 0, 0.72);
          border-radius: 16px;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.7);
        }

        .vc-backdrop {
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .vc-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--vc-border);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
          padding: 10px 12px;
          outline: none;
        }
        .vc-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .vc-input:focus {
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.06);
        }

        .vc-btn {
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
          border: 1px solid var(--vc-border);
        }
        .vc-btn:active {
          transform: translateY(1px);
        }

        .vc-btn-primary {
          background: rgba(255, 255, 255, 0.92);
          color: rgba(0, 0, 0, 0.92);
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.55);
        }
        .vc-btn-primary:hover {
          background: rgba(255, 255, 255, 0.98);
        }

        .vc-btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.88);
          border-color: rgba(255, 255, 255, 0.14);
        }
        .vc-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .vc-btn-ghost {
          background: transparent;
          color: rgba(255, 255, 255, 0.78);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .vc-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.9);
        }

        .vc-iconbtn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.72);
          transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
        }
        .vc-iconbtn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
          border-color: rgba(255, 255, 255, 0.16);
        }

        /* chat bubbles */
        .vc-bubble-user {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.92);
          color: rgba(0, 0, 0, 0.92);
        }
        .vc-bubble-ai {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.92);
        }

        /* scrollbars */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            transition: none !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="h-[100dvh] min-h-0 flex flex-col">
        {/* Header (minimal, Vercel-ish) */}
        <header className="sticky top-0 z-40 flex-shrink-0 vc-topbar">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded-full vc-logo text-[12px] font-semibold tracking-tight cursor-pointer ${outfit.className}`}
                onClick={() => router.replace('/')}
              >
                protocol<span className="opacity-80">LM</span>
              </div>

              {hasActiveSubscription && (
                <span className={`hidden sm:inline-flex vc-badge ${inter.className}`}>
                  <span className="vc-dot" />
                  <span className="text-[11px] tracking-[0.18em] uppercase">Active</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className={`vc-btn vc-btn-ghost ${inter.className}`}>
                    Sign in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className={`vc-btn vc-btn-primary ${inter.className}`}>
                    Start trial
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleNewChat} className={`hidden sm:inline-flex items-center gap-2 vc-btn vc-btn-secondary ${inter.className}`}>
                    <Icons.Plus />
                    New chat
                  </button>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="w-9 h-9 rounded-full border border-white/15 bg-white/5 hover:bg-white/7 text-white/80 flex items-center justify-center text-sm font-semibold"
                      aria-label="User menu"
                    >
                      {session.user.email?.[0]?.toUpperCase() || 'U'}
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 vc-panel overflow-hidden">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 ${inter.className}`}
                        >
                          <Icons.Settings />
                          <span className="vc-text">Subscription</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 ${inter.className}`}
                        >
                          <Icons.LogOut />
                          <span className="vc-text">Log out</span>
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
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LandingPage onShowPricing={() => setShowPricingModal(true)} onShowAuth={() => setShowAuthModal(true)} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Messages */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable', paddingBottom: '2px' }}
              >
                {messages.length === 0 ? (
                  // ✅ No “demo box” — just a clean empty state + optional quick prompts
                  <div className="h-full flex items-center justify-center px-5">
                    <div className="max-w-xl w-full">
                      <p className={`text-sm vc-muted leading-relaxed ${inter.className}`}>
                        Ask a question or attach a photo for a quick compliance check. Keep it simple — like you’d say it to a manager.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {quickPrompts.map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={`vc-chip ${inter.className}`}
                            onClick={() => setInput(p)}
                            title="Click to use this question"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'vc-bubble-user' : 'vc-bubble-ai'}`}>
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Uploaded"
                              className="mb-3 rounded-xl border border-white/10 max-h-64 object-contain bg-black/40"
                            />
                          )}

                          {msg.role === 'assistant' && msg.content === '' && isSending && idx === messages.length - 1 ? (
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" />
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.12s' }} />
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0.24s' }} />
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

              {/* Input bar */}
              <div className="flex-shrink-0 border-t border-white/10 bg-black/55 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className={`mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/12 bg-white/5 text-[12px] ${inter.className}`}>
                      <span className="vc-text">Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="vc-iconbtn !w-8 !h-8" aria-label="Remove image">
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />

                    <button type="button" onClick={() => fileInputRef.current?.click()} className="vc-iconbtn" aria-label="Attach image">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a compliance question…"
                        rows={1}
                        className={`flex-1 max-h-32 min-h-[42px] resize-none vc-input ${inter.className}`}
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
                        className={`vc-iconbtn ${(!input.trim() && !selectedImage) || isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/80 animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[11px] text-center vc-muted ${inter.className}`}>
                    protocolLM uses AI and may make mistakes. Always confirm critical food safety decisions with official regulations and your local health department.
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
