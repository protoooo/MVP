'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. TECHNICAL WIREFRAME ICONS (Blueprint Style) ---
// Thin strokes, precision geometry. No fills.

const IconRevenue = () => (
  <svg viewBox="0 0 48 48" className="w-full h-full text-black">
    {/* The Chart Line - Jagged Fall */}
    <path d="M4 12 L16 24 L28 16 L44 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    {/* The Arrow Head */}
    <path d="M44 36 H34 M44 36 V26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    {/* Reference Grid (Dotted) */}
    <path d="M4 24 H44 M4 36 H28" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.2" />
    {/* Frame Corners */}
    <path d="M2 10 V2 H10 M38 2 H46 V10 M46 38 V46 H38 M10 46 H2 V38" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const IconLiability = () => (
  <svg viewBox="0 0 48 48" className="w-full h-full text-black">
    {/* Shield Outline */}
    <path d="M24 4 L42 12 V24 C42 36 34 42 24 46 C14 42 6 36 6 24 V12 L24 4 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Inner Lock Mechanism */}
    <rect x="19" y="20" width="10" height="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M24 20 V16 M24 28 V32" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const IconRisk = () => (
  <svg viewBox="0 0 48 48" className="w-full h-full text-black">
    {/* Base Block */}
    <rect x="14" y="32" width="20" height="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    {/* Middle Block */}
    <rect x="18" y="20" width="12" height="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    {/* Top Floating Block (Risk) */}
    <rect x="20" y="4" width="8" height="12" stroke="currentColor" strokeWidth="1.5" fill="none" className="group-hover:-translate-y-1 transition-transform duration-500" />
    {/* Exclamation */}
    <path d="M24 8 V12" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

// --- 2. CHAT DEMO (Minimalist Document Style) ---
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
            <span className="font-bold underline decoration-dotted underline-offset-4">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] group mx-auto">
      {/* Container: Stark White, Hard Border */}
      <div className="flex flex-col h-[480px] w-full bg-white border border-neutral-200 rounded-lg relative z-10 overflow-hidden shadow-2xl shadow-neutral-200/50">
        
        {/* Header: Minimalist */}
        <div className="h-12 border-b border-neutral-100 flex items-center px-5 justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-black rounded-full" />
            <span className="font-sans text-[10px] font-bold text-neutral-900 uppercase tracking-[0.2em]">
              Compliance_Log
            </span>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">v1.0.4 • Connected</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll bg-[#FAFAFA]"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
              <div className="w-10 h-10 border border-neutral-300 rounded flex items-center justify-center">
                 <div className="w-4 h-4 bg-neutral-300 rounded-sm animate-spin"/>
              </div>
              <p className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">Initializing</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[90%] px-4 py-3 text-xs font-medium leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-lg'
                    : 'bg-white text-neutral-800 border border-neutral-200 rounded-lg shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="px-2 py-1 flex gap-1 items-center">
                <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce delay-75" />
                <div className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-4 bg-white border-t border-neutral-100">
          <div className="w-full bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 flex items-center gap-3">
            <span className="text-neutral-400 text-xs">{'>'}</span>
            <div className="flex-1 text-xs text-neutral-900 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-1.5 h-3 bg-black ml-1 animate-pulse" />
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

// --- 4. EXECUTIVE CARDS (Blueprint Style) ---
const StatCard = ({ title, value, sub, icon, delay }) => {
  return (
    <div 
      style={{ animationDelay: `${delay}ms` }}
      className="group bg-white border border-neutral-200 p-5 rounded-lg flex flex-col justify-between min-h-[140px] opacity-0 animate-reveal-card hover:border-black transition-colors duration-300 cursor-default relative overflow-hidden"
    >
      {/* Icon Top Right */}
      <div className="absolute top-4 right-4 w-8 h-8 opacity-30 group-hover:opacity-100 transition-opacity duration-300">
        {icon}
      </div>

      <div className="relative z-10 mt-auto">
        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-3xl font-bold text-black tracking-tighter mb-2">{value}</div>
        <div className="text-[10px] font-medium text-neutral-500 border-t border-neutral-100 pt-2 w-full inline-block">
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
      <div onClick={onClose} className="absolute inset-0 bg-white/80 backdrop-blur-md animate-in fade-in duration-300" />
      <div className="w-full max-w-[380px] bg-white border border-neutral-200 shadow-2xl p-8 rounded-lg relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-black transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-lg font-bold text-black tracking-tight uppercase">
            {view === 'signup' ? 'Create Account' : 'Authorized Access'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-neutral-300 hover:bg-neutral-50 transition-all disabled:opacity-50 mb-6 group rounded">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="text-[#4285F4]"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="text-[#34A853]"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" className="text-[#FBBC05]"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="text-[#EA4335]"/></svg>
          <span className="text-xs font-bold text-neutral-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="px-3 bg-white text-neutral-400">Or</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white outline-none text-neutral-900 text-xs font-medium placeholder-neutral-400 rounded transition-all" placeholder="EMAIL ADDRESS" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white outline-none text-neutral-900 text-xs font-medium placeholder-neutral-400 rounded transition-all" placeholder="PASSWORD" />
          <button type="submit" disabled={loading} className="w-full bg-black hover:bg-neutral-800 text-white font-bold py-3.5 rounded text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 mt-2">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs font-medium text-neutral-500 hover:text-black transition-colors">
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
    <div className="min-h-screen w-full bg-white font-sans text-neutral-900 selection:bg-black selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND (The "Textured Money" Look) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-neutral-50">
        {/* Your restaurant image as texture */}
        <div className="absolute inset-0 w-full h-full mix-blend-multiply opacity-[0.03] grayscale contrast-125">
           <Image 
             src="/background.png" 
             alt="Background" 
             fill 
             className="object-cover" 
             priority 
           />
        </div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white/90"></div>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-4">
        <div className={`w-full max-w-6xl flex justify-between items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-4 h-4 bg-black" />
            <span className="text-sm font-bold tracking-tight text-black">
              protocol<span className="text-neutral-400">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-black hover:bg-neutral-800 text-white px-5 py-2 rounded text-xs font-bold transition-all uppercase tracking-widest">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Split & Tight) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 md:pt-20 pb-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10 min-h-screen lg:h-screen lg:max-h-[850px] lg:min-h-[600px]">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left pt-8 lg:pt-0">
          
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white border border-neutral-200 rounded-full text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
            <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
            Compliance Intelligence
          </div>

          {/* Headline */}
          <h1 className={`text-4xl md:text-6xl font-bold text-black tracking-tighter leading-[1.05] mb-5 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Standardize<br/>
            Compliance.<br/>
            <span className="text-neutral-400">Protect Brand.</span>
          </h1>

          {/* Subheader */}
          <p className={`text-sm md:text-base text-neutral-500 leading-relaxed max-w-md mx-auto lg:mx-0 mb-10 font-medium transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Enterprise-grade food safety intelligence for multi-unit operators. Reduce liability and unify standards across your portfolio.
          </p>

          {/* CTA */}
          <div className={`flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-3.5 bg-black hover:bg-neutral-800 text-white rounded font-bold text-xs uppercase tracking-[0.15em] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:scale-95">
              Start Free Trial
            </button>
          </div>

          {/* CARDS GRID (Wireframe Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 lg:mb-0">
            <StatCard 
              icon={<IconRevenue />}
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue Risk"
              sub="Post-incident loss"
              delay={500}
            />
            <StatCard 
              icon={<IconLiability />}
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Liability"
              sub="Avg. incident cost"
              delay={650}
            />
            <StatCard 
              icon={<IconRisk />}
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Compound Risk"
              sub="Repeat violation"
              delay={800}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Demo) */}
        <div className={`flex-1 w-full max-w-[550px] flex justify-center transition-all duration-1000 ease-out delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        
        @keyframes revealCard {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal-card { animation: revealCard 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MainContent />
    </Suspense>
  )
}
