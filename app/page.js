'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Redesigned for High-Fidelity) ---
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
    <div className="relative w-full max-w-[550px] group mx-auto">
      {/* Decorative Glow Behind */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
      
      <div className="flex flex-col h-[450px] w-full bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl relative z-10 overflow-hidden ring-1 ring-black/5">
        
        {/* Modern Header */}
        <div className="h-14 border-b border-black/5 flex items-center px-5 justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
            </div>
            <div className="h-4 w-[1px] bg-black/10 mx-1"></div>
            <span className="font-semibold text-slate-700 text-xs tracking-tight flex items-center gap-1">
              protocol<span className="text-blue-600">LM</span>
              <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[9px] font-bold text-blue-600 uppercase tracking-wider ml-1">Beta</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Connected</span>
          </div>
        </div>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 flex items-center justify-center shadow-inner">
                 <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <p className="text-xs font-medium text-slate-400 tracking-wider">INITIALIZING KNOWLEDGE BASE</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-3 duration-500`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#0077B6] text-white rounded-tr-sm shadow-blue-500/20'
                    : 'bg-white text-slate-600 border border-slate-100 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-100 flex gap-2 items-center shadow-sm">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite_0.1s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                </div>
                <span className="text-[10px] font-medium text-slate-400">Consulting FDA Code 2022...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100">
          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white">
            <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
              )}
              {!inputValue && !isTyping && <span className="text-slate-400/70 text-xs">Ask protocolLM...</span>}
            </div>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-blue-600 scale-100' : 'bg-slate-200 scale-90'}`}>
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

// --- AUTH MODAL (Glassmorphism) ---
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
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-300" />
      
      {/* Modal Card */}
      <div className="w-full max-w-[400px] bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] p-8 rounded-3xl relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ring-1 ring-black/5">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {view === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {view === 'signup' ? 'Get started with your free trial today.' : 'Access your dashboard.'}
          </p>
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
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-500 selection:text-white flex flex-col relative overflow-x-hidden max-w-[100vw]">
      
      {/* 
        High-End Background: 
        1. Base gradient
        2. Mesh Gradients (Orbs)
        3. Noise Texture overlay (optional, keeping it simple here)
      */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-400/10 blur-[100px]" />
      </div>

      {/* Floating Navbar */}
      <nav className="fixed top-6 left-0 right-0 z-40 flex justify-center px-4">
        <div className={`w-full max-w-5xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-full px-6 py-3 flex justify-between items-center transition-all duration-700 ring-1 ring-black/5 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800">
              protocol<span className="text-blue-600">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Pricing</button>
            <button onClick={() => router.push('/docs')} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Docs</button>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <button onClick={() => openAuth('login')} className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-slate-900 hover:bg-black text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 active:scale-95">
              Get Started
            </button>
          </div>
          
          <button className="md:hidden text-slate-700" onClick={() => openAuth('signup')}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-40 pb-20 md:pt-48 md:pb-32 flex flex-col md:flex-row items-center gap-16 relative z-10">
        
        {/* Left Copy */}
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Updated for 2025 Code
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter leading-[1.1] mb-6">
            Train your team <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">before</span> the inspector arrives.
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto md:mx-0 mb-10 font-medium">
            Instant, AI-verified answers from <strong className="text-slate-900">Washtenaw, Wayne, and Oakland County</strong> health codes. Stop guessing and start complying.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start mb-16">
            <button onClick={() => openAuth('signup')} className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-1">
              Start 30-Day Free Trial
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group">
              <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Watch Demo
            </button>
          </div>

          {/* Bento Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { val: 12, suffix: '%', label: 'Revenue Drop', sub: 'Post-bad grade' },
              { val: 75, prefix: '$', suffix: 'k', label: 'Incident Cost', sub: 'Avg. per outbreak' },
              { val: 2.5, suffix: 'x', label: 'Fine Multiplier', sub: 'Repeat violations' }
            ].map((stat, i) => (
              <div key={i} className="group relative bg-white/40 backdrop-blur-md border border-white/60 p-5 rounded-2xl hover:bg-white/80 transition-all duration-300 hover:scale-105 hover:shadow-xl ring-1 ring-black/5">
                <div className="text-4xl font-bold text-slate-800 tracking-tighter mb-1 group-hover:text-blue-600 transition-colors">
                  <CountUp end={stat.val} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.val % 1 !== 0 ? 1 : 0} />
                </div>
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 opacity-80">{stat.label}</div>
                <div className="text-[10px] font-medium text-slate-500 leading-tight">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Demo Chat */}
        <div className={`flex-1 w-full flex justify-center perspective-1000 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
          <div className="flex gap-6">
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
          <div className="opacity-60">© 2025 protocolLM Inc.</div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .perspective-1000 { perspective: 1000px; }
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
