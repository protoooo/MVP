'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. CHAT DEMO (Modern & Centered) ---
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
          await wait(1800) // Thinking time
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
            <span className="font-semibold text-black">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full h-full group mx-auto">
      {/* Container: Soft modern borders */}
      <div className="flex flex-col h-full w-full bg-white border border-neutral-200 rounded-2xl relative z-10 overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)]">
        
        {/* Header */}
        <div className="h-16 border-b border-neutral-100 flex items-center px-8 justify-between bg-white/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-sans text-sm font-bold text-neutral-900 tracking-wide">
              protocol_LM
            </span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Live Database</span>
          </div>
        </div>

        {/* Chat Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 custom-scroll bg-[#FAFAFA]"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
              <div className="w-14 h-14 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center shadow-sm">
                 <div className="w-6 h-6 border-2 border-neutral-200 border-t-black rounded-full animate-spin"/>
              </div>
              <p className="text-sm font-semibold text-neutral-400 tracking-wide">Initializing Database</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-4 duration-500`}
            >
              <div
                className={`max-w-[85%] px-6 py-4 text-[15px] leading-relaxed rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-neutral-900 text-white rounded-tr-sm'
                    : 'bg-white text-neutral-800 border border-neutral-100 shadow-sm rounded-tl-sm'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start animate-fade-in pl-1">
              <div className="bg-white px-5 py-3 rounded-full border border-neutral-100 shadow-sm flex items-center">
                <div className="loader"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="p-6 bg-white border-t border-neutral-100 shrink-0">
          <div className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-4 transition-all focus-within:ring-2 focus-within:ring-neutral-100 focus-within:bg-white focus-within:border-neutral-300">
            <div className="flex-1 text-[15px] text-neutral-900 font-medium min-h-[24px] relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-0.5 h-5 bg-black ml-0.5 animate-pulse" />
              )}
              {!inputValue && !isTyping && <span className="text-neutral-400 text-sm">Ask protocol_LM...</span>}
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-black' : 'bg-neutral-200'}`}>
               <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
               </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. AUTH MODAL ---
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
          setMessage({ type: 'success', text: 'Confirmation email sent.' })
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
      <div onClick={onClose} className="absolute inset-0 bg-neutral-900/10 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="w-full max-w-[380px] bg-white border border-white/50 shadow-2xl p-8 rounded-2xl relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ring-1 ring-neutral-900/5">
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-black transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            {view === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm rounded-xl transition-all disabled:opacity-50 mb-6 group">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          <span className="text-sm font-semibold text-neutral-600 group-hover:text-neutral-900">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100" /></div>
          <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-neutral-400 font-medium">Or</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 outline-none text-neutral-900 text-sm font-medium placeholder-neutral-400 rounded-xl transition-all" placeholder="Email address" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5 outline-none text-neutral-900 text-sm font-medium placeholder-neutral-400 rounded-xl transition-all" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-neutral-900 hover:bg-black text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-neutral-900/20 active:scale-[0.98] disabled:opacity-50 mt-2">
            {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs font-medium text-neutral-500 hover:text-black transition-colors">
            {view === 'signup' ? 'Already have an account? Sign in' : 'New to protocolLM? Create account'}
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
    <div className="min-h-screen w-full bg-white font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND (Subtle Modern Texture) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
        <div className="absolute inset-0 w-full h-full mix-blend-multiply opacity-[0.15] grayscale contrast-[1.1]">
           <Image 
             src="/background.png" 
             alt="Background" 
             fill 
             className="object-cover" 
             priority 
           />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-transparent to-white/95"></div>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-6">
        <div className={`w-full max-w-6xl flex justify-between items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              protocol<span className="text-neutral-400">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-wide">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-wide">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all uppercase tracking-wide shadow-lg hover:shadow-xl active:scale-95">
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Centered Single Column) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-8 flex flex-col items-center relative z-10 min-h-screen">
        
        {/* CENTERED TEXT */}
        <div className="w-full max-w-4xl text-center mb-10">
          <h1 className={`text-5xl md:text-6xl font-bold text-neutral-900 tracking-tighter leading-[1.0] mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Employee errors are costing you money.
          </h1>

          <p className={`text-[15px] md:text-[16px] text-neutral-600 leading-relaxed max-w-2xl mx-auto font-medium transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Instant answers from <strong>Washtenaw County</strong> regulations, plus <strong>Michigan Modified Food Code, FDA Code 2022, & USDA</strong> guidelines. Stop losing revenue to preventable violations.
          </p>

          {/* MOBILE CTA */}
          <div className={`md:hidden flex justify-center mt-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="bg-neutral-900 hover:bg-black text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg">
              Start Free Trial
            </button>
          </div>
        </div>

        {/* MASSIVE DEMO BOX (Centered & Wide) */}
        <div className={`w-full max-w-4xl h-[500px] md:h-[650px] transition-all duration-1000 ease-out delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <DemoChatContent />
        </div>

      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        
        .loader {
          height: 15px;
          aspect-ratio: 2.5;
          --_g: no-repeat radial-gradient(farthest-side,#000 90%,#0000);
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
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MainContent />
    </Suspense>
  )
}
