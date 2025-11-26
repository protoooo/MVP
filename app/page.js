'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- CHAT DEMO BOX ---
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

  // UPDATED: Hyper-Local Scenarios (Washtenaw, Oakland, Wayne Specific)
  const SEQUENCE = [
    {
      text: "We got cited for the same 'Cold Holding' violation twice. The inspector mentioned an 'Administrative Conference'. What is that?",
      response: "MANDATORY ACTION: According to Washtenaw Enforcement Procedure Sec 6.2, an Administrative Conference is required when a 'chronic violation' exists (cited on 3 of last 5 inspections). You must present a risk control plan to the Health Officer or face license limitation."
    },
    {
      text: "My head chef quit. Do I have to close if no one else is a Certified Food Manager?",
      response: "NO, BUT TIME IS LIMITED. Oakland County Sanitary Code Article IV, Section 4.4 allows a grace period of 3 months to replace a Certified Food Service Manager. You must notify the Health Division immediately to avoid penalties."
    },
    {
      text: "Can I put a consumer advisory on the menu for 'Rare' burgers for the kids' menu to be safe?",
      response: "VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of any consumer advisory or parental permission."
    },
    {
      text: "The floor drain in the prep area is backing up water when we run the dishwasher. Can we keep serving if we mop it up?",
      response: "IMMINENT HEALTH HAZARD. Washtenaw County Enforcement Procedure Sec 5.0 defines sewage backup as grounds for Immediate Closure without a hearing. You must cease operations until the backup is fixed and sanitized to prevent summary suspension."
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

  return (
    <div className="flex flex-col h-[500px] w-full max-w-[600px] bg-white font-sans border border-slate-200 rounded-2xl shadow-2xl overflow-hidden relative z-0 transform-gpu">
      <div className="h-14 bg-white border-b border-slate-100 flex items-center px-6 justify-between shrink-0 relative z-20">
        <span className="font-bold text-slate-900 text-sm tracking-tight">protocol<span className="text-[#6b85a3]">LM</span></span>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">Active</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc] min-h-0 relative z-10">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
             <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <div className="w-6 h-6 border-2 border-slate-100 rounded-full"></div>
             </div>
             <span className="text-xs font-bold uppercase tracking-widest">Ready</span>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed font-medium shadow-sm relative z-20 ${
              msg.role === 'user' 
                ? 'bg-[#6b85a3] text-white rounded-tr-sm' 
                : 'bg-white text-slate-700 rounded-tl-sm border border-slate-100'
            }`}>
               <div className="whitespace-pre-wrap font-sans text-xs relative z-30">{msg.content}</div>
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-200 relative z-20">
              <div className="bg-white px-4 py-3 rounded-xl rounded-tl-sm border border-slate-100 flex gap-1.5 items-center shadow-sm">
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
              </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative z-20">
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 min-h-[52px]">
           <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center">
              {inputValue}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-[#6b85a3] ml-1 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-400">Ask a question...</span>}
           </div>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${inputValue ? 'bg-[#6b85a3]' : 'bg-slate-200'}`}>
              <svg className="w-4 h-4 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                 <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
           </div>
        </div>
      </div>
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
  const router = useRouter()

  useEffect(() => { setView(defaultView); setMessage(null) }, [isOpen, defaultView])

  const handleAuth = (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    if (view === 'signup') {
      supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, 
          data: { county: 'washtenaw' } 
        } 
      }).then(({ data, error }) => {
        if (error) throw error
        if (data.session) {
          window.location.href = '/pricing'
        } else {
          setMessage({ type: 'success', text: 'Verification link sent.' })
        }
      }).catch(error => {
        setMessage({ type: 'error', text: error.message })
      }).finally(() => {
        setLoading(false)
      })
    } else {
      supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
        if (error) throw error
        return supabase.from('user_profiles').select('is_subscribed').eq('id', data.session.user.id).single()
      }).then(({ data: profile }) => {
        if (profile?.is_subscribed) {
          window.location.href = '/documents'
        } else {
          window.location.href = '/pricing'
        }
      }).catch(error => {
        setMessage({ type: 'error', text: error.message })
      }).finally(() => {
        setLoading(false)
      })
    }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8fafc]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">✕</button>
        <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg" placeholder="Password" />
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#6b85a3] hover:bg-[#5a728a] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </div>
        {message && <div className={`mt-4 p-3 text-xs font-sans border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#6b85a3] font-sans">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
      </div>
    </div>
  )
}

// --- DATA INGESTION BEAM ANIMATION (3 SOURCES) ---
const DataIngestionSection = () => {
  return (
    <div className="w-full max-w-5xl mx-auto pt-32 pb-32 text-center">
      <div className="mb-16">
        <h3 className="text-3xl font-bold text-slate-900 tracking-tighter mb-4">Localized Regulatory Intelligence</h3>
        <p className="text-slate-600 font-medium max-w-2xl mx-auto">We don't just guess. We inject official county enforcement data and the full FDA Code directly into the model.</p>
      </div>
      
      <div className="relative h-[350px] flex flex-col items-center justify-between px-4">
        {/* TOP SOURCES (3 Items) */}
        <div className="grid grid-cols-3 gap-8 w-full max-w-3xl z-10">
          {['Washtenaw County', 'Wayne County', 'Oakland County'].map((src, i) => (
            <div key={i} className="flex justify-center">
              <div className="bg-white border border-slate-200 px-5 py-2.5 rounded-lg shadow-sm text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 whitespace-nowrap">
                <div className="w-2 h-2 bg-[#6b85a3] rounded-full animate-pulse"></div>
                {src}
              </div>
            </div>
          ))}
        </div>

        {/* SVG BEAMS (3 Paths) */}
        <div className="absolute inset-0 z-0 overflow-visible pointer-events-none flex justify-center">
           <div className="w-full max-w-3xl h-full relative">
             <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 350">
               <defs>
                 <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.4" />
                   <stop offset="100%" stopColor="#6b85a3" stopOpacity="0.8" />
                 </linearGradient>
               </defs>
               
               {/* Left Path */}
               <path d="M130 60 C 130 200, 400 180, 400 280" stroke="url(#beamGradient)" strokeWidth="1.5" fill="none" />
               {/* Center Path */}
               <path d="M400 60 L 400 280" stroke="url(#beamGradient)" strokeWidth="1.5" fill="none" />
               {/* Right Path */}
               <path d="M670 60 C 670 200, 400 180, 400 280" stroke="url(#beamGradient)" strokeWidth="1.5" fill="none" />
               
               {/* Animated Particles */}
               <circle r="3" fill="#6b85a3">
                 <animateMotion dur="3s" repeatCount="indefinite" path="M130 60 C 130 200, 400 180, 400 280" />
               </circle>
               <circle r="3" fill="#6b85a3">
                 <animateMotion dur="3s" begin="0.5s" repeatCount="indefinite" path="M400 60 L 400 280" />
               </circle>
               <circle r="3" fill="#6b85a3">
                 <animateMotion dur="3s" begin="1s" repeatCount="indefinite" path="M670 60 C 670 200, 400 180, 400 280" />
               </circle>
             </svg>
           </div>
        </div>

        {/* CENTRAL BRAIN */}
        <div className="z-10 mt-auto transform translate-y-4">
          <div className="bg-[#6b85a3] text-white px-12 py-6 rounded-2xl shadow-2xl shadow-[#6b85a3]/20 flex items-center justify-center">
            <span className="font-bold text-xl tracking-tight">protocol<span className="text-white/80">LM</span></span>
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
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center fixed top-0 left-0 right-0 z-30 bg-[#f8fafc]/95 backdrop-blur-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900">protocol<span style={{ color: '#6b85a3' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-sm font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#6b85a3] border border-[#6b85a3] rounded-lg hover:bg-[#6b85a3] hover:text-white transition-all active:scale-95">
             <span className="hidden md:inline">Create Account</span>
             <span className="md:hidden">Join</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-40 pb-32 gap-16">
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-8">
            Train Your Team Before the Health Department Does.
          </h2>
          <p className="text-base text-slate-600 font-medium leading-relaxed max-w-xl mx-auto md:mx-0 mb-10">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
          <button onClick={() => openAuth('signup')} className="bg-[#6b85a3] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#5a728a] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95">
            Start 30-Day Free Trial
          </button>
          <div className="mt-8 flex items-center justify-center md:justify-start gap-3 text-slate-400">
            <span className="text-xs uppercase tracking-widest font-bold">Works on any device</span>
            <div className="flex gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H7V4h10v16z"/></svg>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16H3V4h18m0-2H3c-1.11 0-2 .89-2 2v12a2 2 0 0 2 2h7l-2 3v1h8v-1l-2-3h7a2 2 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>
            </div>
          </div>
        </div>
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <DemoChatContent />
        </div>
      </div>

      {/* NEW DATA INGESTION SECTION */}
      <div className={`transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <DataIngestionSection />
      </div>
      
      <div className="w-full py-8 text-center bg-white border-t border-slate-200">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
           <a href="/terms" className="hover:text-[#6b85a3]">Terms</a>
           <span>© 2025 protocolLM</span>
           <a href="/privacy" className="hover:text-[#6b85a3]">Privacy</a>
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
