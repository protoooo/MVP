'use client'

import { useState, useEffect, useRef } from 'react'

// --- CHAT DEMO BOX (Premium Optical Glass) ---
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
            <span className="font-bold text-[#0A2463]">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="flex flex-col h-[400px] md:h-[500px] w-full max-w-[600px] rounded-[2.5rem] overflow-hidden relative z-0 transform-gpu shrink-0 mx-auto shadow-[0_40px_100px_-20px_rgba(10,36,99,0.15)] ring-1 ring-white/60 bg-white/60 backdrop-blur-3xl backdrop-saturate-150">
      
      {/* Specular Highlight (The "Apple" Shine) */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-0" />
      
      {/* Top chrome */}
      <div className="h-14 border-b border-white/30 flex items-center px-6 justify-between shrink-0 relative z-20 bg-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0A2463] text-sm tracking-tight drop-shadow-sm">
            protocol<span className="text-[#1E96FC]">LM</span>
          </span>
          <span className="hidden md:inline text-[10px] font-semibold text-slate-500/80">
            Live demo
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/50 shadow-[0_2px_8px_0_rgba(0,0,0,0.02)]">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-[9px] font-bold text-[#0A2463] uppercase tracking-wide opacity-80">
            Online
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 relative z-10 custom-scroll"
      >
        {!hasStarted && !isTyping && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/80 flex items-center justify-center shadow-xl shadow-blue-900/5 ring-1 ring-white">
              <div className="w-8 h-8 border-[3px] border-slate-200 rounded-full border-t-[#1E96FC] animate-spin" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#1E96FC]/70 text-shadow-sm">
              SYSTEM READY
            </span>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            } animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out`}
          >
            <div
              className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed font-medium relative z-20 backdrop-blur-md ${
                msg.role === 'user'
                  ? 'bg-gradient-to-b from-[#1E96FC] to-[#0A2463] text-white rounded-tr-sm shadow-[0_8px_20px_-6px_rgba(30,150,252,0.35)] border border-white/10'
                  : 'bg-white/60 text-slate-800 rounded-tl-sm border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] ring-1 ring-white/40'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans relative z-30">
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-in fade-in zoom-in duration-300 relative z-20">
            <div className="bg-white/60 backdrop-blur-xl px-4 py-3 rounded-2xl rounded-tl-sm border border-white/50 flex gap-2 items-center shadow-lg shadow-blue-900/5 ring-1 ring-white/40">
              <div className="w-1.5 h-1.5 bg-[#1E96FC] rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-[#1E96FC] rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
              <div className="w-1.5 h-1.5 bg-[#1E96FC] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <span className="ml-2 text-[10px] font-semibold text-slate-500 hidden md:inline tracking-tight">
                Cross-checking local code & FDA Food Code…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Faux input */}
      <div className="p-4 border-t border-white/30 shrink-0 relative z-20 bg-gradient-to-b from-transparent to-white/10">
        <div className="w-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl px-4 py-3.5 flex items-center gap-3 min-h-[56px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] ring-1 ring-white/40 transition-all focus-within:ring-[#1E96FC]/30 focus-within:bg-white/60">
          <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
            {inputValue}
            {isTyping && (
              <span className="inline-block w-0.5 h-4 bg-[#1E96FC] ml-0.5 animate-pulse rounded-full" />
            )}
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${inputValue ? 'bg-gradient-to-b from-[#1E96FC] to-[#0A2463] shadow-lg shadow-blue-500/25 scale-100' : 'bg-slate-200/50 scale-90'}`}>
            <svg className="w-3.5 h-3.5 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
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
      const easeOutQuart = 1 - Math.pow(1 - progress, 4) // Smoother easing
      setCount(easeOutQuart * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return (
    <span>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  )
}

// --- AUTH MODAL (VisionOS Style) ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)

  useEffect(() => {
    setView(defaultView)
    setMessage(null)
  }, [isOpen, defaultView])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setMessage(null)
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Google sign-in would redirect here!' })
      setLoading(false)
    }, 1000)
  }

  const handleAuth = (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setTimeout(() => {
      if (view === 'signup') {
        setMessage({ type: 'success', text: 'Check your email to confirm your account!' })
      } else {
        setMessage({ type: 'success', text: 'Sign in successful!' })
      }
      setLoading(false)
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-3xl backdrop-saturate-150 border border-white/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] p-8 rounded-[2rem] relative ring-1 ring-white/60">
        
        {/* Shine effect */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-50" />
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-[#0A2463] transition-colors hover:bg-white/30 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-2xl font-bold text-[#0A2463] mb-6 tracking-tight text-center">
          {view === 'signup' ? 'Create Account' : 'Welcome Back'}
        </h2>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white/50 hover:bg-white/80 backdrop-blur-md border border-white/60 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6 group">
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300/40" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-2 bg-transparent text-slate-400 font-medium">Or continue with email</span></div>
        </div>

        <div className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-white/40 backdrop-blur-md border border-white/50 focus:bg-white/70 focus:border-[#1E96FC]/50 focus:ring-4 focus:ring-[#1E96FC]/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all shadow-inner" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-white/40 backdrop-blur-md border border-white/50 focus:bg-white/70 focus:border-[#1E96FC]/50 focus:ring-4 focus:ring-[#1E96FC]/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all shadow-inner" placeholder="Password (min 6 characters)" />
          <button onClick={handleAuth} disabled={loading} className="w-full mt-2 bg-gradient-to-b from-[#1E96FC] to-[#0A2463] hover:brightness-110 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-[0_10px_30px_-10px_rgba(30,150,252,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(30,150,252,0.4)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 text-xs font-sans border rounded-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 ${message.type === 'error' ? 'bg-red-50/50 text-red-600 border-red-200/50' : 'bg-emerald-50/50 text-emerald-600 border-emerald-200/50'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200/40 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-[#1E96FC] font-semibold transition-colors">
            {view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- MAIN CONTENT ---
export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')

  useEffect(() => {
    setMounted(true)
  }, [])

  const openAuth = (view) => {
    setAuthView(view)
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F5F7] font-sans text-slate-900 selection:bg-[#1E96FC]/30 selection:text-[#0A2463] flex flex-col relative overflow-x-hidden max-w-[100vw]">
      {/* NOISE & GRADIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         {/* Apple-style subtle noise grain */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        
        {/* Soft, deep gradients */}
        <div className="absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-200/30 blur-[100px]" />
        <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-sky-100/40 blur-[80px]" />
      </div>

      {/* NAV - Premium Frosted Glass */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-5 flex justify-between items-center fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-white/40 shadow-[0_5px_20px_-10px_rgba(0,0,0,0.03)] transition-all">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-[#0A2463] drop-shadow-sm">
            protocol<span className="text-[#1E96FC]">LM</span>
          </h1>
        </div>
        <div className={`flex gap-2 md:gap-4 text-[11px] md:text-xs font-bold uppercase tracking-widest items-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => alert('Pricing page')} className="px-4 py-2 text-slate-500 hover:text-[#0A2463] transition-colors font-semibold">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#0A2463] transition-colors font-semibold">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-white bg-[#0A2463] hover:bg-[#1E96FC] rounded-full shadow-[0_4px_14px_0_rgba(10,36,99,0.25)] hover:shadow-[0_6px_20px_rgba(30,150,252,0.3)] transition-all active:scale-95 duration-300">
            <span className="hidden md:inline">Get protocolLM</span>
            <span className="md:hidden">Join</span>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center pt-32 pb-12 gap-12 lg:gap-20 relative z-10">
        
        {/* Left Content */}
        <div className={`flex-1 text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
             New: Oakland County Live
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-[#0A2463] tracking-tight leading-[1.1] mb-6 drop-shadow-sm">
            Train Your Team Before<br className="hidden md:block" /> The Health Department Arrives.
          </h2>

          <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed max-w-xl mb-8 opacity-90">
            protocol<span className="text-[#1E96FC] font-bold">LM</span> gives your team instant answers from <strong>Washtenaw, Wayne, and Oakland County</strong> rules, preventing violations before they happen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button onClick={() => openAuth('signup')} className="group relative overflow-hidden bg-[#0A2463] text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide shadow-[0_20px_50px_-12px_rgba(10,36,99,0.5)] hover:shadow-[0_20px_50px_-12px_rgba(30,150,252,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]">
              <span className="relative z-10">Start 30-Day Free Trial</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
            </button>
            <button className="px-8 py-4 rounded-full bg-white/50 border border-white/60 text-[#0A2463] font-bold text-sm hover:bg-white transition-all shadow-sm hover:shadow-md backdrop-blur-md">
                View Pricing
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
                { val: 12, suffix: '%', label: 'Revenue Drop / Unit', desc: 'Typical year-one sales hit after a public bad grade.' },
                { val: 75, prefix: '$', suffix: 'k', label: 'Avg. Incident Cost', desc: 'Legal, remediation, labor, and lost traffic.' },
                { val: 2.5, suffix: 'x', label: 'Repeat Fine Multiplier', desc: 'Fines climb when the same issue shows up twice.', decimals: 1 }
            ].map((item, i) => (
                <div key={i} className="bg-white/40 backdrop-blur-xl backdrop-saturate-150 border border-white/50 p-6 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] hover:bg-white/60 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] transition-all duration-300 cursor-default group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="text-4xl md:text-5xl font-bold text-[#0A2463] tracking-tighter group-hover:scale-105 transition-transform duration-500 drop-shadow-sm">
                    <CountUp end={item.val} prefix={item.prefix} suffix={item.suffix} decimals={item.decimals} duration={2500} />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3 mb-1">{item.label}</div>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight opacity-80">{item.desc}</p>
                </div>
            ))}
          </div>
        </div>

        {/* Right: Premium Glass Demo Chat */}
        <div className={`flex-1 w-full flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
          <DemoChatContent />
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full py-8 text-center border-t border-slate-200/50 bg-white/30 backdrop-blur-xl relative z-10 mt-auto pb-safe">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <a href="/terms" className="hover:text-[#0A2463] transition-colors">Terms</a>
          <span>© 2025 protocolLM</span>
          <a href="/privacy" className="hover:text-[#0A2463] transition-colors">Privacy</a>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        body { overscroll-behavior-y: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
        .text-shadow-sm { text-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  )
}
