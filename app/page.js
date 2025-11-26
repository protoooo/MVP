'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Fixed Dimensions, Enterprise Look) ---
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
    // Updated container to look like an iPad Pro / High-end Dashboard
    <div className="flex flex-col h-[600px] w-full max-w-[550px] bg-white font-sans rounded-[32px] shadow-[0_30px_60px_-12px_rgba(2,62,138,0.15)] overflow-hidden relative z-0 transform-gpu shrink-0 border-[6px] border-slate-50 ring-1 ring-black/5">
      
      {/* Header - Looks like native OS */}
      <div className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-6 justify-between shrink-0 relative z-20">
        <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-sm tracking-tight">protocol<span className="text-[#0077B6]">LM</span></span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Enterprise Instance</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Live</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 min-h-0 relative z-10 scroll-smooth">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
             <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <div className="w-8 h-8 border-4 border-slate-100 rounded-full"></div>
             </div>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Awaiting Input</span>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out`}>
            <div className={`max-w-[85%] px-6 py-4 rounded-2xl text-[13px] leading-6 font-medium shadow-sm relative z-20 ${
              msg.role === 'user' 
                ? 'bg-[#023E8A] text-white rounded-br-sm shadow-md shadow-blue-900/10' 
                : 'bg-white text-slate-600 rounded-bl-sm border border-slate-100 shadow-sm'
            }`}>
               <div className="whitespace-pre-wrap font-sans relative z-30">
                 {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
               </div>
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-300 relative z-20">
              <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-sm border border-slate-100 flex gap-2 items-center shadow-sm">
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
              </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative z-20">
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 min-h-[60px] transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-[#0077B6]">
           <div className="flex-1 text-sm text-slate-800 font-medium min-h-[20px] relative flex items-center">
              {inputValue}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-[#023E8A] ml-1 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-400 font-medium">Ask protocolLM...</span>}
           </div>
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-[#023E8A] text-white shadow-lg shadow-blue-900/20' : 'bg-slate-200 text-slate-400'}`}>
              <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
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
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      setCount(ease * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return <span>{prefix}{count.toFixed(decimals)}{suffix}</span>
}

// --- AUTH MODAL (Polished) ---
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-3xl relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
        <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <div className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0077B6] focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm font-medium placeholder-slate-400 rounded-xl transition-all" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0077B6] focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm font-medium placeholder-slate-400 rounded-xl transition-all" placeholder="Password" />
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#023E8A] hover:bg-[#0077B6] text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98]">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </div>
        {message && <div className={`mt-4 p-3 text-xs font-medium border rounded-xl ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-50 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-[#023E8A] font-medium transition-colors">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
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
    <div className="min-h-screen w-full bg-white font-sans text-slate-900 flex flex-col relative overflow-hidden">
      
      {/* BACKGROUND: Technical Grid (Engineering feel) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
      </div>

      {/* NAV: Floating "Dock" Style - Very trendy/high-end */}
      <nav className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-xl shadow-slate-200/40 rounded-full px-2 py-2 flex items-center gap-1">
            <div className="pl-5 pr-6 flex items-center gap-2 border-r border-slate-100">
                <div className="w-3 h-3 bg-[#023E8A] rounded-sm rotate-45"></div>
                <h1 className="text-base font-bold tracking-tight text-[#023E8A]">protocol<span className="text-[#0077B6]">LM</span></h1>
            </div>
            
            <div className="flex items-center gap-1 pl-2">
                <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#0077B6] hover:bg-slate-50 rounded-full transition-all">Pricing</button>
                <button onClick={() => openAuth('login')} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#0077B6] hover:bg-slate-50 rounded-full transition-all">Log In</button>
                <button onClick={() => openAuth('signup')} className="ml-1 px-5 py-2.5 bg-[#023E8A] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#0077B6] hover:shadow-lg hover:shadow-blue-900/20 transition-all active:scale-95">
                    Request Access
                </button>
            </div>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-center pt-32 pb-16 gap-16 relative z-10">
        
        {/* LEFT COLUMN: Copy & Stats */}
        <div className={`flex-1 w-full max-w-2xl flex flex-col transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0077B6] mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0077B6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0077B6]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Updated for 2025 Regulations</span>
          </div>

          <h2 className="text-5xl lg:text-7xl font-bold text-slate-900 tracking-[-0.03em] leading-[1.1] mb-8">
            Protect your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#023E8A] to-[#0077B6]">franchise assets.</span>
          </h2>
          
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-lg mb-12">
            Health inspections are public record. ProtocolLM uses enforcement data from <strong>Washtenaw, Wayne, and Oakland County</strong> to predict risks before they become fines.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button onClick={() => openAuth('signup')} className="group relative overflow-hidden bg-[#023E8A] text-white pl-8 pr-12 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#00306d] transition-all shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:-translate-y-0.5 active:scale-95">
              <span className="relative z-10">Start Trial</span>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 transition-transform group-hover:translate-x-1">→</div>
              <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]"></div>
            </button>
            <button className="px-8 py-4 rounded-xl border border-slate-200 font-bold text-sm uppercase tracking-widest text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-all">
                View Coverage Map
            </button>
          </div>
          
          {/* BENTO GRID STATS - Heavy, distinct cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
               <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter group-hover:text-[#023E8A] transition-colors"><CountUp end={12} suffix="%" duration={2000} /></span>
                  <span className="text-red-500 text-lg mb-1.5">↓</span>
               </div>
               <div className="h-px w-full bg-slate-100 mb-3 group-hover:bg-blue-50 transition-colors"></div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue Risk</div>
               <p className="text-xs text-slate-500 font-medium leading-normal">Annual sales drop following a sub-par inspection grade.</p>
             </div>
             
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <div className="flex items-end gap-1 mb-2 relative z-10">
                  <span className="text-4xl font-bold text-white tracking-tighter"><CountUp end={75} prefix="$" suffix="k" duration={2200} /></span>
               </div>
               <div className="h-px w-full bg-slate-800 mb-3 relative z-10"></div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Incident Cost</div>
               <p className="text-xs text-slate-400 font-medium leading-normal relative z-10">Average legal fees and fines per major violation.</p>
             </div>
             
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
               <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold text-slate-900 tracking-tighter group-hover:text-[#023E8A] transition-colors"><CountUp end={2.5} suffix="x" decimals={1} duration={2400} /></span>
               </div>
               <div className="h-px w-full bg-slate-100 mb-3 group-hover:bg-blue-50 transition-colors"></div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penalty Multiplier</div>
               <p className="text-xs text-slate-500 font-medium leading-normal">Increase in fines for repeat offenses in MI.</p>
             </div>
          </div>

        </div>
        
        {/* RIGHT COLUMN: The Product */}
        <div className={`flex-1 flex flex-col items-center lg:items-end justify-center perspective-1000 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative group">
                {/* Decorative Elements behind the chat */}
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-slate-100 rounded-[40px] blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-700"></div>
                <DemoChatContent />
                
                {/* Floating "Trusted" Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white py-3 px-5 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3 animate-bounce" style={{animationDuration: '3s'}}>
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                        <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                        <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-900">500+ Locations</div>
                        <div className="text-[10px] text-slate-500 font-medium">Monitoring Active</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="w-full py-6 bg-white border-t border-slate-100 relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <span>© 2025 Protocol Systems Inc.</span>
           <div className="flex gap-6">
                <a href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
                <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
                <a href="/security" className="hover:text-slate-900 transition-colors">Security</a>
           </div>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
      
      <style jsx global>{`
        @keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }
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
