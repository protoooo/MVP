'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. PRECISION TECHNICAL ICONS (Not Vibe-Coded) ---
// High-contrast, flat, regulatory aesthetic.

const IconRevenue = () => (
  <svg viewBox="0 0 48 48" className="w-full h-full text-rose-600">
    {/* Frame */}
    <rect x="2" y="2" width="44" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
    {/* Chart Line */}
    <path d="M10 16 L20 16 L28 26 L38 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    {/* Arrow Head */}
    <path d="M38 34 L38 24 M38 34 L28 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    {/* Grid Lines (Subtle) */}
    <path d="M10 24 H20 M28 24 H38" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
  </svg>
)

const IconIncident = () => (
  <svg viewBox="0 0 48 48" className="w-full h-full text-amber-500">
    {/* Warning Triangle Shape */}
    <path d="M24 4 L44 42 H4 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    {/* Dollar Sign (The Risk) */}
    <path d="M24 14 V34 M20 18 H24 C27 18 28 20 28 22 C28 24 27 26 24 26 H20 C17 26 16 28 16 30 C16 32 17 34 24 34 H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const IconMultiplier = () => (
  <svg viewBox="0 0 48 48" className="w-full h-full text-indigo-500">
    {/* Technical Crosshair/Multiplier */}
    <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M14 14 L34 34 M34 14 L14 34" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    {/* Ticks */}
    <path d="M24 2 V6 M24 42 V46 M2 24 H6 M42 24 H46" stroke="currentColor" strokeWidth="2" />
  </svg>
)

// --- 2. CHAT DEMO (Industrial Terminal Look) ---
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
            <span className="font-bold text-rose-400 border-b border-rose-400/30">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[550px] group mx-auto">
      {/* Heavy Steel Shadow */}
      <div className="absolute top-2 left-2 w-full h-full bg-black/40 rounded-sm -z-10"></div>
      
      {/* Main Container - Dark Terminal Style */}
      <div className="flex flex-col h-[480px] w-full bg-[#1e293b] border-2 border-slate-600 rounded-sm relative z-10 overflow-hidden shadow-2xl">
        
        {/* Header - Industrial Label */}
        <div className="h-10 border-b-2 border-slate-700 flex items-center px-4 justify-between bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              LIVE_FEED // MI_CODE_DB
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-50">
             <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
             <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
             <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll bg-[#1e293b]"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
              <div className="w-12 h-12 border-2 border-dashed border-slate-500 rounded flex items-center justify-center">
                 <div className="w-4 h-4 bg-slate-500 rounded-sm animate-spin"/>
              </div>
              <p className="text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase">System Online</p>
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
                className={`max-w-[90%] px-4 py-3 text-xs font-mono leading-relaxed shadow-sm border-l-2 ${
                  msg.role === 'user'
                    ? 'bg-[#334155] text-white border-blue-500 rounded-r-sm'
                    : 'bg-[#0f172a] text-slate-300 border-emerald-500 rounded-r-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-[#0f172a] px-3 py-2 border-l-2 border-emerald-500/50 flex gap-2 items-center">
                <span className="text-[10px] font-mono text-emerald-500 animate-pulse">PROCESSING_QUERY_</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-3 bg-[#0f172a] border-t-2 border-slate-700">
          <div className="w-full bg-black/20 border border-slate-600 rounded-sm px-3 py-2.5 flex items-center gap-3">
            <span className="text-emerald-500 font-mono text-xs">{'>'}</span>
            <div className="flex-1 text-xs text-slate-300 font-mono min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse" />
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

// --- 4. EXECUTIVE STAT CARDS (The "Paperwork" Look) ---
// These look like official documents or high-contrast labels.
const StatCard = ({ title, value, sub, type, icon, delay }) => {
  return (
    <div 
      style={{ animationDelay: `${delay}ms` }}
      className="relative bg-white h-[140px] flex flex-col p-0 overflow-hidden opacity-0 animate-reveal-card shadow-lg group hover:-translate-y-1 transition-transform duration-300"
    >
      {/* Top Warning Strip */}
      <div className={`h-1.5 w-full ${type === 'danger' ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-500' : 'bg-indigo-600'}`} />
      
      <div className="p-5 flex-1 flex flex-col justify-between relative">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</div>
            <div className="text-3xl font-bold text-slate-900 tracking-tighter">{value}</div>
          </div>
          {/* Icon stamped in top right */}
          <div className="w-10 h-10 opacity-90 grayscale group-hover:grayscale-0 transition-all duration-300">
            {icon}
          </div>
        </div>
        
        <div className="text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-3 mt-1 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${type === 'danger' ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-500' : 'bg-indigo-600'}`}></span>
          {sub}
        </div>
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
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300" />
      {/* Modal - Square edges, heavy contrast */}
      <div className="w-full max-w-[400px] bg-white shadow-2xl p-8 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-8 uppercase font-mono border-b border-slate-100 pb-4">
          {view === 'signup' ? 'Access Request' : 'Authorized Login'}
        </h2>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-slate-50 border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all disabled:opacity-50 mb-6">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-sm font-bold text-slate-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 font-mono uppercase tracking-widest">Or</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-white border border-slate-300 focus:border-slate-900 focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 transition-all" placeholder="EMAIL_ADDRESS" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-white border border-slate-300 focus:border-slate-900 focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 transition-all" placeholder="PASSWORD" />
          <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 text-xs uppercase tracking-widest transition-all shadow-lg active:translate-y-0.5 disabled:opacity-50 mt-4">
            {loading ? 'Processing...' : view === 'signup' ? 'Initialize Account' : 'Secure Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wide transition-colors">
            {view === 'signup' ? 'Have an account? Login' : 'Need Access? Request Account'}
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
    <div className="min-h-screen w-full bg-[#0B1120] font-sans text-slate-100 selection:bg-rose-600 selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND (Dark Industrial) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* The Base Texture */}
        <div className="absolute inset-0 bg-[#0B1120]"></div>
        {/* Your Image, blended darkly */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
           <Image src="/background.png" alt="Background" fill className="object-cover" priority />
        </div>
        {/* Technical Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-[#0B1120]/80"></div>
      </div>

      {/* NAVBAR (High & Tight) */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 bg-[#0B1120]/80 border-b border-white/5 backdrop-blur-sm">
        <div className={`w-full max-w-7xl flex justify-between items-center h-16 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-6 h-6 border-2 border-white flex items-center justify-center">
               <div className="w-2 h-2 bg-white"></div>
            </div>
            <span className="text-sm font-bold tracking-tight text-white font-mono">
              PROTOCOL_LM
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-white hover:bg-slate-200 text-black px-5 py-2 text-xs font-bold transition-all uppercase tracking-widest">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Shifted Up drastically) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 pb-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10 h-[calc(100vh-64px)] min-h-[600px]">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left pt-0">
          
          {/* Compliance Status Badge */}
          <div className={`inline-flex items-center gap-3 px-0 py-1 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Compliance Engine: Active
          </div>

          {/* Headline (Strong, White) */}
          <h1 className={`text-4xl md:text-6xl font-bold text-white tracking-tighter leading-[1.05] mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            <span className="text-slate-400">before</span> the inspector arrives.
          </h1>

          {/* Subheader (Clean, Legible) */}
          <p className={`text-sm md:text-base text-slate-400 leading-relaxed max-w-md mx-auto lg:mx-0 mb-10 font-medium transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Instant, AI-verified answers from <strong className="text-white">Washtenaw, Wayne, and Oakland County</strong> health codes. Standardize food safety and protect brand equity.
          </p>

          {/* CTA */}
          <div className={`flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-[0_0_20px_-5px_rgba(225,29,72,0.5)] hover:shadow-[0_0_30px_-5px_rgba(225,29,72,0.6)]">
              Start Free Trial
            </button>
          </div>

          {/* STAT CARDS (The "Briefing" Look) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              type="danger" 
              icon={<IconRevenue />}
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue Drop"
              sub="First-year loss."
              delay={500}
            />
            <StatCard 
              type="warning" 
              icon={<IconIncident />}
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Incident Cost"
              sub="Legal & labor."
              delay={650}
            />
            <StatCard 
              type="info" 
              icon={<IconMultiplier />}
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Fine Multiplier"
              sub="Repeat issues."
              delay={800}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Demo - The "Black Box") */}
        <div className={`flex-1 w-full max-w-[550px] flex justify-center transition-all duration-1000 ease-out delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #334155; }
        
        @keyframes messageSlide {
          0% { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-message-slide { animation: messageSlide 0.3s ease-out forwards; }

        @keyframes revealCard {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal-card { animation: revealCard 0.6s ease-out forwards; }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1120]" />}>
      <MainContent />
    </Suspense>
  )
}
