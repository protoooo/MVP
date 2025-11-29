'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. ISOMETRIC BACKGROUND (The "Tracing" Blueprint) ---
const IsometricBackground = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-20">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="iso-grid" width="60" height="35" patternUnits="userSpaceOnUse">
            <path d="M0 17.5 L30 0 L60 17.5 L30 35 Z" fill="none" stroke="black" strokeWidth="0.5" className="animate-trace-grid" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#iso-grid)" />
      </svg>
      
      {/* Floating Wireframe Cubes */}
      <div className="absolute top-[15%] left-[10%] w-32 h-32 animate-float-slow">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <path d="M50 5 L90 25 V65 L50 85 L10 65 V25 Z" fill="none" stroke="black" strokeWidth="1" className="animate-trace-slow" />
          <path d="M10 25 L50 45 L90 25" fill="none" stroke="black" strokeWidth="1" className="animate-trace-slow" />
          <path d="M50 45 V85" fill="none" stroke="black" strokeWidth="1" className="animate-trace-slow" />
        </svg>
      </div>

      <div className="absolute bottom-[20%] right-[5%] w-48 h-48 animate-float-reverse">
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <path d="M50 0 L100 25 V75 L50 100 L0 75 V25 Z" fill="none" stroke="black" strokeWidth="0.5" className="animate-trace-slower" />
          <path d="M0 25 L50 50 L100 25" fill="none" stroke="black" strokeWidth="0.5" className="animate-trace-slower" />
          <path d="M50 50 V100" fill="none" stroke="black" strokeWidth="0.5" className="animate-trace-slower" />
        </svg>
      </div>
    </div>
  )
}

// --- 2. TRACING BORDER CONTAINER ---
const TracingBorder = ({ children }) => {
  return (
    <div className="relative group p-1">
      {/* Corner Brackets that Trace */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-black animate-trace-corner-tl"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-black animate-trace-corner-tr"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-black animate-trace-corner-bl"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-black animate-trace-corner-br"></div>
      
      {/* Content */}
      <div className="relative bg-white border border-neutral-200 z-10">
        {children}
      </div>
    </div>
  )
}

// --- 3. CHAT DEMO (Geometric & Clean) ---
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
            <span className="font-bold border-b-2 border-black pb-0.5">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="flex flex-col h-[420px] md:h-[560px] w-full bg-white relative z-10 overflow-hidden">
      {/* Header - Geometric */}
      <div className="h-16 border-b border-black/10 flex items-center px-8 justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 border border-black transform rotate-45"></div>
          <span className="font-mono text-xs font-bold text-neutral-900 uppercase tracking-[0.2em]">
            protocol_LM
          </span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
           <span className="text-[10px] font-mono font-medium text-neutral-500 uppercase tracking-widest">Connected</span>
        </div>
      </div>

      {/* Chat Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 custom-scroll bg-[#FAFAFA]"
      >
        {!hasStarted && !isTyping && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
            <div className="w-12 h-12 border border-black transform rotate-45 flex items-center justify-center">
               <div className="w-2 h-2 bg-black transform -rotate-45"/>
            </div>
            <p className="text-[10px] font-mono font-bold text-neutral-500 tracking-widest uppercase">System Ready</p>
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
              className={`max-w-[85%] px-6 py-4 text-[14px] leading-relaxed border ${
                msg.role === 'user'
                  ? 'bg-neutral-50 border-neutral-200 text-neutral-500 text-right'
                  : 'bg-white border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]'
              }`}
            >
              {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-fade-in pl-1">
            <div className="bg-white border border-neutral-200 px-4 py-3 flex items-center shadow-sm">
              <div className="loader"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-6 bg-white border-t border-black/10 shrink-0">
        <div className="w-full bg-neutral-50 border border-neutral-200 px-5 py-4 flex items-center gap-4">
          <span className="text-neutral-300 text-lg font-mono">{'>'}</span>
          <div className="flex-1 text-[15px] text-neutral-900 font-medium font-mono min-h-[24px] relative flex items-center overflow-hidden whitespace-nowrap">
            {inputValue}
            {isTyping && (
              <span className="inline-block w-2 h-5 bg-black ml-1 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 4. AUTH MODAL ---
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
      <div onClick={onClose} className="absolute inset-0 bg-white/95 backdrop-blur-md animate-in fade-in duration-300" />
      
      {/* TRACING BORDER ON MODAL */}
      <div className="relative w-full max-w-[380px]">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black"/>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black"/>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black"/>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black"/>
        
        <div className="bg-white border border-neutral-200 p-10 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="text-center mb-10">
            <h2 className="text-lg font-bold text-black tracking-tight uppercase font-mono">
              {view === 'signup' ? 'Initiate Access' : 'Login'}
            </h2>
          </div>

          <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-neutral-300 hover:bg-neutral-50 transition-all disabled:opacity-50 mb-6 group">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="text-[#4285F4]"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="text-[#34A853]"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" className="text-[#FBBC05]"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="text-[#EA4335]"/></svg>
            <span className="text-xs font-bold text-neutral-700">Continue with Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="px-3 bg-white text-neutral-400">Or</span></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white outline-none text-neutral-900 text-xs font-medium placeholder-neutral-400 transition-all" placeholder="EMAIL ADDRESS" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-black focus:bg-white outline-none text-neutral-900 text-xs font-medium placeholder-neutral-400 transition-all" placeholder="PASSWORD" />
            <button type="submit" disabled={loading} className="w-full bg-black hover:bg-neutral-800 text-white font-bold py-3.5 text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 mt-2">
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
    </div>
  )
}

// --- 5. MAIN CONTENT ---
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
    <div className="min-h-screen w-full bg-white font-sans text-neutral-900 selection:bg-black selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* 1. BACKGROUND (Self-Drawing Isometric) */}
      <IsometricBackground />

      {/* 2. NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-4">
        <div className={`w-full max-w-6xl flex justify-between items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-3 h-3 bg-black transform rotate-45"></div>
            <span className="text-xl font-bold tracking-tight text-black font-mono">
              protocol<span className="text-neutral-400">LM</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest font-mono">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest font-mono">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-black hover:bg-neutral-800 text-white px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-widest shadow-lg active:scale-95 border border-black font-mono">
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* 3. HERO SECTION (Centered) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-10 md:pt-4 pb-0 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10 min-h-screen lg:h-screen lg:max-h-[850px] lg:min-h-[600px]">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left pt-20 lg:pt-0">
          
          {/* Headline */}
          <h1 className={`text-5xl md:text-7xl font-bold text-black tracking-tighter leading-[1.0] mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            before the inspector arrives.
          </h1>

          {/* Subheader */}
          <p className={`text-[15px] text-neutral-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-10 font-medium transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Instant answers from <strong>Washtenaw County</strong> regulations, plus <strong>Michigan Modified Food Code, FDA Code 2022, & USDA</strong> guidelines. Stop losing revenue to preventable violations.
          </p>

          {/* Mobile CTA */}
          <div className={`md:hidden flex justify-center mb-10 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <button onClick={() => openAuth('signup')} className="bg-black text-white px-6 py-3 text-xs font-bold uppercase tracking-widest shadow-lg">
              Start Free Trial
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (Tracing Demo Box) */}
        <div className={`flex-1 w-full max-w-[550px] flex justify-center transition-all duration-1000 ease-out delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <TracingBorder>
            <DemoChatContent />
          </TracingBorder>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #000; }
        
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

        /* --- TRACING ANIMATIONS --- */
        @keyframes trace-grid {
          0% { stroke-dasharray: 100; stroke-dashoffset: 100; opacity: 0; }
          100% { stroke-dasharray: 100; stroke-dashoffset: 0; opacity: 0.2; }
        }
        .animate-trace-grid { animation: trace-grid 2s ease-out forwards; }

        @keyframes trace-slow {
          0% { stroke-dasharray: 200; stroke-dashoffset: 200; opacity: 0; }
          100% { stroke-dasharray: 200; stroke-dashoffset: 0; opacity: 0.15; }
        }
        .animate-trace-slow { animation: trace-slow 4s ease-out forwards; }

        @keyframes trace-slower {
          0% { stroke-dasharray: 300; stroke-dashoffset: 300; opacity: 0; }
          100% { stroke-dasharray: 300; stroke-dashoffset: 0; opacity: 0.15; }
        }
        .animate-trace-slower { animation: trace-slower 6s ease-out forwards; }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }

        @keyframes float-reverse {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(20px); }
        }
        .animate-float-reverse { animation: float-reverse 10s ease-in-out infinite; }

        /* CORNER TRACING */
        @keyframes trace-corner {
          0% { width: 0; height: 0; opacity: 0; }
          100% { width: 32px; height: 32px; opacity: 1; }
        }
        .animate-trace-corner-tl { animation: trace-corner 1s ease-out forwards; }
        .animate-trace-corner-tr { animation: trace-corner 1s ease-out 0.2s forwards; opacity: 0; }
        .animate-trace-corner-bl { animation: trace-corner 1s ease-out 0.4s forwards; opacity: 0; }
        .animate-trace-corner-br { animation: trace-corner 1s ease-out 0.6s forwards; opacity: 0; }
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
