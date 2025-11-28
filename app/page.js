'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CUSTOM ISOMETRIC ICONS (More Reserved Palette) ---
const IsoChartDown = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-sm">
    <path
      d="M4 24 L20 36 L36 20 L56 44"
      fill="none"
      stroke="#0F172A"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M56 44 L46 44 M56 44 L56 34"
      fill="none"
      stroke="#0F172A"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 3D Depth Walls */}
    <path d="M4 24 L20 36 L20 44 L4 32 Z" fill="#E5E7EB" opacity="0.9" />
    <path d="M20 36 L36 20 L36 28 L20 44 Z" fill="#CBD5F5" opacity="0.7" />
    <path d="M36 20 L56 44 L56 52 L36 28 Z" fill="#BFDBFE" opacity="0.8" />
  </svg>
)

const IsoShield = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-sm">
    {/* Inner Face */}
    <path
      d="M32 8 L52 16 V32 C52 44 44 54 32 60 C20 54 12 44 12 32 V16 L32 8 Z"
      fill="#0F172A"
    />
    {/* Side Depth */}
    <path
      d="M52 16 L56 18 V34 C56 47 47 58 32 64 V60 C44 54 52 44 52 32 V16 Z"
      fill="#020617"
    />
    {/* Highlight */}
    <path
      d="M32 8 L32 60 C20 54 12 44 12 32 V16 L32 8 Z"
      fill="#1E293B"
    />
  </svg>
)

const IsoBlocks = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-sm">
    {/* Bottom Block */}
    <path d="M16 36 L32 44 L48 36 L32 28 Z" fill="#E5E7EB" />
    <path d="M16 36 L32 44 V54 L16 46 Z" fill="#94A3B8" />
    <path d="M48 36 L32 44 V54 L48 46 Z" fill="#64748B" />
    {/* Top Block (Floating) */}
    <path
      d="M16 16 L32 24 L48 16 L32 8 Z"
      fill="#E5E7EB"
      className="animate-hover-float"
    />
    <path
      d="M16 16 L32 24 V34 L16 26 Z"
      fill="#94A3B8"
      className="animate-hover-float"
    />
    <path
      d="M48 16 L32 24 V34 L48 26 Z"
      fill="#64748B"
      className="animate-hover-float"
    />
  </svg>
)

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
      'ACTION REQUIRED'
    ]
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-semibold text-sky-700">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[500px] group mx-auto perspective-1000">
      {/* Subtle framed border behind */}
      <div className="absolute inset-0 rounded-3xl border border-slate-200/70 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.4)]" />

      {/* Main Container */}
      <div className="relative flex flex-col h-[450px] w-full bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-[0_20px_40px_-24px_rgba(15,23,42,0.6)] z-10 overflow-hidden transform-gpu transition-all duration-500 ease-out-spring group-hover:-translate-y-1 group-hover:shadow-[0_30px_60px_-30px_rgba(15,23,42,0.7)]">
        {/* Header */}
        <div className="h-12 border-b border-slate-200 flex items-center px-5 justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 opacity-80">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shadow-sm" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shadow-sm" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shadow-sm" />
            </div>
            <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
            <span className="font-semibold text-slate-800 text-[11px] tracking-tight flex items-center gap-1">
              protocol<span className="text-sky-700">LM</span>
              <span className="px-1.5 py-0.5 rounded-[4px] bg-sky-50 text-[8px] font-bold text-sky-700 uppercase tracking-wider ml-1 border border-sky-100">
                Beta
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">
              Live in Michigan
            </span>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll bg-slate-50/40"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-70">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
              </div>
              <p className="text-[10px] font-semibold text-slate-400 tracking-[0.2em] uppercase">
                System Ready
              </p>
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
                className={`max-w-[88%] px-4 py-3 rounded-2xl text-[12px] leading-relaxed shadow-sm border ${
                  msg.role === 'user'
                    ? 'bg-sky-700 text-white rounded-tr-sm border-sky-800/40'
                    : 'bg-white text-slate-700 border-slate-200 rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-white px-3 py-2 rounded-xl rounded-tl-sm border border-slate-200 flex gap-2 items-center shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-sky-600 rounded-full animate-[bounce_1s_infinite]" />
                  <div className="w-1 h-1 bg-sky-600 rounded-full animate-[bounce_1s_infinite_0.1s]" />
                  <div className="w-1 h-1 bg-sky-600 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                </div>
                <span className="text-[9px] font-semibold text-slate-500 tracking-wide uppercase">
                  Verifying code
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all focus-within:bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
            <div className="flex-1 text-[13px] text-slate-800 font-medium min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-sky-600 ml-0.5 animate-pulse" />
              )}
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                inputValue
                  ? 'bg-sky-700 scale-100 shadow-lg shadow-sky-700/30'
                  : 'bg-slate-200 scale-90'
              }`}
            >
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- COUNT UP UTIL ---
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

// --- STAT CARD ---
const StatCard = ({ title, value, sub, type, icon, delay }) => {
  const tone =
    type === 'danger'
      ? 'bg-rose-50 border-rose-100'
      : type === 'warning'
      ? 'bg-amber-50 border-amber-100'
      : 'bg-sky-50 border-sky-100'

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative ${tone} backdrop-blur-sm border p-5 rounded-2xl overflow-hidden hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 ease-out-spring shadow-[0_6px_18px_-10px_rgba(15,23,42,0.6)] cursor-default flex flex-col justify-between min-h-[140px] opacity-0 animate-reveal-card`}
    >
      {/* Floating 3D Icon */}
      <div className="relative z-10 w-12 h-12 mb-3 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1">
        {icon}
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-semibold text-slate-900 tracking-tight mb-1.5">
          {value}
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mb-1">
          {title}
        </div>
        <div className="text-[11px] font-medium text-slate-500 leading-snug">{sub}</div>
      </div>

      {/* Light Shine */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-transparent opacity-60" />
    </div>
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
      setMessage({ type: 'error', text: error?.message || 'Google sign-in failed.' })
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
          setMessage({
            type: 'success',
            text: 'Check your email to confirm your account.'
          })
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
      setMessage({
        type: 'error',
        text: error?.message || 'Something went wrong. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-300"
      />
      <div className="w-full max-w-[380px] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.7)] p-8 rounded-3xl relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            {view === 'signup' ? 'Create a protocolLM account' : 'Welcome back'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Purpose-built for restaurant groups in Southeast Michigan.
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 p-3 bg-white border border-slate-200 hover:border-sky-500 hover:shadow-md rounded-xl transition-all disabled:opacity-50 mb-5 group"
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
          <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
            Continue with Google
          </span>
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-slate-400 font-medium">Or use email</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3.5 bg-white border border-slate-200 focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-500/10 outline-none text-slate-900 text-sm placeholder-slate-400 rounded-xl transition-all"
            placeholder="Work email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-3.5 bg-white border border-slate-200 focus:bg-white focus:border-sky-600 focus:ring-4 focus:ring-sky-500/10 outline-none text-slate-900 text-sm placeholder-slate-400 rounded-xl transition-all"
            placeholder="Password"
          />

          {message && (
            <div
              className={`text-xs rounded-lg px-3 py-2 ${
                message.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 hover:bg-sky-800 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-sky-700/20 active:scale-[0.98] disabled:opacity-50 mt-1"
          >
            {loading ? 'Processing…' : view === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
            className="text-xs text-slate-500 hover:text-sky-700 font-medium transition-colors"
          >
            {view === 'signup'
              ? 'Already using protocolLM? Sign in'
              : 'New to protocolLM? Create an account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- MAIN PAGE LAYOUT ---
function MainContent() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    const authParam = searchParams.get('auth')
    if (authParam === 'login' || authParam === 'signup') {
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
    <div className="min-h-screen w-full bg-[#F3F4F6] font-sans text-slate-900 selection:bg-sky-600 selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src="/background.png"
            alt="Isometric restaurant background"
            fill
            className="object-cover opacity-[0.18]"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/95 via-slate-50/80 to-slate-100" />
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-2 left-0 right-0 z-40 flex justify-center px-4">
        <div
          className={`w-full max-w-5xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_6px_18px_-10px_rgba(15,23,42,0.5)] rounded-full px-5 py-2.5 flex justify-between items-center transition-all duration-700 ease-out-spring ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
        >
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center">
              <div className="w-4 h-4 rounded-[10px] border border-slate-400 bg-slate-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-[6px] bg-sky-500" />
              </div>
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              protocol<span className="text-sky-700">LM</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => router.push('/pricing')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-[0.16em]"
            >
              Pricing
            </button>
            <div className="h-3 w-[1px] bg-slate-200"></div>
            <button
              onClick={() => openAuth('login')}
              className="text-xs font-semibold text-slate-700 hover:text-sky-700 transition-colors uppercase tracking-[0.16em]"
            >
              Log in
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="bg-slate-900 hover:bg-black text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-lg shadow-slate-900/20 active:scale-95 uppercase tracking-[0.18em]"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 pt-20 pb-6 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 relative z-10 h-screen max-h-[860px] min-h-[620px]">
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-slate-100 text-[10px] font-semibold uppercase tracking-[0.22em] mb-5 transition-all duration-700 ease-out-spring ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Built for multi-unit operators
          </div>

          {/* Headline */}
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.05] mb-4 transition-all duration-900 ease-out-spring ${
              mounted ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-8 blur-sm'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            Make every location
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">
              inspection-ready, every day.
            </span>
          </h1>

          {/* Subheader */}
          <p
            className={`text-base text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-6 font-medium transition-all duration-900 ease-out-spring ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '280ms' }}
          >
            protocolLM turns the{' '}
            <span className="font-semibold text-slate-900">
              Washtenaw, Wayne, and Oakland County
            </span>{' '}
            rulebooks into one consistent playbook for your managers—so issues are handled before
            they appear on an inspection report.
          </p>

          {/* Micro-proof line */}
          <p
            className={`text-xs text-slate-500 mb-6 transition-all duration-900 ease-out-spring ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '320ms' }}
          >
            Designed for franchisees and multi-location groups managing high volume and brand risk.
          </p>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start mb-8 transition-all duration-900 ease-out-spring ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '380ms' }}
          >
            <button
              onClick={() => openAuth('signup')}
              className="w-full sm:w-auto px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-sky-700/25 hover:shadow-2xl hover:shadow-sky-700/30 hover:-translate-y-0.5 active:scale-95 tracking-[0.14em] uppercase"
            >
              Start free trial
            </button>
            <button className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-3">
              View product walkthrough →
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              type="danger"
              icon={<IsoChartDown />}
              value={<CountUp end={12} suffix="%" duration={2500} />}
              title="Revenue at risk"
              sub="Average year-one impact of a major incident across a portfolio."
              delay={500}
            />
            <StatCard
              type="warning"
              icon={<IsoShield />}
              value={<CountUp end={75} prefix="$" suffix="k" duration={2500} />}
              title="Typical claim cost"
              sub="Estimated labor, legal, and remediation cost per serious event."
              delay={650}
            />
            <StatCard
              type="info"
              icon={<IsoBlocks />}
              value={<CountUp end={2.5} suffix="x" decimals={1} duration={2500} />}
              title="Repeat-issue risk"
              sub="Likelihood of escalated action from recurring violations."
              delay={800}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Demo) */}
        <div
          className={`flex-1 w-full max-w-[500px] flex justify-center perspective-1000 transition-all duration-1000 ease-out-spring ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <DemoChatContent />
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full py-4 bg-transparent absolute bottom-0 z-20">
        <div className="flex justify-center items-center gap-6 text-[9px] font-semibold text-slate-400 uppercase tracking-[0.25em] opacity-70">
          <a href="/terms" className="hover:text-slate-700 transition-colors">
            Terms
          </a>
          <span>© 2025 protocolLM</span>
          <a href="/privacy" className="hover:text-slate-700 transition-colors">
            Privacy
          </a>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      {/* GLOBAL STYLES & ANIMATIONS */}
      <style jsx global>{`
        /* Scrollbar */
        .custom-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        /* 3D Perspective */
        .perspective-1000 {
          perspective: 1000px;
        }

        /* Spring Physics Easing */
        .ease-out-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Message Slide In */
        @keyframes messageSlide {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-message-slide {
          animation: messageSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        /* Card Reveal */
        @keyframes revealCard {
          0% {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .animate-reveal-card {
          animation: revealCard 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        /* Hover Float for Icon */
        @keyframes hoverFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        .group:hover .animate-hover-float {
          animation: hoverFloat 2s ease-in-out infinite;
        }
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
