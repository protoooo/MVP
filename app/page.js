'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- 1. CHAT DEMO (Massive Cinematic Version) ---
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

  // Slower, more deliberate typing sequence
  const SEQUENCE = [
    {
      text: "We received a 'Chronic Violation' notice in Washtenaw. Translate.",
      response: "CRITICAL ACTION: A Chronic Violation (Washtenaw Sec 1.4) means you failed 3 of your last 5 inspections on this priority item. You are now triggered for an Administrative Conference (Sec 6.2). We need to file a Risk Control Plan immediately to avoid license limitation."
    },
    {
      text: 'Manager quit. Do we close the kitchen?',
      response: "NO. Oakland County Code (Art IV, Sec 4.4) grants a 90-day grace period to replace a Certified Manager. I will draft the notification letter to the Health Division now to secure this window."
    },
    {
      text: "Can I serve a rare burger to a kid if the parent signs a waiver?",
      response: 'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits undercooked comminuted meat for Highly Susceptible Populations (children). A waiver does not override this code. Do not serve.'
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(35) // Slightly slower typing for premium feel
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
          await wait(600)
          setMessages((prev) => [...prev, { role: 'user', content: step.text }])
          setInputValue('')
          setIsTyping(false)
          setIsThinking(true)
          await wait(1800) // Longer "Thinking" time adds weight/realism
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
            await wait(30)
          }
          await wait(4000)
        }
        await wait(2000)
        setMessages((prev) => prev.slice(-6))
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    const keywords = ['CRITICAL ACTION', 'VIOLATION', 'IMMINENT HEALTH HAZARD', 'CORE VIOLATION', 'NO']
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-semibold text-black border-b-2 border-black/10 pb-0.5 mr-1">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 border-b border-neutral-100 flex items-center px-8 justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
          <span className="font-mono text-xs text-neutral-400 uppercase tracking-widest">
            Protocol_LM Active
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-300">WASHTENAW / WAYNE / OAKLAND</span>
      </div>

      {/* Chat Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 custom-scroll"
      >
        {!hasStarted && !isTyping && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-20">
            <div className="w-16 h-16 border border-neutral-300 rounded-full flex items-center justify-center">
               <div className="w-1 h-1 bg-black rounded-full"/>
            </div>
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Awaiting Command</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            } animate-fade-in-up`}
          >
            <div
              className={`max-w-[85%] text-lg md:text-xl font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'text-neutral-400 text-right' // User text is grey/subtle
                  : 'text-black' // System text is bold/black
              }`}
            >
              {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-fade-in pl-1">
            <span className="text-xs font-mono text-neutral-400">PROCESSING_REGULATIONS...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-8 bg-white shrink-0">
        <div className="w-full border-b-2 border-neutral-100 py-4 flex items-center gap-4">
          <span className="text-neutral-300 text-lg font-mono">{'>'}</span>
          <div className="flex-1 text-lg md:text-xl text-black font-medium min-h-[30px] relative flex items-center overflow-hidden whitespace-nowrap">
            {inputValue}
            {isTyping && (
              <span className="inline-block w-2.5 h-5 bg-black ml-1 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. AUTH MODAL (Minimalist) ---
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
          setMessage({ type: 'success', text: 'Check email.' })
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
      <div onClick={onClose} className="absolute inset-0 bg-white/95 backdrop-blur-sm animate-in fade-in duration-500" />
      <div className="w-full max-w-[360px] bg-white border border-neutral-100 shadow-2xl p-8 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-300 hover:text-black transition-colors">✕</button>

        <h2 className="text-xl font-bold text-black mb-8 tracking-tight">
          {view === 'signup' ? 'Initialize' : 'Login'}
        </h2>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-4 bg-white border border-neutral-200 hover:border-black transition-all disabled:opacity-50 mb-6">
          <span className="text-sm font-bold text-black">Google</span>
        </button>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-neutral-50 border-b border-neutral-200 focus:border-black outline-none text-black text-sm placeholder-neutral-400 transition-all" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-4 bg-neutral-50 border-b border-neutral-200 focus:border-black outline-none text-black text-sm placeholder-neutral-400 transition-all" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-4 text-xs uppercase tracking-widest transition-all hover:bg-neutral-800 mt-4">
            {loading ? '...' : 'Submit'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-neutral-400 hover:text-black transition-colors">
            {view === 'signup' ? 'Login instead' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- 3. MAIN CONTENT (Radical Simplicity) ---
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
    <div className="min-h-screen w-full bg-white font-sans text-black selection:bg-black selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Navbar: Ultra Minimal */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-between px-6 md:px-12 py-8 bg-white/90 backdrop-blur-sm">
        <div className={`transition-all duration-[1500ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-sm font-bold tracking-tight">protocolLM</span>
        </div>
        
        <div className={`flex items-center gap-8 transition-all duration-[1500ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">Pricing</button>
          <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-widest">Login</button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-12 flex flex-col items-center relative z-10">
        
        {/* Hero Text */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-20">
          <h1 className={`text-5xl md:text-8xl font-semibold tracking-tighter leading-[0.95] mb-8 transition-all duration-[1500ms] ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            Train your team <br />
            <span className="text-neutral-400">before</span> inspection.
          </h1>
          
          <div className={`flex flex-col items-center transition-all duration-[1500ms] delay-300 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <p className="text-lg md:text-xl text-neutral-500 max-w-xl mb-8 leading-relaxed">
              Instant answers from Washtenaw, Wayne, and Oakland County regulations. Stop losing revenue to preventable violations.
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <button onClick={() => openAuth('signup')} className="bg-black hover:bg-neutral-800 text-white px-10 py-4 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-xl">
                Start
              </button>
              <span className="font-mono text-xs text-neutral-400">$199/mo per location</span>
            </div>
          </div>
        </div>

        {/* Massive Demo Box */}
        <div className={`w-full max-w-5xl h-[600px] md:h-[700px] bg-white border border-neutral-200 shadow-2xl rounded-2xl overflow-hidden transition-all duration-[2000ms] delay-500 ease-out ${mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-24'}`}>
          <DemoChatContent />
        </div>

      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 0px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
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
