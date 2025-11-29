'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. CHAT DEMO (The "System Log" Style) ---
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
      text: "Notice received: 'Chronic Violation' in Washtenaw. Define implications.",
      response: "CRITICAL ACTION: Per Washtenaw Enforcement Procedure Sec 1.4, a Chronic Violation (3 repeat priority violations in 5 inspections) automatically triggers an Administrative Conference (Sec 6.2). You must submit a Risk Control Plan immediately to prevent license limitation."
    },
    {
      text: 'Manager quit. Do we close kitchen?',
      response: "NO. Michigan Food Law (Sec 289.2129) provides a statutory 3-month grace period to replace a Certified Food Service Manager. Notification to Washtenaw County Health Department is required to secure this window."
    },
    {
      text: "Can I serve rare burger to a minor with parental waiver?",
      response: 'VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits undercooked comminuted meat for Highly Susceptible Populations. Parental waivers do not supersede state code liability.'
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    
    const typeChar = async (char) => {
      setInputValue((prev) => prev + char)
      await wait(20) // Fast, mechanical typing
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
            await wait(15) // Faster response, computer-like
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
            <span className="font-bold text-black border-b border-black">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="relative w-full max-w-[600px] group mx-auto">
      {/* Container: Sharp, bordered, technical */}
      <div className="flex flex-col h-[450px] md:h-[580px] w-full bg-white border border-black rounded-sm relative z-10 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Header: Technical Status Bar */}
        <div className="h-10 border-b border-black flex items-center px-4 justify-between bg-neutral-50 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] font-bold text-black uppercase tracking-widest">
              PROTOCOL_LM // TERMINAL
            </span>
            <div className="h-3 w-[1px] bg-black/20"></div>
            <span className="font-mono text-[10px] text-neutral-500">WASHTENAW_DB: CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Chat Feed: The "Log" View */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll bg-white font-mono"
        >
          {!hasStarted && !isTyping && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-40">
              <p className="text-[10px] font-bold text-black tracking-widest uppercase">Awaiting Query</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                {msg.role === 'user' ? 'USER_INPUT' : 'SYSTEM_RESPONSE'}
              </span>
              <div
                className={`max-w-[95%] text-[13px] leading-relaxed p-3 border ${
                  msg.role === 'user'
                    ? 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    : 'bg-white border-black text-black'
                }`}
              >
                {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex flex-col gap-1 items-start">
               <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">SYSTEM_PROCESSING</span>
               <div className="p-3 border border-dashed border-neutral-300 w-full max-w-[100px] flex items-center justify-center bg-neutral-50">
                  <div className="loader"></div>
               </div>
            </div>
          )}
        </div>

        {/* Input Field: Command Line Style */}
        <div className="p-0 border-t border-black shrink-0">
          <div className="w-full bg-white px-4 py-4 flex items-center gap-3">
            <span className="text-black text-sm font-mono font-bold">{'>'}</span>
            <div className="flex-1 text-sm text-black font-mono relative flex items-center overflow-hidden whitespace-nowrap">
              {inputValue}
              {isTyping && (
                <span className="inline-block w-2 h-4 bg-black ml-1 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. CAPABILITY MODULES (Technical Specs) ---
const CapabilityCard = ({ label, title, code, description }) => {
  return (
    <div className="group bg-white border border-neutral-300 p-5 rounded-sm flex flex-col justify-between min-h-[140px] hover:border-black transition-colors duration-200 cursor-default">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest">{label}</span>
          <span className="text-[9px] font-mono text-neutral-300 uppercase">{code}</span>
        </div>
        <div className="text-xl font-bold text-black tracking-tight mb-2 font-mono">
          {title}
        </div>
      </div>
      <div className="text-[11px] font-medium text-neutral-600 border-t border-neutral-100 pt-3 leading-relaxed">
        {description}
      </div>
    </div>
  )
}

// --- 3. AUTH MODAL ---
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
      <div onClick={onClose} className="absolute inset-0 bg-white/95 backdrop-blur-md animate-in fade-in duration-200" />
      <div className="w-full max-w-[380px] bg-white border-2 border-black p-8 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <button onClick={onClose} className="absolute top-4 right-4 text-black hover:text-neutral-500 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-sm font-bold text-black tracking-widest uppercase font-mono border-b-2 border-black pb-2 inline-block">
            {view === 'signup' ? 'Access_Request' : 'System_Login'}
          </h2>
        </div>

        <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 p-3.5 bg-white border border-black hover:bg-neutral-50 transition-all disabled:opacity-50 mb-6">
          <span className="text-xs font-bold text-black uppercase tracking-widest font-mono">Google Auth</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200" /></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest font-mono"><span className="px-3 bg-white text-neutral-400">OR</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-white border border-black focus:ring-1 focus:ring-black outline-none text-black text-sm font-mono placeholder-neutral-400 transition-all" placeholder="EMAIL" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-3.5 bg-white border border-black focus:ring-1 focus:ring-black outline-none text-black text-sm font-mono placeholder-neutral-400 transition-all" placeholder="PASSWORD" />
          <button type="submit" disabled={loading} className="w-full bg-black hover:bg-neutral-800 text-white font-bold py-4 text-xs uppercase tracking-widest font-mono transition-all disabled:opacity-50 mt-2">
            {loading ? 'PROCESSING...' : view === 'signup' ? 'INITIALIZE' : 'ENTER'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors font-mono uppercase">
            {view === 'signup' ? '[ Login Existing ]' : '[ Create Account ]'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- 4. MAIN CONTENT ---
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
      
      {/* BACKGROUND (Technical Grid) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-white">
        <div className="absolute inset-0 w-full h-full mix-blend-multiply opacity-[0.15] grayscale contrast-[1.2]">
           <Image 
             src="/background.png" 
             alt="Background" 
             fill 
             className="object-cover" 
             priority 
           />
        </div>
        <div className="absolute inset-0 bg-white/90"></div>
        {/* The Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center px-6 pt-0 bg-white/80 backdrop-blur-sm border-b border-black/5">
        <div className={`w-full max-w-6xl flex justify-between items-center h-16 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-lg font-bold tracking-tight text-black font-mono uppercase">
              protocol_LM
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => router.push('/pricing')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest font-mono">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-xs font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-widest font-mono">Log in</button>
            <button onClick={() => openAuth('signup')} className="bg-black hover:bg-neutral-800 text-white px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-widest font-mono border border-black hover:shadow-lg">
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 pt-24 md:pt-20 pb-0 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 relative z-10 min-h-screen lg:h-screen lg:max-h-[850px] lg:min-h-[600px]">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 w-full lg:max-w-lg text-center lg:text-left pt-8 lg:pt-0">
          
          {/* Headline */}
          <h1 className={`text-4xl md:text-6xl font-bold text-black tracking-tighter leading-[1.05] mb-5 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
            Train your team <br />
            before the inspector arrives.
          </h1>

          {/* Subheader */}
          <p className={`text-sm md:text-base text-neutral-600 leading-relaxed max-w-md mx-auto lg:mx-0 mb-10 font-medium transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
            Instant answers from <strong>Washtenaw County</strong> regulations, plus <strong>Michigan Modified Food Code, FDA Code 2022, & USDA</strong> guidelines. Stop losing revenue to preventable violations.
          </p>

          {/* CAPABILITY MODULES (Technical) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 lg:mb-0 transition-all duration-1000 delay-500 ease-out">
            <CapabilityCard 
              label="JURISDICTION"
              code="MI_WASH"
              title="Local"
              description="Washtenaw enforcement procedures & ordinances."
            />
            <CapabilityCard 
              label="INTELLIGENCE"
              code="FDA_2022"
              title="State"
              description="Full Michigan Modified Food Code & USDA guidelines."
            />
            <CapabilityCard 
              label="UTILITY"
              code="SYS_24/7"
              title="24/7"
              description="Instant, cited answers for staff on any shift."
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Demo) */}
        <div className={`flex-1 w-full max-w-[600px] flex justify-center transition-all duration-1000 ease-out delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #000; border-radius: 0px; }
        
        /* THE LOADER CSS (Integrated) */
        .loader {
          height: 14px;
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
