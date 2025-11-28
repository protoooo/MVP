'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. INDUSTRIAL ISOMETRIC ICONS (Precision Engineered) ---

// "Revenue Waterfall" - Structural, not scribbly
const IsoChart = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm overflow-visible">
    <defs>
      <linearGradient id="crashGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F43F5E"/>
        <stop offset="100%" stopColor="#9F1239"/>
      </linearGradient>
    </defs>
    {/* Grid Base */}
    <path d="M10 50 L40 65 L70 50 L40 35 Z" fill="#E2E8F0" opacity="0.5" />
    
    {/* Block 1 (High) */}
    <path d="M10 20 L25 27.5 V35 L10 27.5 Z" fill="#CBD5E1" />
    <path d="M25 27.5 L40 20 L40 27.5 L25 35 Z" fill="#94A3B8" />
    <path d="M10 20 L25 12.5 L40 20 L25 27.5 Z" fill="#E2E8F0" />

    {/* Block 2 (Mid) */}
    <path d="M25 35 L40 42.5 V50 L25 42.5 Z" fill="#FDA4AF" />
    <path d="M40 42.5 L55 35 L55 42.5 L40 50 Z" fill="#F43F5E" />
    <path d="M25 35 L40 27.5 L55 35 L40 42.5 Z" fill="#FECDD3" />

    {/* Block 3 (Low/Crash) */}
    <path d="M40 50 L55 57.5 V65 L40 57.5 Z" fill="#BE123C" />
    <path d="M55 57.5 L70 50 L70 57.5 L55 65 Z" fill="#881337" />
    <path d="M40 50 L55 42.5 L70 50 L55 57.5 Z" fill="#E11D48" />
  </svg>
)

// "Liability Vault" - Heavy, secure
const IsoVault = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm overflow-visible">
    {/* Door Side */}
    <path d="M40 10 L70 25 V55 L40 40 Z" fill="#D97706" />
    {/* Frame Side */}
    <path d="M10 25 L40 40 V70 L10 55 Z" fill="#B45309" />
    {/* Top */}
    <path d="M10 25 L40 10 L70 25 L40 40 Z" fill="#F59E0B" />
    {/* Lock Dial */}
    <ellipse cx="40" cy="40" rx="8" ry="4" fill="#FEF3C7" className="animate-pulse" />
  </svg>
)

// "Multiplier Stack" - Technical
const IsoStack = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm overflow-visible">
    {/* Base */}
    <path d="M20 45 L40 55 L60 45 L40 35 Z" fill="#93C5FD" />
    <path d="M20 45 L40 55 V65 L20 55 Z" fill="#3B82F6" />
    <path d="M60 45 L40 55 V65 L60 55 Z" fill="#1D4ED8" />
    {/* Floating X */}
    <g className="animate-hover-float">
      <path d="M35 15 L45 15 L45 45 L35 45 Z" fill="#1E40AF" transform="skewY(10)"/>
      <path d="M25 25 L55 25 L55 35 L25 35 Z" fill="#60A5FA" transform="skewY(-10)"/>
    </g>
  </svg>
)

// --- 2. CHAT DEMO (Steel/Glass Aesthetic) ---
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, isThinking])

  const SEQUENCE = [
    {
      text: "We received a notice for a 'Chronic Violation' in Washtenaw County. What does that mean?",
      response: "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan."
    },
    {
      text: 'Our certified manager quit yesterday. Do we have to close the kitchen?',
      response: "NO. 'Oakland County Sanitary Code Article IV, Sec 4.4' allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Health Division immediately to avoid penalties."
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response: 'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.'
    },
    {
      text: 'The floor drain is backing up in the dish room. Can we just mop it and keep serving?',
      response: 'IMMINENT HEALTH HAZARD. Washtenaw Enforcement Procedure Sec 5.0 defines sewage backup as grounds for Immediate Closure. You must cease operations until the backup is fixed and the area sanitized.'
    },
    {
      text: "Inspector cited us for 'Wet Nesting' pans. Is that actually a priority violation?",
      response: 'CORE VIOLATION. Stacking wet pans prevents air drying (FDA Code 4-901.11). While usually a Core item, repeated failure to correct it can lead to Priority Foundation citations for unsanitary equipment storage.'
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(Math.random() * 30 + 20)
    }

    const runSimulation = async () => {
      setHasStarted(true) 
      while (isMounted) {
        for (const step of SEQUENCE) {
          if (!isMounted) return
          setIsTyping(true)
          setInputValue('')
          await wait(500)
          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }
          await wait(400)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)
          setIsThinking(true)
          await wait(1200)
          setIsThinking(false)
          let currentResponse = ''
          const words = step.response.split(' ')
          setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
          for (let i = 0; i < words.length; i++) {
            if (!isMounted) return
            currentResponse += (i === 0 ? '' : ' ') + words[i]
            setMessages((prev) => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content = currentResponse
              return newMsgs
            })
            await wait(25)
          }
          await wait(3500)
        }
        await wait(1200)
        setMessages((prev) => prev.slice(-6))
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    const keywords = ['CRITICAL ACTION', 'VIOLATION', 'IMMINENT HEALTH HAZARD', 'CORE VIOLATION', 'ACTION REQUIRED']
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-bold text-rose-600">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] group mx-auto perspective-1000">
      {/* 1. Industrial Glow (Cool White/Blue) */}
      <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 via-blue-100 to-slate-200 rounded-[20px] blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
      
      {/* 2. Main Container (Steel Glass) */}
      <div className="flex flex-col h-[480px] w-full bg-[#F8FAFC]/90 backdrop-blur-xl border border-white/80 rounded-[18px] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.1)] relative z-10 overflow-hidden transform-gpu transition-all duration-500 ease-out-spring group-hover:scale-[1.005]">
        
        {/* Header */}
        <div className="h-12 border-b border-slate-200/60 flex items-center px-5 justify-between bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
            <span className="font-bold text-slate-700 text-[11px] tracking-tight flex items-center gap-2">
              protocol<span className="text-[#0284C7] font-bold">LM</span>
              <span className="px-1.5 py-px rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200">MI-Code v25</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll bg-gradient-to-b from-white/40 to-white/10"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50 animate-fade-in-up">
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                 <div className="w-6 h-6 border-2 border-slate-200 border-t-[#0284C7] rounded-full animate-spin"/>
              </div>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Local Database Ready</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-message-slide`}
            >
              <div
                className={`max-w-[90%] px-4 py-3 rounded-xl text-[13px] leading-relaxed shadow-sm backdrop-blur-md border ${
                  msg.role === 'user'
                    ? 'bg-[#0F172A] text-white rounded-tr-sm border-slate-800'
                    : 'bg-white text-slate-700 border-slate-100 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/80 px-4 py-2.5 rounded-xl rounded-tl-sm border border-slate-100 flex gap-2 items-center shadow-sm backdrop-blur-md">
                <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Searching Code...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-4 bg-white/60 backdrop-blur-lg border-t border-white/60">
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3 transition-all focus-within:bg-white focus-within:shadow-md focus-within:border-[#0284C7] focus-within:ring-1 focus-within:ring-[#0284C7]/20">
            <div className="flex-1 text-[13px] text-slate-800 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-[#0284C7] ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 3. UTILS ---
const CountUp = ({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(progress * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return (
    <span className="tabular-nums">
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// --- 4. ENTERPRISE STAT CARDS ---
const StatCard = ({ title, value, sub, type, icon, delay }) => {
  return (
    <div 
      style={{ animationDelay: `${delay}ms` }}
      className="group relative bg-white/80 backdrop-blur-xl border border-white/60 p-5 rounded-xl overflow-hidden hover:bg-white transition-all duration-500 ease-out-spring shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-default flex flex-col justify-between min-h-[150px] opacity-0 animate-reveal-card"
    >
      
      {/* 3D Icon - Pinned Top Left */}
      <div className="relative z-10 w-14 h-14 -ml-2 -mt-2 self-start transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
        {icon}
      </div>

      <div className="relative z-10 mt-auto pl-1">
        <div className="text-3xl font-bold text-slate-800 tracking-tighter mb-1">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{title}</div>
        <div className="text-[10px] font-medium text-slate-400 leading-snug">{sub}</div>
      </div>
    </div>
  )
}

// --- 5. AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()

  useEffect(() => {
    setView(defaultView)
    setMessage(null)
  }, [isOpen, defaultView])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Google sign-in error:', error)
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { county: 'washtenaw' }
          }
        })
        if (error) throw error
        if (data?.user && !data?.session) {
          setMessage({ type: 'success', text: 'Confirmation email sent.' })
        } else if (data?.session) {
          window.location.href = '/accept-terms'
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed, accepted_terms, accepted_privacy')
          .eq('id', data.session.user.id)
          .single()

        if (!profile?.accepted_terms || !profile?.accepted_privacy) {
          window.location.href = '/accept-terms'
        } else if (profile?.is_subscribed) {
          window.location.href = '/documents'
        } else {
          window.location.href = '/pricing'
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="w-full max-w-[400px] bg-white backdrop-blur-xl shadow-2xl p-8 rounded-[16px] relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-lg transition-all disabled:opacity-50 mb-6 group">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 font-medium">Or continue with email</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#0284C7] focus:bg-white outline-none text-slate-900 text-sm font-medium placeholder-slate-400 rounded-lg transition-all" placeholder="Email address" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#0284C7] focus:bg-white outline-none text-slate-900 text-sm font-medium placeholder-slate-400 rounded-lg transition-all" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3.5 rounded-lg text-sm transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 mt-2">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-[#0284C7] font-medium transition-colors">
            {view === 'signup' ? 'Already have an account? Sign in' : 'New to protocolLM? Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- 6. LAYOUT ---
function MainContent() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    const authParam = searchParams.get('auth')
    if (authParam) {
      setAuthView(authParam)
      setShowAuth(true)
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  const openAuth = (view) => {
    setAuthView(view)
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen w-full bg-[#F1F5F9] font-sans text-slate-900 selection:bg-[#0284C7] selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND (Professional/Local Vibe) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle Map Texture Hint */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
        
        {/* Deep Lake Gradient */}
        <div className="absolute top-[-40%] left-[-20%] w-[1000px] h-[1000px] rounded-full bg-[#0EA5E9]/10 blur-[150px] animate-orb-breath-1" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#6366F1]/10 blur-[120px] animate-orb-breath-2" />
      </div>

      {/* NAVBAR (High & Tight) */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-3">
        <div className={`w-full max-w-6xl flex justify-between items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-5 h-5 bg-[#0F172A] rounded flex items-center justify-center">
               <div className="w-2 h-2 bg-[#0284C7] rounded-full"></div>
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-800">
              protocol<span className="text-[#0284C7]">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wide">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wide">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 uppercase tracking-wide">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Shifted Up) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-10 pb-0 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-24 relative z-10 h-screen max-h-[850px] min-h-[600px]">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left pt-10 lg:pt-0">
          
          {/* Michigan Local Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-6 shadow-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
            <span className="w-1.5 h-1.5 bg-[#0284C7] rounded-full animate-pulse"></span>
            Local Compliance Engine
          </div>

          {/* Headline (Restored) */}
          <h1 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tighter leading-[1.05] mb-5 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            <span className="text-[#0284C7]">before</span> the inspector arrives.
          </h1>

          {/* Subheader (Mixed: Owner + Functional) */}
          <p className={`text-base text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-8 font-medium transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Instant, AI-verified answers from <strong className="text-slate-900">Washtenaw, Wayne, and Oakland County</strong> health codes. Standardize food safety and protect brand equity.
          </p>

          {/* CTA */}
          <div className={`flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 tracking-wide">
              Start Free Trial
            </button>
          </div>

          {/* CARDS GRID (Matte Isometric) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard 
              type="danger" 
              icon={<IsoChart />}
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue Drop"
              sub="First-year loss."
              delay={500}
            />
            <StatCard 
              type="warning" 
              icon={<IsoVault />}
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Incident Cost"
              sub="Legal & labor."
              delay={650}
            />
            <StatCard 
              type="info" 
              icon={<IsoStack />}
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Fine Multiplier"
              sub="Repeat issues."
              delay={800}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Demo) */}
        <div className={`flex-1 w-full max-w-[550px] flex justify-center perspective-1000 transition-all duration-1000 ease-out-spring delay-300 ${mounted ? 'opacity-100 translate-y-0 rotate-x-0' : 'opacity-0 translate-y-12 rotate-x-6'}`}>
          <DemoChatContent />
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .perspective-1000 { perspective: 1000px; }
        .ease-out-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
        
        @keyframes drift { 0% { transform: scale(1); } 100% { transform: scale(1.05); } }
        .animate-drift { animation: drift 20s ease-in-out infinite alternate; }
        
        @keyframes messageSlide {
          0% { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-message-slide { animation: messageSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        @keyframes revealCard {
          0% { opacity: 0; transform: translateY(20px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-reveal-card { animation: revealCard 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

        @keyframes hoverFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .group:hover .animate-hover-float { animation: hoverFloat 2s ease-in-out infinite; }

        @keyframes orbBreath1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.1; }
          50% { transform: translate(20px, 30px) scale(1.1); opacity: 0.2; }
        }
        @keyframes orbBreath2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.1; }
          50% { transform: translate(-30px, -20px) scale(1.15); opacity: 0.2; }
        }
        .animate-orb-breath-1 { animation: orbBreath1 10s ease-in-out infinite; }
        .animate-orb-breath-2 { animation: orbBreath2 12s ease-in-out infinite reverse; }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <MainContent />
    </Suspense>
  )
}
