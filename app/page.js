'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Refined UI) ---
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

  // --- LOGIC UNTOUCHED ---
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
      response: "VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission."
    },
    {
      text: "The floor drain is backing up in the dish room. Can we just mop it and keep serving?",
      response: "IMMINENT HEALTH HAZARD. Washtenaw Enforcement Procedure Sec 5.0 defines sewage backup as grounds for Immediate Closure. You must cease operations until the backup is fixed and the area sanitized."
    },
    {
      text: "Inspector cited us for 'Wet Nesting' pans. Is that actually a priority violation?",
      response: "CORE VIOLATION. Stacking wet pans prevents air drying (FDA Code 4-901.11). While usually a Core item, repeated failure to correct it can lead to Priority Foundation citations for unsanitary equipment storage."
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

  const formatContent = (text) => {
    const keywords = ["CRITICAL ACTION", "VIOLATION", "IMMINENT HEALTH HAZARD", "CORE VIOLATION", "ACTION REQUIRED"]
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return (
          <span>
            <span className="font-bold text-[#023E8A] drop-shadow-sm">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  // --- REFINED CHAT UI ---
  return (
    <div className="flex flex-col h-[520px] w-full max-w-[650px] font-sans rounded-3xl overflow-hidden relative z-0 transform-gpu shrink-0 backdrop-blur-xl bg-white/70 border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,119,182,0.25)] ring-1 ring-white/50">
      
      {/* Header - Glass Effect */}
      <div className="h-16 border-b border-[#0077B6]/10 flex items-center px-6 justify-between shrink-0 relative z-20 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
          </div>
          <div className="h-6 w-px bg-slate-300/50 mx-2"></div>
          <span className="font-bold text-[#023E8A] text-sm tracking-tight">protocol<span className="text-[#0077B6]">LM</span> <span className="text-slate-400 font-medium text-xs ml-1">/ assistant</span></span>
        </div>
        
        <div className="flex items-center gap-2 bg-[#0077B6]/5 px-3 py-1.5 rounded-full border border-[#0077B6]/10 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0077B6]"></span>
          </span>
          <span className="text-[10px] font-bold text-[#023E8A] uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 relative z-10 scroll-smooth">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
             <div className="w-16 h-16 rounded-2xl bg-white/50 border border-white flex items-center justify-center shadow-lg shadow-blue-900/5 backdrop-blur-sm">
                <svg className="w-8 h-8 text-[#0077B6]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <div className="text-center">
                <p className="text-sm font-bold text-[#023E8A] tracking-wide">SYSTEM READY</p>
                <p className="text-xs text-slate-500 mt-1">Awaiting health code inquiry...</p>
             </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-[13px] md:text-sm leading-relaxed font-medium shadow-sm relative z-20 backdrop-blur-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-[#0077B6] to-[#023E8A] text-white rounded-tr-sm shadow-blue-900/20' 
                : 'bg-white/80 text-slate-700 rounded-tl-sm border border-white/60 shadow-slate-200/50'
            }`}>
               <div className="whitespace-pre-wrap font-sans relative z-30">
                 {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
               </div>
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-300 relative z-20">
             <div className="bg-white/80 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/60 flex gap-1.5 items-center shadow-sm backdrop-blur-sm">
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
             </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/40 border-t border-white/50 shrink-0 relative z-20 backdrop-blur-md">
        <div className="w-full bg-white/60 border border-white/80 shadow-inner rounded-xl px-5 py-4 flex items-center gap-4 min-h-[60px] ring-1 ring-[#0077B6]/5 focus-within:ring-[#0077B6]/20 transition-all">
           <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center">
             {inputValue}
             {isTyping && <span className="inline-block w-0.5 h-5 bg-[#0077B6] ml-1 animate-pulse rounded-full"></span>}
             {!inputValue && !isTyping && <span className="text-slate-400 font-normal">Ask a compliance question...</span>}
           </div>
           <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md ${inputValue ? 'bg-gradient-to-tr from-[#023E8A] to-[#0077B6] scale-100 opacity-100' : 'bg-slate-200 scale-90 opacity-50'}`}>
              <svg className="w-4 h-4 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                 <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- COUNT UP ANIMATION ---
const CountUp = ({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(progress * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return <span>{prefix}{count.toFixed(decimals)}{suffix}</span>
}

// --- AUTH MODAL (Refined UI) ---
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#023E8A]/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] p-8 rounded-3xl relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-300 hover:text-[#023E8A] transition-colors bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
        <h2 className="text-2xl font-bold text-[#023E8A] mb-2 tracking-tight">{view === 'signup' ? 'Get Started' : 'Welcome Back'}</h2>
        <p className="text-slate-500 text-sm mb-6">Enter your details to access the platform.</p>
        
        <div className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="name@company.com" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="••••••••" />
          </div>
          
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 active:translate-y-0 mt-2">
            {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </div>
        
        {message && <div className={`mt-4 p-3 text-xs font-sans border rounded-xl flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
            <span className={`w-2 h-2 rounded-full ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></span>
            {message.text}
        </div>}
        
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-[#0077B6] font-medium transition-colors">
                {view === 'signup' ? 'Already have an account? Sign In' : 'New to protocolLM? Create Account'}
            </button>
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
    <div className="min-h-screen w-full bg-[#F0F9FF] font-sans text-slate-900 selection:bg-[#0077B6] selection:text-white flex flex-col relative overflow-hidden">
      
      {/* BACKGROUND - UNCHANGED (Opacity 34%) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="relative w-full h-full animate-drift">
           <Image 
             src="/background.png" 
             alt="Background" 
             fill 
             className="object-cover opacity-[0.34]" 
             priority
           />
         </div>
         {/* Refined gradient overlay for better text contrast while keeping background visible */}
         <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF]/95 via-[#F0F9FF]/20 to-[#F0F9FF]/95 mix-blend-overlay"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-[#F0F9FF] via-transparent to-transparent"></div>
      </div>

      {/* NAVBAR - Frosted Glass */}
      <nav className="w-full fixed top-0 left-0 right-0 z-40 transition-all border-b border-white/40 bg-white/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="text-2xl font-black tracking-tighter text-[#023E8A] flex items-center gap-1">
                <div className="w-8 h-8 bg-gradient-to-tr from-[#023E8A] to-[#0077B6] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                    <span className="text-lg">P</span>
                </div>
                protocol<span className="text-[#0077B6]">LM</span>
            </h1>
            </div>
            <div className={`flex items-center gap-2 md:gap-6 text-xs font-bold uppercase tracking-widest transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={() => router.push('/pricing')} className="hidden md:block px-4 py-2 text-slate-500 hover:text-[#0077B6] transition-colors">Pricing</button>
            <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] transition-colors">Sign In</button>
            <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-white bg-[#0077B6] rounded-full hover:bg-[#023E8A] transition-all active:scale-95 shadow-lg shadow-[#0077B6]/30 hover:shadow-xl hover:shadow-[#0077B6]/40 border border-white/20">
                <span className="hidden md:inline">Start Free Trial</span>
                <span className="md:hidden">Join</span>
            </button>
            </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center pt-32 pb-16 gap-12 lg:gap-20 relative z-10">
        
        {/* Left Column: Copy */}
        <div className={`flex-1 text-center lg:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0077B6]/10 border border-[#0077B6]/20 text-[#0077B6] font-bold text-[10px] uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <span className="w-2 h-2 rounded-full bg-[#0077B6]"></span>
             Now Available for Michigan
          </div>

          <h2 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-[#023E8A] tracking-tighter leading-[1.1] mb-8">
            Train Your Team<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0077B6] to-[#48CAE4]">Before The Health</span><br/>
            Department Does.
          </h2>
          
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10">
            Avoid violations and prepare for health inspections with AI intelligence trained directly on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={() => openAuth('signup')} className="group relative overflow-hidden bg-[#023E8A] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#0077B6] transition-all shadow-[0_20px_40px_-15px_rgba(2,62,138,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(2,62,138,0.5)] hover:-translate-y-1 active:scale-95 border border-white/10">
                <span className="relative z-10">Start 30-Day Free Trial</span>
                <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]"></div>
              </button>
              <button className="px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[#023E8A] bg-white border border-slate-200 hover:bg-slate-50 hover:border-[#0077B6]/30 transition-all shadow-sm hover:shadow-md">
                 View Demo
              </button>
          </div>
          
          {/* STATS CARDS - Refined Glass Look */}
          <div className="mt-16 grid grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-white/60 border border-white p-5 rounded-2xl backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 cursor-default group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#023E8A] to-[#0077B6] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#023E8A] to-[#0077B6] tracking-tighter group-hover:scale-105 transition-transform duration-500">
                  <CountUp end={12} suffix="%" duration={2500} />
                </div>
                <div className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Revenue Drop</div>
                <p className="text-[10px] lg:text-xs text-slate-600 mt-1 font-medium leading-tight">Annual sales loss after one bad grade.</p>
              </div>
              
              <div className="bg-white/60 border border-white p-5 rounded-2xl backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 cursor-default group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#023E8A] to-[#0077B6] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#023E8A] to-[#0077B6] tracking-tighter group-hover:scale-105 transition-transform duration-500">
                  <CountUp end={75} prefix="$" suffix="k" duration={2500} />
                </div>
                <div className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Avg. Incident</div>
                <p className="text-[10px] lg:text-xs text-slate-600 mt-1 font-medium leading-tight">Legal fees, fines, and lost revenue.</p>
              </div>
              
              <div className="bg-white/60 border border-white p-5 rounded-2xl backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 hover:-translate-y-1 transition-all duration-300 cursor-default group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#023E8A] to-[#0077B6] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#023E8A] to-[#0077B6] tracking-tighter group-hover:scale-105 transition-transform duration-500">
                  <CountUp end={2.5} suffix="x" decimals={1} duration={2500} />
                </div>
                <div className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Fine Hike</div>
                <p className="text-[10px] lg:text-xs text-slate-600 mt-1 font-medium leading-tight">Multiplier for repeat violations.</p>
              </div>
          </div>

        </div>
        
        {/* Right Column: Chat Demo with Glow Effect */}
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 relative ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
          {/* Glow Behind Chat */}
          <div className="absolute inset-0 bg-[#48CAE4] opacity-20 blur-[100px] rounded-full pointer-events-none transform translate-y-10"></div>
          <DemoChatContent />
        </div>
      </div>

      <div className="w-full py-8 text-center border-t border-white/50 bg-white/30 backdrop-blur-sm relative z-10 mt-auto">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <a href="/terms" className="hover:text-[#0077B6] transition-colors">Terms</a>
           <span>© 2025 protocolLM</span>
           <a href="/privacy" className="hover:text-[#0077B6] transition-colors">Privacy</a>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
      
      <style jsx global>{`
        @keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }
        @keyframes drift { 0% { transform: scale(1); } 100% { transform: scale(1.05); } }
        .animate-drift { animation: drift 20s ease-in-out infinite alternate; }
      `}</style>
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
