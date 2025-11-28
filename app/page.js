'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Fixed Dimensions & Mobile Optimized) ---
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
        "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan.",
    },
    {
      text: 'Our certified manager quit yesterday. Do we have to close the kitchen?',
      response:
        "NO. 'Oakland County Sanitary Code Article IV, Sec 4.4' allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Health Division immediately to avoid penalties.",
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response:
        'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.',
    },
    {
      text: 'The floor drain is backing up in the dish room. Can we just mop it and keep serving?',
      response:
        'IMMINENT HEALTH HAZARD. Washtenaw Enforcement Procedure Sec 5.0 defines sewage backup as grounds for Immediate Closure. You must cease operations until the backup is fixed and the area sanitized.',
    },
    {
      text: "Inspector cited us for 'Wet Nesting' pans. Is that actually a priority violation?",
      response:
        'CORE VIOLATION. Stacking wet pans prevents air drying (FDA Code 4-901.11). While usually a Core item, repeated failure to correct it can lead to Priority Foundation citations for unsanitary equipment storage.',
    },
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
    const keywords = ['CRITICAL ACTION', 'VIOLATION', 'IMMINENT HEALTH HAZARD', 'CORE VIOLATION', 'ACTION REQUIRED']
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-bold text-[#023E8A]">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[640px] mx-auto shrink-0">
      {/* Glow + blur halo behind card */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -inset-10 bg-[radial-gradient(circle_at_top,_rgba(144,224,239,0.4),_transparent_55%)] opacity-80 blur-3xl" />
        <div className="absolute -bottom-16 -right-12 w-40 h-40 rounded-full bg-[#0077B6]/30 blur-3xl opacity-60" />
      </div>

      {/* Glass shell */}
      <div className="relative flex flex-col h-[420px] md:h-[520px] w-full rounded-[26px] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-[0_26px_80px_rgba(15,23,42,0.45)] overflow-hidden transform-gpu">
        {/* Accent border gradient */}
        <div className="pointer-events-none absolute inset-px rounded-[24px] border border-white/30/60 [border-image:linear-gradient(135deg,#90E0EF,#ffffff,#0077B6)_1] opacity-80" />

        {/* Top chrome */}
        <div className="relative z-20 flex items-center justify-between px-5 md:px-6 py-3.5 md:py-4 border-b border-white/10 bg-gradient-to-r from-white/60 via-white/30 to-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Mini “planet Proto” icon */}
            <div className="relative w-8 h-8 rounded-2xl bg-[#023E8A] flex items-center justify-center shadow-lg shadow-[#023E8A]/40 overflow-hidden">
              <div className="absolute inset-0 bg-[conic-gradient(from_200deg,_#90E0EF,_#0077B6,_#023E8A,_#90E0EF)] opacity-70" />
              <div className="absolute inset-[6px] rounded-full bg-slate-950/70 border border-white/40" />
              <div className="absolute -left-1.5 top-1/2 h-[1.5px] w-[140%] rounded-full bg-white/50" />
              <div className="relative w-1.5 h-1.5 rounded-full bg-[#90E0EF] shadow-[0_0_10px_rgba(144,224,239,0.8)] translate-y-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#023E8A] text-xs tracking-tight leading-none">
                protocol<span className="text-[#0077B6]">LM</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">SE Michigan · Health Code Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#F0F9FF]/90 px-3 py-1.5 rounded-full border border-[#90E0EF]/70 shadow-sm">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-[#0077B6] uppercase tracking-[0.22em]">Online</span>
          </div>
        </div>

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-5 space-y-3 md:space-y-4 bg-gradient-to-b from-[#F0F9FF]/80 via-[#E0F3FF]/70 to-[#F0F9FF]/90 min-h-0 custom-scroll"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/70 border border-slate-100 flex items-center justify-center shadow-md shadow-sky-100">
                <div className="w-6 h-6 border-2 border-slate-200 rounded-full border-t-[#0077B6] animate-spin" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#0077B6]/70">
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
                className={`max-w-[85%] px-4 md:px-5 py-3 md:py-3.5 rounded-2xl text-sm leading-relaxed font-medium shadow-sm relative z-20 ${
                  msg.role === 'user'
                    ? 'bg-[#0077B6] text-white rounded-tr-sm shadow-md shadow-[#0077B6]/40'
                    : 'bg-white/95 text-slate-700 rounded-tl-sm border border-[#90E0EF]/60 shadow-md shadow-sky-100'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs md:text-[13px] relative z-30">
                  {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in fade-in zoom-in duration-200 relative z-20">
              <div className="bg-white/95 px-4 py-3 rounded-2xl rounded-tl-sm border border-[#90E0EF]/70 flex gap-1.5 items-center shadow-sm shadow-sky-100">
                <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" />
                <div
                  className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce"
                  style={{ animationDelay: '100ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce"
                  style={{ animationDelay: '200ms' }}
                />
                <span className="ml-2 text-[10px] font-semibold text-slate-500 hidden md:inline">
                  Cross-checking local code &amp; FDA Food Code…
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Faux input */}
        <div className="relative z-20 px-4 md:px-5 py-3.5 md:py-4 bg-gradient-to-r from-white/80 via-white/70 to-white/80 border-t border-white/30 backdrop-blur-xl">
          <div className="w-full bg-[#F0F9FF]/90 border border-[#90E0EF]/70 rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 flex items-center gap-3 min-h-[48px] shadow-inner shadow-sky-100/60">
            <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-[#0077B6] ml-1 animate-pulse" />}
              {!inputValue && !isTyping && (
                <span className="text-slate-400 text-[11px] truncate">
                  “What happens if we get a second priority violation?”
                </span>
              )}
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
                inputValue ? 'bg-[#0077B6] shadow-md shadow-[#0077B6]/40' : 'bg-slate-200/80'
              }`}
            >
              <svg
                className="w-4 h-4 text-white transform rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
    <span>
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
  const router = useRouter()

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
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
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
            data: { county: 'washtenaw' },
          },
        })
        if (error) throw error
        if (data?.user && !data?.session) {
          setMessage({ type: 'success', text: 'Check your email to confirm your account!' })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-white/60 shadow-[0_28px_80px_rgba(15,23,42,0.5)] p-8 rounded-3xl relative overflow-hidden">
        {/* subtle corner glow */}
        <div className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 rounded-full bg-[#90E0EF]/40 blur-3xl" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-[#023E8A] transition-colors"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-[#023E8A] mb-6 tracking-tight">
          {view === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border-2 border-slate-200 hover:border-[#0077B6] hover:shadow-md rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm font-semibold text-slate-700">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-slate-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3.5 bg-[#F0F9FF] border border-[#90E0EF] focus:bg-white focus:border-[#0077B6] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg"
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-3.5 bg-[#F0F9FF] border border-[#90E0EF] focus:bg-white focus:border-[#0077B6] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg"
            placeholder="Password (min 6 characters)"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all font-mono shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 text-xs font-sans border rounded-lg ${
              message.type === 'error'
                ? 'bg-red-50 text-red-600 border-red-100'
                : 'bg-green-50 text-green-600 border-green-100'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button
            onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
            className="text-xs text-slate-400 hover:text-[#0077B6] font-sans"
          >
            {view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}
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
    <div className="min-h-screen w-full bg-[#020817] font-sans text-slate-50 selection:bg-[#0077B6] selection:text-white flex flex-col relative overflow-x-hidden max-w-[100vw]">
      {/* BACKGROUND LAYERS */}
      <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden">
        {/* Soft gradient base */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(12,74,110,0.9),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(8,47,73,0.9),_transparent_55%),linear-gradient(to_bottom,#020617,#020617)]" />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.18] mix-blend-soft-light">
          <div className="w-[160%] h-[160%] -left-[30%] -top-[30%] bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {/* Glow orbs */}
        <div className="absolute -top-24 -right-10 w-64 h-64 rounded-full bg-[#00B4D8]/40 blur-3xl opacity-80" />
        <div className="absolute bottom-[-80px] left-[-40px] w-72 h-72 rounded-full bg-[#023E8A]/50 blur-3xl opacity-90" />

        {/* Optional texture image if you want to keep your PNG */}
        <div className="absolute inset-0 opacity-[0.24]">
          <div className="relative w-full h-full animate-drift">
            <Image src="/background.png" alt="Background texture" fill className="object-cover mix-blend-soft-light" priority />
          </div>
        </div>
      </div>

      {/* NAV CONTAINER */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-4 flex justify-between items-center">
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="flex items-center gap-2">
              {/* Tiny planet mark next to logotype */}
              <div className="relative w-7 h-7 rounded-2xl bg-[#023E8A] flex items-center justify-center overflow-hidden shadow-md shadow-sky-900/70">
                <div className="absolute inset-0 bg-[conic-gradient(from_220deg,_#90E0EF,_#00B4D8,_#023E8A,_#90E0EF)] opacity-80" />
                <div className="absolute inset-[6px] rounded-full border border-white/40 bg-slate-950/80" />
                <div className="absolute -left-1.5 top-1/2 h-[1px] w-[140%] rounded-full bg-white/40" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                protocol<span className="text-[#00B4D8]">LM</span>
              </h1>
            </div>
          </div>

          <div
            className={`flex gap-2 md:gap-4 text-[10px] md:text-xs font-semibold uppercase tracking-[0.22em] items-center transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <span className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[9px] tracking-[0.21em] text-slate-300">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live in Washtenaw · Oakland · Wayne
            </span>
            <button
              onClick={() => router.push('/pricing')}
              className="px-2 md:px-3 py-1.5 text-slate-300 hover:text-white transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => openAuth('login')}
              className="px-2 md:px-3 py-1.5 text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="group relative overflow-hidden px-3.5 md:px-4 py-2 rounded-full text-[10px] md:text-xs bg-gradient-to-r from-[#00B4D8] via-[#0077B6] to-[#023E8A] text-white font-semibold tracking-[0.22em] shadow-lg shadow-sky-900/70 hover:shadow-xl hover:-translate-y-[1px] active:scale-95 transition-all"
            >
              <span className="relative z-10 hidden md:inline">Get protocolLM</span>
              <span className="relative z-10 md:hidden">Join</span>
              <div className="absolute top-0 -left-[120%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]" />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <main className="flex-1 w-full pt-24 md:pt-28 pb-10 md:pb-16 relative z-10">
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col-reverse md:flex-row items-center justify-center gap-10 md:gap-16 lg:gap-20 min-h-[calc(100vh-120px)]">
          {/* Left column */}
          <section
            className={`flex-1 text-center md:text-left transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100 mb-4 shadow-sm shadow-slate-900/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              AI coach for SE Michigan health inspections
            </div>

            <h2 className="text-3xl md:text-5xl lg:text-[46px] font-semibold text-white tracking-tight leading-tight mb-4 md:mb-5">
              Train your team{' '}
              <span className="inline-block bg-gradient-to-r from-[#90E0EF] via-[#00B4D8] to-[#0077B6] bg-clip-text text-transparent">
                before the inspector walks in.
              </span>
            </h2>

            <p className="text-sm md:text-base text-slate-200/90 font-medium leading-relaxed max-w-xl mx-auto md:mx-0 mb-4 md:mb-5">
              protocol<span className="text-[#00B4D8] font-bold">LM</span> gives front-line staff
              instant, county-specific answers pulled from{' '}
              <span className="font-semibold text-sky-100">
                Washtenaw, Wayne, and Oakland food codes
              </span>
              —so they handle violations correctly before they become headlines.
            </p>

            <p className="text-[10px] md:text-[11px] text-slate-400 font-semibold uppercase tracking-[0.3em] mb-6 md:mb-7">
              One avoided closure can cover protocolLM for years.
            </p>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-5 mb-8 md:mb-12">
              <button
                onClick={() => openAuth('signup')}
                className="group relative overflow-hidden bg-gradient-to-r from-[#00B4D8] via-[#0077B6] to-[#023E8A] text-white px-6 md:px-8 py-3.5 md:py-4 rounded-xl font-bold uppercase tracking-[0.28em] hover:shadow-[0_20px_60px_rgba(8,47,73,0.8)] hover:-translate-y-1 active:scale-95 transition-all text-[10px] md:text-xs shadow-[0_16px_40px_rgba(8,47,73,0.75)]"
              >
                <span className="relative z-10">Start 30-day free trial</span>
                <div className="absolute top-0 -left-[120%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]" />
              </button>

              <div className="flex items-center gap-3 text-left text-[11px] text-slate-300/90">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[#0F172A] border border-sky-500/40" />
                  <div className="w-6 h-6 rounded-full bg-[#020617] border border-slate-500/40" />
                  <div className="w-6 h-6 rounded-full bg-[#0B1120] border border-sky-400/40" />
                </div>
                <div>
                  <div className="font-semibold text-[11px] text-sky-50">
                    Built with actual county documents.
                  </div>
                  <div className="text-[10px] text-slate-400">Not generic AI answers.</div>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.7)] hover:bg-white/7 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                <div className="text-4xl md:text-5xl font-bold text-sky-100 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                  <CountUp end={12} suffix="%" duration={2500} />
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] mt-2">
                  Revenue drop / unit
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium leading-snug">
                  Typical year-one sales hit after a public bad grade or closure.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.7)] hover:bg-white/7 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                <div className="text-4xl md:text-5xl font-bold text-sky-100 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                  <CountUp end={75} prefix="$" suffix="k" duration={2500} />
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] mt-2">
                  Avg. incident cost
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium leading-snug">
                  Legal, remediation, labor, and lost traffic from one major food safety event.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.7)] hover:bg-white/7 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                <div className="text-4xl md:text-5xl font-bold text-sky-100 tracking-tighter group-hover:scale-105 transition-transform duration-500">
                  <CountUp end={2.5} suffix="x" decimals={1} duration={2500} />
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] mt-2">
                  Repeat fine multiplier
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-medium leading-snug">
                  Scrutiny and fines spike once the same violation shows up twice.
                </p>
              </div>
            </div>
          </section>

          {/* Right: demo chat */}
          <aside
            className={`flex-1 w-full flex flex-col items-center justify-center transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0 md:translate-x-0' : 'opacity-0 translate-y-4 md:translate-x-4'
            }`}
          >
            <DemoChatContent />
          </aside>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-6 md:py-8 border-t border-white/5 bg-black/20 backdrop-blur-xl relative z-10 mt-auto pb-safe">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-sky-200 transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-sky-200 transition-colors">
              Privacy
            </a>
          </div>
          <div className="text-slate-500">© 2025 protocolLM · Built in Michigan</div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        body {
          overscroll-behavior-y: none;
          background: #020817;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
        .custom-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 20px;
        }
        @keyframes shine {
          0% {
            left: -120%;
          }
          100% {
            left: 200%;
          }
        }
        @keyframes drift {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.04);
          }
        }
        .animate-drift {
          animation: drift 26s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div></div>}>
      <MainContent />
    </Suspense>
  )
}
