// app/page.js
'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { compressImage } from '@/lib/imageCompression'
import { Outfit, Inter, IBM_Plex_Mono } from 'next/font/google'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'

// --- Fonts ---
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'] })

// --- Config ---
const MONTHLY_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY
const ANNUAL_PRICE = process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL

// --- Icons ---
const Icons = {
  Camera: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Shield: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
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
}

// --- Demo Data ---
const DEMO_DOCUMENTS = [
  'Washtenaw County Enforcement Actions',
  'Washtenaw County Violation Types',
  'Washtenaw County Food Allergy Information',
  'Washtenaw County Inspection Program',
  'Food Labeling Guide',
  'Food Temperatures',
  'Internal Cooking Temperatures',
  'FDA Food Code',
  'MI Modified Food Code',
  'MCL Act 92 of 2000',
  'Inspection Report Types',
  'Date Marking Guide',
  'Cross Contamination',
  'Cooling Foods',
  'Sanitation Standards',
  'Fat, Oil, and Grease Control',
  'New Business Information Packet',
  'Norovirus Environmental Cleaning',
  'Procedures for the Michigan Food Code',
  'Retail Food Establishments Emergency Action Plan',
]

const TYPEWRITER_LINES = [
  'Welcome to Protocol LM.',
  'Where you catch violations before they cost you.',
  'Upload an image to check compliance in seconds.',
  'Ask anything about Washtenaw County food safety and regulations.',
]

// --- Helper Components ---

function useConsoleTypewriter(lines) {
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let isCancelled = false
    let lineIndex = 0
    let charIndex = 0
    let buffer = ''
    let printed = []
    let deleting = false
    let deleteCountdown = 0
    let mistakesUsed = 0
    const mistakeLimit = 1
    let timeoutId

    const schedule = (delay) => {
      timeoutId = setTimeout(step, delay)
    }

    const step = () => {
      if (isCancelled) return
      const current = lines[lineIndex]

      if (!deleting) {
        const allowMistake = mistakesUsed < mistakeLimit
        const makeMistake = allowMistake && Math.random() < 0.04 && charIndex > 4 && charIndex < current.length - 6

        if (makeMistake) {
          mistakesUsed += 1
          const alphabet = 'abcdefghijklmnopqrstuvwxyz'
          buffer += alphabet[Math.floor(Math.random() * alphabet.length)]
          deleteCountdown = 1
          deleting = true
          setOutput([...printed, buffer].join('\n'))
          return schedule(90 + Math.random() * 40)
        }

        buffer += current[charIndex]
        charIndex += 1
        setOutput([...printed, buffer].join('\n'))

        if (charIndex === current.length) {
          printed = [...printed, buffer]
          buffer = ''
          charIndex = 0
          lineIndex += 1
          mistakesUsed = 0

          if (lineIndex >= lines.length) {
            setOutput(printed.join('\n'))
            setDone(true)
            return
          }
          return schedule(400)
        }
        return schedule(28 + Math.random() * 18)
      }

      buffer = buffer.slice(0, -1)
      deleteCountdown -= 1
      setOutput([...printed, buffer].join('\n'))
      if (deleteCountdown <= 0) deleting = false
      schedule(40 + Math.random() * 50)
    }

    schedule(400)
    return () => {
      isCancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [lines])

  return { output, done }
}

function SmartProgress({ active, mode = 'text', requestKey = 0 }) {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('Starting…')
  const refs = useRef({ pct: 0, timer: null, startedAt: 0, hideTimer: null })

  const cfg = useMemo(() => {
    return mode === 'vision' ? { baseCap: 88, finalCap: 94, k: 0.03 } : { baseCap: 90, finalCap: 96, k: 0.04 }
  }, [mode])

  useEffect(() => {
    if (refs.current.hideTimer) {
      clearTimeout(refs.current.hideTimer)
      refs.current.hideTimer = null
    }

    if (active) {
      setVisible(true)
      setProgress(0)
      setPhase(mode === 'vision' ? 'Uploading image…' : 'Sending…')

      refs.current.pct = 0
      refs.current.startedAt = Date.now()
      if (refs.current.timer) clearInterval(refs.current.timer)

      refs.current.timer = setInterval(() => {
        const elapsed = (Date.now() - refs.current.startedAt) / 1000
        const cap = elapsed < 1.5 ? cfg.baseCap - 8 : elapsed < 4 ? cfg.baseCap : cfg.finalCap
        const next = refs.current.pct + (cap - refs.current.pct) * cfg.k
        refs.current.pct = Math.max(refs.current.pct, next)
        const pctInt = Math.min(99, Math.floor(refs.current.pct))
        setProgress(pctInt)

        const p = pctInt
        if (p < 15) setPhase(mode === 'vision' ? 'Analyzing image…' : 'Reading question…')
        else if (p < 45) setPhase('Searching regulations…')
        else if (p < 70) setPhase('Checking requirements…')
        else if (p < 90) setPhase('Formulating answer…')
        else setPhase('Finalizing…')
      }, 120)

      return () => {
        if (refs.current.timer) clearInterval(refs.current.timer)
        refs.current.timer = null
      }
    }

    if (!active && visible) {
      if (refs.current.timer) clearInterval(refs.current.timer)
      refs.current.timer = null
      setProgress(100)
      setPhase('Done')
      refs.current.hideTimer = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 350)
      return () => {
        if (refs.current.hideTimer) clearTimeout(refs.current.hideTimer)
        refs.current.hideTimer = null
      }
    }
  }, [active, requestKey, cfg, mode, visible])

  if (!visible) return null

  return (
    <div className={`smart-progress ${ibmMono.className}`}>
      <div className="smart-progress-header">
        <span className="smart-progress-phase">{phase}</span>
        <span className="smart-progress-pct">{progress}%</span>
      </div>
      <div className="smart-progress-track">
        <div className="smart-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function LandingPage({ onShowPricing, onShowAuth }) {
  const { output: typewriter, done: typewriterDone } = useConsoleTypewriter(TYPEWRITER_LINES)
  // Tripled list to prevent blank spaces during scroll
  const documentScrollRows = useMemo(() => [...DEMO_DOCUMENTS, ...DEMO_DOCUMENTS, ...DEMO_DOCUMENTS], [])
  const [showPricingMenu, setShowPricingMenu] = useState(false)

  return (
    <div className={`${ibmMono.className} ibm-landing`}>
      <div className="ibm-landing-topbar">
        <div /> {/* Spacer */}
        <div className="ibm-top-actions">
          <div className="pricing-menu-wrapper">
            <button
              type="button"
              className="ibm-cta secondary compact"
              onClick={() => setShowPricingMenu((v) => !v)}
            >
              Pricing
            </button>
            {showPricingMenu && (
              <div className="pricing-menu">
                <div className="pricing-menu-title">Site License</div>
                <div className="pricing-menu-price">$100 / month</div>
                <ul className="pricing-menu-list">
                  <li>Unlimited usage</li>
                </ul>
                <button
                  type="button"
                  className="ibm-cta block compact"
                  onClick={() => {
                    setShowPricingMenu(false)
                    onShowPricing()
                  }}
                >
                  Start trial
                </button>
              </div>
            )}
          </div>
          <button onClick={onShowPricing} className="ibm-cta compact">
            Start trial
          </button>
          <button onClick={onShowAuth} className="ibm-cta secondary compact">
            Sign in
          </button>
        </div>
      </div>

      <div className="ibm-landing-bg" />
      <div className="ibm-landing-grid">
        <section className="ibm-console-text">
          <pre className="ibm-console-type">
            {typewriter}
            {typewriterDone && <span className="type-cursor">▌</span>}
          </pre>
        </section>

        <section className="ibm-doc-card">
          <div className="ibm-doc-window">
            <div className="ibm-doc-gradient" />
            <div className="ibm-doc-scroll animate-doc-scroll">
              {documentScrollRows.map((doc, idx) => (
                <div key={`${doc}-${idx}`} className="ibm-doc-row">
                  <span className="ibm-doc-dot" />
                  <span className="ibm-doc-name">{doc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setMessage('')
    
    try {
      const captchaToken = await executeRecaptcha(mode)
      if (!captchaToken) throw new Error('Security verification failed.')

      const body = { email, captchaToken, ...(mode !== 'reset' && { password }) }
      const endpoint = mode === 'reset' ? '/api/auth/reset-password' : mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Authentication failed.')

      setMessageKind('ok')
      setMessage(mode === 'reset' ? 'Check your email.' : 'Success. Redirecting...')
      
      if (mode === 'signin' || mode === 'signup') {
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 500)
      }
    } catch (error) {
      setMessageKind('err')
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card retro-modal">
          <button onClick={onClose} className="modal-close-btn"><Icons.X /></button>
          <div className="modal-header">
            <h2 className={`${ibmMono.className} modal-title`}>
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-field">
              <label className={ibmMono.className}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={`form-input ${ibmMono.className}`} />
            </div>
            {mode !== 'reset' && (
              <div className="form-field">
                <label className={ibmMono.className}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={`form-input ${ibmMono.className}`} />
              </div>
            )}
            <button type="submit" disabled={loading || !isLoaded} className={`btn-form-submit ${ibmMono.className}`}>
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </form>
          {message && <div className={`modal-alert ${messageKind} ${ibmMono.className}`}>{message}</div>}
          <div className="modal-footer">
            {mode === 'signin' && <button onClick={() => setMode('signup')} className={`modal-link ${ibmMono.className}`}>Need an account?</button>}
            {mode === 'signup' && <button onClick={() => setMode('signin')} className={`modal-link ${ibmMono.className}`}>Have an account?</button>}
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card retro-modal">
          <button onClick={onClose} className="modal-close-btn"><Icons.X /></button>
          <h2 className={`${ibmMono.className} modal-title`} style={{ textAlign: 'center' }}>Site License</h2>
          <div className={`pricing-display ${ibmMono.className}`}>
            <span className="amount">$100</span>/month
          </div>
          <div className="pricing-actions">
            <button onClick={() => onCheckout(MONTHLY_PRICE, 'monthly')} disabled={!!loading} className={`btn-form-submit ${ibmMono.className}`}>
              {loading === 'monthly' ? 'Processing...' : 'Start 7-Day Trial'}
            </button>
            <div style={{ height: 8 }} />
            <button onClick={() => onCheckout(ANNUAL_PRICE, 'annual')} disabled={!!loading} className={`btn-form-submit ${ibmMono.className}`} style={{ background: 'transparent', color: '#fff', border: '1px solid #333' }}>
              Annual Plan ($1000/yr)
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
  const { isLoaded: captchaLoaded, executeRecaptcha } = useRecaptcha()

  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [sendKey, setSendKey] = useState(0)
  const [sendMode, setSendMode] = useState('text')
  const [currentChatId, setCurrentChatId] = useState(null)

  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  const isAuthenticated = !!session

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.dataset.view = isAuthenticated ? 'chat' : 'landing'
  }, [isAuthenticated])

  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' })

  // --- Session & Subscription Logic (Restored) ---
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

      // 1. Check Terms
      try {
        const { data: profile } = await supabase.from('user_profiles').select('accepted_terms, accepted_privacy').eq('id', s.user.id).maybeSingle()
        if (!profile?.accepted_terms || !profile?.accepted_privacy) {
          router.replace('/accept-terms')
          return
        }
      } catch (e) { console.error(e) }

      // 2. Check Subscription
      let active = false
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status,current_period_end')
          .eq('user_id', s.user.id)
          .in('status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub?.current_period_end && new Date(sub.current_period_end) > new Date()) active = true
      } catch (e) { console.error(e) }

      if (isMounted) {
        setHasActiveSubscription(active)
        setIsLoading(false)
      }
    }

    async function init() {
      const { data } = await supabase.auth.getSession()
      loadSessionAndSub(data.session)
    }
    init()
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, s) => loadSessionAndSub(s))
    return () => { isMounted = false; authListener.subscription.unsubscribe() }
  }, [supabase, router])

  useEffect(() => {
    if (messages.length) scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (searchParams?.get('showPricing') === 'true') setShowPricingModal(true)
  }, [searchParams])

  // --- Action Handlers (Restored) ---
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setMessages([])
    setCurrentChatId(null)
    setSession(null)
    window.location.reload()
  }

  const handleCheckout = async (priceId, planName) => {
    if (!session) {
      setShowPricingModal(false); setShowAuthModal(true); return
    }
    if (!captchaLoaded) return
    setCheckoutLoading(planName)

    try {
      const captchaToken = await executeRecaptcha('checkout')
      if (!captchaToken) throw new Error('Security check failed.')

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ priceId, captchaToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.url) window.location.href = data.url
    } catch (e) {
      alert(e.message || 'Checkout failed')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!session) return
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.url) window.location.href = data.url
    } catch (e) {
      alert(e.message || 'Billing portal failed')
    }
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if ((!input.trim() && !selectedImage) || isSending) return

    const question = input.trim()
    const image = selectedImage
    setSendMode(image ? 'vision' : 'text')
    setSendKey(p => p + 1)

    const newUserMsg = { role: 'user', content: question, image }
    setMessages(prev => [...prev, newUserMsg, { role: 'assistant', content: '' }])
    setInput('')
    setSelectedImage(null)
    setIsSending(true)
    if (fileInputRef.current) fileInputRef.current.value = ''

    let activeChatId = currentChatId

    try {
      // Create chat if doesn't exist
      if (session && !activeChatId) {
        const { data: created } = await supabase.from('chats').insert({ user_id: session.user.id, title: (question || 'New Chat').slice(0,40) }).select().single()
        if (created) {
          activeChatId = created.id
          setCurrentChatId(created.id)
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newUserMsg], image, chatId: activeChatId }),
      })

      if (!res.ok) {
        if (res.status === 402) { setShowPricingModal(true); throw new Error('Subscription required.') }
        const err = await res.json()
        throw new Error(err.error || 'Request failed.')
      }

      const data = await res.json()
      setMessages(prev => {
        const up = [...prev]
        up[up.length - 1] = { role: 'assistant', content: data.message || 'No response.' }
        return up
      })
    } catch (err) {
      setMessages(prev => {
        const up = [...prev]
        up[up.length - 1] = { role: 'assistant', content: `Error: ${err.message}` }
        return up
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const comp = await compressImage(file)
        setSelectedImage(comp)
      } catch (e) { alert('Image error') }
    }
  }

  if (isLoading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  return (
    <>
      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════════
           RETRO DARK THEME - ProtocolLM
           Strict Monospace & Dark Console Aesthetic
           ═══════════════════════════════════════════════════════════════════════ */
        :root {
          --bg-main: #0e0e11;
          --bg-card: #15151a;
          --border: #2a2a32;
          --border-hover: #40404a;
          --text-main: #f2f2f2;
          --text-muted: #888890;
          --accent: #2F5D8A;
          --accent-green: #55D6B2;
          --font-mono: 'IBM Plex Mono', monospace;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        html, body {
          background: var(--bg-main);
          color: var(--text-main);
          height: 100%;
          overflow: hidden; /* App-like feel */
        }

        /* ─── Shared Retro UI ─── */
        .ibm-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          background: #1d1d22;
          color: #f2f2f2;
          border: 1px solid #2a2a32;
          border-radius: 4px; /* Sharper corners */
          text-transform: uppercase;
          font-family: var(--font-mono);
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ibm-cta:hover { border-color: #555; background: #25252a; }
        
        .ibm-cta.secondary { background: transparent; color: #aaa; border-color: transparent; }
        .ibm-cta.secondary:hover { color: #fff; }
        
        .ibm-cta.compact {
          padding: 6px 12px;
          font-size: 11px; /* Smaller as requested */
          height: 32px;
        }

        /* ─── Landing Page Specifics ─── */
        .ibm-landing {
          position: absolute; inset: 0; overflow-y: auto;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-main);
        }
        .ibm-landing-topbar {
          position: absolute; top: 0; left: 0; right: 0;
          padding: 16px 24px; display: flex; justify-content: space-between; z-index: 10;
        }
        .ibm-top-actions { display: flex; gap: 8px; align-items: center; }
        
        .pricing-menu-wrapper { position: relative; }
        .pricing-menu {
          position: absolute; right: 0; top: 100%; margin-top: 8px;
          background: var(--bg-card); border: 1px solid var(--border);
          padding: 16px; min-width: 220px; z-index: 20;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .pricing-menu-title { font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
        .pricing-menu-price { font-size: 20px; color: #fff; margin-bottom: 12px; }
        .pricing-menu-list { list-style: none; color: #ccc; font-size: 13px; margin-bottom: 16px; }

        .ibm-landing-grid {
          width: 100%; max-width: 1100px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
          padding: 24px;
        }
        @media (max-width: 768px) { .ibm-landing-grid { grid-template-columns: 1fr; } }

        .ibm-console-type {
          font-family: var(--font-mono); color: var(--text-main);
          font-size: 15px; line-height: 1.6; min-height: 120px;
        }
        .type-cursor { animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0; } }

        /* ─── Demo Database Retro Styling ─── */
        .ibm-doc-window {
          height: 340px; overflow: hidden; position: relative;
          background: #0a0a0d; border: 1px solid #333;
          border-radius: 6px;
        }
        .ibm-doc-gradient {
          position: absolute; inset: 0; pointer-events: none; z-index: 2;
          background: linear-gradient(180deg, #0a0a0d 0%, transparent 10%, transparent 90%, #0a0a0d 100%);
        }
        .ibm-doc-scroll { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .ibm-doc-row { 
          display: flex; align-items: center; gap: 12px; 
          font-family: var(--font-mono); font-size: 13px; color: #889;
        }
        .ibm-doc-dot { width: 4px; height: 4px; background: #445; border-radius: 50%; }
        
        /* Faster scroll (19s) */
        .animate-doc-scroll { animation: doc-scroll 19s linear infinite; }
        @keyframes doc-scroll { 0% { transform: translateY(0); } 100% { transform: translateY(-33.33%); } }

        /* ─── Chat App Layout ─── */
        .app-container { display: flex; flex-direction: column; height: 100vh; }
        
        .chat-container {
          flex: 1; display: flex; flex-direction: column; min-height: 0;
          background: var(--bg-main); position: relative;
        }
        
        .chat-topbar {
          display: flex; justify-content: flex-end; padding: 12px 20px;
          border-bottom: none; background: var(--bg-main);
        }

        .chat-messages {
          flex: 1; overflow-y: auto; padding: 20px;
          display: flex; flex-direction: column; gap: 20px;
        }
        
        .chat-empty {
          flex: 1; display: flex; align-items: center; justify-content: center;
          text-align: center; color: var(--text-muted); opacity: 0.6;
        }

        .chat-bubble {
          max-width: 85%; padding: 12px 16px; font-size: 15px; line-height: 1.5;
          color: var(--text-main);
        }
        .chat-message-user { align-self: flex-end; }
        .chat-message-user .chat-bubble { background: #222; border-radius: 8px 8px 0 8px; border: 1px solid #333; }
        .chat-message-assistant { align-self: flex-start; }
        .chat-message-assistant .chat-bubble { padding-left: 0; }
        
        .chat-bubble-image img {
          max-width: 100%; max-height: 250px; border-radius: 4px; border: 1px solid #333; margin-bottom: 8px;
        }

        /* ─── Chat Input (Retro) ─── */
        .chat-input-area {
          background: var(--bg-main);
          border-top: none;
          padding: 20px;
        }
        .chat-input-inner { max-width: 800px; margin: 0 auto; width: 100%; }
        
        .chat-attachment-badge {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--font-mono); font-size: 12px; color: var(--accent-green);
          margin-bottom: 8px; border: 1px dashed var(--border); padding: 4px 8px;
        }

        .chat-input-row { display: flex; gap: 12px; align-items: flex-end; }
        
        /* Input Textarea - IBM Font required */
        .chat-textarea {
          flex: 1; background: transparent; border: none; outline: none;
          color: #fff; font-family: var(--font-mono); font-size: 14px;
          resize: none; min-height: 24px; max-height: 120px;
          padding-bottom: 8px; border-bottom: 1px solid #333;
          transition: border-color 0.2s;
        }
        .chat-textarea:focus { border-bottom-color: #777; }
        .chat-textarea::placeholder { color: #555; }

        /* Camera & Send Buttons - Retro Style */
        .btn-retro-icon {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: #111; border: 1px solid #333; color: #888;
          border-radius: 4px; cursor: pointer; transition: all 0.2s;
        }
        .btn-retro-icon:hover { border-color: #666; color: #fff; }
        .btn-retro-icon:disabled { opacity: 0.3; }

        /* Progress Bar */
        .smart-progress { margin-bottom: 12px; }
        .smart-progress-header { display: flex; justify-content: space-between; font-size: 11px; color: var(--accent-green); margin-bottom: 4px; }
        .smart-progress-track { height: 2px; background: #222; }
        .smart-progress-bar { height: 100%; background: var(--accent-green); transition: width 0.2s; }

        /* ─── Modals (Dark) ─── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100;
          display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);
        }
        .retro-modal {
          background: #111; border: 1px solid #333; padding: 32px;
          width: 100%; max-width: 400px; color: #fff; position: relative;
        }
        .modal-close-btn {
          position: absolute; top: 12px; right: 12px;
          background: none; border: none; color: #555; cursor: pointer;
        }
        .modal-close-btn:hover { color: #fff; }
        .modal-title { font-size: 20px; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }
        
        .form-field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
        .form-field label { font-size: 12px; color: #888; text-transform: uppercase; }
        .form-input {
          background: #000; border: 1px solid #333; color: #fff;
          padding: 10px; font-size: 14px; outline: none;
        }
        .form-input:focus { border-color: var(--accent-green); }
        
        .btn-form-submit {
          width: 100%; background: #fff; color: #000; border: none;
          padding: 12px; font-weight: 700; text-transform: uppercase;
          cursor: pointer; margin-top: 8px;
        }
        .btn-form-submit:hover:not(:disabled) { background: #ccc; }
        
        .modal-alert { margin-top: 16px; font-size: 12px; padding: 10px; border: 1px solid; }
        .modal-alert.err { border-color: red; color: #faa; }
        .modal-alert.ok { border-color: green; color: #afa; }
        
        .pricing-display { text-align: center; margin: 30px 0; font-size: 14px; color: #888; }
        .pricing-display .amount { font-size: 48px; color: #fff; font-weight: 400; }
        
        .modal-footer { margin-top: 20px; text-align: center; }
        .modal-link { background: none; border: none; color: #666; font-size: 12px; cursor: pointer; text-decoration: underline; }
        .modal-link:hover { color: #fff; }

        .loading-screen { position: fixed; inset: 0; background: #000; display: flex; align-items: center; justify-content: center; }
        .loading-spinner { width: 20px; height: 20px; border: 2px solid #333; border-top-color: #fff; border-radius: 50%; animation: spin 1s infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} onCheckout={handleCheckout} loading={checkoutLoading} />

      <div className="app-container">
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!isAuthenticated ? (
            <LandingPage
              onShowPricing={() => setShowPricingModal(true)}
              onShowAuth={() => setShowAuthModal(true)}
            />
          ) : (
            <div className="chat-container">
              <div className="chat-topbar">
                <div className="chat-top-actions">
                  {hasActiveSubscription && (
                    <button onClick={handleManageBilling} className={`ibm-cta secondary compact ${ibmMono.className}`}>
                      Billing
                    </button>
                  )}
                  <button onClick={handleSignOut} className={`ibm-cta secondary compact ${ibmMono.className}`}>
                    Log out
                  </button>
                </div>
              </div>

              <div ref={scrollRef} className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-empty">
                    <div>
                      <Icons.Shield />
                      <p className={ibmMono.className} style={{ marginTop: 16, fontSize: 14 }}>
                        PROTOCOL_LM v1.0 <br/> READY FOR INPUT
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                      <div className={`chat-bubble ${ibmMono.className}`}>
                        {msg.image && (
                          <div className="chat-bubble-image">
                            <img src={msg.image} alt="Uploaded" />
                          </div>
                        )}
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-input-area">
                <div className="chat-input-inner">
                  <SmartProgress active={isSending} mode={sendMode} requestKey={sendKey} />

                  {selectedImage && (
                    <div className={`${ibmMono.className} chat-attachment-badge`}>
                      <Icons.Camera />
                      <span>IMAGE_ATTACHED.JPG</span>
                      <button onClick={() => setSelectedImage(null)} style={{background:'none', border:'none', color:'inherit', cursor:'pointer', marginLeft: 4}}><Icons.X /></button>
                    </div>
                  )}

                  <div className="chat-input-row">
                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                    
                    <button onClick={() => fileInputRef.current?.click()} className="btn-retro-icon" aria-label="Camera">
                      <Icons.Camera />
                    </button>

                    <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question or attach a photo..."
                        rows={1}
                        className={`chat-textarea ${ibmMono.className}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSend(e)
                          }
                        }}
                      />
                      <button type="submit" disabled={(!input.trim() && !selectedImage) || isSending} className="btn-retro-icon">
                        {isSending ? <div className="loading-spinner" style={{ width: 14, height: 14, borderTopColor: '#888' }} /> : <Icons.ArrowUp />}
                      </button>
                    </form>
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
