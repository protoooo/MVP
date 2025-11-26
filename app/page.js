'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- SECURITY SCANNER CHAT (CrowdStrike/Fortinet Style) ---
const SecurityChat = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) 
  const [status, setStatus] = useState('active') // active, scanning, threat_detected, secure
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, status])

  const SEQUENCE = [
    {
      text: "Kitchen manager wants to cool the chili in the walk-in using 5-gallon buckets.",
      scanTime: 2000,
      threatLevel: "HIGH",
      response: "VIOLATION DETECTED: This violates cooling parameters (Sec 3-501.14). 5-gallon buckets have insufficient surface area for rapid cooling. THREAT: Product will not reach 41°F within 6 hours. ACTION: Use shallow pans (2 inches max) or blast chiller immediately."
    },
    {
      text: "Dish machine is reading 155°F on the final rinse.",
      scanTime: 1500,
      threatLevel: "CRITICAL",
      response: "SANITATION FAILURE: 155°F is below the critical limit of 180°F for high-temp machines (Sec 4-501.112). Equipment is not sanitizing. ACTION: Switch to chemical sanitization or close dish pit until booster heater is serviced."
    },
    {
      text: "Can we store raw chicken above the beef if both are sealed?",
      scanTime: 1200,
      threatLevel: "MEDIUM",
      response: "STORAGE HAZARD: Negative. Chicken (165°F cook temp) must strictly be stored BELOW beef (155°F) to prevent cross-contamination from drip. Sealing does not negate vertical storage hierarchy (Sec 3-302.11)."
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
          // 1. User Types
          setStatus('active')
          setIsTyping(true)
          await wait(800)
          for (const char of step.text) { if (!isMounted) return; await typeChar(char) }
          await wait(400) 
          setInputValue('')
          setIsTyping(false)
          setMessages(prev => [...prev, { role: 'user', content: step.text }])
          
          // 2. "Scanning" Phase (The Cybersecurity Vibe)
          setStatus('scanning')
          await wait(step.scanTime)

          // 3. Threat Detection & Response
          setStatus(step.threatLevel === 'CRITICAL' ? 'threat_detected' : 'secure')
          let currentResponse = ""
          const words = step.response.split(' ')
          setMessages(prev => [...prev, { role: 'assistant', content: '', threat: step.threatLevel }])
          
          for (let i = 0; i < words.length; i++) {
            currentResponse += (i === 0 ? '' : ' ') + words[i]
            setMessages(prev => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content = currentResponse
              return newMsgs
            })
            await wait(15) 
          }
          await wait(4000)
        }
        setMessages([])
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  const formatContent = (text, threat) => {
    const isCritical = threat === 'CRITICAL' || threat === 'HIGH';
    const colorClass = isCritical ? 'text-red-600' : 'text-orange-600';
    
    // Highlight key alerts
    const keywords = ["VIOLATION DETECTED", "SANITATION FAILURE", "STORAGE HAZARD", "ACTION:", "THREAT:"];
    
    // Simple parser to highlight keywords
    let formattedText = text;
    keywords.forEach(key => {
        if (formattedText.includes(key)) {
            const parts = formattedText.split(key);
            formattedText = (
                <span>
                    {parts[0]}
                    <span className={`font-bold ${key.includes("ACTION") ? 'text-slate-900' : colorClass}`}>{key}</span>
                    {parts[1]}
                </span>
            );
        }
    });
    return formattedText;
  }

  return (
    // "Fortinet" Appliance Look: Thick borders, status lights, rigid structure
    <div className="flex flex-col h-[540px] w-full md:w-[500px] bg-[#F8FAFC] rounded-xl shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_20px_40px_-10px_rgba(15,23,42,0.15)] overflow-hidden relative z-20 shrink-0 border-t-4 border-t-[#0F172A]">
      
      {/* Header: Threat Monitor Bar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-5 justify-between shrink-0">
        <div className="flex items-center gap-3">
             <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Liability_Shield™</span>
                <span className="text-[9px] font-mono text-slate-400">WASHTENAW_NODE_04</span>
             </div>
        </div>
        
        {/* Dynamic Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
            status === 'scanning' ? 'bg-blue-50 border-blue-100 text-blue-700' :
            status === 'threat_detected' ? 'bg-red-50 border-red-100 text-red-700' :
            'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
                status === 'scanning' ? 'bg-blue-600 animate-pulse' :
                status === 'threat_detected' ? 'bg-red-600 animate-ping' :
                'bg-emerald-600'
            }`}></div>
            {status === 'scanning' ? 'ANALYZING THREAT...' : 
             status === 'threat_detected' ? 'RISK DETECTED' : 'SYSTEM SECURE'}
        </div>
      </div>

      {/* Messages: Security Log Style */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F1F5F9] font-mono text-sm relative">
        {/* Subtle Grid Background for that "CrowdStrike" Map feel */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:20px_20px]"></div>

        {messages.length === 0 && !isTyping && (
           <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3 opacity-30">
                 <div className="w-16 h-16 border-2 border-slate-400 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 border-2 border-slate-400 rounded-full flex items-center justify-center">
                         <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    </div>
                 </div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Awaiting Incident Data</div>
              </div>
           </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`relative z-10 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            
            {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1.5">
                    {msg.threat === 'CRITICAL' || msg.threat === 'HIGH' ? (
                        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    )}
                    <span className={`text-[9px] font-bold uppercase ${msg.threat === 'CRITICAL' ? 'text-red-700' : 'text-slate-500'}`}>
                        {msg.threat === 'CRITICAL' ? 'Critical Violation' : 'Regulatory Response'}
                    </span>
                </div>
            )}

            <div className={`max-w-[90%] p-4 rounded-lg text-xs leading-5 shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-white text-slate-700 border-slate-200' 
                : msg.threat === 'CRITICAL' || msg.threat === 'HIGH'
                    ? 'bg-red-50 text-slate-800 border-red-100' // Red tint for "Threats"
                    : 'bg-white text-slate-600 border-slate-200'
            }`}>
               {msg.role === 'assistant' ? formatContent(msg.content, msg.threat) : msg.content}
            </div>
          </div>
        ))}
        
        {/* Scanning Animation */}
        {status === 'scanning' && (
           <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50 animate-in fade-in relative z-10">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Scanning Regulatory Database...</span>
           </div>
        )}
      </div>

      {/* Input: Command Line Feel */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 z-20">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 px-4 py-3 rounded-md focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all">
           <span className="text-slate-400 font-mono text-xs">&gt;</span>
           <div className="flex-1 font-mono text-xs text-slate-800 h-4 flex items-center">
              {inputValue}
              {isTyping && <span className="w-1.5 h-3 bg-slate-800 ml-1 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-400">Enter operational query...</span>}
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
      setCount((1 - Math.pow(1 - progress, 3)) * end)
      if (progress < 1) window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
  }, [end, duration])
  return <span>{prefix}{count.toFixed(decimals)}{suffix}</span>
}

// --- AUTH MODAL (Clean, Corporate) ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [view, setView] = useState(defaultView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-[400px] bg-white shadow-2xl p-10 rounded-xl relative animate-in slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-800 transition-colors">✕</button>
        <div className="mb-8 border-l-4 border-[#0F172A] pl-4">
          <h2 className="text-lg font-bold text-[#0F172A] tracking-wide uppercase mb-1">{view === 'signup' ? 'New Deployment' : 'Operator Login'}</h2>
          <p className="text-xs text-slate-500 font-medium">Authentication required.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
             <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Corporate ID / Email</label>
             <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-sm font-medium outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all" />
          </div>
          <div className="space-y-1">
             <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Password</label>
             <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-sm font-medium outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all" />
          </div>
          <button className="w-full bg-[#0F172A] text-white font-bold py-4 rounded text-xs uppercase tracking-widest hover:bg-[#1E293B] hover:shadow-lg transition-all active:scale-[0.98] mt-2 flex justify-center items-center gap-2">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             {loading ? 'Authenticating...' : (view === 'signup' ? 'Initiate Trial' : 'Secure Login')}
          </button>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#0F172A] transition-colors">{view === 'signup' ? 'Already Deployed? Login' : 'Need Access? Contact Sales'}</button>
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
    <div className="min-h-screen w-full bg-[#FAFAFA] font-sans text-slate-900 flex flex-col relative overflow-hidden selection:bg-[#0F172A] selection:text-white">
      
      {/* Background: Clean, minimal map pattern (CrowdStrike style) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      {/* NAV: High-End "Dock" */}
      <nav className={`fixed top-8 left-0 right-0 z-50 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="max-w-fit mx-auto bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/50 rounded-full px-2 py-2 flex items-center gap-4">
            <div className="pl-6 pr-6 flex items-center gap-3 border-r border-slate-100">
                {/* Logo Icon */}
                <div className="w-5 h-5 bg-[#0F172A] rotate-45 flex items-center justify-center">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-bold tracking-tight text-[#0F172A]">protocol<span className="text-slate-400">LM</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 pl-2">
                <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#0F172A] transition-colors">Pricing</button>
                <button onClick={() => openAuth('login')} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#0F172A] transition-colors">Login</button>
            </div>
            <button onClick={() => openAuth('signup')} className="ml-2 px-6 py-2.5 bg-[#0F172A] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                Get Protected
            </button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-[1300px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between pt-40 pb-20 gap-20 relative z-10">
        
        {/* LEFT COLUMN: The "Security Pitch" */}
        <div className={`flex-1 max-w-[600px] flex flex-col items-start transition-all duration-1000 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
             <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Enterprise Liability Defense</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-[#0F172A] leading-[1] tracking-tight mb-8">
            Your reputation <br/>
            <span className="text-slate-400">firewall.</span>
          </h1>
          
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-lg mb-12">
            Health inspections are the greatest threat to franchise valuation. ProtocolLM uses enforcement intelligence to detect and block violations before they become public record.
          </p>

          {/* FINANCIAL THREAT CARDS (Rebranded as Security Threats) */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
             
             {/* Card 1 */}
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:border-red-100 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300 group cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Revenue Threat</div>
                <div className="text-3xl font-bold text-[#0F172A] mb-1 flex items-center gap-2">
                   <CountUp end={12} suffix="%" duration={2000} />
                   <span className="text-xs text-red-500 font-normal">LOSS</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Projected annual sales drop after one Critical Violation.</div>
             </div>

             {/* Card 2 */}
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:border-orange-100 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 group cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Incident Cost</div>
                <div className="text-3xl font-bold text-[#0F172A] mb-1 flex items-center gap-2">
                   <CountUp end={75} prefix="$" suffix="k" duration={2200} />
                   <span className="text-xs text-orange-500 font-normal">AVG</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Legal fees, fines, and PR crisis management per incident.</div>
             </div>

             {/* Card 3 */}
             <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-lg transition-all duration-300 group cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-800"></div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Penalty Multiplier</div>
                <div className="text-3xl font-bold text-[#0F172A] mb-1 flex items-center gap-2">
                   <CountUp end={2.5} suffix="x" decimals={1} duration={2400} />
                   <span className="text-xs text-slate-400 font-normal">HIKE</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Automatic fine escalation for repeat offenders.</div>
             </div>
          </div>

          <button onClick={() => openAuth('signup')} className="bg-[#0F172A] text-white px-10 py-5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-[#1E293B] transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] flex items-center gap-3 w-full sm:w-auto justify-center">
            <span>Activate Liability Shield</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>

        </div>

        {/* RIGHT COLUMN: The "Security Console" */}
        <div className={`flex-1 flex justify-center lg:justify-end transition-all duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <div className="relative">
                {/* Decorative "Security Lines" */}
                <div className="absolute -top-10 -right-10 w-64 h-64 border border-dashed border-slate-200 rounded-full animate-[spin_60s_linear_infinite]"></div>
                <div className="absolute -bottom-10 -left-10 w-64 h-64 border border-dashed border-slate-200 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
                
                <SecurityChat />
                
                {/* "Secured By" Badge */}
                <div className="absolute -bottom-6 -right-6 bg-white py-4 px-6 rounded-lg shadow-xl border border-slate-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide">Protocol Secured</div>
                        <div className="text-[10px] font-medium text-slate-500">Monitoring 524 Locations</div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="w-full py-10 border-t border-slate-200 relative z-10 mt-auto bg-white">
        <div className="max-w-[1300px] mx-auto px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
           <span>© 2025 Protocol Systems Inc. Detroit, MI</span>
           <div className="flex gap-8">
                <a href="#" className="hover:text-[#0F172A] transition-colors">Data Security</a>
                <a href="#" className="hover:text-[#0F172A] transition-colors">Compliance Map</a>
                <a href="#" className="hover:text-[#0F172A] transition-colors">Terms</a>
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
