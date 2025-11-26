'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- 1. CHAT DEMO BOX (With "Intelligent Scanning" Animation) ---
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) 
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingStep, setThinkingStep] = useState('') // New "Smart" State
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, isThinking, thinkingStep])

  const SEQUENCE = [
    {
      text: "We received a notice for a 'Chronic Violation' in Washtenaw County. What does that mean?",
      response: "ACTION REQUIRED: Per 'Washtenaw Enforcement Procedure Sec 1.4', a Chronic Violation is a priority violation documented on 3 of the last 5 routine inspections. You are now subject to an Administrative Conference (Sec 6.2) and must submit a Risk Control Plan.",
      county: "Washtenaw"
    },
    {
      text: "Our certified manager quit yesterday. Do we have to close the kitchen?",
      response: "NO. 'Oakland County Sanitary Code Article IV, Sec 4.4' allows a 3-month grace period to replace a Certified Food Service Manager. However, you must notify the Health Division immediately to avoid penalties.",
      county: "Oakland"
    },
    {
      text: "Can I serve a rare burger to a 10-year-old if the parents say it's okay?",
      response: "VIOLATION. Michigan Modified Food Code 3-801.11(C) strictly prohibits serving undercooked comminuted meat (ground beef) to a Highly Susceptible Population (children), regardless of parental permission.",
      county: "State/Federal"
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
          // 1. Typing User Question
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

          // 2. "Smart Thinking" Animation (The 50k Touch)
          setIsThinking(true)
          
          setThinkingStep(`Accessing ${step.county} Database...`)
          await wait(800)
          
          setThinkingStep("Verifying Enforcement Codes...")
          await wait(800)
          
          setThinkingStep("Formulating Compliance Plan...")
          await wait(800)
          
          setIsThinking(false)
          setThinkingStep('')

          // 3. Typing Response
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
    <div className="flex flex-col h-[500px] w-full max-w-[600px] bg-white font-sans border border-[#0077B6]/20 rounded-2xl shadow-2xl shadow-[#0077B6]/10 overflow-hidden relative z-0 transform-gpu">
      <div className="h-14 bg-white border-b border-slate-100 flex items-center px-6 justify-between shrink-0 relative z-20">
        <span className="font-bold text-[#023E8A] text-sm tracking-tighter">protocol<span className="text-[#0077B6]">LM</span></span>
        <div className="flex items-center gap-2 bg-[#F0F9FF] px-3 py-1 rounded-full border border-[#90E0EF]">
          <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-pulse"></div>
          <span className="text-[9px] font-bold text-[#0077B6] uppercase tracking-wide">Active</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F0F9FF] min-h-0 relative z-10">
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
            <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed font-medium shadow-sm relative z-20 ${
              msg.role === 'user' 
                ? 'bg-[#0077B6] text-white rounded-tr-sm' 
                : 'bg-white text-slate-700 rounded-tl-sm border border-[#90E0EF]'
            }`}>
               <div className="whitespace-pre-wrap font-sans text-xs relative z-30">
                 {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
               </div>
            </div>
          </div>
        ))}

        {/* THE NEW "SMART" THINKING ANIMATION */}
        {isThinking && (
           <div className="flex flex-col justify-start animate-in fade-in zoom-in duration-200 relative z-20 gap-2">
              <div className="bg-white px-4 py-3 rounded-xl rounded-tl-sm border border-[#90E0EF] flex gap-1.5 items-center shadow-sm w-fit">
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
              </div>
              <span className="text-[10px] font-bold text-[#0077B6] pl-2 uppercase tracking-wider animate-pulse">
                {thinkingStep}
              </span>
           </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0 relative z-20">
        <div className="w-full bg-[#F0F9FF] border border-[#90E0EF] rounded-xl px-4 py-3 flex items-center gap-3 min-h-[52px]">
           <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center">
              {inputValue}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-[#0077B6] ml-1 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-400">Ask a question...</span>}
           </div>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${inputValue ? 'bg-[#0077B6]' : 'bg-slate-200'}`}>
              <svg className="w-4 h-4 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                 <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. ANIMATED COUNT UP COMPONENT ---
const CountUp = ({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease-out expo for premium feel
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(easeOut * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])

  return <span>{prefix}{count.toFixed(decimals)}{suffix}</span>
}

// --- 3. AUTH MODAL ---
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
      <div className="w-full max-w-sm bg-white border border-white/50 shadow-2xl p-8 rounded-3xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-[#023E8A]">✕</button>
        <h2 className="text-xl font-bold text-[#023E8A] mb-6 tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-[#F0F9FF] border border-[#90E0EF] focus:bg-white focus:border-[#0077B6] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3.5 bg-[#F0F9FF] border border-[#90E0EF] focus:bg-white focus:border-[#0077B6] outline-none text-slate-900 text-sm font-sans placeholder-slate-400 rounded-lg" placeholder="Password" />
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all font-mono shadow-md active:scale-95">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </div>
        {message && <div className={`mt-4 p-3 text-xs font-sans border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#0077B6] font-sans">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
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
    if (authParam) { setAuthView(authParam); setShowAuth(true); window.history.replaceState({}, '', '/') }
  }, [searchParams])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#F0F9FF] font-sans text-slate-900 selection:bg-[#0077B6] selection:text-white flex flex-col relative overflow-hidden">
      
      {/* BACKGROUND IMAGE (OPACITY 35%) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <Image 
           src="/background.png" 
           alt="Background" 
           fill 
           className="object-cover opacity-[0.35]" 
           priority
         />
         <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF]/95 via-[#F0F9FF]/50 to-[#F0F9FF]/95"></div>
      </div>

      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center fixed top-0 left-0 right-0 z-30 bg-[#F0F9FF]/80 backdrop-blur-md transition-all">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-[#023E8A]">protocol<span style={{ color: '#0077B6' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-sm font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#0077B6] border border-[#0077B6]/30 bg-white rounded-lg hover:bg-[#0077B6] hover:text-white transition-all active:scale-95 shadow-sm">
             <span className="hidden md:inline">Create Account</span>
             <span className="md:hidden">Join</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-20 pb-12 gap-16 relative z-10">
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-[#023E8A] tracking-tight leading-tight mb-8">
            Train Your Team Before<br className="hidden md:block"/> The Health Department Does.
          </h2>
          <p className="text-lg text-slate-600 font-semibold leading-relaxed max-w-xl mx-auto md:mx-0 mb-10">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data.
          </p>
          <button onClick={() => openAuth('signup')} className="group relative overflow-hidden bg-[#0077B6] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#023E8A] transition-all shadow-lg shadow-[#0077B6]/20 hover:shadow-xl hover:-translate-y-1 active:scale-95">
            <span className="relative z-10">Start 30-Day Free Trial</span>
            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]"></div>
          </button>
          
          {/* STATS CARDS */}
          <div className="mt-12 grid grid-cols-3 gap-4">
             <div className="bg-white/60 border border-white/80 p-5 rounded-xl backdrop-blur-md shadow-sm hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 cursor-default border-b-4 border-b-[#0077B6]/20">
               <div className="text-5xl font-bold text-[#023E8A] tracking-tighter">
                 <CountUp end={12} suffix="%" />
               </div>
               <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">Revenue Drop</div>
               <p className="text-xs text-slate-600 mt-2 font-medium leading-tight">Immediate loss in annual sales after one bad grade.</p>
             </div>
             
             <div className="bg-white/60 border border-white/80 p-5 rounded-xl backdrop-blur-md shadow-sm hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 cursor-default border-b-4 border-b-[#0077B6]/20">
               <div className="text-5xl font-bold text-[#023E8A] tracking-tighter">
                 <CountUp end={75} prefix="$" suffix="k" />
               </div>
               <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">Avg. Incident</div>
               <p className="text-xs text-slate-600 mt-2 font-medium leading-tight">Legal fees, fines, and lost business revenue.</p>
             </div>
             
             <div className="bg-white/60 border border-white/80 p-5 rounded-xl backdrop-blur-md shadow-sm hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 cursor-default border-b-4 border-b-[#0077B6]/20">
               <div className="text-5xl font-bold text-[#023E8A] tracking-tighter">
                 <CountUp end={2.5} suffix="x" decimals={1} />
               </div>
               <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-2">Fine Hike</div>
               <p className="text-xs text-slate-600 mt-2 font-medium leading-tight">Fines often double or triple for repeat violations.</p>
             </div>
          </div>

        </div>
        
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <DemoChatContent />
        </div>
      </div>

      <div className="w-full py-8 text-center border-t border-[#90E0EF] relative z-10 mt-auto">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <a href="/terms" className="hover:text-[#0077B6]">Terms</a>
           <span>© 2025 protocolLM</span>
           <a href="/privacy" className="hover:text-[#0077B6]">Privacy</a>
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
