'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. MATTE ISOMETRIC ICONS (Custom SVG) ---

// "Market Crash" Waterfall Chart
const IsoRevenue = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm overflow-visible">
    <defs>
      <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F43F5E"/>
        <stop offset="100%" stopColor="#BE123C"/>
      </linearGradient>
    </defs>
    {/* Base Plane */}
    <path d="M10 50 L40 65 L70 50 L40 35 Z" fill="#E2E8F0" opacity="0.5" />
    
    {/* The Crash Line (Ribbon) */}
    <path d="M10 25 L30 35 L30 42 L10 32 Z" fill="#FDA4AF" /> {/* Segment 1 Side */}
    <path d="M30 35 L45 28 L45 35 L30 42 Z" fill="#F43F5E" /> {/* Segment 2 Side */}
    <path d="M45 28 L70 55 L70 62 L45 35 Z" fill="#BE123C" /> {/* Segment 3 Side */}
    
    {/* Top Surface */}
    <path d="M10 25 L30 35 L45 28 L70 55" fill="none" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

// "Asset Protection" Shield
const IsoShield = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm overflow-visible">
    {/* Shield Depth */}
    <path d="M40 10 L65 20 V40 C65 55 55 68 40 75 C25 68 15 55 15 40 V20 L40 10 Z" fill="#B45309" transform="translate(0, 4)" />
    {/* Shield Face */}
    <path d="M40 10 L65 20 V40 C65 55 55 68 40 75 C25 68 15 55 15 40 V20 L40 10 Z" fill="#F59E0B" />
    {/* Reflection */}
    <path d="M40 10 L40 75 C25 68 15 55 15 40 V20 L40 10 Z" fill="#FBBF24" opacity="0.4" />
    {/* Checkmark */}
    <path d="M30 40 L38 48 L52 32" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// "Compound Risk" Blocks
const IsoBlocks = () => (
  <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-sm overflow-visible">
    {/* Bottom Block */}
    <g transform="translate(0, 15)">
      <path d="M20 40 L40 50 L60 40 L40 30 Z" fill="#93C5FD" />
      <path d="M20 40 L40 50 V62 L20 52 Z" fill="#3B82F6" />
      <path d="M60 40 L40 50 V62 L60 52 Z" fill="#1D4ED8" />
    </g>
    {/* Floating Top Block */}
    <g className="animate-hover-float">
      <path d="M20 20 L40 30 L60 20 L40 10 Z" fill="#BFDBFE" />
      <path d="M20 20 L40 30 V42 L20 32 Z" fill="#60A5FA" />
      <path d="M60 20 L40 30 V42 L60 32 Z" fill="#2563EB" />
    </g>
  </svg>
)

// --- 2. CHAT DEMO (Titanium Glass Look) ---
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
    <div className="relative w-full max-w-[550px] group mx-auto perspective-1000">
      {/* 1. Behind Glow */}
      <div className="absolute -inset-1 bg-gradient-to-br from-slate-200 to-blue-200 rounded-[28px] blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
      
      {/* 2. Main Glass Container */}
      <div className="flex flex-col h-[500px] w-full bg-white/80 backdrop-blur-2xl border border-white/60 rounded-[24px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] relative z-10 overflow-hidden transform-gpu transition-all duration-500 ease-out-spring group-hover:scale-[1.005] group-hover:-translate-y-1">
        
        {/* Header */}
        <div className="h-14 border-b border-slate-100 flex items-center px-6 justify-between bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex gap-2 opacity-80">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
            <span className="font-semibold text-slate-700 text-[11px] tracking-tight flex items-center gap-2">
              protocol<span className="text-blue-700 font-bold">LM</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200">Enterprise</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </div>
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Connected</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-5 custom-scroll"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50 animate-fade-in-up">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 shadow-sm flex items-center justify-center">
                 <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"/>
              </div>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Ready for Query</p>
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
                className={`max-w-[88%] px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm backdrop-blur-md border ${
                  msg.role === 'user'
                    ? 'bg-[#0F172A] text-white rounded-tr-sm border-slate-800' // Dark Slate for User (Enterprise feel)
                    : 'bg-white/90 text-slate-700 border-slate-100 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/80 px-4 py-2.5 rounded-2xl rounded-tl-sm border border-slate-100 flex gap-2 items-center shadow-sm backdrop-blur-md">
                <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-[bounce_1s_infinite]" />
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-[bounce_1s_infinite_0.1s]" />
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase ml-1">Cross-referencing</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-4 bg-white/60 backdrop-blur-lg border-t border-white/60">
          <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 transition-all focus-within:bg-white focus-within:shadow-md focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/5">
            <div className="flex-1 text-[13px] text-slate-800 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse" />
              )}
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-blue-600 scale-100 shadow-lg shadow-blue-600/20' : 'bg-slate-200 scale-90'}`}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
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
      className="group relative bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-2xl overflow-hidden hover:bg-white transition-all duration-500 ease-out-spring shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-default flex flex-col justify-between min-h-[160px] opacity-0 animate-reveal-card"
    >
      
      {/* Background Gradient (Very Subtle) */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-0 transition-opacity duration-500 group-hover:opacity-10 z-0
        ${type === 'danger' ? 'bg-rose-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} 
      />
      
      {/* 3D Icon - Pinned Top Left */}
      <div className="relative z-10 w-12 h-12 mb-4 self-start transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
        {icon}
      </div>

      <div className="relative z-10 mt-auto">
        <div className="text-3xl font-bold text-slate-800 tracking-tighter mb-1.5">{value}</div>
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-[11px] font-medium text-slate-400 leading-snug">{sub}</div>
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
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300" />
      <div className="w-full max-w-[400px] bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl p-8 rounded-[24px] relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ring-1 ring-black/5">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-xl transition-all disabled:opacity-50 mb-6 group">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white/50 backdrop-blur-xl text-slate-400 font-medium">Or continue with email</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 text-sm font-medium placeholder-slate-400 rounded-xl transition-all" placeholder="Email address" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 text-sm font-medium placeholder-slate-400 rounded-xl transition-all" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 mt-2">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors">
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
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-500 selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND (High-End Subtle) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="relative w-full h-full animate-drift">
          <Image src="/background.png" alt="Background" fill className="object-cover opacity-[0.20]" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF]/95 via-[#F0F9FF]/30 to-[#F0F9FF]/95" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-blue-300/10 blur-[120px] animate-orb-breath-1" />
      </div>

      {/* NAVBAR (Pinned & Tight) */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-4">
        <div className={`w-full max-w-5xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] rounded-full px-6 py-3 flex justify-between items-center transition-all duration-1000 ease-out-spring ring-1 ring-black/5 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-base font-bold tracking-tight text-slate-800">
              protocol<span className="text-blue-600">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wide">Pricing</button>
            <div className="h-3 w-[1px] bg-slate-200"></div>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors uppercase tracking-wide">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg shadow-slate-900/10 hover:shadow-slate-900/30 active:scale-95 uppercase tracking-wide hover:-translate-y-0.5 duration-300">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Compact Verticality) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-20 pb-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 relative z-10 h-screen max-h-[900px] min-h-[600px]">
        
        {/* LEFT COLUMN (Copy) */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left pt-12 lg:pt-0">
          
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-6 shadow-sm backdrop-blur-sm transition-all duration-700 ease-out-spring ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            System Operational
          </div>

          {/* Headline */}
          <h1 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tighter leading-[1.05] mb-5 transition-all duration-1000 ease-out-spring ${mounted ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-8 blur-sm'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">before</span> the inspector arrives.
          </h1>

          {/* Subheader */}
          <p className={`text-base text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-8 font-medium transition-all duration-1000 ease-out-spring ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Institutional-grade compliance for multi-unit operators. Standardize food safety and protect brand equity in <strong className="text-slate-900">Washtenaw, Wayne, and Oakland County</strong>.
          </p>

          {/* CTA Button */}
          <div className={`flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-10 transition-all duration-1000 ease-out-spring ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 hover:-translate-y-1 active:scale-95 tracking-wide">
              Start Free Trial
            </button>
          </div>

          {/* STAT CARDS (Matte 3D Icons) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard 
              type="danger" 
              icon={<IsoRevenue />}
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue Drop"
              sub="First-year loss."
              delay={500}
            />
            <StatCard 
              type="warning" 
              icon={<IsoShield />}
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Incident Cost"
              sub="Liabilty & labor."
              delay={650}
            />
            <StatCard 
              type="info" 
              icon={<IsoBlocks />}
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Fine Multiplier"
              sub="Compound risk."
              delay={800}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Demo - Big & Bold) */}
        <div className={`flex-1 w-full max-w-[550px] flex justify-center perspective-1000 transition-all duration-1000 ease-out-spring delay-300 ${mounted ? 'opacity-100 translate-y-0 rotate-x-0' : 'opacity-0 translate-y-12 rotate-x-6'}`}>
          <DemoChatContent />
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full py-4 bg-transparent absolute bottom-0 z-20 hidden md:block">
        <div className="flex justify-center items-center gap-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-70">
            <a href="/terms" className="hover:text-blue-600 transition-colors">Terms</a>
            <span>© 2025 protocolLM</span>
            <a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</a>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      {/* GLOBAL STYLES */}
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
          50% { transform: translateY(-4px); }
        }
        .group:hover .animate-hover-float { animation: hoverFloat 2s ease-in-out infinite; }
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
