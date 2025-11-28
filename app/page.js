'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Optimized Height for 'Above Fold') ---
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
            <span className="font-bold text-rose-500">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] group mx-auto perspective-1000">
      {/* Decorative Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000"></div>
      
      <div className="flex flex-col h-[420px] w-full bg-white/60 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl relative z-10 overflow-hidden ring-1 ring-black/5 transform-gpu transition-transform duration-500 group-hover:scale-[1.005]">
        
        {/* Header */}
        <div className="h-12 border-b border-black/5 flex items-center px-4 justify-between bg-white/40">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 opacity-80">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="h-4 w-[1px] bg-black/5 mx-1"></div>
            <span className="font-semibold text-slate-700 text-xs tracking-tight flex items-center gap-1">
              protocol<span className="text-blue-600">LM</span>
              <span className="px-1.5 py-0.5 rounded-[4px] bg-blue-50/80 text-[8px] font-bold text-blue-600 uppercase tracking-wider ml-1 border border-blue-100">Beta</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
             <div className="relative">
                <span className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></span>
                <span className="relative w-1.5 h-1.5 bg-emerald-500 rounded-full block shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
             </div>
             <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-5 custom-scroll bg-gradient-to-b from-transparent to-white/20"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-60">
              <div className="w-14 h-14 rounded-2xl bg-white/80 border border-blue-100/50 flex items-center justify-center shadow-sm">
                 <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"/>
              </div>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">System Ready</p>
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
                className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed shadow-sm backdrop-blur-sm ${
                  msg.role === 'user'
                    ? 'bg-[#0077B6] text-white rounded-tr-sm shadow-blue-500/10'
                    : 'bg-white/90 text-slate-600 border border-slate-100 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-white/80 px-3 py-2 rounded-xl rounded-tl-sm border border-slate-100/50 flex gap-2 items-center shadow-sm backdrop-blur-sm">
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite]" />
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_0.1s]" />
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                </div>
                <span className="text-[9px] font-medium text-slate-400 tracking-wide">FDA Code Verification...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white/60 backdrop-blur-md border-t border-slate-100/50">
          <div className="w-full bg-slate-50/50 border border-slate-200/50 rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all focus-within:bg-white focus-within:shadow-sm focus-within:border-blue-200">
            <div className="flex-1 text-[13px] text-slate-700 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
              )}
            </div>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-blue-600 scale-100 shadow-lg shadow-blue-500/30' : 'bg-slate-200 scale-90'}`}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
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

// --- AUTH MODAL ---
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
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-300" />
      <div className="w-full max-w-[380px] bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] p-8 rounded-[2rem] relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ring-1 ring-black/5">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-xl transition-all disabled:opacity-50 mb-6 group">
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white/50 backdrop-blur-xl text-slate-400 font-medium">Or continue with email</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-white/50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Email address" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-white/50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 mt-2">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 text-xs font-medium rounded-xl flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors">
            {view === 'signup' ? 'Already have an account? Sign in' : 'New to protocolLM? Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- COOL WIDGET CARDS (Refined) ---
const StatCard = ({ title, value, sub, type }) => {
  return (
    <div className="group relative bg-white/50 backdrop-blur-md border border-white/60 p-5 rounded-2xl overflow-hidden hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-2xl hover:shadow-blue-500/10 ring-1 ring-black/5 cursor-default flex flex-col justify-between min-h-[140px]">
      
      {/* Noise Texture (Simulated via filtered gradient) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiLz4KPC9zdmc+')]"></div>

      {/* Internal Gradients */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-20 transition-opacity group-hover:opacity-30 z-0
        ${type === 'danger' ? 'bg-rose-500' : type === 'warning' ? 'bg-amber-500' : 'bg-purple-500'}`} 
      />
      
      {/* Floating Icon */}
      <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center mb-3 shadow-inner border border-white/60
        ${type === 'danger' ? 'bg-rose-50 text-rose-500' : type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-purple-50 text-purple-500'}`}>
        {type === 'danger' && (
           // Trend Down Arrow
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
        )}
        {type === 'warning' && (
           // Alert Triangle
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        )}
        {type === 'info' && (
           // Multiplier X
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        )}
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-bold text-slate-800 tracking-tighter mb-1.5">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-[10px] font-medium text-slate-400 leading-snug">{sub}</div>
      </div>

      {/* Decorative Bottom Stroke */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-200/50 to-transparent opacity-50"></div>
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
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-500 selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="relative w-full h-full animate-drift">
          <Image src="/background.png" alt="Background" fill className="object-cover opacity-[0.24]" priority />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF]/95 via-[#F0F9FF]/30 to-[#F0F9FF]/95" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
      </div>

      {/* Navbar (Tighter Spacing) */}
      <nav className="fixed top-4 left-0 right-0 z-40 flex justify-center px-4">
        <div className={`w-full max-w-4xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-full px-5 py-2.5 flex justify-between items-center transition-all duration-700 ring-1 ring-black/5 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-base font-bold tracking-tight text-slate-800">
              protocol<span className="text-blue-600">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/pricing')} className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wide">Pricing</button>
            <div className="h-3 w-[1px] bg-slate-200"></div>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors uppercase tracking-wide">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg shadow-slate-900/10 hover:shadow-slate-900/30 active:scale-95 uppercase tracking-wide">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section (Lifted Layout) */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 pt-24 pb-8 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 relative z-10 h-screen max-h-[900px] min-h-[600px]">
        
        {/* Left Copy */}
        <div className={`flex-1 w-full lg:max-w-lg text-center lg:text-left transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
            </span>
            Available Now
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tighter leading-[1.05] mb-5">
            Train your team <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">before</span> the inspector arrives.
          </h1>

          <p className="text-base text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-8 font-medium">
            Instant, AI-verified answers from <strong className="text-slate-900">Washtenaw, Wayne, and Oakland County</strong> health codes.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-10">
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-0.5 tracking-wide">
              Start Free Trial
            </button>
            <button className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors px-4 py-3">View Demo</button>
          </div>

          {/* COOL CARDS GRID (Compact & Swapped) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard 
              type="danger"
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue Drop"
              sub="First-year loss after bad grade."
            />
            {/* SWAPPED: Incident Cost is now Warning (Amber) */}
            <StatCard 
              type="warning"
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Incident Cost"
              sub="Legal & labor costs per event."
            />
            {/* SWAPPED: Fine Multiplier is now Info (Purple) */}
            <StatCard 
              type="info"
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Fine Multiplier"
              sub="Escalation for repeat issues."
            />
          </div>
        </div>

        {/* Right: Demo Chat (Slightly shorter to fit above fold) */}
        <div className={`flex-1 w-full max-w-[500px] flex justify-center perspective-1000 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      {/* Footer (Minimalist) */}
      <footer className="w-full py-4 bg-transparent absolute bottom-0 z-20">
        <div className="flex justify-center items-center gap-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
            <a href="/terms" className="hover:text-blue-600 transition-colors">Terms</a>
            <span>© 2025 protocolLM</span>
            <a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</a>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .perspective-1000 { perspective: 1000px; }
        @keyframes drift { 0% { transform: scale(1); } 100% { transform: scale(1.05); } }
        .animate-drift { animation: drift 20s ease-in-out infinite alternate; }
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
