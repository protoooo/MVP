'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- CHAT DEMO BOX (Stripe/Apple Aesthetic) ---
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
      text: "The GM just quit. Can we run the shift without a certified manager?",
      response: "RISK ALERT: Operating without a Certified Food Manager violates 'Oakland Sanitary Code Sec 4.4'. You have a 90-day grace period, but you MUST notify the department within 24 hours to avoid a closure order."
    },
    {
      text: "Inspector found a backed-up drain in the prep area.",
      response: "CRITICAL: This is an 'Imminent Health Hazard' (sewage backup). Per Washtenaw Enforcement Procedure 5.0, you must VOLUNTARILY CLOSE the affected area immediately. Failure to do so will result in a forced shutdown and public notice."
    },
    {
      text: "What's the fine if we get cited for the same thing twice?",
      response: "FINANCIAL IMPACT: Repeat priority violations often trigger 'Administrative Conferences'. In Wayne County, this escalates to fines doubling (approx $500-$1000) and potential license limitation. It puts the franchise agreement in jeopardy."
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
          await wait(800)
          for (const char of step.text) { if (!isMounted) return; await typeChar(char) }
          await wait(400) 
          setInputValue('')
          setIsTyping(false)
          setMessages(prev => [...prev, { role: 'user', content: step.text }])
          setIsThinking(true)
          await wait(1000) 
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
            await wait(15) 
          }
          await wait(5000)
        }
        setMessages([])
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text) => {
    const keywords = ["RISK ALERT", "CRITICAL", "FINANCIAL IMPACT"]
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return <span key={key}><span className="font-bold text-[#CD3636]">{key}</span>{parts[1]}</span>
      }
    }
    return text
  }

  return (
    // Fixed Dimensions, Heavy Shadow, "Floating App" Feel
    <div className="flex flex-col h-[520px] w-full md:w-[460px] bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-black/5 overflow-hidden relative z-20 shrink-0 transform-gpu transition-all hover:scale-[1.005] duration-700">
      
      {/* Header */}
      <div className="h-16 bg-white/50 backdrop-blur-md border-b border-slate-200/50 flex items-center px-6 justify-between shrink-0">
        <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-[13px] tracking-tight">Protocol Intelligence</span>
            <span className="text-[10px] text-slate-400 font-medium">Michigan Enforcement Database</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#0055FF] rounded-full shadow-[0_0_10px_rgba(0,85,255,0.5)] animate-pulse"></div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
             <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <span className="text-xs font-semibold text-slate-400">System Secure</span>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed font-medium shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-[#0A2540] text-white border-[#0A2540] rounded-br-none' 
                : 'bg-white text-slate-600 border-slate-100 rounded-bl-none'
            }`}>
               {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-300">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 flex gap-1.5 shadow-sm items-center">
                 <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
           </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/50 backdrop-blur-md border-t border-slate-200/50 shrink-0">
        <div className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#0055FF]/20 focus-within:border-[#0055FF]">
           <div className="flex-1 text-[13px] text-slate-700 font-medium h-5 flex items-center overflow-hidden">
              {inputValue}
              {isTyping && <span className="w-0.5 h-4 bg-[#0055FF] ml-0.5 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-300">Ask about liability...</span>}
           </div>
           <button className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${inputValue ? 'bg-[#0055FF] text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
           </button>
        </div>
      </div>
    </div>
  )
}

// --- COUNT UP ---
const CountUp = ({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount((1 - Math.pow(1 - progress, 3)) * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])
  return <span>{prefix}{count.toFixed(decimals)}{suffix}</span>
}

// --- AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [view, setView] = useState(defaultView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-[360px] bg-white shadow-2xl p-8 rounded-[24px] relative animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-800 transition-colors">✕</button>
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#0A2540] tracking-tight mb-2">{view === 'signup' ? 'Request Access' : 'Sign In'}</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">Secure portal for multi-unit operators.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Work Email</label>
             <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#0055FF] focus:ring-1 focus:ring-[#0055FF] transition-all placeholder:text-slate-300" placeholder="name@company.com" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Password</label>
             <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#0055FF] focus:ring-1 focus:ring-[#0055FF] transition-all placeholder:text-slate-300" placeholder="••••••••" />
          </div>
          <button className="w-full bg-[#0055FF] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:bg-[#0044CC] hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-[0.98] mt-2">{loading ? 'Processing...' : (view === 'signup' ? 'Start Trial' : 'Access Dashboard')}</button>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-[11px] font-bold text-slate-400 hover:text-[#0055FF] transition-colors">{view === 'signup' ? 'Have an account? Sign in' : 'No account? Request access'}</button>
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

  useEffect(() => { setMounted(true) }, [])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#FDFDFD] font-sans text-slate-900 flex flex-col relative overflow-hidden selection:bg-[#0055FF] selection:text-white">
      
      {/* Background: Very subtle mesh, high-end clean feel */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-blue-50/50 via-white to-white"></div>
         <div className="absolute -top-[400px] -right-[200px] w-[800px] h-[800px] bg-blue-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* NAV: Floating "Island" - Cleaner, smaller */}
      <nav className={`fixed top-6 left-0 right-0 z-50 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-fit mx-auto bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full px-2 py-2 flex items-center gap-2">
            <div className="pl-4 pr-6 flex items-center gap-2.5">
                <div className="w-5 h-5 bg-[#0055FF] rounded-md flex items-center justify-center shadow-sm">
                   <div className="w-2.5 h-2.5 border-2 border-white rounded-full"></div>
                </div>
                <span className="text-sm font-bold tracking-tight text-[#0A2540]">protocol<span className="text-[#0055FF]">LM</span></span>
            </div>
            <div className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-100">
                <button onClick={() => router.push('/pricing')} className="px-4 py-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0A2540] transition-colors">Pricing</button>
                <button onClick={() => openAuth('login')} className="px-4 py-1.5 text-[11px] font-bold text-slate-500 hover:text-[#0A2540] transition-colors">Sign In</button>
            </div>
            <button onClick={() => openAuth('signup')} className="ml-1 px-5 py-2 bg-[#0A2540] text-white text-[11px] font-bold uppercase tracking-wide rounded-full hover:bg-[#051525] hover:shadow-lg hover:shadow-slate-900/10 transition-all active:scale-95">
                Get Protected
            </button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-[1280px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between pt-36 pb-20 gap-16 relative z-10">
        
        {/* LEFT COLUMN: Copy & Financial Stats */}
        <div className={`flex-1 max-w-[600px] flex flex-col items-start transition-all duration-1000 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <h1 className="text-5xl lg:text-[4.5rem] font-bold text-[#0A2540] leading-[1.05] tracking-tight mb-8">
            Protect the <br/>
            <span className="text-[#0055FF]">bottom line.</span>
          </h1>
          
          <p className="text-[17px] text-slate-500 font-medium leading-relaxed max-w-lg mb-12">
            Health inspections aren't just bureaucracy—they are financial risks. We monitor <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data to prevent revenue loss.
          </p>

          {/* FINANCIAL LOSS CARDS (Robinhood Style) */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
             
             {/* Card 1: Revenue Drop */}
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                </div>
                <div className="text-3xl font-bold text-[#0A2540] mb-1"><CountUp end={12} suffix="%" duration={2000} /></div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Drop in sales after one bad grade.</div>
             </div>

             {/* Card 2: Incident Cost */}
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-slate-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Cost</span>
                </div>
                <div className="text-3xl font-bold text-[#0A2540] mb-1"><CountUp end={75} prefix="$" suffix="k" duration={2200} /></div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Legal fees & lost business per incident.</div>
             </div>

             {/* Card 3: Fine Hike */}
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group cursor-default">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-2 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-slate-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fines</span>
                </div>
                <div className="text-3xl font-bold text-[#0A2540] mb-1"><CountUp end={2.5} suffix="x" decimals={1} duration={2400} /></div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Penalty multiplier for repeat violations.</div>
             </div>
          </div>

          <button onClick={() => openAuth('signup')} className="w-full sm:w-auto bg-[#0A2540] text-white px-8 py-4 rounded-xl font-bold text-[13px] uppercase tracking-widest hover:bg-[#051525] transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">
            Start 30-Day Risk Audit
          </button>

        </div>

        {/* RIGHT COLUMN: Chat Demo */}
        <div className={`flex-1 flex justify-center lg:justify-end transition-all duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative group">
                {/* Subtle blue glow behind chat */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100/50 rounded-full blur-[80px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <DemoChatContent />
                
                {/* Trust Badge */}
                <div className="absolute -bottom-8 -left-8 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-white flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-700 delay-500">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-[#0A2540] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">M</div>
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                        <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-[#0A2540]">Trusted by Franchises</div>
                        <div className="text-[9px] font-medium text-slate-400">Syncing 500+ Locations</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="w-full py-8 border-t border-slate-100 relative z-10 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1280px] mx-auto px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <span>© 2025 Protocol Systems</span>
           <div className="flex gap-6">
                <a href="#" className="hover:text-[#0055FF] transition-colors">Privacy</a>
                <a href="#" className="hover:text-[#0055FF] transition-colors">Terms</a>
           </div>
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
