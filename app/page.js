'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * --- ICONS ---
 */
const Icons = {
  Send: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Check: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Google: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  X: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  ArrowRight: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// --- CHAT DEMO BOX ---
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
    {
      text: 'The floor drain is backing up in the dish room. Can we just mop it and keep serving?',
      response:
        'IMMINENT HEALTH HAZARD. Washtenaw Enforcement Procedure Sec 5.0 defines sewage backup as grounds for Immediate Closure. You must cease operations until the backup is fixed and the area sanitized.'
    },
    {
      text: "Inspector cited us for 'Wet Nesting' pans. Is that actually a priority violation?",
      response:
        'CORE VIOLATION. Stacking wet pans prevents air drying (FDA Code 4-901.11). While usually a Core item, repeated failure to correct it can lead to Priority Foundation citations for unsanitary equipment storage.'
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
    return () => {
      isMounted = false
    }
  }, [])

  const formatContent = (text) => {
    const keywords = [
      'CRITICAL ACTION',
      'VIOLATION',
      'IMMINENT HEALTH HAZARD',
      'CORE VIOLATION',
      'ACTION REQUIRED',
      'NO'
    ]

    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-bold text-black border-b-2 border-black/10 inline-block mr-1">
              {key}
            </span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] mx-auto">
      <div className="relative flex flex-col h-[500px] w-full bg-white/70 backdrop-blur-3xl backdrop-saturate-150 border border-black/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] rounded-[2.5rem] overflow-hidden transition-all duration-500">
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/60 via-transparent to-transparent opacity-60 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-black/5 bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 opacity-40 grayscale">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <div className="w-3 h-3 rounded-full bg-slate-400" />
            </div>
            <div className="h-4 w-[1px] bg-black/10 mx-1" />
            <span className="text-xs font-bold text-black tracking-tight flex items-center gap-1.5">
              Protocol Assistant
            </span>
          </div>
          <div className="px-2 py-1 rounded-full bg-black/5 border border-black/5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-black/60 uppercase tracking-wider">
              Online
            </span>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 scroll-smooth no-scrollbar"
        >
          {messages.length === 0 && !hasStarted && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-black animate-spin mb-4" />
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">
                Initializing
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex w-full ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[85%] p-4 text-[13px] leading-relaxed relative overflow-hidden ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-[20px] rounded-br-sm shadow-md'
                    : 'bg-white/60 backdrop-blur-xl border border-white/80 text-slate-800 rounded-[20px] rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 px-4 py-3 rounded-[20px] rounded-bl-sm flex items-center gap-1.5 shadow-sm">
                <div
                  className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 relative z-20">
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-[20px] p-1.5 pl-4 flex items-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-lg">
            <div className="flex-1 text-sm text-slate-800 font-medium truncate h-6 flex items-center">
              {inputValue}
              {isTyping && (
                <span className="ml-0.5 w-0.5 h-4 bg-black animate-pulse rounded-full" />
              )}
              {!inputValue && !isTyping && (
                <span className="text-slate-400 font-normal">Ask a question...</span>
              )}
            </div>
            <button
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                inputValue
                  ? 'bg-black text-white shadow-md scale-100'
                  : 'bg-slate-100 text-slate-300 scale-95'
              }`}
            >
              <Icons.ArrowRight className="w-4 h-4 ml-0.5" />
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

// --- AUTH MODAL ---
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-white/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[400px] bg-white border border-slate-200 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] rounded-[2rem] p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-black"
        >
          <Icons.X className="w-4 h-4" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-black tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            {view === 'signup'
              ? 'Start your intelligent compliance journey.'
              : 'Access your dashboard.'}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icons.Google className="w-5 h-5" />
            <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Or
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Work Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 transition-all outline-none text-sm font-medium text-black placeholder-slate-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 transition-all outline-none text-sm font-medium text-black placeholder-slate-400"
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-black/10 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            {loading ? 'Processing...' : view === 'signup' ? 'Get Started' : 'Sign In'}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 ${
              message.type === 'error'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-green-50 text-green-600 border border-green-200'
            }`}
          >
            {message.type === 'success' && <Icons.Check className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
            className="text-xs font-semibold text-slate-400 hover:text-black transition-colors"
          >
            {view === 'signup'
              ? 'Already have an account? Log in'
              : "Don't have an account? Sign up"}
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

  useEffect(() => {
    setMounted(true)
  }, [])

  const openAuth = (v) => {
    setAuthView(v)
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-black/10 selection:text-black overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/background.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: 0.28,
            filter: 'blur(1px)',
            mixBlendMode: 'luminosity'
          }}
        />
      </div>

      <nav className="fixed top-0 inset-x-0 z-40 bg-white/70 backdrop-blur-xl border-b border-black/5 shadow-sm transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-black">protocolLM</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#"
              className="text-sm font-medium text-slate-500 hover:text-black transition-colors"
            >
              Features
            </a>
            <a
              href="#"
              className="text-sm font-medium text-slate-500 hover:text-black transition-colors"
            >
              Pricing
            </a>
            <a
              href="#"
              className="text-sm font-medium text-slate-500 hover:text-black transition-colors"
            >
              Enterprise
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth('login')}
              className="hidden md:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-black transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="px-5 py-2 rounded-full bg-black text-white text-sm font-bold tracking-wide hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 md:pt-40 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div
            className={`flex-1 text-center lg:text-left space-y-8 transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-black leading-[1.05]">
              Compliance,
              <br />
              Clarified.
            </h1>

            <p className="text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Stop fearing the health inspector. Equip your franchisees with an intelligent
              assistant trained on <strong>local enforcement codes</strong>.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button
                onClick={() => openAuth('signup')}
                className="h-12 px-8 rounded-full bg-black text-white font-bold tracking-wide hover:bg-slate-800 transition-all shadow-lg shadow-black/20 flex items-center gap-2 group hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Trial
                <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-8 mt-4">
              {[
                {
                  val: 12,
                  suffix: '%',
                  label: 'REVENUE DROP',
                  desc: 'Typical year-one sales hit after a public bad grade.'
                },
                {
                  val: 75,
                  prefix: '$',
                  suffix: 'k',
                  label: 'INCIDENT COST',
                  desc: 'Legal, remediation, labor, and lost traffic.'
                },
                {
                  val: 2.5,
                  suffix: 'x',
                  label: 'REPEAT FINES',
                  desc: 'Fines climb when the same issue shows up twice.',
                  decimals: 1
                }
              ].map((stat, i) => (
                <div
                  key={i}
                  className="text-left bg-white/50 backdrop-blur-sm border border-black/5 p-4 rounded-2xl hover:bg-white/80 transition-colors"
                >
                  <div className="text-3xl font-bold text-black tracking-tighter">
                    <CountUp
                      end={stat.val}
                      suffix={stat.suffix}
                      prefix={stat.prefix || ''}
                      decimals={stat.decimals || 0}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-2">
                    {stat.label}
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 leading-tight">
                    {stat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`flex-1 w-full max-w-[600px] lg:max-w-none transition-all duration-1000 delay-200 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}
          >
            <DemoChatContent />
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-slate-400 font-medium">
            © 2025 ProtocolLM Inc. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-black transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-black transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-black transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
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
