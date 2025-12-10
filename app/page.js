'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

const Icons = {
  Camera: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Zap: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  FileText: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

const LandingPage = ({ onShowPricing }) => (
  <div className="w-full bg-white relative z-10 min-h-full flex flex-col">
    <section className="relative border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col items-center text-center">
        <h1
          className={`text-3xl md:text-[2.7rem] font-semibold text-slate-900 tracking-tight leading-tight mb-4 ${outfit.className}`}
        >
          Spot Violations Before The Health Inspector
        </h1>
        <p
          className={`text-sm md:text-base text-slate-700 max-w-xl leading-relaxed mb-10 ${inter.className}`}
        >
          Upload a photo or ask a question. protocolLM cross-checks the Michigan Food Code and local Washtenaw guidance.
        </p>
        <button
          onClick={onShowPricing}
          className="bg-black hover:bg-slate-900 text-white text-xs font-semibold py-3.5 px-8 rounded-full uppercase tracking-[0.18em] shadow-sm transition-colors"
        >
          Start 7-Day Free Trial
        </button>
      </div>
    </section>
    <section className="py-20 px-6 bg-white flex-1">
      <div className="max-w-6xl mx-auto">
        <h2
          className={`text-xl font-semibold text-slate-900 mb-14 text-center tracking-tight ${outfit.className}`}
        >
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200 p-8 rounded-xl">
            <div className="text-slate-500 mb-4">
              <Icons.Camera />
            </div>
            <h3
              className={`text-base font-semibold text-slate-900 mb-2 ${outfit.className}`}
            >
              1. Capture
            </h3>
            <p className={`text-sm text-slate-700 leading-relaxed ${inter.className}`}>
              Take a photo of your cooler, prep line, or 3-comp sink using any smartphone.
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-xl">
            <div className="text-slate-500 mb-4">
              <Icons.Zap />
            </div>
            <h3
              className={`text-base font-semibold text-slate-900 mb-2 ${outfit.className}`}
            >
              2. Process
            </h3>
            <p className={`text-sm text-slate-700 leading-relaxed ${inter.className}`}>
              Your question or image is analyzed against Michigan Food Code and Washtenaw guidance.
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-xl">
            <div className="text-slate-500 mb-4">
              <Icons.FileText />
            </div>
            <h3
              className={`text-base font-semibold text-slate-900 mb-2 ${outfit.className}`}
            >
              3. Review
            </h3>
            <p className={`text-sm text-slate-700 leading-relaxed ${inter.className}`}>
              Receive a structured summary of likely violations and corrective guidance.
            </p>
          </div>
        </div>
      </div>
    </section>
    <footer className="mt-auto py-12 border-t border-slate-200 text-center">
      <p
        className={`text-slate-500 font-medium mb-4 text-sm ${inter.className}`}
      >
        Serving Washtenaw County Food Service Establishments
      </p>
      <div className="flex justify-center gap-6 mb-6 text-sm text-slate-500 font-medium">
        <Link href="/terms" className="hover:text-slate-900 transition-colors">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:text-slate-900 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/contact" className="hover:text-slate-900 transition-colors">
          Contact
        </Link>
      </div>
    </footer>
  </div>
)

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('✓ Check your email for the login link.')
      setTimeout(() => onSuccess?.(), 2000)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2
              className={`text-xl font-semibold text-slate-900 mb-1 tracking-tight ${outfit.className}`}
            >
              Sign in to continue
            </h2>
            <p className={`text-sm text-slate-500 ${inter.className}`}>
              Enter your email to receive a login link
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 transition-colors"
          >
            <Icons.X />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work@restaurant.com"
            required
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-slate-900 text-white font-semibold py-3 rounded-lg text-xs uppercase tracking-[0.18em] transition-colors shadow-sm disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Login Link'}
          </button>
        </form>
        {message && (
          <div
            className={`mt-6 p-4 rounded-lg text-sm border ${
              message.includes('Error')
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-green-50 border-green-200 text-green-900'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

const PricingModal = ({ isOpen, onClose, onCheckout, loading }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[1000] bg-white/95 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <Icons.X />
        </button>
        <div className="mb-8 text-center">
          <h3
            className={`text-xs font-semibold text-slate-900 uppercase tracking-[0.25em] mb-3 ${outfit.className}`}
          >
            protocolLM
          </h3>
          <p
            className={`text-lg md:text-xl font-semibold text-slate-900 mb-2 tracking-tight ${outfit.className}`}
          >
            Choose your plan
          </p>
          <p
            className={`text-sm text-slate-600 max-w-xl mx-auto ${inter.className}`}
          >
            Start with a 7-day free trial. Cancel anytime.
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="border border-slate-200 rounded-xl p-6 bg-white">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-2">
                protocolLM Access
              </p>
              <div className="flex items-baseline mb-2">
                <span
                  className={`text-4xl font-semibold text-slate-900 tracking-tight ${outfit.className}`}
                >
                  $100
                </span>
                <span className="ml-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                  /month
                </span>
              </div>
              <p className={`text-sm text-slate-600 mb-4 ${inter.className}`}>
                Full access to compliance tools and resources.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>~200 text queries per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>~40 image audits per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Full Michigan Food Code access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>Washtenaw County guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Icons.Check />
                  <span>7-day free trial</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')}
                disabled={!!loading && loading !== 'monthly'}
                className={`w-full bg-black hover:bg-slate-900 text-white font-semibold py-3.5 rounded-lg text-xs uppercase tracking-[0.18em] transition-colors ${
                  loading && loading !== 'monthly'
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                {loading === 'monthly' ? 'Processing...' : 'Monthly Access - Start Free Trial'}
              </button>
              <button
                onClick={() => onCheckout(ANNUAL_PRICE, 'annual')}
                disabled={!!loading && loading !== 'annual'}
                className={`w-full bg-white border border-dashed border-slate-400 text-slate-900 font-semibold py-3.5 rounded-lg text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition-colors ${
                  loading && loading !== 'annual'
                    ? 'opacity-60 cursor-not-allowed'
                    : ''
                }`}
              >
                {loading === 'annual' ? 'Processing...' : 'Yearly Access - Save 15%'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
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
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const userMenuRef = useRef(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession()
        if (!mounted) return
        setSession(s)

        const payment = searchParams.get('payment')
        if (payment === 'success') {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        if (s) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status, current_period_end, trial_end')
            .eq('user_id', s.user.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()
          let active = false
          if (s.user.email === ADMIN_EMAIL) {
            active = true
          } else if (sub) {
            const periodEnd = new Date(sub.current_period_end)
            if (periodEnd > new Date()) active = true
          }
          setHasActiveSubscription(active)

          if (!active || searchParams.get('showPricing') === 'true') {
            setShowPricingModal(true)
          }
        } else {
          setHasActiveSubscription(false)
        }
      } catch (e) {
        console.error('Auth Init Error', e)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', newSession.user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()
        let active = false
        if (newSession.user.email === ADMIN_EMAIL) {
          active = true
        } else if (sub) {
          const periodEnd = new Date(sub.current_period_end)
          if (periodEnd > new Date()) active = true
        }
        setHasActiveSubscription(active)
      } else {
        setHasActiveSubscription(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, searchParams])

  const handleCheckout = async (priceId, planName) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    if (!currentSession) {
      setShowPricingModal(false)
      setShowAuthModal(true)
      return
    }
    if (!priceId) {
      alert('Invalid price selected')
      return
    }
    setCheckoutLoading(planName)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Checkout failed')
      }

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout: ' + error.message)
      setCheckoutLoading(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      window.location.href = '/'
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setInput('')
    setSelectedImage(null)
    setCurrentChatId(null)
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const currentInput = input
    const currentImage = selectedImage
    const newMsg = { role: 'user', content: currentInput, image: currentImage }

    setMessages((p) => [...p, newMsg, { role: 'assistant', content: '' }])
    setInput('')
    setSelectedImage(null)
    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let activeChatId = currentChatId
    if (session && !activeChatId) {
      const { data: newChat } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          title: currentInput.slice(0, 30) + '...',
        })
        .select()
        .single()
      if (newChat) {
        activeChatId = newChat.id
        setCurrentChatId(newChat.id)
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          image: currentImage,
          chatId: activeChatId,
        }),
      })

      if (!res.ok) {
        if (res.status === 402) {
          setShowPricingModal(true)
          throw new Error('Subscription required.')
        }
        if (res.status === 429) {
          const data = await res.json()
          throw new Error(data.error || 'Rate limit exceeded. Please upgrade.')
        }
        if (res.status === 503) {
          const data = await res.json()
          throw new Error(data.error || 'Service temporarily unavailable')
        }
        throw new Error(`Server error: ${res.status}`)
      }

      const data = await res.json()
      setMessages((p) => {
        const u = [...p]
        u[u.length - 1].content = data.message || 'No response.'
        return u
      })
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((p) => {
        const u = [...p]
        u[u.length - 1].content = `Error: ${err.message}`
        return u
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch (error) {
      console.error(error)
      alert('Failed to process image')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canUseApp = session && hasActiveSubscription

  return (
    <>
      <style jsx global>{`
        body {
          background-color: #f9fafb;
          color: #111827;
        }
        .btn-press {
          transition: transform 0.1s ease;
        }
        .btn-press:active {
          transform: scale(0.98);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12);
          border-radius: 3px;
        }
      `}</style>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          setShowPricingModal(true)
        }}
      />
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />

      <div className="relative min-h-screen w-full overflow-hidden bg-white">
        <div className="relative z-10 flex flex-col h-[100dvh]">
          <header className="border-b border-slate-200 bg-white z-30">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
              <div
                className={`font-semibold tracking-tight text-xl ${outfit.className} text-slate-900`}
              >
                protocol<span className="text-slate-500">LM</span>
              </div>
              <div className="flex items-center gap-4">
                {!session ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className={`text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors ${inter.className}`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => setShowPricingModal(true)}
                      className={`inline-flex items-center gap-2 bg-black hover:bg-slate-900 text-white px-3 sm:px-4 py-2.5 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${inter.className}`}
                    >
                      <Icons.Check />
                      Sign up
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {canUseApp && (
                      <button
                        onClick={handleNewChat}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <Icons.Plus />
                      </button>
                    )}
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
                      >
                        {session.user.email[0].toUpperCase()}
                      </button>
                      {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 p-1">
                          <button
                            onClick={() => setShowPricingModal(true)}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-3 rounded-md transition-colors"
                          >
                            <Icons.Settings /> Subscription
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 rounded-md transition-colors"
                          >
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

          <main className="flex-1 flex flex-col items-center justify-start w-full pb-20 md:pb-0 overflow-y-auto bg-white">
            {!canUseApp ? (
              <LandingPage onShowPricing={() => setShowPricingModal(true)} />
            ) : (
              <>
                <div
                  className="flex-1 overflow-y-auto w-full py-8"
                  ref={scrollRef}
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <p
                        className={`text-slate-500 text-base max-w-md leading-relaxed ${inter.className}`}
                      >
                        Ask about the Michigan Food Code, Washtenaw enforcement, or
                        upload a photo to check for violations.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col w-full max-w-4xl mx-auto py-8 px-6 gap-8">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`w-full flex ${
                            msg.role === 'user'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[90%] px-2 ${
                              msg.role === 'user'
                                ? 'text-slate-900 font-medium'
                                : 'text-slate-800'
                            }`}
                          >
                            {msg.image && (
                              <img
                                src={msg.image}
                                alt="Upload"
                                className="rounded-lg mb-4 max-h-80 object-contain border border-slate-200"
                              />
                            )}
                            {msg.role === 'assistant' &&
                            msg.content === '' &&
                            isSending &&
                            idx === messages.length - 1 ? (
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <div
                                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.1s' }}
                                />
                                <div
                                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                  style={{ animationDelay: '0.2s' }}
                                />
                              </div>
                            ) : (
                              <div className="text-base leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full shrink-0 z-20 bg-white border-t border-slate-100 pt-4">
                  <div className="w-full max-w-4xl mx-auto px-4 pb-8">
                    {selectedImage && (
                      <div className="mb-3 mx-1 p-3 bg-white border border-slate-200 rounded-lg inline-flex items-center gap-3 shadow-sm">
                        <span className="text-sm text-slate-900 font-semibold">
                          Image attached
                        </span>
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="text-slate-400 hover:text-slate-900"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    )}
                    <form
                      onSubmit={handleSend}
                      className="relative flex items-end w-full p-2 bg-white border border-slate-300 rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900 transition-all"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImage}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all mb-1 ml-1"
                      >
                        <Icons.Camera />
                      </button>
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                        placeholder="Ask about code sections, violations, or upload a photo..."
                        className={`flex-1 max-h-[200px] min-h-[44px] py-3 px-4 bg-transparent border-none focus:ring-0 focus:outline-none appearance-none resize-none text-slate-900 placeholder-slate-400 text-base leading-relaxed ${inter.className}`}
                        rows={1}
                      />
                      <button
                        type="submit"
                        disabled={
                          (!input.trim() && !selectedImage) || isSending
                        }
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mb-1 mr-1 transition-all duration-200 ${
                          !input.trim() && !selectedImage
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-black text-white hover:bg-slate-900 shadow-md'
                        }`}
                      >
                        {isSending ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Icons.ArrowUp />
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
