'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// --- CHAT DEMO BOX (ISOMETRIC VERSION) ---
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) 
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, isThinking])

  const SEQUENCE = [
    {
      text: "Walk-in cooler is reading 45°F. Repair tech can't come until tomorrow. Do I have to throw away $800 of inventory?",
      response: "CRITICAL ACTION: FDA Code 3-501.16 requires TCS foods be ≤41°F. If food has been >41°F for more than 4 hours, it MUST be discarded to prevent liability."
    },
    {
      text: "Head cook showed up vomiting but says he can work the grill. We are fully booked tonight.",
      response: "VIOLATION: FDA Code 2-201.12 mandates IMMEDIATE EXCLUSION for vomiting/diarrhea. Allowing him to work risks a Norovirus outbreak and permanent closure."
    },
    {
      text: "Found mouse droppings in dry storage this morning. Do we have to self-close?",
      response: "IMMINENT HEALTH HAZARD: FDA Code 8-404.11. If active pests are found, you must cease operations immediately until the area is verified pest-free."
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    const typeChar = async (char) => {
      setInputValue(prev => prev + char)
      await wait(Math.random() * 20 + 10)
    }

    const runSimulation = async () => {
      while (isMounted) {
        for (const step of SEQUENCE) {
          setIsTyping(true)
          await wait(500)
          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }
          await wait(300) 
          setInputValue('')
          setIsTyping(false)
          setMessages(prev => [...prev, { role: 'user', content: step.text }])
          setIsThinking(true)
          await wait(1200)
          setIsThinking(false)
          
          // Special rendering for "Typewriter" effect on response
          let currentResponse = ""
          const words = step.response.split(' ')
          setMessages(prev => [...prev, { role: 'assistant', content: '' }])
          
          for (let i = 0; i < words.length; i++) {
            currentResponse += (i === 0 ? '' : ' ') + words[i]
            setMessages(prev => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content = currentResponse
              return newMsgs
            })
            await wait(15)
          }
          await wait(3500)
        }
        await wait(1000)
        setMessages([])
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  // Helper to highlight "VIOLATION" keywords in Eggplant Color
  const formatContent = (text) => {
    const keywords = ["CRITICAL ACTION:", "VIOLATION:", "IMMINENT HEALTH HAZARD:"]
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-bold text-[#A0006D]">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    // ISOMETRIC CONTAINER
    <div className="group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:transform-none"
         style={{ transform: 'perspective(2000px) rotateY(-12deg) rotateX(5deg) scale(0.95)' }}>
      
      <div className="flex flex-col h-[500px] w-full max-w-[600px] bg-white font-sans border border-[#4A8BDF]/20 rounded-3xl shadow-2xl shadow-[#4A8BDF]/20 overflow-hidden relative z-0">
        
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-100 flex items-center px-6 justify-between shrink-0 relative z-20">
          <span className="font-bold text-slate-900 text-sm tracking-tighter">protocol<span className="text-[#4A8BDF]">LM</span></span>
          <div className="flex items-center gap-2 bg-[#EFFAFD] px-3 py-1 rounded-full border border-[#4A8BDF]/20">
            <div className="w-1.5 h-1.5 bg-[#4A8BDF] rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-[#4A8BDF] uppercase tracking-wide">Active</span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#EFFAFD] min-h-0 relative z-10">
          {messages.length === 0 && !isTyping && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
               <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <div className="w-6 h-6 border-2 border-slate-100 rounded-full"></div>
               </div>
               <span className="text-xs font-bold uppercase tracking-widest text-[#4A8BDF]/40">System Ready</span>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm leading-relaxed font-medium shadow-sm relative z-20 ${
                msg.role === 'user' 
                  ? 'bg-[#4A8BDF] text-white rounded-tr-sm' 
                  : 'bg-white text-slate-700 rounded-tl-sm border border-[#4A8BDF]/10'
              }`}>
                 <div className="whitespace-pre-wrap font-sans text-xs relative z-30">
                   {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                 </div>
              </div>
            </div>
          ))}

          {isThinking && (
             <div className="flex justify-start animate-in fade-in zoom-in duration-200 relative z-20">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-[#4A8BDF]/10 flex gap-1.5 items-center shadow-sm">
                   <div className="w-1.5 h-1.5 bg-[#4A8BDF] rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-[#4A8BDF] rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                   <div className="w-1.5 h-1.5 bg-[#4A8BDF] rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                </div>
             </div>
          )}
        </div>

        {/* Input */}
        <div className="p-5 bg-white border-t border-slate-100 shrink-0 relative z-20">
          <div className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 min-h-[56px]">
             <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center">
                {inputValue}
                {isTyping && <span className="inline-block w-0.5 h-4 bg-[#4A8BDF] ml-1 animate-pulse"></span>}
                {!inputValue && !isTyping && <span className="text-slate-400">Ask a question...</span>}
             </div>
             <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${inputValue ? 'bg-[#4A8BDF]' : 'bg-slate-200'}`}>
                <svg className="w-4 h-4 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
             </div>
          </div>
        </div>
      </div>
      
      {/* Isometric Shadow (Fake Floor) */}
      <div className="absolute -bottom-8 left-8 right-8 h-8 bg-black/5 blur-xl rounded-[100%] transform rotateX(60deg) z-[-1] transition-all duration-700 group-hover:bg-black/10 group-hover:blur-2xl group-hover:scale-110"></div>
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

  useEffect(() => { setView(defaultView); setMessage(null) }, [isOpen, defaultView])

  const handleAuth = (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    if (view === 'signup') {
      supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, data: { county: 'washtenaw' } } })
        .then(({ data, error }) => {
          if (error) throw error
          if (data.session) window.location.href = '/pricing'
          else setMessage({ type: 'success', text: 'Verification link sent.' })
        }).catch(error => setMessage({ type: 'error', text: error.message })).finally(() => setLoading(false))
    } else {
      supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
        if (error) throw error
        return supabase.from('user_profiles').select('is_subscribed').eq('id', data.session.user.id).single()
      }).then(({ data: profile }) => {
        window.location.href = profile?.is_subscribed ? '/documents' : '/pricing'
      }).catch(error => setMessage({ type: 'error', text: error.message })).finally(() => setLoading(false))
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A8BDF]/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-white/50 shadow-2xl p-8 rounded-3xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900">✕</button>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-[#EFFAFD] border border-transparent focus:bg-white focus:border-[#4A8BDF] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-[#EFFAFD] border border-transparent focus:bg-white focus:border-[#4A8BDF] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Password" />
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#4A8BDF] hover:bg-[#3b82f6] text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#4A8BDF]/30 active:scale-95">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </div>
        {message && <div className={`mt-4 p-3 text-xs font-sans border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#4A8BDF] font-sans font-medium">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
      </div>
    </div>
  )
}

// --- DATA INGESTION BEAM (UPDATED COLORS) ---
const DataIngestionSection = () => {
  return (
    <div className="w-full max-w-5xl mx-auto pt-20 pb-32 text-center">
      <div className="mb-16">
        <h3 className="text-3xl font-bold text-slate-900 tracking-tighter mb-4">Localized Regulatory Intelligence</h3>
        <p className="text-slate-600 font-medium max-w-2xl mx-auto">We don't just guess. We inject official county enforcement data and the full FDA Code directly into the model.</p>
      </div>
      
      <div className="relative h-[350px] flex flex-col items-center justify-between px-4">
        <div className="grid grid-cols-3 gap-8 w-full max-w-3xl z-10">
          {['Washtenaw County', 'Wayne County', 'Oakland County'].map((src, i) => (
            <div key={i} className="flex justify-center">
              <div className="bg-white border border-[#4A8BDF]/20 px-5 py-3 rounded-xl shadow-sm text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                <div className="w-2 h-2 bg-[#4A8BDF] rounded-full animate-pulse"></div>
                {src}
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 z-0 overflow-visible pointer-events-none flex justify-center">
           <div className="w-full max-w-3xl h-full relative">
             <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 350">
               <defs>
                 <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.2" />
                   <stop offset="100%" stopColor="#4A8BDF" stopOpacity="0.6" />
                 </linearGradient>
               </defs>
               <path d="M130 60 C 130 200, 400 180, 400 280" stroke="url(#beamGradient)" strokeWidth="2" fill="none" />
               <path d="M400 60 L 400 280" stroke="url(#beamGradient)" strokeWidth="2" fill="none" />
               <path d="M670 60 C 670 200, 400 180, 400 280" stroke="url(#beamGradient)" strokeWidth="2" fill="none" />
               <circle r="4" fill="#4A8BDF"><animateMotion dur="3s" repeatCount="indefinite" path="M130 60 C 130 200, 400 180, 400 280" /></circle>
               <circle r="4" fill="#4A8BDF"><animateMotion dur="3s" begin="0.5s" repeatCount="indefinite" path="M400 60 L 400 280" /></circle>
               <circle r="4" fill="#4A8BDF"><animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M670 60 C 670 200, 400 180, 400 280" /></circle>
             </svg>
           </div>
        </div>

        <div className="z-10 mt-auto transform translate-y-4">
          <div className="bg-[#4A8BDF] text-white px-12 py-6 rounded-2xl shadow-2xl shadow-[#4A8BDF]/30 flex items-center justify-center">
            <span className="font-bold text-xl tracking-tighter">protocol<span className="text-white/90">LM</span></span>
          </div>
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
    if (authParam) { setAuthView(authParam); setShowAuth(true); window.history.replaceState({}, '', '/') }
  }, [searchParams])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#EFFAFD] font-sans text-slate-900 selection:bg-[#4A8BDF] selection:text-white flex flex-col">
      
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center fixed top-0 left-0 right-0 z-30 bg-[#EFFAFD]/90 backdrop-blur-md transition-all">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900">protocol<span style={{ color: '#4A8BDF' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-sm font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#4A8BDF] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#4A8BDF] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-6 py-2.5 text-[#4A8BDF] border border-[#4A8BDF]/30 bg-white rounded-xl hover:bg-[#4A8BDF] hover:text-white transition-all active:scale-95 shadow-sm">
             <span className="hidden md:inline">Create Account</span>
             <span className="md:hidden">Join</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-44 pb-32 gap-16">
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-8">
            Train Your Team Before the Health Department Does.
          </h2>
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-xl mx-auto md:mx-0 mb-10">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data.
          </p>
          <button onClick={() => openAuth('signup')} className="bg-[#4A8BDF] text-white px-10 py-5 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#3b82f6] transition-all shadow-xl shadow-[#4A8BDF]/20 hover:shadow-2xl hover:-translate-y-1 active:scale-95">
            Start 30-Day Free Trial
          </button>
          <div className="mt-10 flex items-center justify-center md:justify-start gap-3 text-slate-400">
            <span className="text-xs uppercase tracking-widest font-bold text-[#4A8BDF]/60">Works on any device</span>
          </div>
        </div>
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <DemoChatContent />
        </div>
      </div>

      <div className={`transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <DataIngestionSection />
      </div>
      
      <div className="w-full py-8 text-center border-t border-slate-200/60">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <a href="/terms" className="hover:text-[#4A8BDF]">Terms</a>
           <span>© 2025 protocolLM</span>
           <a href="/privacy" className="hover:text-[#4A8BDF]">Privacy</a>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
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
