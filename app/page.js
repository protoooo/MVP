'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (High-Fidelity UI) ---
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

  // --- LOGIC (Unchanged) ---
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
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
    const typeChar = async (char) => {
      setInputValue(prev => prev + char)
      await wait(Math.random() * 20 + 10) // Faster typing for "Pro" feel
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
            await wait(15) // Faster reading speed
          }
          await wait(5000)
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
            <span className="font-bold text-rose-500">{key}</span>
            {parts[1]}
          </span>
        )
      }
    }
    return text
  }

  return (
    <div className="flex flex-col h-[520px] w-full max-w-[600px] font-sans rounded-2xl overflow-hidden relative z-0 backdrop-blur-2xl bg-white/60 border border-white/40 shadow-2xl ring-1 ring-white/50">
      
      {/* Header - Technical & Precise */}
      <div className="h-12 border-b border-slate-200/50 flex items-center px-4 justify-between shrink-0 relative z-20 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100/50 border border-slate-200/50">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mich_Health_Code_v4.2</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
           <span>LATENCY: 12ms</span>
           <div className="h-3 w-px bg-slate-300"></div>
           <span>SECURE CONNECTION</span>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0 relative z-10 scroll-smooth">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-100 to-white border border-white flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-[#0077B6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <p className="text-xs font-bold tracking-widest uppercase">System Initialized</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-[13px] leading-6 font-medium shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-[#0F172A] text-white border-[#0F172A] rounded-tr-sm' 
                : 'bg-white text-slate-700 border-white/60 shadow-slate-200/50 rounded-tl-sm'
            }`}>
               {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#0077B6] to-[#48CAE4]"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protocol Analysis</span>
                  </div>
               )}
               <div className="whitespace-pre-wrap font-sans">
                 {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
               </div>
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-300">
             <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Analyzing</span>
                 <div className="flex gap-1">
                   <div className="w-1 h-1 bg-[#0077B6] rounded-full animate-bounce"></div>
                   <div className="w-1 h-1 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                   <div className="w-1 h-1 bg-[#0077B6] rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                 </div>
             </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/40 border-t border-white/60 shrink-0 relative z-20 backdrop-blur-md">
        <div className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-[#0077B6]/20 focus-within:border-[#0077B6]">
           <div className="flex-1 text-sm text-slate-800 font-medium relative flex items-center h-5 overflow-hidden">
             <span className="absolute whitespace-pre">{inputValue}</span>
             {isTyping && <span className="inline-block w-0.5 h-4 bg-[#0077B6] ml-[calc(100%+2px)] absolute animate-pulse"></span>}
             {!inputValue && !isTyping && <span className="text-slate-400 font-normal">Ask about compliance risks...</span>}
           </div>
           <div className={`w-6 h-6 rounded flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-300'}`}>
              <svg className="w-3 h-3 transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- STAT CARD COMPONENT ---
const StatCard = ({ value, label, subtext, delay }) => (
  <div className={`bg-white/40 border border-white/60 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/60 transition-all duration-500 hover:-translate-y-1 group animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards`} style={{animationDelay: delay}}>
    <div className="flex items-baseline gap-1">
      <div className="text-4xl font-black text-[#0F172A] tracking-tighter group-hover:text-[#0077B6] transition-colors">
        {value}
      </div>
    </div>
    <div className="text-[10px] font-bold text-[#0077B6] uppercase tracking-widest mt-2 mb-1">{label}</div>
    <p className="text-xs text-slate-600 font-medium leading-relaxed">{subtext}</p>
  </div>
)

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
    
    // Auth logic remains same, just refined UI
    const action = view === 'signup' ? supabase.auth.signUp : supabase.auth.signInWithPassword
    const args = view === 'signup' 
      ? { email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, data: { county: 'washtenaw' } } }
      : { email, password }

    action(args).then(async ({ data, error }) => {
      if (error) throw error
      if (view === 'login') {
         const { data: profile } = await supabase.from('user_profiles').select('is_subscribed').eq('id', data.session.user.id).single()
         window.location.href = profile?.is_subscribed ? '/documents' : '/pricing'
      } else if (data.session) {
         window.location.href = '/pricing'
      } else {
         setMessage({ type: 'success', text: 'Verification link sent to email.' })
      }
    }).catch(err => setMessage({ type: 'error', text: err.message }))
    .finally(() => setLoading(false))
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white shadow-2xl p-8 rounded-2xl relative animate-in zoom-in-95 duration-300 ring-1 ring-black/5">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
        <h2 className="text-xl font-bold text-[#0F172A] mb-1 tracking-tight">{view === 'signup' ? 'Request Access' : 'Client Login'}</h2>
        <p className="text-slate-500 text-xs font-medium mb-6">Secure portal for franchise operators.</p>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Work Email</label>
             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 outline-none text-slate-900 text-sm rounded-lg transition-all" placeholder="operator@franchise.com" />
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Password</label>
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#0077B6] focus:ring-2 focus:ring-[#0077B6]/10 outline-none text-slate-900 text-sm rounded-lg transition-all" placeholder="••••••••" />
          </div>
          
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all mt-2">
            {loading ? 'Authenticating...' : (view === 'signup' ? 'Create Account' : 'Access Portal')}
          </button>
        </div>
        
        {message && <div className={`mt-4 p-3 text-xs border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-500 hover:text-[#0077B6] font-medium transition-colors">
                {view === 'signup' ? 'Already have an account? Login' : 'New Franchise? Request Access'}
            </button>
        </div>
      </div>
    </div>
  )
}

// --- MAIN CONTENT ---
function MainContent() {
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('auth')) { 
      setAuthView(searchParams.get('auth'))
      setShowAuth(true) 
      window.history.replaceState({}, '', '/') 
    }
  }, [searchParams])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 selection:bg-[#0077B6] selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background Gradients (Subtle & High End) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Right Blue Glow */}
        <div className="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-[#0077B6] opacity-[0.08] blur-[120px] rounded-full mix-blend-multiply"></div>
        {/* Bottom Left Cyan Glow */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#48CAE4] opacity-[0.1] blur-[100px] rounded-full mix-blend-multiply"></div>
        {/* Texture Mesh */}
        <div className="absolute inset-0 opacity-[0.4]" style={{backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px'}}></div>
      </div>

      {/* NAVBAR */}
      <nav className="w-full shrink-0 z-40 h-20 flex items-center justify-between px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/')}>
            <div className="w-9 h-9 bg-gradient-to-br from-[#0F172A] to-[#334155] rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-900/10 group-hover:shadow-slate-900/20 transition-all">
                <span className="text-lg font-bold font-mono">P</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter text-[#0F172A] leading-none">protocol<span className="text-[#0077B6]">LM</span></span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Enterprise</span>
            </div>
        </div>
        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
            <button onClick={() => router.push('/pricing')} className="hidden md:block text-slate-500 hover:text-[#0F172A] transition-colors">Pricing</button>
            <button onClick={() => openAuth('login')} className="text-slate-500 hover:text-[#0F172A] transition-colors">Login</button>
            <button onClick={() => openAuth('signup')} className="px-5 py-2.5 bg-[#0F172A] text-white rounded-lg hover:bg-[#1E293B] transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
                Start Trial
            </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 relative z-10 pt-4 lg:pt-0">
        
        {/* Left Column: Value Prop */}
        <div className="flex-1 max-w-xl text-center lg:text-left z-20">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Updated for 2025 FDA Code</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-black text-[#0F172A] tracking-tighter leading-[1.05] mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            Automate Your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0077B6] to-[#48CAE4]">Compliance Risk.</span>
          </h1>
          
          <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            For franchise operators in <strong>Washtenaw, Wayne, & Oakland</strong>. Eliminate fines and protect your brand with AI trained on local enforcement data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <button onClick={() => openAuth('signup')} className="bg-[#0077B6] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#023E8A] transition-all shadow-xl shadow-[#0077B6]/20 hover:shadow-2xl hover:-translate-y-1 active:scale-95">
                Start Free Trial
              </button>
              <div className="flex items-center gap-4 px-4">
                 <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                           {i === 1 ? 'M' : i === 2 ? 'D' : 'K'}
                        </div>
                    ))}
                 </div>
                 <div className="text-left">
                    <div className="flex text-amber-400 text-xs">★★★★★</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Trusted by 50+ Operators</span>
                 </div>
              </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
             <StatCard value="12%" label="Revenue Saved" subtext="Avg. annual loss prevented per location." delay="400ms" />
             <StatCard value="$75k" label="Liability Shield" subtext="Reduction in legal & compliance overhead." delay="500ms" />
             <StatCard value="24/7" label="Instant Audit" subtext="Immediate answers to inspector queries." delay="600ms" />
          </div>

        </div>
        
        {/* Right Column: The Product (Floating Glass) */}
        <div className="flex-1 w-full flex items-center justify-center lg:justify-end perspective-1000 animate-in fade-in slide-in-from-right-12 duration-1000 delay-300">
           <div className="relative transform transition-all hover:scale-[1.01] duration-500">
              {/* Back Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#0077B6] to-[#48CAE4] rounded-full opacity-20 blur-[80px] -z-10 animate-pulse" style={{animationDuration: '4s'}}></div>
              <DemoChatContent />
           </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-6 mt-auto border-t border-slate-200/60 bg-white/50 backdrop-blur-sm z-20">
         <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>© 2025 protocolLM Systems</span>
            <div className="flex gap-6">
                <a href="#" className="hover:text-[#0077B6]">Privacy Policy</a>
                <a href="#" className="hover:text-[#0077B6]">Terms of Service</a>
                <span className="text-emerald-500">● Systems Normal</span>
            </div>
         </div>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#F8FAFC]"></div>}>
      <MainContent />
    </Suspense>
  )
}
