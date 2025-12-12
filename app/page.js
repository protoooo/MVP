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
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
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
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="ent-hero-shell">
          <div className="ent-hero-card">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className={`ent-badge ${outfit.className}`}>protocolLM</div>
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={onShowAuth} className={`ent-link ${inter.className}`}>
                  Sign in
                </button>
                <button onClick={onShowPricing} className={`ent-btn-primary ${outfit.className}`}>
                  Request access
                </button>
              </div>
            </div>

            <h1 className={`ent-title ${outfit.className}`}>
              Compliance answers your staff can trust.
            </h1>

            <p className={`ent-subtitle ${inter.className}`}>
              Built for restaurants that take inspections seriously. Ask the Michigan Food Code, scan photos for likely violations, and keep a clean paper trail—without digging through PDFs.
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="ent-mini">
                <div className={`ent-mini-kicker ${outfit.className}`}>Photo scans</div>
                <div className={`ent-mini-body ${inter.className}`}>Attach a walk-in or line photo. Get a risk-oriented summary fast.</div>
              </div>
              <div className="ent-mini">
                <div className={`ent-mini-kicker ${outfit.className}`}>Grounded answers</div>
                <div className={`ent-mini-body ${inter.className}`}>Focused on local regs & guidance so your team stops guessing.</div>
              </div>
              <div className="ent-mini">
                <div className={`ent-mini-kicker ${outfit.className}`}>Operator-ready</div>
                <div className={`ent-mini-body ${inter.className}`}>Short, actionable next steps—written for real kitchens.</div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
              <button onClick={onShowPricing} className={`ent-btn-primary ent-btn-lg ${outfit.className}`}>
                See pricing
              </button>
              <div className={`ent-fine ${inter.className}`}>
                Washtenaw first • Wayne + Oakland planned for 2026
              </div>
            </div>

            <div className="mt-8 ent-divider" />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="ent-try">
                <div className={`ent-try-title ${outfit.className}`}>Try asking</div>
                <ul className={`ent-try-list ${inter.className}`}>
                  <li>“Can raw chicken be stored above produce in the walk-in?”</li>
                  <li>“What should our sanitizer bucket concentration be?”</li>
                  <li>“What’s the safest cooling method for chili after service?”</li>
                </ul>
              </div>
              <div className="ent-try">
                <div className={`ent-try-title ${outfit.className}`}>Built for owners & GMs</div>
                <div className={`ent-try-body ${inter.className}`}>
                  This is not a toy chatbot. It’s positioned like a real operational system: premium, limited, and designed to reduce risk—fast.
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-10 flex flex-wrap gap-4 justify-center text-xs text-white/55">
          <Link href="/terms" className="hover:text-white/80">Terms</Link>
          <Link href="/privacy" className="hover:text-white/80">Privacy</Link>
          <Link href="/contact" className="hover:text-white/80">Contact</Link>
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
        setMessage('✓ Check your email for reset instructions.')
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
      <div className="w-full max-w-md ent-modal" onClick={(e) => e.stopPropagation()}>
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
          <button onClick={onClose} className="ent-icon-btn" aria-label="Close">
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
              className="ent-input"
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
                  className="ent-input pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isLoaded} className={`ent-btn-primary w-full ${outfit.className}`}>
            {loading ? 'Processing…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs rounded-lg px-3 py-2 border ${
            message.startsWith('Error')
              ? 'bg-red-500/10 border-red-400/30 text-red-200'
              : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-4 text-center space-y-1 text-xs text-white/60">
          {mode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('reset')} className="block w-full hover:text-white">
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode('signup')} className="block w-full hover:text-white">
                Need an account? <span className="font-semibold text-white">Sign up</span>
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button type="button" onClick={() => setMode('signin')} className="hover:text-white">
              Already have an account? <span className="font-semibold text-white">Sign in</span>
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" onClick={() => setMode('signin')} className="hover:text-white">
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
      <div className="w-full max-w-lg ent-modal relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-5 top-5 ent-icon-btn" aria-label="Close">
          <Icons.X />
        </button>

        <div className="mb-6">
          <div className={`ent-badge ${outfit.className}`}>protocolLM</div>
          <h3 className={`mt-3 text-xl font-semibold text-white tracking-tight ${outfit.className}`}>Site license</h3>
          <p className={`mt-1 text-sm text-white/60 ${inter.className}`}>
            One license per restaurant. Serious compliance tooling. 7-day free trial.
          </p>
        </div>

        <div className="ent-price-card">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-semibold text-white tracking-tight ${outfit.className}`}>$200</span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">/ month</span>
              </div>
              <p className={`mt-2 text-xs text-white/60 ${inter.className}`}>
                Includes roughly <span className="text-white font-semibold">1,000 monthly checks</span> for a single restaurant.
                Text questions count as one check; photo analyses count as two.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <div className={`text-[11px] tracking-[0.22em] uppercase text-white/60 ${outfit.className}`}>Premium</div>
              <div className={`text-xs text-white/40 ${inter.className}`}>Risk reduction</div>
            </div>
          </div>

          <ul className="mt-5 text-xs text-white/70 space-y-2">
            <li className="flex items-start gap-2"><span className="text-white/80"><Icons.Check /></span><span>Text questions + photo uploads</span></li>
            <li className="flex items-start gap-2"><span className="text-white/80"><Icons.Check /></span><span>Grounded in Michigan Food Code &amp; local guidance</span></li>
            <li className="flex items-start gap-2"><span className="text-white/80"><Icons.Check /></span><span>Built for one restaurant site license</span></li>
            <li className="flex items-start gap-2"><span className="text-white/80"><Icons.Check /></span><span>7-day free trial · cancel anytime</span></li>
          </ul>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className={`ent-btn-primary w-full ${outfit.className}`}
            >
              {loading === 'monthly' ? 'Processing…' : 'Start monthly trial'}
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className={`ent-btn-secondary w-full ${outfit.className}`}
            >
              {loading === 'annual' ? 'Processing…' : 'Yearly · $2,000'}
            </button>

            <div className={`text-[11px] text-white/45 text-center ${inter.className}`}>
              Need higher volume? Email support for an expanded license.
            </div>
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
        <div className="w-8 h-8 rounded-full border border-white/20 border-t-white/70 animate-spin" />
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
          background: #05070c;
        }

        /* Keep scrolling inside panes, not the page */
        body.ui-enterprise-bg {
          overflow: hidden;
          position: relative;
          color: white;
          background: radial-gradient(circle at 50% -20%, rgba(255,255,255,0.08), transparent 48%), #05070c;
        }

        /* OPTION A: “void + spotlight” (no grid) */
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1200px 520px at 50% -6%, rgba(255, 255, 255, 0.12), transparent 60%),
            radial-gradient(900px 520px at 18% 10%, rgba(0, 255, 200, 0.06), transparent 58%),
            radial-gradient(900px 520px at 84% 10%, rgba(120, 90, 255, 0.06), transparent 58%),
            radial-gradient(700px 700px at 50% 70%, rgba(255, 255, 255, 0.04), transparent 62%),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03), transparent 35%);
          opacity: 1;
        }

        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 22%, transparent 0%, rgba(0, 0, 0, 0.62) 72%),
            radial-gradient(rgba(255, 255, 255, 0.035) 0.7px, transparent 0.8px);
          background-size: auto, 7px 7px;
          opacity: 0.95;
          mix-blend-mode: normal;
        }

        /* Scrollbars */
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

        /* --- Enterprise components (NO “white leaking borders”) --- */
        .ent-border {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background-clip: padding-box;
        }

        .ent-glass {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
          backdrop-filter: blur(18px) saturate(1.15);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .ent-hero-shell {
          position: relative;
          padding: 1px; /* thin “edge” without glowing white */
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(0,255,200,0.12), rgba(120,90,255,0.10), rgba(255,255,255,0.06));
        }

        .ent-hero-card {
          border-radius: 19px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05));
          backdrop-filter: blur(22px) saturate(1.2);
          -webkit-backdrop-filter: blur(22px) saturate(1.2);
          box-shadow: 0 40px 120px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10);
          padding: 28px;
          position: relative;
          overflow: hidden;
        }

        .ent-hero-card::before {
          content: '';
          position: absolute;
          inset: -30%;
          pointer-events: none;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.14), transparent 42%);
          transform: rotate(10deg);
          opacity: 0.9;
        }

        .ent-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
          font-size: 11px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .ent-title {
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,0.96);
          margin-top: 6px;
        }

        .ent-subtitle {
          margin-top: 10px;
          color: rgba(255,255,255,0.66);
          max-width: 56ch;
          font-size: 14px;
          line-height: 1.6;
        }

        .ent-mini {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.22);
          border-radius: 14px;
          padding: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .ent-mini-kicker {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.80);
        }
        .ent-mini-body {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.55;
          color: rgba(255,255,255,0.62);
        }

        .ent-btn-primary {
          border-radius: 12px;
          padding: 10px 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
          color: rgba(255,255,255,0.92);
          box-shadow: 0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10);
          transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
        }
        .ent-btn-primary:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08));
          box-shadow: 0 20px 60px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .ent-btn-primary:active {
          transform: translateY(0px);
        }

        .ent-btn-secondary {
          border-radius: 12px;
          padding: 10px 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.18);
          color: rgba(255,255,255,0.82);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          transition: transform 150ms ease, background 150ms ease;
        }
        .ent-btn-secondary:hover {
          transform: translateY(-1px);
          background: rgba(0,0,0,0.26);
        }

        .ent-btn-lg {
          padding: 12px 16px;
        }

        .ent-link {
          color: rgba(255,255,255,0.68);
          font-size: 12px;
          font-weight: 600;
        }
        .ent-link:hover {
          color: rgba(255,255,255,0.90);
        }

        .ent-fine {
          font-size: 12px;
          color: rgba(255,255,255,0.52);
        }

        .ent-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
        }

        .ent-try {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.20);
          border-radius: 14px;
          padding: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .ent-try-title {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.78);
        }
        .ent-try-list {
          margin-top: 10px;
          color: rgba(255,255,255,0.60);
          font-size: 12px;
          line-height: 1.6;
          list-style: none;
          padding: 0;
        }
        .ent-try-list li {
          margin: 6px 0;
        }
        .ent-try-body {
          margin-top: 10px;
          color: rgba(255,255,255,0.60);
          font-size: 12px;
          line-height: 1.6;
        }

        .ent-modal {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05));
          backdrop-filter: blur(24px) saturate(1.2);
          -webkit-backdrop-filter: blur(24px) saturate(1.2);
          box-shadow: 0 36px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10);
          padding: 22px;
          position: relative;
          overflow: hidden;
        }

        .ent-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.20);
          color: rgba(255,255,255,0.78);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 150ms ease, transform 150ms ease;
        }
        .ent-icon-btn:hover {
          background: rgba(0,0,0,0.32);
          transform: translateY(-1px);
        }

        .ent-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.26);
          color: rgba(255,255,255,0.88);
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .ent-input::placeholder {
          color: rgba(255,255,255,0.36);
        }
        .ent-input:focus {
          border-color: rgba(0,255,200,0.28);
          box-shadow: 0 0 0 3px rgba(0,255,200,0.10), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .ent-price-card {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.26);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          padding: 18px;
        }

        @media (max-width: 640px) {
          .ent-title {
            font-size: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            transition: none !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div className="h-[100dvh] min-h-0 flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className={`text-xs tracking-[0.24em] uppercase text-white/80 hover:text-white ${outfit.className}`}
              >
                protocolLM
              </button>

              {hasActiveSubscription && (
                <span className="hidden sm:inline-flex text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 tracking-[0.18em] uppercase">
                  Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className={`ent-link ${inter.className}`}>
                    Sign in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className={`ent-btn-primary ${outfit.className}`}>
                    Pricing
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChat}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Icons.Plus />
                    New chat
                  </button>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/75 flex items-center justify-center text-xs font-bold"
                      aria-label="User menu"
                    >
                      {session.user.email?.[0]?.toUpperCase() || 'U'}
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.70)] overflow-hidden text-sm">
                        <button
                          onClick={() => {
                            setShowPricingModal(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white/75 hover:text-white transition-colors"
                        >
                          <Icons.Settings />
                          <span>Subscription</span>
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-red-300 hover:bg-red-500/10 transition-colors"
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

        {/* Main */}
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
                {/* Removed “demo / empty-state box” */}
                {messages.length > 0 && (
                  <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-3">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'border border-white/10 bg-white/10 text-white'
                              : 'border border-white/10 bg-black/30 text-white/85'
                          }`}
                          style={{
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                          }}
                        >
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

              {/* Input bar */}
              <div className="flex-shrink-0 border-t border-white/10 bg-black/35 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] text-white/70">
                      <span>Image attached</span>
                      <button onClick={() => setSelectedImage(null)} className="text-white/50 hover:text-white transition-colors" aria-label="Remove image">
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition"
                      aria-label="Attach image"
                    >
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo…"
                        rows={1}
                        className={`flex-1 max-h-32 min-h-[44px] resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none ${inter.className}`}
                        style={{
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                          backdropFilter: 'blur(14px)',
                          WebkitBackdropFilter: 'blur(14px)',
                        }}
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
                        className={`flex items-center justify-center w-10 h-10 rounded-xl border transition ${
                          (!input.trim() && !selectedImage) || isSending
                            ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                            : 'border-white/12 bg-white/10 text-white hover:bg-white/15'
                        }`}
                        aria-label="Send"
                      >
                        {isSending ? <div className="w-4 h-4 rounded-full border border-white/30 border-t-white/80 animate-spin" /> : <Icons.ArrowUp />}
                      </button>
                    </form>
                  </div>

                  <p className={`mt-2 text-[10px] text-center text-white/40 ${inter.className}`}>
                    protocolLM may make mistakes. Always confirm critical food safety decisions with official regulations and your local health department.
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
