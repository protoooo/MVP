'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. CHAT DEMO (Blue Tech Theme) ---
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
      response: "NO. Michigan Food Law (Sec 289.2129) allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Washtenaw County Health Department immediately to avoid penalties."
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response: 'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.'
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
          await wait(800)
          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }
          await wait(400)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)
          setIsThinking(true)
          await wait(1800)
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
        setMessages((prev) => prev.slice(-4))
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
            <span className="text-[#3B82F6] font-semibold">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-5xl group mx-auto">
      {/* FIXED HEIGHT: Supabase Console Container */}
      <div className="flex flex-col h-[500px] md:h-[650px] w-full bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg relative z-10 overflow-hidden shadow-2xl">
        
        {/* Header: Technical Console */}
        <div className="h-10 border-b border-[#2C2C2C] flex items-center px-4 justify-between bg-[#232323] shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-[#3C3C3C]"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-[#3C3C3C]"></div>
            </div>
            <span className="font-sans text-[11px] font-medium text-[#EDEDED] tracking-wide opacity-80">
              protocol_LM / query_console
            </span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
             <span className="text-[10px] font-medium text-[#3B82F6] uppercase tracking-wide">Connected</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll bg-[#1C1C1C]"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
              <div className="w-12 h-12 border border-[#3C3C3C] rounded-md flex items-center justify-center border-dashed">
                 <div className="w-4 h-4 bg-[#3C3C3C] rounded-sm animate-pulse"/>
              </div>
              <p className="text-[11px] font-medium text-[#888888] tracking-widest uppercase">Washtenaw DB Initialized</p>
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
                className={`max-w-[85%] px-4 py-3 text-[13px] leading-relaxed rounded-md border ${
                  msg.role === 'user'
                    ? 'bg-[#2C2C2C] text-[#EDEDED] border-[#3C3C3C]' 
                    : 'bg-[#1C1C1C] text-[#C2C2C2] border-transparent pl-0' 
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in pl-0">
              <div className="px-0 py-2 flex items-center">
                <div className="loader"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-4 bg-[#232323] border-t border-[#2C2C2C] shrink-0">
          <div className="w-full bg-[#161616] border border-[#333333] rounded-md px-3 py-2.5 flex items-center gap-3 transition-all focus-within:border-[#3B82F6] focus-within:ring-1 focus-within:ring-[#3B82F6]/20">
            <span className="text-[#3B82F6] text-xs font-mono">{'>'}</span>
            <div className="flex-1 text-[13px] text-[#EDEDED] font-mono min-h-[20px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-1.5 h-4 bg-[#3B82F6] ml-0.5 animate-pulse" />
              )}
              {!inputValue && !isTyping && <span className="text-[#555] text-xs">Run compliance query...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. AUTH MODAL (Tech Blue) ---
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
          setMessage({ type: 'success', text: 'Check your email.' })
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
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
      <div className="w-full max-w-[380px] bg-[#1C1C1C] border border-[#2C2C2C] shadow-2xl p-8 rounded-md relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-lg font-medium text-[#EDEDED] tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Sign In'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-2.5 bg-[#232323] text-[#EDEDED] border border-[#333333] hover:bg-[#2C2C2C] hover:border-[#444] transition-all disabled:opacity-50 mb-6 rounded-md">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-sm font-medium">Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2C2C2C]" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-2 bg-[#1C1C1C] text-[#666]">Or</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2.5 bg-[#161616] border border-[#333333] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20 outline-none text-[#EDEDED] text-sm rounded-md transition-all placeholder-[#555]" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-2.5 bg-[#161616] border border-[#333333] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/20 outline-none text-[#EDEDED] text-sm rounded-md transition-all placeholder-[#555]" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#3B82F6] hover:bg-[#2563eb] text-white font-semibold py-2.5 rounded-md text-sm transition-all disabled:opacity-50 mt-2 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#2C2C2C] text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-[#888] hover:text-[#3B82F6] transition-colors">
            {view === 'signup' ? 'Have an account? Sign in' : 'No account? Sign up'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- 3. MAIN CONTENT ---
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
    <div className="min-h-screen w-full bg-[#121212] font-sans text-[#EDEDED] selection:bg-[#3B82F6] selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND: DOT GRID */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#121212]">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-[#121212]/80"></div>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 border-b border-[#2C2C2C] bg-[#121212]/80 backdrop-blur-md">
        <div className={`w-full max-w-6xl flex justify-between items-center h-16 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-6 h-6 bg-[#3B82F6] rounded-md flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.4)]">
               <div className="w-3 h-3 bg-[#121212] rounded-sm opacity-50"></div>
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#EDEDED]">
              protocol<span className="text-[#3B82F6]">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/pricing')} className="text-xs font-medium text-[#888] hover:text-white transition-colors">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-medium text-[#888] hover:text-white transition-colors">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)]">
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - ALIGNED & TIGHTER */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 md:pt-4 pb-24 flex flex-col items-center relative z-10 min-h-screen">
        
        {/* HEADER TEXT */}
        <div className="w-full max-w-4xl text-center mb-8 mt-16 md:mt-24">
          {/* 
             Aligned to fit exactly over the Demo Box Width.
             Reduced Size: 5xl Desktop / 4xl Mobile
          */}
          <h1 className={`text-4xl md:text-5xl font-medium text-[#EDEDED] tracking-tight leading-tight mb-4 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team before the inspector arrives.
          </h1>

          <div className={`flex flex-col items-center gap-3 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            <p className="text-[14px] md:text-[15px] text-[#888] leading-relaxed max-w-2xl mx-auto font-normal">
              Instant answers from <strong className="text-white">Washtenaw County</strong> regulations, <strong className="text-white">Michigan Food Law</strong>, and <strong className="text-white">FDA Code</strong>.
            </p>
            
            <div className="flex items-center gap-2 bg-[#232323] border border-[#333] rounded-full px-3 py-1">
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
               <span className="text-[10px] text-[#666] font-mono uppercase tracking-wide">Wayne & Oakland Support: Coming Q1</span>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className={`md:hidden flex justify-center mt-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="bg-[#3B82F6] hover:bg-[#2563eb] text-white px-6 py-2.5 rounded-md text-sm font-semibold shadow-lg">
              Start Free Trial
            </button>
          </div>
        </div>

        {/* DEMO BOX */}
        <div className={`w-full flex justify-center transition-all duration-1000 ease-out delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <DemoChatContent />
        </div>

      </div>

      {/* FOOTER */}
      <footer className="w-full py-8 border-t border-[#2C2C2C] bg-[#121212] relative z-10 mt-auto">
         <div className="flex justify-center items-center gap-8 text-xs text-[#666]">
             <a href="/terms" className="hover:text-[#EDEDED] transition-colors">Terms</a>
             <a href="/privacy" className="hover:text-[#EDEDED] transition-colors">Privacy</a>
             <span className="text-[#444]">© 2025 protocolLM</span>
         </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        
        .loader {
          height: 15px;
          aspect-ratio: 2.5;
          --_g: no-repeat radial-gradient(farthest-side,#3B82F6 90%,#0000);
          background:var(--_g), var(--_g), var(--_g), var(--_g);
          background-size: 20% 50%;
          animation: l43 1s infinite linear; 
        }
        @keyframes l43 {
          0%     {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
          16.67% {background-position: calc(0*100%/3) 0   ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
          33.33% {background-position: calc(0*100%/3) 100%,calc(1*100%/3) 0   ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
          50%    {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 100%,calc(2*100%/3) 0   ,calc(3*100%/3) 50% }
          66.67% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 100%,calc(3*100%/3) 0   }
          83.33% {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 100%}
          100%   {background-position: calc(0*100%/3) 50% ,calc(1*100%/3) 50% ,calc(2*100%/3) 50% ,calc(3*100%/3) 50% }
        }
      `}</style>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#121212]" />}>
      <MainContent />
    </Suspense>
  )
}
