'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Fixed Dimensions & Stable Layout) ---
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
            <span className="font-semibold text-amber-300">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      {/* Glow behind card */}
      <div className="pointer-events-none absolute -inset-8 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_55%)] blur-3xl" />
        <div className="absolute -bottom-10 -right-6 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl" />
      </div>

      <div className="flex flex-col h-[420px] md:h-[520px] rounded-[24px] border border-slate-800/80 bg-gradient-to-b from-slate-950/95 via-slate-950 to-slate-950/98 shadow-[0_22px_80px_rgba(15,23,42,0.95)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden shadow-lg shadow-sky-900/80">
              <div className="absolute inset-0 bg-[conic-gradient(from_210deg,_#38bdf8,_#0ea5e9,_#0f172a,_#38bdf8)] opacity-80" />
              <div className="absolute inset-[6px] rounded-full bg-slate-950/90 border border-slate-600/70" />
              <div className="absolute -left-[6px] top-1/2 h-px w-[140%] bg-slate-300/60" />
              <div className="relative w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)] translate-y-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold tracking-tight text-slate-50">
                protocol<span className="text-sky-400">LM</span> · Live console
              </span>
              <span className="text-[10px] text-slate-400">
                Washtenaw · Wayne · Oakland · Michigan code
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Online
            </span>
          </div>
        </div>

        {/* Chat area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-5 py-4 md:py-5 space-y-3 md:space-y-4 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 custom-scroll"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-slate-500">
              <div className="w-11 h-11 rounded-2xl border border-dashed border-slate-700 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-slate-700 rounded-full border-t-sky-400 animate-spin" />
              </div>
              <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-slate-400">
                Loading operator demo
              </span>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed font-medium shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-sky-500 text-slate-950 rounded-tr-sm shadow-[0_10px_30px_rgba(56,189,248,0.4)]'
                    : 'bg-slate-900/80 text-slate-50 border border-slate-700/80 rounded-tl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-in fade-in zoom-in duration-150">
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-[11px] text-slate-300">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: '240ms' }}
                  />
                </div>
                <span>Cross-checking county code & FDA Food Code…</span>
              </div>
            </div>
          )}
        </div>

        {/* Faux input */}
        <div className="border-t border-slate-800/80 bg-slate-950/95 px-4 md:px-5 py-3.5">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 shadow-inner shadow-black/40">
            <div className="flex-1 text-[13px] text-slate-100 font-medium truncate min-h-[18px] flex items-center">
              {inputValue}
              {isTyping && (
                <span className="ml-1 h-4 w-0.5 bg-sky-400 animate-pulse inline-block" />
              )}
              {!inputValue && !isTyping && (
                <span className="text-slate-500">
                  “Walk me through what happens after a repeat priority violation.”
                </span>
              )}
            </div>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-slate-950 shadow-md shadow-sky-500/40">
              <svg
                className="w-4 h-4 -rotate-90"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.95)] p-7 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full bg-sky-500/20 blur-3xl" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-slate-50 mb-5 tracking-tight">
          {view === 'signup' ? 'Create operator login' : 'Sign in'}
        </h2>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-5 flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-900/70 px-3.5 py-3 text-sm font-medium text-slate-100 hover:border-sky-500/60 hover:bg-slate-900 transition-all disabled:opacity-50"
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
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-950 px-2 text-[11px] text-slate-400">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              placeholder="Work email"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              placeholder="Password (min 6 characters)"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-950 hover:bg-sky-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing…' : view === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
              message.type === 'error'
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 border-t border-slate-800 pt-4 text-center">
          <button
            onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
            className="text-[11px] text-slate-400 hover:text-slate-100"
          >
            {view === 'signup' ? 'Already have access? Sign in' : 'Need access? Create account'}
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
    <div className="min-h-screen w-full bg-[#020617] text-slate-50 flex flex-col relative overflow-x-hidden max-w-[100vw]">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,1),_transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.16] mix-blend-soft-light">
          <div className="w-[160%] h-[160%] -left-[30%] -top-[30%] bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>
      </div>

      {/* NAV (fixed, not affected by demo box) */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 md:px-6 py-3.5 md:py-4">
          <div
            className={`flex items-center gap-2 transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            <div className="h-7 w-7 rounded-xl bg-slate-900 flex items-center justify-center text-[11px] font-bold text-sky-300 border border-slate-700/80">
              pl
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-semibold tracking-tight text-slate-50">
                protocol<span className="text-sky-400">LM</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Built for operators with <span className="text-sky-300">3+ units</span>
              </span>
            </div>
          </div>

          <nav
            className={`flex items-center gap-2 md:gap-4 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            }`}
          >
            <span className="hidden lg:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700/80 bg-slate-900/70 text-[9px] text-slate-300">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Multi-unit ready · Washtenaw · Wayne · Oakland
            </span>
            <button
              onClick={() => router.push('/pricing')}
              className="px-2 py-1.5 hover:text-slate-100 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => openAuth('login')}
              className="px-2 py-1.5 hover:text-slate-100 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="inline-flex items-center rounded-full bg-sky-500 px-3.5 md:px-4 py-1.5 text-[9px] md:text-[10px] text-slate-950 hover:bg-sky-400 transition-colors shadow-md shadow-sky-500/40"
            >
              Get protocolLM
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN HERO */}
      <main className="flex-1 pt-24 md:pt-28 pb-10 md:pb-14">
        <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row gap-10 lg:gap-16 px-4 md:px-6 items-stretch">
          {/* LEFT: story for rich operators */}
          <section
            className={`flex-1 max-w-xl flex flex-col justify-center transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">
              Health inspection prep · Southeast Michigan
            </p>

            <h1 className="text-3xl md:text-4xl lg:text-[40px] font-semibold tracking-tight text-slate-50 leading-tight mb-4">
              Turn county code into a{' '}
              <span className="text-amber-300">playbook for every unit</span>, not a surprise
              for the next inspection.
            </h1>

            <p className="text-sm md:text-base text-slate-300 font-medium leading-relaxed mb-4">
              protocol<span className="text-sky-400 font-semibold">LM</span> trains your managers
              and line staff on{' '}
              <span className="font-semibold text-slate-50">
                Washtenaw, Wayne, and Oakland food rules
              </span>
              —using the same documents your inspectors carry. No more guessing what “Chronic
              Violation” or “Imminent Health Hazard” actually means at a multi-unit scale.
            </p>

            <p className="text-[10px] md:text-[11px] text-slate-400 font-semibold uppercase tracking-[0.3em] mb-6">
              One avoided closure at a busy store pays for protocolLM for years.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-9">
              <button
                onClick={() => openAuth('signup')}
                className="inline-flex items-center rounded-xl bg-sky-500 px-6 md:px-7 py-3 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-950 hover:bg-sky-400 transition-colors shadow-[0_20px_60px_rgba(56,189,248,0.6)]"
              >
                Start 30-day trial
              </button>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700/80" />
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700/80" />
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-sky-500/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-200 font-medium">
                    Designed for franchisees & multi-unit groups.
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Not a general “ask anything” chatbot.
                  </span>
                </div>
              </div>
            </div>

            {/* Operator-flavored stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-3xl md:text-4xl font-semibold text-slate-50">
                  <CountUp end={12} suffix="%" duration={2400} />
                </div>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Revenue drop / unit
                </p>
                <p className="mt-2 text-[12px] text-slate-400 leading-snug">
                  Typical year-one sales hit after a bad grade or publicized closure at a single
                  store.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-3xl md:text-4xl font-semibold text-slate-50">
                  <CountUp end={75} prefix="$" suffix="k" duration={2400} />
                </div>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Avg. incident cost
                </p>
                <p className="mt-2 text-[12px] text-slate-400 leading-snug">
                  Legal, remediation, temp staffing, and lost traffic from one major food safety
                  event.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                <div className="text-3xl md:text-4xl font-semibold text-slate-50">
                  <CountUp end={2.5} suffix="x" decimals={1} duration={2400} />
                </div>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Repeat fine multiplier
                </p>
                <p className="mt-2 text-[12px] text-slate-400 leading-snug">
                  Scrutiny and penalties once the same violation shows up across multiple stores.
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT: demo chat (always on right on desktop) */}
          <aside
            className={`flex-1 w-full flex flex-col justify-center transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0 md:translate-x-0' : 'opacity-0 translate-y-2 md:translate-x-2'
            }`}
          >
            <DemoChatContent />
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Demo built from actual Washtenaw, Oakland, Michigan Modified Food Code, and FDA Food
              Code language.
            </p>
          </aside>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl mt-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-slate-100 transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-slate-100 transition-colors">
              Privacy
            </a>
          </div>
          <div>© 2025 protocolLM · Built in Michigan for multi-unit operators</div>
        </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        body {
          overscroll-behavior-y: none;
          background: #020617;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 999px;
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
