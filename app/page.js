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

function LandingPage({ onShowPricing }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-4xl w-full space-y-4">
        <div className="term-window">
          <div className="term-titlebar">
            <div className="term-dots">
              <span className="dot dot-r" />
              <span className="dot dot-y" />
              <span className="dot dot-g" />
            </div>
            <div className="term-title">protocolLM — compliance console</div>
            <div className="term-spacer" />
          </div>

          <div className="term-body">
            <div className="term-line">
              <span className="term-dim">Connected:</span> <span className="term-ok">washtenaw_ruleset</span>
            </div>
            <div className="term-line">
              <span className="term-dim">Mode:</span> <span className="term-ok">database / terminal</span>
            </div>
            <div className="term-line">
              <span className="term-dim">Version:</span> <span className="term-ok">v1</span>
            </div>

            <div className="term-gap" />

            <div className="term-line term-dim">Available commands:</div>
            <div className="term-line">
              <span className="term-prompt">$</span> scan &lt;photo&gt; <span className="term-dim">→ likely violations</span>
            </div>
            <div className="term-line">
              <span className="term-prompt">$</span> ask "&lt;question&gt;" <span className="term-dim">→ grounded answers</span>
            </div>
            <div className="term-line">
              <span className="term-prompt">$</span> checklist "&lt;issue&gt;" <span className="term-dim">→ close/open tasks</span>
            </div>

            <div className="term-gap" />

            <div className="term-line">
              <span className="term-dim">Notes:</span> Text question = 1 check · Photo analysis = 2 checks
            </div>

            <div className="term-gap" />

            <div className="flex flex-wrap gap-3 items-center">
              <button onClick={onShowPricing} className="term-btn term-btn-primary">
                <Icons.Check />
                Start trial
              </button>
              <div className="term-dim text-xs">
                Washtenaw County today · Wayne + Oakland planned for 2026
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center text-xs term-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/contact">Contact</Link>
        </div>
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
        setMessage('OK: check your email for reset instructions.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else if (mode === 'signup') {
        setMessage('OK: account created. Check email to verify.')
        setTimeout(() => {
          setMode('signin')
          setMessage('')
        }, 2200)
      } else {
        setMessage('OK: signed in. Redirecting…')
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
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-md term-window" onClick={(e) => e.stopPropagation()}>
        <div className="term-titlebar">
          <div className="term-dots">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
          </div>
          <div className="term-title">
            {mode === 'signin' && 'auth/login'}
            {mode === 'signup' && 'auth/create'}
            {mode === 'reset' && 'auth/reset'}
          </div>
          <div className="term-spacer" />
          <button onClick={onClose} className="term-icon-btn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <div className="term-body">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="term-label">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gm@restaurant.com"
                required
                className="term-input w-full"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="term-label">password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="term-input w-full pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 term-link text-xs"
                  >
                    {showPassword ? 'hide' : 'show'}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !isLoaded} className="term-btn term-btn-primary w-full">
              {loading ? 'processing…' : mode === 'signin' ? 'sign in' : mode === 'signup' ? 'create account' : 'send reset link'}
            </button>
          </form>

          {message && (
            <div className={`mt-3 term-msg ${message.startsWith('Error') ? 'term-msg-err' : 'term-msg-ok'}`}>
              {message}
            </div>
          )}

          <div className="mt-3 text-xs space-y-1">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('reset')} className="term-link w-full text-left">
                  forgot password?
                </button>
                <button type="button" onClick={() => setMode('signup')} className="term-link w-full text-left">
                  need an account? <span className="term-strong">sign up</span>
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('signin')} className="term-link w-full text-left">
                already have an account? <span className="term-strong">sign in</span>
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" onClick={() => setMode('signin')} className="term-link w-full text-left">
                back to sign in
              </button>
            )}
          </div>

          <RecaptchaBadge />
        </div>
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="w-full max-w-lg term-window relative" onClick={(e) => e.stopPropagation()}>
        <div className="term-titlebar">
          <div className="term-dots">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
          </div>
          <div className="term-title">billing/subscription</div>
          <div className="term-spacer" />
          <button onClick={onClose} className="term-icon-btn" aria-label="Close">
            <Icons.X />
          </button>
        </div>

        <div className="term-body space-y-4">
          <div className="term-line">
            <span className="term-dim">Plan:</span> <span className="term-ok">Site license</span>
          </div>
          <div className="term-line">
            <span className="term-dim">Trial:</span> <span className="term-ok">7 days</span>
          </div>

          <div className="term-line">
            <span className="term-dim">Price:</span> <span className="term-strong">$100</span> / month
          </div>

          <div className="term-dim text-xs">
            Includes roughly <span className="term-strong">1,300 monthly checks</span>. Text = 1 · Photo = 2.
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
              disabled={!!loading && loading !== 'monthly'}
              className="term-btn term-btn-primary w-full"
            >
              {loading === 'monthly' ? 'processing…' : 'start monthly trial'}
            </button>

            <button
              onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
              disabled={!!loading && loading !== 'annual'}
              className="term-btn w-full"
            >
              {loading === 'annual' ? 'processing…' : 'yearly · save 15%'}
            </button>
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
    document.body.classList.add('term-bg')
    return () => document.body.classList.remove('term-bg')
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
      <div className="fixed inset-0 flex items-center justify-center term-loading">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
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

        body.term-bg {
          overflow: hidden;
          background: radial-gradient(1000px 800px at 20% 10%, rgba(16, 185, 129, 0.08), transparent 55%),
            radial-gradient(900px 700px at 80% 20%, rgba(34, 211, 238, 0.06), transparent 55%),
            radial-gradient(900px 700px at 60% 80%, rgba(59, 130, 246, 0.05), transparent 55%),
            linear-gradient(180deg, #05080d 0%, #04070b 60%, #03060a 100%);
          color: #d1fae5;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        }

        /* Scanlines + subtle noise */
        body.term-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
          background-size: 100% 4px;
          opacity: 0.08;
          mix-blend-mode: soft-light;
        }
        body.term-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255, 255, 255, 0.06) 0.55px, transparent 0.65px);
          background-size: 7px 7px;
          opacity: 0.06;
        }

        .term-loading {
          background: linear-gradient(180deg, #05080d 0%, #03060a 100%);
        }

        /* Core terminal components */
        .term-window {
          border: 1px solid rgba(16, 185, 129, 0.18);
          border-radius: 14px;
          background: rgba(3, 6, 10, 0.72);
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .term-titlebar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
          border-bottom: 1px solid rgba(16, 185, 129, 0.14);
        }

        .term-dots {
          display: flex;
          gap: 6px;
          padding-right: 2px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
          opacity: 0.9;
        }
        .dot-r {
          background: #ff5f57;
        }
        .dot-y {
          background: #febc2e;
        }
        .dot-g {
          background: #28c840;
        }

        .term-title {
          color: rgba(209, 250, 229, 0.9);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: lowercase;
        }
        .term-spacer {
          flex: 1;
        }

        .term-body {
          padding: 14px 14px 16px;
        }

        .term-line {
          font-size: 12px;
          line-height: 1.7;
          color: rgba(209, 250, 229, 0.92);
          white-space: pre-wrap;
        }

        .term-gap {
          height: 10px;
        }

        .term-dim {
          color: rgba(209, 250, 229, 0.62);
        }

        .term-ok {
          color: rgba(52, 211, 153, 0.95);
        }

        .term-strong {
          color: rgba(209, 250, 229, 0.98);
          font-weight: 700;
        }

        .term-prompt {
          color: rgba(34, 211, 238, 0.85);
          margin-right: 8px;
        }

        .term-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(209, 250, 229, 0.18);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(209, 250, 229, 0.92);
          font-size: 12px;
          text-transform: lowercase;
          letter-spacing: 0.04em;
          transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
        }

        .term-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(52, 211, 153, 0.26);
          transform: translateY(-1px);
        }

        .term-btn:active {
          transform: translateY(0px);
        }

        .term-btn-primary {
          border-color: rgba(52, 211, 153, 0.35);
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.08));
        }

        .term-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          border: 1px solid rgba(209, 250, 229, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(209, 250, 229, 0.85);
        }
        .term-icon-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(52, 211, 153, 0.22);
        }

        .term-input {
          border-radius: 12px;
          border: 1px solid rgba(209, 250, 229, 0.16);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(209, 250, 229, 0.95);
          padding: 10px 12px;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .term-input::placeholder {
          color: rgba(209, 250, 229, 0.42);
        }
        .term-input:focus {
          border-color: rgba(34, 211, 238, 0.35);
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.10);
        }

        .term-label {
          display: block;
          font-size: 11px;
          color: rgba(209, 250, 229, 0.70);
          margin-bottom: 6px;
          text-transform: lowercase;
          letter-spacing: 0.06em;
        }

        .term-msg {
          border-radius: 12px;
          border: 1px solid rgba(209, 250, 229, 0.14);
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 12px;
          font-size: 12px;
        }
        .term-msg-ok {
          border-color: rgba(52, 211, 153, 0.22);
          color: rgba(52, 211, 153, 0.95);
        }
        .term-msg-err {
          border-color: rgba(248, 113, 113, 0.22);
          color: rgba(248, 113, 113, 0.95);
        }

        .term-link {
          color: rgba(34, 211, 238, 0.85);
          text-decoration: none;
        }
        .term-link:hover {
          color: rgba(34, 211, 238, 1);
          text-decoration: underline;
        }

        .term-links a {
          color: rgba(209, 250, 229, 0.65);
        }
        .term-links a:hover {
          color: rgba(209, 250, 229, 0.95);
          text-decoration: underline;
        }

        /* Chat scroll area scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(52, 211, 153, 0.20);
          border-radius: 999px;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="h-[100dvh] min-h-0 flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`term-btn ${outfit.className}`} style={{ padding: '8px 10px' }}>
                protocolLM
              </div>
              {hasActiveSubscription && (
                <span className="text-[11px] px-3 py-1 rounded-full" style={{ border: '1px solid rgba(52,211,153,0.22)', color: 'rgba(52,211,153,0.95)' }}>
                  active · site license
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className={`text-xs term-link ${inter.className}`}>
                    sign in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className="term-btn term-btn-primary">
                    <Icons.Check />
                    sign up
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleNewChat} className="term-btn hidden sm:inline-flex">
                    <Icons.Plus />
                    new chat
                  </button>

                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu((v) => !v)}
                      className="term-btn"
                      style={{ width: 38, height: 38, padding: 0, borderRadius: 999 }}
                      aria-label="User menu"
                    >
                      {session.user.email?.[0]?.toUpperCase() || 'U'}
                    </button>

                    {showUserMenu && (
                      <div
                        className="absolute right-0 mt-2 w-52 term-window"
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="term-body" style={{ padding: 10 }}>
                          <button
                            onClick={() => {
                              setShowPricingModal(true)
                              setShowUserMenu(false)
                            }}
                            className="term-btn w-full"
                            style={{ justifyContent: 'flex-start' }}
                          >
                            <Icons.Settings />
                            subscription
                          </button>

                          <button
                            onClick={handleSignOut}
                            className="term-btn w-full"
                            style={{ justifyContent: 'flex-start', borderColor: 'rgba(248,113,113,0.22)', color: 'rgba(248,113,113,0.95)' }}
                          >
                            <Icons.LogOut />
                            log out
                          </button>
                        </div>
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
              <LandingPage onShowPricing={() => setShowPricingModal(true)} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Messages container */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto"
                style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}
              >
                <div className="max-w-4xl mx-auto w-full px-4 py-5">
                  {messages.length === 0 ? (
                    <div className="term-window">
                      <div className="term-titlebar">
                        <div className="term-dots">
                          <span className="dot dot-r" />
                          <span className="dot dot-y" />
                          <span className="dot dot-g" />
                        </div>
                        <div className="term-title">help</div>
                        <div className="term-spacer" />
                      </div>
                      <div className="term-body">
                        <div className="term-line term-dim">Try:</div>
                        <div className="term-line">
                          <span className="term-prompt">$</span> ask "What does the Michigan Food Code require for cold holding?"
                        </div>
                        <div className="term-line">
                          <span className="term-prompt">$</span> scan &lt;photo&gt; (attach image) → likely violations
                        </div>
                        <div className="term-line">
                          <span className="term-prompt">$</span> checklist "raw chicken above RTE"
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg, idx) => {
                        const isUser = msg.role === 'user'
                        const label = isUser ? 'USER' : 'PROTOCOL'
                        const prompt = isUser ? '>' : '<'

                        return (
                          <div key={idx} className="term-line">
                            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                              <span style={{ color: isUser ? 'rgba(34,211,238,0.95)' : 'rgba(52,211,153,0.95)', fontWeight: 700 }}>
                                {label}
                              </span>
                              <span className="term-dim">{prompt}</span>
                              <span className="whitespace-pre-wrap" style={{ color: 'rgba(209,250,229,0.92)' }}>
                                {msg.content === '' && !isUser && isSending && idx === messages.length - 1 ? '…' : msg.content}
                              </span>
                            </div>

                            {msg.image && (
                              <div className="mt-2 term-window" style={{ maxWidth: 520 }}>
                                <div className="term-titlebar">
                                  <div className="term-dots">
                                    <span className="dot dot-r" />
                                    <span className="dot dot-y" />
                                    <span className="dot dot-g" />
                                  </div>
                                  <div className="term-title">attachment/image</div>
                                  <div className="term-spacer" />
                                </div>
                                <div className="term-body">
                                  <img
                                    src={msg.image}
                                    alt="Uploaded"
                                    className="rounded-lg"
                                    style={{ maxHeight: 320, width: '100%', objectFit: 'contain' }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Input bar */}
              <div className="flex-shrink-0">
                <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  {selectedImage && (
                    <div className="mb-2 term-msg term-msg-ok" style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                      <span>attached: image</span>
                      <button onClick={() => setSelectedImage(null)} className="term-icon-btn" aria-label="Remove image">
                        <Icons.X />
                      </button>
                    </div>
                  )}

                  <div className="term-window">
                    <div className="term-body" style={{ padding: 10 }}>
                      <div className="flex items-end gap-2">
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="term-btn"
                          style={{ width: 44, height: 44, padding: 0 }}
                          aria-label="Attach photo"
                        >
                          <Icons.Camera />
                        </button>

                        <form onSubmit={handleSend} className="flex-1 flex items-end gap-2">
                          <div style={{ width: 28, paddingBottom: 10 }} className="term-dim">
                            &gt;
                          </div>
                          <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='ask "question" or attach photo'
                            rows={1}
                            className="term-input flex-1 resize-none"
                            style={{ minHeight: 44, maxHeight: 140 }}
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
                            className="term-btn term-btn-primary"
                            style={{
                              width: 44,
                              height: 44,
                              padding: 0,
                              opacity: (!input.trim() && !selectedImage) || isSending ? 0.55 : 1,
                              cursor: (!input.trim() && !selectedImage) || isSending ? 'not-allowed' : 'pointer',
                            }}
                            aria-label="Send"
                          >
                            {isSending ? <div className="w-4 h-4 rounded-full border-2 border-emerald-200/40 border-t-emerald-200 animate-spin" /> : <Icons.ArrowUp />}
                          </button>
                        </form>
                      </div>

                      <div className="term-dim text-[10px]" style={{ marginTop: 8 }}>
                        protocolLM may make mistakes. Confirm critical food safety decisions with official regulations and your local health department.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </>
  )
}
