'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CUSTOM ISOMETRIC ICONS (SVG) ---
// These replace the "vibe coded" generic icons with structural 3D illustrations

const IsometricRevenue = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    <path d="M50 20 L90 40 L50 60 L10 40 Z" fill="#E2E8F0" />
    <path d="M10 40 L50 60 V90 L10 70 Z" fill="#CBD5E1" />
    <path d="M90 40 L50 60 V90 L90 70 Z" fill="#94A3B8" />
    {/* Red Indicator Slice */}
    <path d="M50 20 L90 40 L90 45 L50 25 Z" fill="#F43F5E" className="opacity-80" />
    <path d="M50 20 L10 40 L10 45 L50 25 Z" fill="#BE123C" className="opacity-80" />
  </svg>
)

const IsometricCost = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    {/* Bottom Coin */}
    <ellipse cx="50" cy="75" rx="35" ry="15" fill="#94A3B8" />
    <path d="M15 75 A35 15 0 0 0 85 75 V65 A35 15 0 0 1 15 65 Z" fill="#64748B" />
    <ellipse cx="50" cy="65" rx="35" ry="15" fill="#CBD5E1" />
    
    {/* Middle Coin */}
    <path d="M15 55 A35 15 0 0 0 85 55 V45 A35 15 0 0 1 15 45 Z" fill="#64748B" />
    <ellipse cx="50" cy="45" rx="35" ry="15" fill="#E2E8F0" />
    
    {/* Top Coin (Accent) */}
    <path d="M15 35 A35 15 0 0 0 85 35 V25 A35 15 0 0 1 15 25 Z" fill="#D97706" />
    <ellipse cx="50" cy="25" rx="35" ry="15" fill="#F59E0B" />
  </svg>
)

const IsometricMultiplier = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
    {/* Base Block */}
    <path d="M20 40 L50 55 L80 40 L50 25 Z" fill="#E2E8F0" />
    <path d="M20 40 L50 55 V85 L20 70 Z" fill="#94A3B8" />
    <path d="M80 40 L50 55 V85 L80 70 Z" fill="#CBD5E1" />
    
    {/* Floating Top Block */}
    <path d="M20 20 L50 35 L80 20 L50 5 Z" fill="#3B82F6" className="animate-hover-float" />
    <path d="M20 20 L50 35 V45 L20 30 Z" fill="#2563EB" className="animate-hover-float" />
    <path d="M80 20 L50 35 V45 L80 30 Z" fill="#1D4ED8" className="animate-hover-float" />
  </svg>
)

// --- CHAT DEMO BOX (Technical/Structural Look) ---
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
            <span className="font-bold text-slate-900 bg-slate-100 px-1 rounded">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] group mx-auto">
      {/* Structural Shadow instead of Glow */}
      <div className="absolute top-4 left-4 w-full h-full bg-slate-200 rounded-xl -z-10 transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-1"></div>
      
      <div className="flex flex-col h-[420px] w-full bg-white border-2 border-slate-900 rounded-xl relative z-10 overflow-hidden">
        
        {/* Technical Header */}
        <div className="h-10 border-b-2 border-slate-100 flex items-center px-4 justify-between bg-slate-50">
          <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-slate-900 rounded-sm"></div>
             <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
               Protocol_LM<span className="text-blue-600">_Beta_v1.0</span>
             </span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="font-mono text-[9px] font-bold text-slate-400 uppercase">Sys_Online</span>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-5 custom-scroll bg-[#F8FAFC]"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-40">
              <div className="w-12 h-12 border-2 border-slate-300 rounded-lg flex items-center justify-center border-dashed">
                 <div className="w-4 h-4 bg-slate-300 rounded-sm animate-spin"/>
              </div>
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Awaiting Input...</p>
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
                className={`max-w-[88%] px-4 py-3 text-[12px] leading-relaxed font-medium ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-l-xl rounded-tr-xl'
                    : 'bg-white text-slate-600 border border-slate-200 rounded-r-xl rounded-tl-xl shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white px-3 py-2 rounded-r-xl rounded-tl-xl border border-slate-200 flex gap-2 items-center shadow-sm">
                <span className="font-mono text-[9px] font-bold text-slate-400 uppercase">Processing</span>
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-75" />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-100">
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 text-[13px] text-slate-700 font-medium font-mono min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              <span className="text-slate-400 mr-2">{'>'}</span>
              {inputValue}
              {isTyping && (
                <span className="inline-block w-2 h-4 bg-slate-900 ml-1 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- COUNT UP ANIMATION ---
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

// --- AUTH MODAL (Monochromatic) ---
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
          setMessage({ type: 'success', text: 'Check your email to confirm!' })
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
      <div onClick={onClose} className="absolute inset-0 bg-white/80 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="w-full max-w-[380px] bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-8 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-8 font-mono uppercase">
          {view === 'signup' ? 'Create_Account' : 'System_Login'}
        </h2>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3 bg-white border-2 border-slate-200 hover:border-slate-900 transition-all disabled:opacity-50 mb-6 group">
           <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-slate-400 font-mono">OR</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-slate-900 focus:bg-white outline-none text-slate-900 text-sm font-medium placeholder-slate-400 transition-colors" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 bg-slate-50 border-2 border-slate-200 focus:border-slate-900 focus:bg-white outline-none text-slate-900 text-sm font-medium placeholder-slate-400 transition-colors" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 text-sm transition-colors active:translate-y-0.5 uppercase tracking-wide">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-slate-900 font-bold uppercase tracking-wide transition-colors">
            {view === 'signup' ? 'Already have an account? Sign in' : 'New to protocolLM? Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- ISOMETRIC STAT CARD ---
const StatCard = ({ title, value, sub, icon, delay }) => {
  return (
    <div 
      style={{ animationDelay: `${delay}ms` }}
      className="group relative bg-white border border-slate-200 p-5 rounded-xl overflow-hidden hover:border-slate-900 transition-all duration-300 cursor-default flex flex-col justify-between min-h-[140px] opacity-0 animate-reveal-card"
    >
      {/* 3D Illustration Container */}
      <div className="absolute top-2 right-2 w-20 h-20 opacity-90 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
        {icon}
      </div>

      <div className="relative z-10 mt-auto">
        <div className="text-3xl font-bold text-slate-900 tracking-tighter mb-1 font-mono">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-[10px] font-medium text-slate-400 leading-snug">{sub}</div>
      </div>
    </div>
  )
}

// --- MAIN CONTENT ---
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
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-slate-900 selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* Grid Background (Technical) */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        opacity: 0.5
      }}>
        {/* Vignette to soften edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC] via-transparent to-[#F8FAFC]"></div>
      </div>

      {/* Navbar (Minimalist/Mono) */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 py-6 bg-gradient-to-b from-[#F8FAFC] to-transparent">
        <div className={`w-full max-w-6xl flex justify-between items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-4 h-4 bg-slate-900" />
            <span className="text-base font-bold tracking-tight text-slate-900 font-mono">
              protocol<span className="text-slate-400">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Sign In</button>
            <button onClick={() => openAuth('signup')} className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-2 text-xs font-bold transition-all uppercase tracking-widest">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 pt-32 pb-8 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 relative z-10 h-screen max-h-[900px] min-h-[600px]">
        
        {/* Left Copy */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left">
          
          <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Operational Status: Online
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold text-slate-900 tracking-tighter leading-[1.05] mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Train your team <br />
            <span className="text-slate-400">before</span> inspection.
          </h1>

          <p className={`text-base text-slate-500 leading-relaxed max-w-md mx-auto lg:mx-0 mb-10 font-medium transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            AI-verified compliance for Washtenaw, Wayne, and Oakland County.
          </p>

          <div className={`flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-sm transition-all hover:-translate-y-1 uppercase tracking-wide">
              Start Free Trial
            </button>
            <button className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors px-4 uppercase tracking-widest border-b border-transparent hover:border-slate-900 pb-0.5">View Demo</button>
          </div>

          {/* Isometric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard 
              icon={<IsometricRevenue />}
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue Drop"
              sub="Post-bad grade."
              delay={400}
            />
            <StatCard 
              icon={<IsometricCost />}
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Incident Cost"
              sub="Per major event."
              delay={550}
            />
            <StatCard 
              icon={<IsometricMultiplier />}
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Fine Multiplier"
              sub="Repeat violations."
              delay={700}
            />
          </div>
        </div>

        {/* Right: Demo Chat (Slide In) */}
        <div className={`flex-1 w-full max-w-[500px] flex justify-center transition-all duration-1000 ease-out delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      <footer className="w-full py-6 absolute bottom-0 z-20">
        <div className="flex justify-center items-center gap-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <a href="/terms" className="hover:text-slate-500 transition-colors">Terms</a>
            <span>Protocol_LM © 2025</span>
            <a href="/privacy" className="hover:text-slate-500 transition-colors">Privacy</a>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        /* Scrollbar */
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; }
        
        /* Message Slide In */
        @keyframes messageSlide {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-message-slide { animation: messageSlide 0.3s ease-out forwards; }

        /* Card Reveal */
        @keyframes revealCard {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal-card { animation: revealCard 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

        /* Hover Float for the Blue Cube */
        @keyframes hoverFloat {
