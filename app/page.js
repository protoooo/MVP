'use client'

import { useState, useEffect, useRef } from 'react'

// --- CHAT DEMO BOX (Liquid Glass Style) ---
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
    <div className="flex flex-col h-[400px] md:h-[500px] w-full max-w-[600px] bg-white/40 backdrop-blur-2xl font-sans border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(10,36,99,0.12)] overflow-hidden relative z-0 transform-gpu shrink-0 mx-auto">
      {/* Top chrome - Glass */}
      <div className="h-14 bg-white/60 backdrop-blur-xl border-b border-white/40 flex items-center px-6 justify-between shrink-0 relative z-20">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0A2463] text-sm tracking-tighter">
            protocol<span className="text-[#1E96FC]">LM</span>
          </span>
          <span className="hidden md:inline text-[10px] font-semibold text-slate-500">
            Live demo
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-white shadow-sm">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-400" />
          <span className="text-[9px] font-bold text-[#0A2463] uppercase tracking-wide">
            Online
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-slate-50/50 to-blue-50/30 min-h-0 relative z-10 custom-scroll"
      >
        {!hasStarted && !isTyping && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-lg shadow-slate-200/50">
              <div className="w-7 h-7 border-2 border-slate-200 rounded-full border-t-[#1E96FC] animate-spin" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#1E96FC]/60">
              SYSTEM READY
            </span>
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
              className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed font-medium relative z-20 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-[#1E96FC] to-[#0A2463] text-white rounded-tr-sm shadow-lg shadow-blue-500/20'
                  : 'bg-white/80 backdrop-blur-xl text-slate-700 rounded-tl-sm border border-white/60 shadow-lg shadow-slate-200/50'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans text-xs relative z-30">
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-in fade-in zoom-in duration-200 relative z-20">
            <div className="bg-white/80 backdrop-blur-xl px-4 py-3 rounded-xl rounded-tl-sm border border-white/60 flex gap-1.5 items-center shadow-lg shadow-slate-200/50">
              <div className="w-1.5 h-1.5 bg-[#1E96FC] rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-[#1E96FC] rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
              <div className="w-1.5 h-1.5 bg-[#1E96FC] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <span className="ml-2 text-[10px] font-semibold text-slate-600 hidden md:inline">
                Cross-checking local code & FDA Food Code…
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Faux input - Glass */}
      <div className="p-4 bg-white/60 backdrop-blur-xl border-t border-white/40 shrink-0 relative z-20">
        <div className="w-full bg-white/60 backdrop-blur-md border border-white/60 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[52px] shadow-sm">
          <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
            {inputValue}
            {isTyping && (
              <span className="inline-block w-0.5 h-4 bg-[#1E96FC] ml-1 animate-pulse" />
            )}
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${inputValue ? 'bg-gradient-to-br from-[#1E96FC] to-[#0A2463] shadow-lg shadow-blue-500/30' : 'bg-slate-200'}`}>
            <svg className="w-4 h-4 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
      setCount(progress * end)
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

// --- AUTH MODAL (Liquid Glass) ---
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(10,36,99,0.2)] p-8 rounded-3xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-[#0A2463] transition-colors">✕</button>

        <h2 className="text-xl font-bold text-[#0A2463] mb-6 tracking-tight">
          {view === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white/80 backdrop-blur-md border border-white/60 hover:border-[#1E96FC]/40 hover:shadow-lg hover:shadow-blue-500/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-2 bg-white/80 text-slate-500">Or continue with email</span></div>
        </div>

        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3.5 bg-white/60 backdrop-blur-md border border-white/60 focus:bg-white/80 focus:border-[#1E96FC]/50 focus:shadow-lg focus:shadow-blue-500/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3.5 bg-white/60 backdrop-blur-md border border-white/60 focus:bg-white/80 focus:border-[#1E96FC]/50 focus:shadow-lg focus:shadow-blue-500/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Password (min 6 characters)" />
          <button onClick={handleAuth} disabled={loading} className="w-full bg-gradient-to-br from-[#1E96FC] to-[#0A2463] hover:shadow-xl hover:shadow-blue-500/30 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all font-mono shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 text-xs font-sans border rounded-xl backdrop-blur-md ${message.type === 'error' ? 'bg-red-50/80 text-red-600 border-red-200/50' : 'bg-green-50/80 text-green-600 border-green-200/50'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-[#1E96FC] font-sans transition-colors">
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 font-sans text-slate-900 selection:bg-[#1E96FC] selection:text-white flex flex-col relative overflow-x-hidden max-w-[100vw]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="relative w-full h-full">
          <img src="/background.png" alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-[0.08]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-white/40" />
        {/* Subtle mesh gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-slate-100/30 via-transparent to-transparent" />
      </div>

      {/* NAV - Liquid Glass */}
      <nav className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex justify-between items-center fixed top-0 left-0 right-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/40 transition-all shadow-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-[#0A2463]">
            protocol<span style={{ color: '#1E96FC' }}>LM</span>
          </h1>
        </div>
        <div className={`flex gap-2 md:gap-6 text-[10px] md:text-sm font-bold uppercase tracking-widest items-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => alert('Pricing page')} className="px-2 md:px-4 py-2 text-slate-600 hover:text-[#1E96FC] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-2 md:px-4 py-2 text-slate-600 hover:text-[#1E96FC] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-3 md:px-5 py-2 md:py-2.5 text-white bg-gradient-to-br from-[#1E96FC] to-[#0A2463] rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all active:scale-95 shadow-lg">
            <span className="hidden md:inline">Get protocolLM</span>
            <span className="md:hidden">Join</span>
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-28 pb-8 md:pt-24 md:pb-12 gap-10 md:gap-16 relative z-10">
        {/* Left */}
        <div className={`flex-1 text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0A2463] tracking-tight leading-tight mb-4 md:mb-6">
            Train Your Team Before<br className="hidden md:block" /> The Health Department Arrives.
          </h2>

          <p className="text-base md:text-lg text-slate-600 font-medium leading-relaxed max-w-xl mb-4 md:mb-5">
            protocol<span className="text-[#1E96FC] font-bold">LM</span> gives your team instant answers from <strong>Washtenaw, Wayne, and Oakland County</strong> rules, so they handle violations correctly before an inspector or customer ever sees them.
          </p>

          <p className="text-[11px] md:text-xs text-slate-500 font-semibold uppercase tracking-[0.25em] mb-5">
            One avoided closure can pay for protocolLM for years.
          </p>

          <button onClick={() => openAuth('signup')} className="group relative overflow-hidden bg-gradient-to-br from-[#1E96FC] to-[#0A2463] text-white px-6 md:px-8 py-3.5 md:py-4 rounded-xl font-bold uppercase tracking-widest hover:shadow-2xl hover:shadow-blue-500/40 transition-all shadow-xl hover:-translate-y-1 active:scale-95 text-xs md:text-sm">
            <span className="relative z-10">Start 30-Day Free Trial</span>
            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]" />
          </button>

          <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-lg shadow-slate-200/50 hover:bg-white/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 cursor-default group">
              <div className="text-5xl font-bold text-[#0A2463] tracking-tighter group-hover:scale-105 transition-transform duration-500">
                <CountUp end={12} suffix="%" duration={2500} />
              </div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">Revenue Drop / Unit</div>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-tight">Typical year-one sales hit after a public bad grade.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-lg shadow-slate-200/50 hover:bg-white/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 cursor-default group">
              <div className="text-5xl font-bold text-[#0A2463] tracking-tighter group-hover:scale-105 transition-transform duration-500">
                <CountUp end={75} prefix="$" suffix="k" duration={2500} />
              </div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">Avg. Incident Cost</div>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-tight">Legal, remediation, labor, and lost traffic for one major event.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-lg shadow-slate-200/50 hover:bg-white/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 cursor-default group">
              <div className="text-5xl font-bold text-[#0A2463] tracking-tighter group-hover:scale-105 transition-transform duration-500">
                <CountUp end={2.5} suffix="x" decimals={1} duration={2500} />
              </div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">Repeat Fine Multiplier</div>
              <p className="text-xs text-slate-600 mt-2 font-medium leading-tight">Fines and scrutiny climb when the same issue shows up twice.</p>
            </div>
          </div>
        </div>

        {/* Right: demo chat */}
        <div className={`flex-1 w-full flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <DemoChatContent />
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full py-8 text-center border-t border-white/40 bg-white/40 backdrop-blur-xl relative z-10 mt-auto pb-safe">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <a href="/terms" className="hover:text-[#1E96FC] transition-colors">Terms</a>
          <span>© 2025 protocolLM</span>
          <a href="/privacy" className="hover:text-[#1E96FC] transition-colors">Privacy</a>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        body { overscroll-behavior-y: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.5); border-radius: 20px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.7); }
        @keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }
      `}</style>
    </div>
  )
}
