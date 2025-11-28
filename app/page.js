'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * --- UTILS & ICONS ---
 * Inline SVGs for zero-dependency implementation
 */

const Icons = {
  Send: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Sparkle: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  Check: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Google: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  ),
  X: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
}

// --- CHAT DEMO BOX (The "Apple Glass" Effect) ---
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
      response:
        "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan."
    },
    {
      text: 'Our certified manager quit yesterday. Do we have to close the kitchen?',
      response:
        "NO. 'Oakland County Sanitary Code Article IV, Sec 4.4' allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Health Division immediately to avoid penalties."
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response:
        'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.'
    },
  ]

  // Typing simulation loop
  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(Math.random() * 20 + 15) // Slightly faster typing for "pro" feel
    }

    const runSimulation = async () => {
      setHasStarted(true)
      // Initial delay before starting the show
      await wait(1000)

      while (isMounted) {
        for (const step of SEQUENCE) {
          if (!isMounted) return
          
          // typing state
          setIsTyping(true)
          setInputValue('')
          await wait(500)

          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }

          await wait(400)
          
          // Send user message
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)

          // Thinking state
          setIsThinking(true)
          await wait(1500) // Thinking time
          setIsThinking(false)

          // Stream response
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
            await wait(20) // Fast streaming
          }

          await wait(4000) // Read time
        }
        
        // Reset loop
        await wait(1000)
        setMessages([])
      }
    }

    runSimulation()
    return () => { isMounted = false }
  }, [])

  // Keyword highlighter for the "Protocol" look
  const formatContent = (text) => {
    const keywords = [
      'CRITICAL ACTION', 'VIOLATION', 'IMMINENT HEALTH HAZARD', 'CORE VIOLATION', 'ACTION REQUIRED', 'NO'
    ]
    
    // Simple check for keywords at start of string or standalone
    for (const key of keywords) {
      if (text.startsWith(key)) {
        const remaining = text.substring(key.length);
        return (
          <span>
            <span className="font-bold text-rose-600 bg-rose-50/50 px-1.5 py-0.5 rounded text-[11px] tracking-wide border border-rose-100/50 inline-block mr-1">
              {key}
            </span>
            {remaining}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] mx-auto group perspective-1000">
      {/* Decorative Glow Behind */}
      <div className="absolute -inset-1 bg-gradient-to-b from-blue-400/30 to-purple-400/30 rounded-[2.6rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
      
      {/* MAIN CARD CONTAINER */}
      <div className="relative flex flex-col h-[500px] w-full bg-white/60 backdrop-blur-3xl backdrop-saturate-150 border border-white/40 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden ring-1 ring-white/50 transition-all duration-500">
        
        {/* Shine Effect */}
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/40 via-transparent to-transparent opacity-50 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/20 bg-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-sm border border-[#E0443E]/10" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-sm border border-[#D89E24]/10" />
                <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-sm border border-[#1AAB29]/10" />
             </div>
             <div className="h-4 w-[1px] bg-black/10 mx-1" />
             <span className="text-xs font-semibold text-slate-600 tracking-tight flex items-center gap-1.5">
                <Icons.Sparkle className="w-3 h-3 text-blue-500" />
                Protocol Assistant
             </span>
          </div>
          <div className="px-2 py-1 rounded-full bg-emerald-100/50 border border-emerald-200/50 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scroll-smooth no-scrollbar"
        >
          {messages.length === 0 && !hasStarted && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mb-4" />
              <p className="text-xs font-medium tracking-widest uppercase">Initializing Core...</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[85%] p-4 text-[13px] leading-relaxed shadow-sm relative overflow-hidden group/bubble
                ${msg.role === 'user' 
                  ? 'bg-gradient-to-br from-[#007AFF] to-[#0062CC] text-white rounded-[20px] rounded-br-sm' 
                  : 'bg-white/40 backdrop-blur-md border border-white/60 text-slate-800 rounded-[20px] rounded-bl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                }`}
              >
                {/* Subtle sheen on user bubbles */}
                {msg.role === 'user' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-white/10 to-white/0 opacity-0 group-hover/bubble:opacity-100 transition-opacity" />
                )}
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
             <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white/30 backdrop-blur-md border border-white/40 px-4 py-3 rounded-[20px] rounded-bl-sm flex items-center gap-1.5 shadow-sm">
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 relative z-20">
            <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[20px] p-1.5 pl-4 flex items-center shadow-lg shadow-black/5 ring-1 ring-white/60 transition-shadow duration-300 hover:shadow-xl hover:shadow-black/5">
                <div className="flex-1 text-sm text-slate-600 font-medium truncate h-6 flex items-center">
                    {inputValue}
                    {isTyping && <span className="ml-0.5 w-0.5 h-4 bg-blue-500 animate-pulse rounded-full" />}
                    {!inputValue && !isTyping && <span className="text-slate-400 font-normal">Ask a question...</span>}
                </div>
                <button className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-[#007AFF] text-white shadow-md scale-100' : 'bg-slate-200/50 text-slate-400 scale-95'}`}>
                    <Icons.Send className="w-4 h-4 ml-0.5" />
                </button>
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
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(easeOutQuart * end)
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

// --- AUTH MODAL (GLASS) ---
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

  const handleAction = async () => {
    setLoading(true); setMessage(null)
    await new Promise(r => setTimeout(r, 1500))
    setLoading(false)
    setMessage({ type: 'success', text: view === 'signup' ? 'Welcome aboard!' : 'Welcome back!' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Darkened backdrop */}
        <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        />
        
        {/* Modal Card */}
        <div className="relative w-full max-w-[400px] bg-white/80 backdrop-blur-2xl backdrop-saturate-200 border border-white/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ring-1 ring-white/60">
            <button 
                onClick={onClose}
                className="absolute top-5 right-5 p-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-full transition-colors text-slate-500"
            >
                <Icons.X className="w-4 h-4" />
            </button>

            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4 text-white">
                   <Icons.Sparkle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {view === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                    {view === 'signup' ? 'Start your intelligent compliance journey.' : 'Access your dashboard.'}
                </p>
            </div>

            <div className="space-y-4">
                <button 
                    onClick={handleAction}
                    className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
                >
                    <Icons.Google className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
                </button>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-[#fcfcfc] px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or</span></div>
                </div>

                <div className="space-y-3">
                    <input 
                        type="email" placeholder="Work Email" 
                        value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                    />
                    <input 
                        type="password" placeholder="Password" 
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3.5 bg-white/50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
                    />
                </div>

                <button
                    onClick={handleAction}
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : view === 'signup' ? 'Get Started' : 'Sign In'}
                </button>
            </div>

            {message && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold text-center border border-emerald-100 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <Icons.Check className="w-4 h-4" />
                    {message.text}
                </div>
            )}

            <div className="mt-6 text-center">
                <button 
                    onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
                    className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                    {view === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
    </div>
  )
}

// --- MAIN HOME PAGE ---
export default function Home() {
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const openAuth = (v) => { setAuthView(v); setShowAuth(true) }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* 1. BACKGROUND GRADIENTS (The Apple "Blob" effect) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply animate-blob" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000" />
         <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-purple-400/20 blur-[100px] mix-blend-multiply animate-blob animation-delay-4000" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      {/* 2. NAVIGATION (Frosted Header) */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Icons.Sparkle className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                protocol<span className="text-blue-600">LM</span>
              </span>
           </div>

           <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
              <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Enterprise</a>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={() => openAuth('login')}
                className="hidden md:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Log in
              </button>
              <button 
                onClick={() => openAuth('signup')}
                className="px-5 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-95"
              >
                Get Started
              </button>
           </div>
        </div>
      </nav>

      {/* 3. HERO SECTION */}
      <main className="relative z-10 pt-32 pb-20 md:pt-40 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Left Content */}
            <div className={`flex-1 text-center lg:text-left space-y-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    New: Oakland County Support
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05]">
                    Compliance, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                        Clarified.
                    </span>
                </h1>

                <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    Stop fearing the health inspector. Equip your franchisees with an intelligent assistant trained on <strong>local enforcement codes</strong>.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                    <button 
                        onClick={() => openAuth('signup')}
                        className="h-12 px-8 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 group"
                    >
                        Start Free Trial
                        <Icons.Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="h-12 px-8 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all hover:border-slate-300">
                        View Demo
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200/60 mt-8">
                    {[
                        { val: 75, suffix: 'k', label: 'Avg Saved' },
                        { val: 12, suffix: '%', label: 'Revenue Lift' },
                        { val: 100, suffix: '%', label: 'Compliant' },
                    ].map((stat, i) => (
                        <div key={i} className="space-y-1">
                            <div className="text-3xl font-bold text-slate-900 tracking-tight">
                                <CountUp end={stat.val} suffix={stat.suffix} prefix={stat.prefix || '$'} />
                            </div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Content (The Liquid Glass Demo) */}
            <div className={`flex-1 w-full max-w-[600px] lg:max-w-none transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <DemoChatContent />
            </div>

        </div>
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-slate-400 font-medium">
                © 2025 ProtocolLM Inc. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-slate-500 font-medium">
                <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
