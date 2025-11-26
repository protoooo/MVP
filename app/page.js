'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- LIVE ENFORCEMENT TICKER (Fixed Syntax) ---
const Ticker = () => {
  return (
    <div className="w-full bg-[#0F172A] text-white overflow-hidden py-2 border-b border-slate-800 relative z-50">
      <div className="animate-marquee whitespace-nowrap flex gap-12 text-[10px] font-mono tracking-widest uppercase items-center">
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>WASHTENAW: Priority Violation (Sec 4-501.114)</span>
        <span className="text-slate-500">|</span>
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span>WAYNE: Imminent Health Hazard (Sewage)</span>
        <span className="text-slate-500">|</span>
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span>OAKLAND: Risk Control Plan Approved</span>
        <span className="text-slate-500">|</span>
        {/* FIXED: Changed '->' to '&rarr;' to prevent build error */}
        <span className="flex items-center gap-2">MACOMB: Cold Holding Failure (38°F &rarr; 45°F)</span>
        <span className="text-slate-500">|</span>
        <span className="text-blue-400">PROTOCOL_LM: ACTIVE MONITORING 524 LOCATIONS</span>
      </div>
      <style jsx>{`
        .animate-marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}</style>
    </div>
  )
}

// --- CHAT DEMO BOX (Architecturally Locked) ---
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) 
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)

  // Auto-scroll that adheres to the container bounds
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, isThinking])

  const SEQUENCE = [
    {
      text: "Inspector just flagged 'Cold Holding' at 44°F. Do we toss the product?",
      response: "ANALYSIS: If product has been above 41°F for <2 hours, you may RAPIDLY COOL it. If >2 hours (or unknown), DISCARD IMMEDIATELY per MI Food Code 3-501.16. Document the corrective action log now to avoid a Priority Violation citation."
    },
    {
      text: "Can I use the 3-comp sink for thawing chicken if prep is full?",
      response: "NEGATIVE. Cross-contamination risk (Sec 3-501.13). Thawing must occur under running water <70°F in a designated prep sink with an air gap. Using the 3-comp sink constitutes a Priority Foundation violation."
    },
    {
      text: "Employee came in with a sore throat but no fever. Send home?",
      response: "RESTRICT, DO NOT EXCLUDE. Per FDA Food Code 2-201.12: If serving a Highly Susceptible Population (children/elderly), you must EXCLUDE. For general service, RESTRICT from open food/clean equipment. If fever develops, EXCLUDE immediately."
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
    const keywords = ["NEGATIVE", "ANALYSIS", "RESTRICT", "EXCLUDE", "DISCARD IMMEDIATELY"]
    for (const key of keywords) {
      if (text.includes(key)) {
        const parts = text.split(key)
        return <span key={key}><span className="font-bold text-[#023E8A]">{key}</span>{parts[1]}</span>
      }
    }
    return text
  }

  return (
    // CONTAINER: STRICT DIMENSIONS. NO FLEX GROW.
    <div className="flex flex-col h-[550px] w-full md:w-[480px] bg-white rounded-3xl shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] border border-slate-200 overflow-hidden relative z-20 shrink-0 transform-gpu transition-all hover:scale-[1.01] duration-500 ring-1 ring-slate-900/5">
      
      {/* Header: OS-Level Blur */}
      <div className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center px-5 justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 border border-red-600 shadow-inner"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600 shadow-inner"></div>
            <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600 shadow-inner"></div>
        </div>
        <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
            Protocol_LM <span className="text-slate-300">v2.4.0</span>
        </div>
      </div>

      {/* Messages Area: STRICT SCROLLING */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 relative z-10 scrollbar-hide">
        {messages.length === 0 && !isTyping && (
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 opacity-30">
                 <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                 <div className="text-[10px] font-bold uppercase tracking-widest">Compliance Engine Ready</div>
              </div>
           </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-[12px] leading-relaxed font-medium shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white rounded-br-none border-slate-800' 
                : 'bg-white text-slate-600 rounded-bl-none border-slate-200'
            }`}>
               {msg.role === 'assistant' && (
                 <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Regulation Database</span>
                 </div>
               )}
               <div className="whitespace-pre-wrap">{msg.role === 'assistant' ? formatContent(msg.content) : msg.content}</div>
            </div>
          </div>
        ))}
        {isThinking && (
           <div className="flex justify-start animate-in fade-in duration-200">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex gap-1">
                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></span>
                 <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></span>
              </div>
           </div>
        )}
      </div>

      {/* Input Area: FIXED HEIGHT */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-30">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
           <div className="flex-1 text-xs font-medium text-slate-700 truncate h-5 flex items-center">
              {inputValue}<span className={`w-0.5 h-4 bg-blue-600 ml-0.5 ${isTyping ? 'animate-pulse' : 'hidden'}`}></span>
              {!inputValue && !isTyping && <span className="text-slate-400">Ask about Michigan Food Code...</span>}
           </div>
           <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${inputValue ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
              <svg className="w-3 h-3 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
           </div>
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
      setCount((1 - Math.pow(1 - progress, 3)) * end) // Cubic Ease Out
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white shadow-2xl p-8 rounded-2xl relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-900">✕</button>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{view === 'signup' ? 'Franchise Access' : 'Owner Login'}</h2>
          <p className="text-xs text-slate-500 mt-1">Secure authentication for multi-unit operators.</p>
        </div>
        <div className="space-y-4">
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all" placeholder="Corporate Email" />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all" placeholder="Password" />
          <button className="w-full bg-[#0F172A] text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">{loading ? 'Verifying...' : 'Access Portal'}</button>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600">{view === 'signup' ? 'Existing Operator? Sign In' : 'Request Instance? Contact Sales'}</button>
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
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-slate-900 flex flex-col relative overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* BACKGROUND: Subtle Grid + Grain */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <Ticker />

      {/* NAV: Floating Glass Pill */}
      <nav className={`fixed top-14 left-0 right-0 z-40 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-fit mx-auto bg-white/70 backdrop-blur-md border border-slate-200 shadow-xl shadow-slate-200/50 rounded-full px-1.5 py-1.5 flex items-center gap-2">
            <div className="pl-4 pr-6 flex items-center gap-2 border-r border-slate-200/60">
                <div className="w-4 h-4 bg-[#023E8A] rounded-[4px] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-bold tracking-tight text-slate-900">protocol<span className="text-blue-600">LM</span></span>
            </div>
            <div className="flex items-center">
                <button onClick={() => router.push('/pricing')} className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Enterprise Plans</button>
                <button onClick={() => openAuth('login')} className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">Login</button>
                <button onClick={() => openAuth('signup')} className="ml-2 px-5 py-2.5 bg-[#0F172A] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-slate-800 hover:scale-105 transition-all shadow-lg shadow-slate-900/20">Get Coverage</button>
            </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-12 pt-32 lg:pt-40 pb-20 flex flex-col lg:flex-row items-center gap-16 relative z-10">
        
        {/* LEFT: Copy */}
        <div className={`flex-1 max-w-2xl flex flex-col items-start transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-md shadow-sm mb-8">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Live in Michigan (Region 4)</span>
          </div>

          <h1 className="text-6xl lg:text-[5rem] font-bold text-slate-900 leading-[0.95] tracking-tighter mb-8">
            Standardize your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">regulatory shield.</span>
          </h1>
          
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-xl mb-10">
            A unified intelligence layer for Owner/Operators. ProtocolLM ingests health codes and county-specific enforcement procedures to prevent violations across your entire portfolio.
          </p>

          <div className="flex gap-4 w-full sm:w-auto">
            <button onClick={() => openAuth('signup')} className="flex-1 sm:flex-none bg-[#0F172A] text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2">
               Deploy Instance <span className="text-slate-400">&rarr;</span>
            </button>
            <button className="flex-1 sm:flex-none px-8 py-4 rounded-xl border border-slate-200 bg-white font-bold text-xs uppercase tracking-widest text-slate-600 hover:border-slate-400 transition-all shadow-sm active:scale-95">
               View Demo
            </button>
          </div>

          {/* STATS: High-End "Bento" Cards */}
          <div className="grid grid-cols-3 gap-4 mt-16 w-full">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-transform">
                <div className="text-3xl font-bold text-slate-900 tracking-tighter mb-1"><CountUp end={94} suffix="%" duration={2000} /></div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inspection Pass Rate</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-transform">
                <div className="text-3xl font-bold text-slate-900 tracking-tighter mb-1"><CountUp end={12} suffix="m" duration={2500} /></div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Regulations Indexed</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-transform">
                <div className="text-3xl font-bold text-slate-900 tracking-tighter mb-1">0.4<span className="text-lg text-slate-400">s</span></div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Query Latency</div>
            </div>
          </div>
        </div>

        {/* RIGHT: The Product (Scale correction for mobile) */}
        <div className={`flex-1 flex justify-center items-center w-full transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
           <div className="relative w-full max-w-[500px] flex justify-center transform lg:scale-100 scale-[0.85] origin-top">
              {/* Decorative 'Server Rack' Lines */}
              <div className="absolute -right-12 top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent"></div>
              <div className="absolute -right-16 top-20 bottom-20 w-[1px] bg-gradient-to-b from-transparent via-slate-200 to-transparent"></div>
              
              <DemoChatContent />
              
              {/* "Approved Vendor" Badge */}
              <div className="absolute -bottom-8 right-0 bg-white py-2 px-4 rounded-lg shadow-lg border border-slate-100 flex items-center gap-3">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Washtenaw County Sync: Active</span>
              </div>
           </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">© 2025 Protocol Systems Inc. / Detroit, MI</div>
             <div className="flex gap-6 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                {/* Fake Partner Logos for Social Proof */}
                <div className="h-6 w-20 bg-slate-200 rounded"></div>
                <div className="h-6 w-20 bg-slate-200 rounded"></div>
                <div className="h-6 w-20 bg-slate-200 rounded"></div>
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
