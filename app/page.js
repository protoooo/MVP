'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. CHAT DEMO (Central Focus) ---
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

  // Washtenaw Specific Sequence
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
      await wait(Math.random() * 35 + 25)
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
          await wait(500)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)
          setIsThinking(true)
          await wait(1500)
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
          await wait(4000)
        }
        await wait(1500)
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
            <span className="font-bold border-b border-black/20 pb-0.5">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Demo Header - Integrated into box */}
      <div className="h-14 border-b border-neutral-100 flex items-center px-6 justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-sans text-[10px] font-bold text-neutral-900 uppercase tracking-[0.2em]">
            protocol_LM
          </span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Chat Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 custom-scroll"
      >
        {!hasStarted && !isTyping && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-20">
            <div className="w-12 h-12 border border-neutral-300 rounded-full flex items-center justify-center">
               <div className="w-1 h-1 bg-black rounded-full"/>
            </div>
            <p className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">System Ready</p>
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
              className={`max-w-[85%] text-[15px] md:text-lg font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'text-neutral-400 text-right'
                  : 'text-black'
              }`}
            >
              {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-fade-in pl-1">
            <span className="text-[10px] font-mono text-neutral-300 uppercase tracking-widest">Processing...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-6 bg-white shrink-0">
        <div className="w-full border-b border-neutral-200 py-3 flex items-center gap-4">
          <span className="text-neutral-300 text-lg font-mono">{'>'}</span>
          <div className="flex-1 text-lg text-neutral-900 font-medium font-mono min-h-[30px] relative flex items-center overflow-hidden whitespace-nowrap">
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
      <div onClick={onClose} className="absolute inset-0 bg-white/95 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="w-full max-w-[380px] bg-white border border-neutral-100 shadow-2xl p-10 rounded-none relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-300 hover:text-black transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-10">
          <h2 className="text-lg font-bold text-black tracking-tight uppercase font-mono">
            {view === 'signup' ? 'Initiate' : 'Access'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-neutral-200 hover:border-black transition-all disabled:opacity-50 mb-6 group">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="text-[#4285F4]"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="text-[#34A853]"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" className="text-[#FBBC05]"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="text-[#EA4335]"/></svg>
          <span className="text-xs font-bold text-neutral-900">Google</span>
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100" /></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-white border-b border-neutral-200 focus:border-black outline-none text-neutral-900 text-sm placeholder-neutral-300 transition-all" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3 bg-white border-b border-neutral-200 focus:border-black outline-none text-neutral-900 text-sm placeholder-neutral-300 transition-all" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-4 text-xs uppercase tracking-widest transition-all hover:bg-neutral-800 disabled:opacity-50 mt-6">
            {loading ? '...' : view === 'signup' ? 'Start' : 'Enter'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs font-medium text-neutral-400 hover:text-black transition-colors">
            {view === 'signup' ? 'Existing user? Login' : 'New? Start here'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- 3. MAIN CONTENT (Headerless / Corner Anchor Style) ---
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
      
      {/* BACKGROUND (Kept as requested) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
        <div className="absolute inset-0 w-full h-full mix-blend-multiply opacity-[0.15] grayscale contrast-125">
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

      {/* CORNER ANCHORS (The "No Navbar" Look) */}
      
      {/* Top Left: Logo */}
      <div className={`fixed top-6 left-6 z-40 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-lg font-bold tracking-tight text-black flex items-center gap-2">
          <div className="w-3 h-3 bg-black"></div>
          protocol<span className="text-neutral-400">LM</span>
        </span>
      </div>

      {/* Top Right: Actions */}
      <div className={`fixed top-6 right-6 z-40 flex items-center gap-6 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest hidden md:block">
          Log in
        </button>
        <button onClick={() => openAuth('signup')} className="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-neutral-800 transition-all">
          Start Free Trial
        </button>
      </div>

      {/* HERO SECTION (Centered & Stacked) */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 pt-32 pb-12 flex flex-col items-center relative z-10 min-h-screen">
        
        {/* TEXT CENTERED */}
        <div className="w-full max-w-3xl text-center mb-12">
          <h1 className={`text-5xl md:text-7xl font-bold text-black tracking-tighter leading-[1.0] mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            before the inspector arrives.
          </h1>

          <p className={`text-[16px] text-neutral-600 leading-relaxed max-w-xl mx-auto mb-2 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Instant answers from <strong>Washtenaw County</strong> regulations, plus <strong>Michigan Modified Food Code, FDA Code 2022, & USDA</strong> guidelines. Stop losing revenue to preventable violations.
          </p>
        </div>

        {/* MASSIVE DEMO BOX (Centered below text) */}
        <div className={`w-full max-w-5xl h-[600px] bg-white border border-neutral-200 shadow-2xl rounded-lg overflow-hidden transition-all duration-[1200ms] ease-out-spring ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '500ms' }}>
          <DemoChatContent />
        </div>

        {/* Mobile-Only Login Link (since top right might be tight) */}
        <div className="md:hidden mt-8 text-center">
           <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-400 hover:text-black uppercase tracking-widest">
             Already have an account? Log in
           </button>
        </div>

      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #E5E5E5; border-radius: 10px; }
        
        .ease-out-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
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
