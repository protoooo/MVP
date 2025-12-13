'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

// Typography setup
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] })

// Env constants
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// --- Icons (Unchanged logic, updated styling context) ---
const Icons = {
  Camera: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Spark: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" />
      <path d="M5 14l.8 2.6L8.5 17l-2.7.9L5 20l-.8-2.1L1.5 17l2.7-.4L5 14z" />
    </svg>
  ),
}

// --- Components ---

function LandingPage({ onShowPricing, onShowAuth }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 animate-fade-in-up">
      <div className="max-w-5xl w-full relative z-10">
        
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-border bg-white/5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`text-[11px] font-medium tracking-wider uppercase text-white/70 ${inter.className}`}>
              Washtenaw Compliance Standard
            </span>
          </div>

          <h1 className={`text-5xl md:text-7xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 ${outfit.className}`}>
            Compliance you can <br /> run your restaurant on.
          </h1>

          <p className={`text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed ${inter.className}`}>
            The premium console for operators who take inspections seriously. Grounded answers, photo risk scans, and actionable checklists.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button onClick={onShowPricing} className="btn-primary">
              Start Enterprise Trial
            </button>
            <button onClick={onShowAuth} className="btn-glass">
              Sign In
            </button>
          </div>
        </div>

        {/* Glass Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-8 flex flex-col justify-between h-full">
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/80 mb-6 border border-white/10">
              <Icons.Camera />
            </div>
            <div>
              <h3 className={`text-lg font-medium text-white mb-2 ${outfit.className}`}>Photo Risk Scan</h3>
              <p className={`text-sm text-white/50 leading-relaxed ${inter.className}`}>
                Upload a walk-in or line photo. Our vision model identifies compliance risks instantly.
              </p>
            </div>
          </div>

          <div className="glass-card p-8 flex flex-col justify-between h-full">
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/80 mb-6 border border-white/10">
              <Icons.Shield />
            </div>
            <div>
              <h3 className={`text-lg font-medium text-white mb-2 ${outfit.className}`}>Grounded Answers</h3>
              <p className={`text-sm text-white/50 leading-relaxed ${inter.className}`}>
                Strict adherence to Michigan Food Code. No hallucinations, just regulations.
              </p>
            </div>
          </div>

          <div className="glass-card p-8 flex flex-col justify-between h-full">
            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/80 mb-6 border border-white/10">
              <Icons.Check />
            </div>
            <div>
              <h3 className={`text-lg font-medium text-white mb-2 ${outfit.className}`}>Action Checklists</h3>
              <p className={`text-sm text-white/50 leading-relaxed ${inter.className}`}>
                Convert inspections into instant Open/Close lists for your shift leads.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Trust */}
        <div className="mt-16 border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/30">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Icons.Lock /> Secure by design</span>
            <span className="flex items-center gap-2"><Icons.Spark /> Operator focused</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
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
        setMessage('Error: Security verification failed.')
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
        setMessage('✓ Check your email for instructions.')
        setTimeout(() => { setMode('signin'); setMessage('') }, 2200)
      } else if (mode === 'signup') {
        setMessage('✓ Account created. Verify your email.')
        setTimeout(() => { setMode('signin'); setMessage('') }, 2200)
      } else {
        setMessage('✓ Authenticated. Loading workspace…')
        setTimeout(() => { onClose(); window.location.reload() }, 600)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('Error: System issue. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[400px] glass-panel p-8 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-xl font-semibold text-white tracking-tight ${outfit.className}`}>
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@restaurant.com"
              required
              className="input-glass"
            />
          </div>

          {mode !== 'reset' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-white/40">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-glass pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider font-medium text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || !isLoaded} className="btn-primary w-full justify-center">
            {loading ? 'Processing…' : mode === 'signin' ? 'Continue' : mode === 'signup' ? 'Create Account' : 'Send Link'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 text-xs p-3 rounded-lg border ${message.startsWith('Error') ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'}`}>
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 text-center">
           {mode === 'signin' && (
            <>
              <button onClick={() => setMode('reset')} className="text-xs text-white/40 hover:text-white transition-colors">Forgot password?</button>
              <button onClick={() => setMode('signup')} className="text-xs text-white/40 hover:text-white transition-colors">No account? Sign up</button>
            </>
          )}
          {mode === 'signup' && (
             <button onClick={() => setMode('signin')} className="text-xs text-white/40 hover:text-white transition-colors">Have an account? Sign in</button>
          )}
          {mode === 'reset' && (
             <button onClick={() => setMode('signin')} className="text-xs text-white/40 hover:text-white transition-colors">Back to sign in</button>
          )}
        </div>
        
        <div className="mt-4 flex justify-center opacity-40 grayscale">
          <RecaptchaBadge />
        </div>
      </div>
    </div>
  )
}

function PricingModal({ isOpen, onClose, onCheckout, loading }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg glass-panel p-0 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex justify-between items-start">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/80 mb-3">
                        Enterprise License
                    </div>
                    <h3 className={`text-3xl font-semibold text-white tracking-tight ${outfit.className}`}>protocolLM Access</h3>
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                    <Icons.X />
                </button>
            </div>
        </div>

        <div className="p-8">
            <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-4xl font-bold text-white ${outfit.className}`}>$200</span>
                <span className="text-sm text-white/40 font-medium">/ month</span>
            </div>
            <p className="text-sm text-white/50 mb-8 leading-relaxed">
                Includes 2,600 monthly checks, priority photo analysis, and Washtenaw-specific compliance updates.
            </p>

            <div className="space-y-3 mb-8">
                {['Full Photo & Text Compliance', 'Michigan Food Code Grounding', 'Single Site License', 'Priority Support'].map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                        <span className="text-emerald-400"><Icons.Check /></span>
                        {feat}
                    </div>
                ))}
            </div>

            <div className="grid gap-3">
                <button
                    onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                    disabled={!!loading && loading !== 'monthly'}
                    className="btn-primary w-full justify-center"
                >
                    {loading === 'monthly' ? 'Processing…' : 'Start 7-Day Trial'}
                </button>
                <button
                    onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                    disabled={!!loading && loading !== 'annual'}
                    className="btn-glass w-full justify-center"
                >
                    {loading === 'annual' ? 'Processing…' : 'Annual (Save 15%)'}
                </button>
            </div>
            <p className="text-[10px] text-center text-white/20 mt-4 uppercase tracking-wider">Cancel anytime via dashboard</p>
        </div>
      </div>
    </div>
  )
}

// --- Main Page Component ---

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

  useEffect(() => { requestAnimationFrame(() => scrollToBottom('auto')) }, [])
  useEffect(() => { if (shouldAutoScrollRef.current) requestAnimationFrame(() => scrollToBottom('auto')) }, [messages])

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
        console.error('Sub check error', e)
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
        if (isMounted) setIsLoading(false)
      }
    }
    init()
    const { data } = supabase.auth.onAuthStateChange((_e, newSession) => loadSessionAndSub(newSession))
    return () => { isMounted = false; data.subscription?.unsubscribe() }
  }, [supabase, searchParams])

  useEffect(() => {
    function handleClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false)
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
      if (!priceId) return
      setCheckoutLoading(planName)
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const payload = await res.json()
      if (payload.url) window.location.href = payload.url
    } catch (error) {
      console.error(error)
      setCheckoutLoading(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setMessages([])
    setCurrentChatId(null)
    router.replace('/')
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
          .insert({ user_id: session.user.id, title: (question || 'New chat').slice(0, 40) })
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
        body: JSON.stringify({ messages: [...messages, newUserMessage], image, chatId: activeChatId }),
      })
      if (!res.ok) {
        if (res.status === 402) { setShowPricingModal(true); throw new Error('Subscription required.') }
        throw new Error('API Error')
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
      alert('Image processing failed')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  const isAuthenticated = !!session

  return (
    <>
      <style jsx global>{`
        /* --- Premium Liquid Theme --- */
        :root {
            --bg-deep: #050505;
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-highlight: rgba(255, 255, 255, 0.05);
        }

        body {
          background-color: var(--bg-deep);
          color: #fff;
          font-family: ${inter.style.fontFamily};
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* The Aurora & Noise Background */
        body::before {
            content: "";
            position: fixed;
            top: -50%;
            left: -50%;
            right: -50%;
            bottom: -50%;
            width: 200%;
            height: 200%;
            background: 
                radial-gradient(circle at 50% 50%, rgba(20, 30, 45, 0.4) 0%, transparent 40%),
                radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.03) 0%, transparent 20%);
            background-size: 100% 100%;
            pointer-events: none;
            z-index: -2;
        }

        body::after {
            content: "";
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: -1;
        }

        /* --- Reusable Glass Components --- */
        
        .glass-panel {
            background: rgba(15, 15, 20, 0.7);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            box-shadow: 
                0 0 0 1px rgba(0,0,0,0.2), 
                0 20px 50px rgba(0,0,0,0.5),
                inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .glass-card {
            background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .glass-card:hover {
            border-color: rgba(255,255,255,0.15);
            transform: translateY(-2px);
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            padding: 10px 20px;
            border-radius: 99px;
            background: white;
            color: black;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.02em;
            transition: all 0.2s ease;
            box-shadow: 0 0 20px rgba(255,255,255,0.2);
            border: 1px solid white;
        }
        .btn-primary:hover {
            transform: scale(1.02);
            box-shadow: 0 0 30px rgba(255,255,255,0.3);
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-glass {
            display: inline-flex;
            align-items: center;
            padding: 10px 20px;
            border-radius: 99px;
            background: rgba(255,255,255,0.05);
            color: white;
            font-size: 13px;
            font-weight: 500;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.2s ease;
        }
        .btn-glass:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
        }

        .input-glass {
            width: 100%;
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 12px 16px;
            color: white;
            font-size: 14px;
            outline: none;
            transition: all 0.2s;
        }
        .input-glass:focus {
            background: rgba(0,0,0,0.4);
            border-color: rgba(255,255,255,0.3);
            box-shadow: 0 0 0 4px rgba(255,255,255,0.05);
        }

        .ui-header {
            background: rgba(5, 5, 5, 0.6);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--glass-border);
        }

        /* Chat Specifics */
        .bubble-user {
            background: white;
            color: black;
            border-radius: 18px 18px 4px 18px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .bubble-ai {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.9);
            border-radius: 18px 18px 18px 4px;
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }

        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="h-[100dvh] flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 ui-header z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-lg font-bold tracking-tight text-white ${outfit.className}`}>
                protocol<span className="opacity-50 font-normal">LM</span>
              </div>
              {hasActiveSubscription && (
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                  Enterprise Active
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button onClick={() => setShowAuthModal(true)} className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2">
                    Log in
                  </button>
                  <button onClick={() => setShowPricingModal(true)} className="btn-primary py-2 px-4 text-xs">
                    Get Access
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                    <button onClick={handleNewChat} className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/70">
                        <Icons.Plus />
                    </button>
                    <div className="relative" ref={userMenuRef}>
                        <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold">
                            {session?.user?.email?.[0].toUpperCase()}
                        </button>
                        {showUserMenu && (
                            <div className="absolute right-0 mt-3 w-48 glass-panel overflow-hidden py-1 z-50">
                                <button onClick={() => { setShowPricingModal(true); setShowUserMenu(false) }} className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/5 flex items-center gap-2">
                                    <Icons.Settings /> Subscription
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-xs text-red-300 hover:bg-white/5 flex items-center gap-2">
                                    <Icons.LogOut /> Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 flex flex-col relative z-0">
          {!isAuthenticated ? (
            <div className="flex-1 overflow-y-auto">
              <LandingPage onShowPricing={() => setShowPricingModal(true)} onShowAuth={() => setShowAuthModal(true)} />
            </div>
          ) : (
            <>
              {/* Chat Area */}
              <div 
                ref={scrollRef} 
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                     <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-6">
                        <Icons.Spark />
                     </div>
                     <h2 className={`text-2xl font-medium text-white mb-2 ${outfit.className}`}>Ready to assist</h2>
                     <p className="text-white/40 max-w-sm text-sm">Ask about code requirements, compliance checks, or upload inspection photos.</p>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-6 pb-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] px-5 py-3.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                            {msg.image && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-black/10">
                                    <img src={msg.image} alt="User upload" className="max-h-64 object-cover" />
                                </div>
                            )}
                            {msg.role === 'assistant' && !msg.content && idx === messages.length - 1 ? (
                                <div className="flex gap-1 py-1">
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-200"></span>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input Floating Dock */}
              <div className="flex-shrink-0 p-4 sm:p-6 w-full max-w-3xl mx-auto relative z-20">
                 {selectedImage && (
                    <div className="absolute -top-12 left-6 bg-black/80 backdrop-blur border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg flex items-center gap-2 animate-fade-in-up">
                        <span className="opacity-70">Image attached</span>
                        <button onClick={() => setSelectedImage(null)} className="hover:text-white"><Icons.X /></button>
                    </div>
                 )}
                 
                 <form onSubmit={handleSend} className="glass-panel p-2 flex items-end gap-2 shadow-2xl">
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors flex-shrink-0"
                    >
                        <Icons.Camera />
                    </button>
                    
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }}}
                        placeholder="Ask anything..."
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 text-sm py-2.5 max-h-32 resize-none"
                    />

                    <button 
                        type="submit"
                        disabled={(!input.trim() && !selectedImage) || isSending}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/20 transition-all flex-shrink-0"
                    >
                        {isSending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <Icons.ArrowUp />}
                    </button>
                 </form>
                 <div className="text-center mt-3">
                    <p className="text-[10px] text-white/20">ProtocolLM can make mistakes. Verify with official code.</p>
                 </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
