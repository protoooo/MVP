'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- DECORATIVE ISOMETRIC CUBES ---
const IsometricDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* CSS-only Isometric Grid Floor */}
    <div 
      className="absolute inset-[-100%] w-[300%] h-[300%] opacity-20 animate-pan-grid"
      style={{
        backgroundImage: `
          linear-gradient(30deg, #90E0EF 1px, transparent 1px),
          linear-gradient(150deg, #90E0EF 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        transform: 'rotateX(60deg) rotateZ(-30deg) translateZ(0)',
        perspective: '1000px',
      }}
    />
    
    {/* Floating "Cubes" (Abstract shapes) */}
    <div className="absolute top-[20%] left-[10%] w-24 h-24 bg-[#0077B6] opacity-10 blur-xl animate-float-slow rounded-full"></div>
    <div className="absolute bottom-[20%] right-[10%] w-32 h-32 bg-[#023E8A] opacity-10 blur-2xl animate-float rounded-full"></div>
    
    {/* Isometric Cube 1 */}
    <div className="hidden lg:block absolute top-[15%] right-[15%] animate-float" style={{ animationDelay: '1s' }}>
      <div className="relative w-16 h-16 transform preserve-3d rotate-x-[60deg] rotate-z-[-45deg]">
         <div className="absolute inset-0 bg-[#F0F9FF] border border-[#90E0EF] transform translate-z-[10px] shadow-lg"></div>
         <div className="absolute inset-0 bg-[#0077B6]/20 transform -translate-x-[5px] -translate-y-[5px]"></div>
      </div>
    </div>
  </div>
)

// --- CHAT DEMO BOX (Refined 3D Style) ---
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
    // 3D Rendering Concept: The main chat container is a "Slab" floating in space
    <div className="relative z-10 animate-float transform-gpu" style={{ perspective: '1000px' }}>
      <div className="flex flex-col h-[520px] w-full max-w-[600px] bg-white font-sans rounded-3xl overflow-hidden shrink-0 
        border-4 border-white
        shadow-[0_20px_50px_-12px_rgba(2,62,138,0.25)]
        ring-1 ring-[#0077B6]/10
      ">
        {/* Header - Glassmorphism feel */}
        <div className="h-16 bg-white/95 backdrop-blur-sm border-b-2 border-slate-100 flex items-center px-6 justify-between shrink-0 z-20">
          <span className="font-bold text-[#023E8A] text-lg tracking-tighter flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#023E8A]"></span>
            protocol<span className="text-[#0077B6]">LM</span>
          </span>
          <div className="flex items-center gap-2 bg-[#F0F9FF] px-4 py-1.5 rounded-lg border-b-4 border-[#90E0EF] active:border-b-0 active:translate-y-1 transition-all">
            <div className="w-2 h-2 bg-[#0077B6] rounded-sm animate-pulse"></div>
            <span className="text-[10px] font-bold text-[#0077B6] uppercase tracking-wide">Live Access</span>
          </div>
        </div>

        {/* Messages Area - Subtle Inner Shadow for "Recessed" screen feel */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FCFF] min-h-0 relative z-10 shadow-inner">
          
          {messages.length === 0 && !isTyping && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 opacity-50">
               <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center shadow-[0_4px_0_0_rgba(226,232,240,1)]">
                  <div className="w-8 h-8 border-4 border-slate-100 rounded-lg"></div>
               </div>
               <span className="text-xs font-bold uppercase tracking-widest text-[#0077B6]">Awaiting Input</span>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              <div className={`max-w-[85%] px-6 py-4 rounded-2xl text-sm leading-relaxed font-medium relative z-20 shadow-sm border-b-2 transition-all hover:-translate-y-0.5 ${
                msg.role === 'user' 
                  ? 'bg-[#0077B6] text-white rounded-tr-sm border-[#023E8A]/20' 
                  : 'bg-white text-slate-700 rounded-tl-sm border-[#90E0EF]/50 shadow-[0_2px_10px_rgba(0,0,0,0.03)]'
              }`}>
                 <div className="whitespace-pre-wrap font-sans relative z-30">
                   {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                 </div>
              </div>
            </div>
          ))}

          {isThinking && (
             <div className="flex justify-start animate-in fade-in zoom-in duration-300 relative z-20">
                <div className="bg-white px-5 py-3 rounded-xl rounded-tl-sm border-2 border-[#F0F9FF] shadow-lg flex gap-2 items-center">
                   <div className="w-2 h-2 bg-[#90E0EF] rounded animate-[bounce_1s_infinite]"></div>
                   <div className="w-2 h-2 bg-[#0077B6] rounded animate-[bounce_1s_infinite_0.1s]"></div>
                   <div className="w-2 h-2 bg-[#023E8A] rounded animate-[bounce_1s_infinite_0.2s]"></div>
                </div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t-2 border-slate-50 shrink-0 relative z-20">
          <div className="w-full bg-[#F0F9FF] border-2 border-[#E2F3FC] rounded-2xl px-5 py-3.5 flex items-center gap-4 transition-all hover:border-[#90E0EF] focus-within:border-[#0077B6] focus-within:shadow-[0_0_0_4px_#90E0EF33]">
             <div className="flex-1 text-sm text-slate-700 font-medium min-h-[20px] relative flex items-center">
                {inputValue}
                {isTyping && <span className="inline-block w-2 h-5 bg-[#0077B6] ml-1 animate-pulse shadow-[0_0_10px_#0077B6]"></span>}
                {!inputValue && !isTyping && <span className="text-slate-400 font-mono text-xs">Waiting for command...</span>}
             </div>
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-b-4 transition-all duration-200 active:border-b-0 active:translate-y-1 ${inputValue ? 'bg-[#0077B6] border-[#023E8A]' : 'bg-slate-100 border-slate-200'}`}>
                <svg className="w-5 h-5 text-white transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                   <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
             </div>
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

// --- AUTH MODAL (Styled to match 3D Look) ---
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#023E8A]/30 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white border-2 border-white/50 shadow-2xl p-8 rounded-[2rem] relative transform transition-all active:scale-[0.99]">
        {/* Decorative corner */}
        <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-[#F0F9FF] to-transparent rounded-tl-[2rem]"></div>
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-[#023E8A] bg-slate-50 p-2 rounded-full hover:bg-[#F0F9FF] transition-colors">✕</button>
        <h2 className="text-2xl font-black text-[#023E8A] mb-8 tracking-tighter relative z-10">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        
        <div className="space-y-5 relative z-10">
          <div className="group">
             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-[#F8FCFF] border-2 border-[#E2F3FC] focus:bg-white focus:border-[#0077B6] focus:shadow-[0_4px_0_0_#90E0EF] outline-none text-slate-900 text-sm font-bold font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Email Address" />
          </div>
          <div className="group">
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-[#F8FCFF] border-2 border-[#E2F3FC] focus:bg-white focus:border-[#0077B6] focus:shadow-[0_4px_0_0_#90E0EF] outline-none text-slate-900 text-sm font-bold font-sans placeholder-slate-400 rounded-xl transition-all" placeholder="Password" />
          </div>
          
          <button onClick={handleAuth} disabled={loading} className="w-full bg-[#0077B6] text-white font-bold py-4 rounded-xl text-sm uppercase tracking-widest transition-all font-sans shadow-lg
            border-b-[6px] border-[#023E8A]
            hover:-translate-y-1 hover:border-b-[8px]
            active:translate-y-1 active:border-b-0
          ">
            {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Access Portal')}
          </button>
        </div>

        {message && <div className={`mt-4 p-3 text-xs font-bold border-2 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-8 pt-6 border-t-2 border-slate-50 text-center relative z-10">
          <button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#0077B6] font-bold tracking-wide">
             {view === 'signup' ? 'ALREADY REGISTERED? SIGN IN' : 'NEED ACCESS? CREATE ACCOUNT'}
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
    <div className="min-h-screen w-full bg-[#F0F9FF] font-sans text-slate-900 selection:bg-[#0077B6] selection:text-white flex flex-col relative overflow-hidden perspective-[2000px]">
      
      <style jsx global>{`
        @keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }
        @keyframes float { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(1deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes float-slow { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-30px) rotate(-2deg); } 100% { transform: translateY(0px) rotate(0deg); } }
        @keyframes pan-grid { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
        .animate-pan-grid { animation: pan-grid 20s linear infinite; }
      `}</style>

      {/* ISOMETRIC/3D BACKGROUND STRUCTURE */}
      <IsometricDecoration />
      
      {/* Old Image Fallback kept for safety, but pushed back */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] mix-blend-overlay">
         <Image src="/background.png" alt="Texture" fill className="object-cover" />
      </div>

      {/* NAVBAR - Floating 3D Panel */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 fixed top-0 left-0 right-0 z-50 transition-all">
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(2,62,138,0.05)] rounded-2xl px-6 py-4 flex justify-between items-center transform-gpu">
            <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-2xl font-black tracking-tighter text-[#023E8A]">
                 protocol<span className="text-[#0077B6]">LM</span>
                 <span className="ml-2 text-[8px] bg-[#E0F3FF] text-[#0077B6] px-1.5 py-0.5 rounded border border-[#0077B6]/20 uppercase align-middle">Beta</span>
              </h1>
            </div>
            <div className={`flex gap-4 text-xs font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] hover:bg-[#F0F9FF] rounded-lg transition-colors">Pricing</button>
              <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#0077B6] hover:bg-[#F0F9FF] rounded-lg transition-colors">Sign In</button>
              <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-white bg-[#0077B6] rounded-xl transition-all shadow-md active:scale-95 border-b-[3px] border-[#023E8A] hover:-translate-y-0.5 active:border-b-0 active:translate-y-0.5">
                 <span className="hidden md:inline">Create Account</span>
                 <span className="md:hidden">Join</span>
              </button>
            </div>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center pt-32 pb-12 gap-12 lg:gap-20 relative z-10">
        
        {/* TEXT CONTENT COLUMN */}
        <div className={`flex-1 text-center lg:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          <h2 className="text-4xl md:text-6xl font-black text-[#023E8A] tracking-tighter leading-[0.9] mb-8 drop-shadow-sm">
            Train Your Team Before<br className="hidden md:block"/>
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0077B6] to-[#00B4D8]">Health Department</span> Does.
          </h2>
          
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10 bg-white/40 p-4 rounded-xl border border-white backdrop-blur-sm shadow-sm inline-block">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data.
          </p>
          
          {/* 3D Main Button */}
          <button onClick={() => openAuth('signup')} className="group relative bg-[#0077B6] text-white px-8 py-5 rounded-2xl font-bold uppercase tracking-widest transition-all 
            shadow-[0_10px_40px_-10px_rgba(0,119,182,0.5)] 
            border-b-[6px] border-[#023E8A]
            hover:-translate-y-1 hover:border-b-[10px]
            active:translate-y-2 active:border-b-0
          ">
            <span className="relative z-10 flex items-center gap-2">
               Start 30-Day Free Trial
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </span>
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[25deg] group-hover:animate-[shine_1s_ease-in-out]"></div>
            </div>
          </button>
          
          {/* STATS - ISOMETRIC CARDS */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
             {[
               { val: 12, suff: '%', label: 'Revenue Drop', text: 'Immediate loss in annual sales after one bad grade.', delay: '0' },
               { val: 75, pre: '$', suff: 'k', label: 'Avg. Incident', text: 'Legal fees, fines, and lost business revenue.', delay: '100' },
               { val: 2.5, suff: 'x', label: 'Fine Hike', text: 'Fines often double or triple for repeat violations.', decimals: 1, delay: '200' }
             ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 border-2 border-slate-50 relative group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,119,182,0.15)] shadow-[0_5px_0_0_#E2E8F0] active:translate-y-0 active:shadow-none"
                   style={{ animationDelay: `${stat.delay}ms` }}
                >
                   {/* Isometric accent on top of card */}
                   <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#90E0EF]"></div>
                   
                   <div className="text-4xl font-black text-[#023E8A] tracking-tighter group-hover:scale-110 transition-transform origin-left">
                     <CountUp end={stat.val} prefix={stat.pre} suffix={stat.suff} decimals={stat.decimals} duration={2500} />
                   </div>
                   <div className="text-[10px] font-black text-[#0077B6] uppercase tracking-widest mt-3 bg-[#F0F9FF] inline-block px-2 py-1 rounded">{stat.label}</div>
                   <p className="text-xs text-slate-500 mt-3 font-medium leading-tight">{stat.text}</p>
                </div>
             ))}
          </div>
        </div>
        
        {/* CHAT DEMO COLUMN */}
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
          <DemoChatContent />
        </div>
      </div>

      <div className="w-full py-6 text-center border-t border-white/20 relative z-10 mt-auto bg-gradient-to-t from-white/50 to-transparent">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-[#0077B6]/60">
           <a href="/terms" className="hover:text-[#023E8A] hover:underline decoration-2">Terms</a>
           <span className="opacity-50">© 2025 protocolLM</span>
           <a href="/privacy" className="hover:text-[#023E8A] hover:underline decoration-2">Privacy</a>
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
