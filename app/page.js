'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Fixed Dimensions) ---
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
            <span className="font-bold text-[#023E8A]">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="flex flex-col h-[500px] w-full max-w-[600px] bg-white/80 backdrop-blur-xl font-sans border border-[#0077B6]/30 rounded-2xl shadow-2xl shadow-[#0077B6]/20 overflow-hidden relative z-0 transform-gpu shrink-0 hover:shadow-[#0077B6]/30 transition-all duration-500 hover:scale-[1.02]">
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#0077B6] via-[#023E8A] to-[#0077B6] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
      
      <div className="h-14 bg-white/90 backdrop-blur-sm border-b border-slate-100 flex items-center px-6 justify-between shrink-0 relative z-20">
        <span className="font-bold text-[#023E8A] text-sm tracking-tighter">protocol<span className="text-[#0077B6]">LM</span></span>
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] px-3 py-1 rounded-full border border-[#90E0EF] shadow-inner">
          <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-pulse shadow-lg shadow-[#0077B6]/50"></div>
          <span className="text-[9px] font-bold text-[#0077B6] uppercase tracking-wide">Active</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-[#F0F9FF] to-[#E0F2FE] min-h-0 relative z-10">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
             <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <div className="w-6 h-6 border-2 border-slate-100 rounded-full"></div>
             </div>
             <span className="text-xs font-bold uppercase tracking-widest text-[#0077B6]/40">System Ready</span>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed font-medium shadow-lg relative z-20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-[#0077B6] to-[#023E8A] text-white rounded-tr-sm' 
                : 'bg-white/90 backdrop-blur-sm text-slate-700 rounded-tl-sm border border-[#90E0EF]'
            }`}>
               <div className="whitespace-pre-wrap font-sans text-xs relative z-30">
                 {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
               </div>
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-200 relative z-20">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-3 rounded-xl rounded-tl-sm border border-[#90E0EF] flex gap-1.5 items-center shadow-lg">
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
              </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-slate-100 shrink-0 relative z-20">
        <div className="w-full bg-gradient-to-r from-[#F0F9FF] to-[#E0F2FE] border border-[#90E0EF] rounded-xl px-4 py-3 flex items-center gap-3 min-h-[52px] shadow-inner">
           <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center">
              {inputValue}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-[#0077B6] ml-1 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-400">Ask a question...</span>}
           </div>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${inputValue ? 'bg-gradient-to-br from-[#0077B6] to-[#023E8A] shadow-lg shadow-[#0077B6]/30' : 'bg-slate-200'}`}>
              <svg className="w-4 h-4 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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

  return <span>{count.toFixed(decimals)}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#023E8A]/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl p-8 rounded-3xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-[#023E8A] transition-colors">✕</button>
        <h2 className="text-xl font-bold text-[#023E8A] mb-6 tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-[#F0F9FF] border border-[#90E0EF] focus:bg-white focus:border-[#0077B6] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg transition-all" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3.5 bg-[#F0F9FF] border border-[#90E0EF] focus:bg-white focus:border-[#0077B6] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg transition-all" placeholder="Password" />
          <button onClick={handleAuth} disabled={loading} className="w-full bg-gradient-to-r from-[#0077B6] to-[#023E8A] hover:from-[#023E8A] hover:to-[#01497C] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all font-mono shadow-lg shadow-[#0077B6]/30 active:scale-95">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </div>
        {message && <div className={`mt-4 p-3 text-xs font-sans border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#0077B6] font-sans transition-colors">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
      </div>
    </div>
  )
}

// --- MAIN CONTENT ---
function MainContent() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const [scrollY, setScrollY] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
   
  useEffect(() => {
    setMounted(true)
    const authParam = searchParams.get('auth')
    if (authParam) { setAuthView(authParam); setShowAuth(true); window.history.replaceState({}, '', '/') }
    
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [searchParams])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#F0F9FF] font-sans text-slate-900 selection:bg-[#0077B6] selection:text-white flex flex-col relative overflow-hidden">
      
      {/* ENHANCED BACKGROUND with Grid Pattern & Animated Blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         {/* Animated Background Image with Parallax */}
         <div 
           className="relative w-full h-full animate-drift" 
           style={{ transform: `translateY(${scrollY * 0.3}px)` }}
         >
           <Image 
             src="/background.png" 
             alt="Background" 
             fill 
             className="object-cover opacity-[0.34]" 
             priority
           />
         </div>
         
         {/* Grid Pattern Overlay */}
         <div className="absolute inset-0 opacity-[0.03]" style={{
           backgroundImage: `linear-gradient(#023E8A 1px, transparent 1px), linear-gradient(90deg, #023E8A 1px, transparent 1px)`,
           backgroundSize: '50px 50px'
         }}></div>
         
         {/* Animated Gradient Blobs */}
         <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0077B6] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
         <div className="absolute top-1/3 -right-1/4 w-96 h-96 bg-[#023E8A] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-1/4 left-1/3 w-96 h-96 bg-[#90E0EF] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
         
         {/* Gradient Overlay */}
         <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF]/95 via-[#F0F9FF]/40 to-[#F0F9FF]/95"></div>
      </div>

      {/* FLOATING PARTICLES */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#0077B6] rounded-full opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${10 + Math.random() * 20}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      <nav className={`w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center fixed top-0 left-0 right-0 z-30 transition-all duration-500 ${scrollY > 50 ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-[#0077B6]/5' : 'bg-[#F0F9FF]/80 backdrop-blur-md'}`}>
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-[#023E8A]">protocol<span style={{ color: '#0077B6' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-sm font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#0077B6] border border-[#0077B6]/30 bg-white rounded-lg hover:bg-[#0077B6] hover:text-white transition-all active:scale-95 shadow-sm hover:shadow-lg hover:shadow-[#0077B6]/20">
             <span className="hidden md:inline">Create Account</span>
             <span className="md:hidden">Join</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-32 pb-20 gap-20 relative z-10">
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* EYEBROW TEXT */}
          <div className="mb-6 inline-block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#0077B6] bg-[#0077B6]/10 px-4 py-2 rounded-full border border-[#0077B6]/20 shadow-inner">
              Michigan's Premier Food Safety AI
            </span>
          </div>
          
          {/* ENHANCED HEADER with Better Spacing */}
          <h2 className="text-5xl md:text-6xl font-bold text-[#023E8A] tracking-tight leading-[1.1] mb-10" style={{ letterSpacing: '-0.02em' }}>
            Train Your Team Before<br className="hidden md:block"/>
            The Health Department Does.
          </h2>
          
          <p className="text-xl text-slate-600 font-semibold leading-relaxed max-w-xl mx-auto md:mx-0 mb-12">
            Avoid violations and prepare for health inspections with intelligence trained on <strong className="text-[#023E8A]">Washtenaw, Wayne, and Oakland County</strong> enforcement data.
          </p>
          
          <button onClick={() => openAuth('signup')} className="group relative overflow-hidden bg-gradient-to-r from-[#0077B6] to-[#023E8A] text-white px-10 py-5 rounded-xl font-bold uppercase tracking-widest hover:from-[#023E8A] hover:to-[#01497C] transition-all shadow-xl shadow-[#0077B6]/30 hover:shadow-2xl hover:shadow-[#0077B6]/40 hover:-translate-y-1 active:scale-95">
            <span className="relative z-10 text-sm">Start 30-Day Free Trial</span>
            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]"></div>
          </button>
          
          {/* TRUST BADGE */}
          <div className="mt-8 flex items-center justify-center md:justify-start gap-3 text-sm text-slate-500">
            <svg className="w-5 h-5 text-[#0077B6]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Trusted by 500+ Michigan restaurants</span>
          </div>
          
          {/* ENHANCED STATS CARDS with More Visual Polish */}
          <div className="mt-16 grid grid-cols-3 gap-5">
             <div className="group bg-white/70 backdrop-blur-xl border border-white/80 p-6 rounded-2xl shadow-lg hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-default relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-[#0077B6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <div className="relative z-10">
                 <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#023E8A] to-[#0077B6] tracking-tighter group-hover:scale-110 transition-transform duration-500">
                   <CountUp end={12} duration={2500} /><span className="text-4xl">%</span>
                 </div>
                 <div className="text-xs font-bold text-slate-700 uppercase tracking-[0.15em] mt-3 mb-2">Revenue Drop</div>
                 <p className="text-xs text-slate-600 font-semibold leading-tight">Immediate loss in annual sales after one bad grade.</p>
               </div>
             </div>
             
             <div className="group bg-white/70 backdrop-blur-xl border border-white/80 p-6 rounded-2xl shadow-lg hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-default relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-[#0077B6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <div className="relative z-10">
                 <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#023E8A] to-[#0077B6] tracking-tighter group-hover:scale-110 transition-transform duration-500">
                   <span className="text-4xl">$</span><CountUp end={75} duration={2500} /><span className="text-4xl">k</span>
                 </div>
                 <div className="text-xs font-bold text-slate-700 uppercase tracking-[0.15em] mt-3 mb-2">Avg. Incident</div>
                 <p className="text-xs text-slate-600 font-semibold leading-tight">Legal fees, fines, and lost business revenue.</p>
               </div>
             </div>
             
             <div className="group bg-white/70 backdrop-blur-xl border border-white/80 p-6 rounded-2xl shadow-lg hover:bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-default relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-[#0077B6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <div className="relative z-10">
                 <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#023E8A] to-[#0077B6] tracking-tighter group-hover:scale-110 transition-transform duration-500">
                   <CountUp end={2.5} decimals={1} duration={2500} /><span className="text-4xl">x</span>
                 </div>
                 <div className="text-xs font-bold text-slate-700 uppercase tracking-[0.15em] mt-3 mb-2">Fine Hike</div>
                 <p className="text-xs text-slate-600 font-semibold leading-tight">Fines often double or triple for repeat violations.</p>
               </div>
             </div>
          </div>

        </div>
        
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <DemoChatContent />
        </div>
      </div>

      <div className="w-full py-10 text-center border-t border-[#90E0EF]/30 relative z-10 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <a href="/terms" className="hover:text-[#0077B6] transition-colors">Terms</a>
