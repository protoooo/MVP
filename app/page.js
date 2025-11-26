'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- CHAT DEMO BOX (ISOMETRIC + HIGHLIGHTING) ---
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

  // 7 Hyper-Local Scenarios (With Keywords for Highlighting)
  const SEQUENCE = [
    {
      text: "We received a notice for a 'Chronic Violation' in Washtenaw County. What does that mean?",
      response: "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan."
    },
    {
      text: "Our certified manager quit yesterday. Do we have to close the kitchen?",
      response: "NO. 'Oakland County Sanitary Code Article IV, Sec 4.4' allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Health Division immediately to avoid penalties."
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response: "VIOLATION: Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission."
    },
    {
      text: "The floor drain is backing up in the dish room. Can we just mop it and keep serving?",
      response: "IMMINENT HEALTH HAZARD: Washtenaw Enforcement Procedure Sec 5.0 defines sewage backup as grounds for Immediate Closure. You must cease operations until the backup is fixed and the area sanitized."
    },
    {
      text: "Inspector cited us for 'Wet Nesting' pans. Is that actually a priority violation?",
      response: "CORE VIOLATION: Stacking wet pans prevents air drying (FDA Code 4-901.11). While usually a Core item, repeated failure to correct it can lead to Priority Foundation citations for unsanitary equipment storage."
    },
    {
      text: "We want to start vacuum packing our steaks. Do we need a special permit?",
      response: "YES. Reduced Oxygen Packaging (ROP) requires a HACCP Plan and often a Variance under Michigan Modified Food Code 3-502.11. You must submit this plan to the regulatory authority for approval BEFORE starting."
    },
    {
      text: "What is the exact cooling requirement for the chili we made this morning?",
      response: "TWO-STAGE COOLING: FDA Code 3-501.14. 1) Cool from 135°F to 70°F within 2 hours. 2) Cool from 70°F to 41°F within the next 4 hours (Total 6 hours). If you miss the first 2-hour window, you must reheat to 165°F and restart."
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    const typeChar = async (char) => {
      setInputValue(prev => prev + char)
      await wait(Math.random() * 30 + 20)
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
          await wait(500) 
          setInputValue('')
          setIsTyping(false)
          setMessages(prev => [...prev, { role: 'user', content: step.text }])
          setIsThinking(true)
          await wait(1500)
          setIsThinking(false)
          
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
            await wait(20)
          }
          await wait(4000)
        }
        await wait(1000)
        setMessages([])
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  // LOGIC: Highlight "VIOLATION", "CRITICAL", "IMMINENT" in Eggplant Color
  const formatContent = (text) => {
    const keywords = ["CRITICAL ACTION", "VIOLATION", "IMMINENT HEALTH HAZARD", "CORE VIOLATION", "ACTION REQUIRED"]
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

// --- MAIN CONTENT (NEW COLORS + NO SCROLL + COMPACT DATA) ---
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
          
          {/* COMPACT DATA FLOW - STATIC & CLEAN (Royal Blue Accents) */}
          <div className="mt-10 pt-8 border-t border-slate-200/60">
             <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                {['Washtenaw', 'Wayne', 'Oakland', 'Michigan', 'Federal'].map((src, i) => (
                  <div key={i} className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[#4A8BDF] rounded-full"></div>
                    {src}
                  </div>
                ))}
             </div>
          </div>

        </div>
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <DemoChatContent />
        </div>
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
