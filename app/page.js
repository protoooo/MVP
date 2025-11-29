'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. CHAT DEMO (The "Terminal") ---
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

  // Sequence tailored to Franchise Risk
  const SEQUENCE = [
    {
      text: "We received a 'Chronic Violation' notice in Washtenaw. Implications?",
      response: "CRITICAL RISK: Per Washtenaw Enforcement Procedure Sec 1.4, a Chronic Violation (3 repeat priority violations in 5 inspections) triggers a mandatory Administrative Conference. Failure to submit a corrective Risk Control Plan will result in license limitation or suspension."
    },
    {
      text: "Can I serve a rare burger to a minor if the parent signs a waiver?",
      response: "VIOLATION. No. Michigan Modified Food Code 3-801.11(C) strictly prohibits undercooked comminuted meat for Highly Susceptible Populations (children). A parental waiver does not supersede state code. Liability remains with the license holder."
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(25) // Fast, mechanical typing
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
            await wait(15) // Fast response
          }
          await wait(3500)
        }
        await wait(1500)
        setMessages((prev) => prev.slice(-4)) 
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    const keywords = ['CRITICAL RISK', 'VIOLATION', 'ACTION REQUIRED']
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-bold text-black border-b border-black">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header - Terminal Style */}
      <div className="h-12 border-b border-black/10 flex items-center px-6 justify-between bg-neutral-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-black rounded-full" />
          <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            SESSION_ID: 4092_WASHTENAW
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold text-neutral-400 uppercase tracking-widest">v1.0.4</span>
      </div>

      {/* Chat Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 custom-scroll"
      >
        {!hasStarted && !isTyping && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
            <div className="w-10 h-10 border border-black/20 flex items-center justify-center">
               <div className="w-1 h-1 bg-black"/>
            </div>
            <p className="text-[10px] font-mono text-black uppercase tracking-widest">System Ready</p>
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
              className={`max-w-[90%] text-[14px] md:text-[15px] font-medium leading-relaxed font-mono ${
                msg.role === 'user'
                  ? 'text-neutral-500 text-right'
                  : 'text-black'
              }`}
            >
              {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-fade-in pl-1">
            <span className="text-[10px] font-mono text-black/40 uppercase tracking-widest">QUERYING_DB...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-6 bg-white border-t border-black/10 shrink-0">
        <div className="w-full flex items-center gap-4">
          <span className="text-neutral-400 text-lg font-mono">{'>'}</span>
          <div className="flex-1 text-lg text-black font-mono min-h-[30px] relative flex items-center overflow-hidden whitespace-nowrap">
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
      <div onClick={onClose} className="absolute inset-0 bg-white/95 backdrop-blur-md animate-in fade-in duration-200" />
      <div className="w-full max-w-[380px] bg-white border-2 border-black shadow-none p-8 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-black hover:text-neutral-500 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-lg font-bold text-black mb-8 font-mono uppercase tracking-widest border-b border-black pb-4">
          {view === 'signup' ? 'New_User' : 'Login'}
        </h2>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-50 border border-black hover:bg-neutral-100 transition-all disabled:opacity-50 mb-6">
          <span className="text-xs font-bold text-black uppercase tracking-widest">Google Access</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/20" /></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-white border border-black focus:ring-1 focus:ring-black outline-none text-black text-sm font-mono placeholder-neutral-400 transition-all" placeholder="EMAIL" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-4 bg-white border border-black focus:ring-1 focus:ring-black outline-none text-black text-sm font-mono placeholder-neutral-400 transition-all" placeholder="PASSWORD" />
          <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-4 text-xs uppercase tracking-widest hover:bg-neutral-800 mt-4 border border-black">
            {loading ? 'PROCESSING...' : 'SUBMIT'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs font-mono text-neutral-500 hover:text-black transition-colors underline decoration-dotted underline-offset-4">
            {view === 'signup' ? 'Access existing account' : 'Request access'}
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
    <div className="min-h-screen w-full bg-white font-sans text-black selection:bg-black selection:text-white flex flex-col relative overflow-hidden max-w-[100vw]">
      
      {/* BACKGROUND (The Blueprint) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
        <div className="absolute inset-0 w-full h-full mix-blend-multiply opacity-[0.12] grayscale contrast-150">
           <Image 
             src="/background.png" 
             alt="Background" 
             fill 
             className="object-cover" 
             priority 
           />
        </div>
        {/* Hard fade to white at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/50 to-white"></div>
        {/* Grid Overlay for Technical Feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* NAVBAR (Minimal & Technical) */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 border-b border-black/5 bg-white/50 backdrop-blur-sm">
        <div className={`w-full max-w-7xl flex justify-between items-center h-16 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="w-4 h-4 bg-black" />
            <span className="text-sm font-bold tracking-tight text-black font-mono uppercase">
              protocol_LM
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-black hover:bg-neutral-800 text-white px-6 py-2.5 text-xs font-bold transition-all uppercase tracking-widest border border-black">
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 pb-12 flex flex-col items-center relative z-10 min-h-screen">
        
        {/* TEXT CENTERED */}
        <div className="w-full max-w-4xl text-center mb-16">
          <h1 className={`text-5xl md:text-8xl font-bold text-black tracking-tighter leading-[0.9] mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            before the inspector arrives.
          </h1>

          <div className={`flex flex-col items-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            <p className="text-[16px] md:text-[18px] text-neutral-600 leading-relaxed max-w-2xl font-medium mb-8">
              Standardize compliance across all units. Instant, cited answers from <strong className="text-black border-b border-black/20">Washtenaw County</strong> regulations, <strong className="text-black border-b border-black/20">Michigan Food Law</strong>, and <strong className="text-black border-b border-black/20">FDA Code</strong>.
            </p>
            
            {/* Mobile CTA */}
            <div className="md:hidden w-full max-w-xs">
              <button onClick={() => openAuth('signup')} className="w-full bg-black hover:bg-neutral-800 text-white py-4 text-xs font-bold uppercase tracking-widest border border-black">
                Start Free Trial
              </button>
            </div>
          </div>
        </div>

        {/* MASSIVE DEMO BOX (The Evidence) */}
        <div className={`w-full max-w-5xl h-[550px] md:h-[650px] bg-white border-2 border-black/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} style={{ transitionDelay: '500ms' }}>
          <DemoChatContent />
        </div>

        {/* DATA SOURCES STRIP (The Authority) */}
        <div className={`mt-16 w-full max-w-4xl border-t border-black/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-neutral-400 text-[10px] font-mono uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '800ms' }}>
          <span>Data Integrity Sources:</span>
          <div className="flex gap-8 items-center">
            <span>FDA Food Code 2022</span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
            <span>Michigan Modified Food Code</span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full"></span>
            <span>Washtenaw County Enforcement</span>
          </div>
        </div>

      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #E5E5E5; }
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
