'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- 1. THE CHAT INTERFACE (Content) ---
const DemoChatInterface = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) 
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, inputValue, isThinking])

  const SEQUENCE = [
    {
      text: "Can I store raw chikin", backspace: 6, correction: "chicken above the cooked brisket?",
      response: "NEGATIVE: Priority Violation (P). Raw poultry (165°F) must be stored on the BOTTOM shelf."
    },
    {
      text: "Generate a corrective action memo.",
      response: "CORRECTIVE ACTION NOTICE\n\nTOPIC: Poultry Storage\nCODE: FDA 3-302.11\nACTION: Move raw poultry to bottom shelf immediately."
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const typeChar = async (char) => { setInputValue(p => p + char); await wait(Math.random() * 40 + 20) } // Faster typing
    const backspace = async (count) => { for (let i = 0; i < count; i++) { setInputValue(p => p.slice(0, -1)); await wait(60) } }

    const runSimulation = async () => {
      while (isMounted) {
        for (const step of SEQUENCE) {
          setIsTyping(true); await wait(500)
          for (const char of step.text) { if (!isMounted) return; await typeChar(char) }
          if (step.backspace) { await wait(300); await backspace(step.backspace); await wait(100); for (const char of step.correction) { if (!isMounted) return; await typeChar(char) } }
          await wait(400)
          const finalMsg = step.backspace ? step.text.slice(0, -step.backspace) + step.correction : step.text
          setInputValue(''); setIsTyping(false); setMessages(prev => [...prev, { role: 'user', content: finalMsg }])
          setIsThinking(true); await wait(1000); setIsThinking(false)
          setMessages(prev => [...prev, { role: 'assistant', content: step.response }])
          await wait(3000)
        }
        await wait(1000); setMessages([])
      }
    }
    runSimulation()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-red-400"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
        <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Session</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
             <div className="w-8 h-8 border-2 border-slate-200 rounded-full mb-2"></div>
             <span className="text-[9px] font-bold uppercase tracking-widest">Ready</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-lg text-[10px] leading-relaxed font-medium shadow-sm ${msg.role === 'user' ? 'bg-[#6b85a3] text-white' : 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
               <div className="whitespace-pre-wrap font-mono">{msg.content}</div>
            </div>
          </div>
        ))}
        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex gap-1 items-center">
                 <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                 <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
              </div>
           </div>
        )}
      </div>
    </div>
  )
}

// --- 2. THE ANIMATED SCENE (The "Flipbook" Effect) ---
const AnimatedWorkplaceScene = () => {
  const [step, setStep] = useState(0) // 0: Idle, 1: Alert, 2: Phone Up, 3: Chat Open

  useEffect(() => {
    const loop = async () => {
      while (true) {
        setStep(0) // Idle
        await new Promise(r => setTimeout(r, 1000))
        setStep(1) // Alert appears
        await new Promise(r => setTimeout(r, 1500))
        setStep(2) // Pull out phone
        await new Promise(r => setTimeout(r, 500))
        setStep(3) // Chat opens
        await new Promise(r => setTimeout(r, 15000)) // Let chat run
      }
    }
    loop()
  }, [])

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">
      
      {/* --- THE SCENE (SVG) --- */}
      <svg viewBox="0 0 400 400" className="w-full max-w-md h-auto drop-shadow-xl">
        
        {/* FLOOR */}
        <path d="M50 350 L350 350" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

        {/* PREP TABLE */}
        <path d="M200 250 L320 250 L320 350 M200 250 L200 350 M210 330 L310 330" stroke="#94a3b8" strokeWidth="2" fill="none" />
        
        {/* THE BOX (The Violation) */}
        <g transform="translate(240, 215)">
           <rect x="0" y="0" width="40" height="35" rx="2" stroke="#64748b" strokeWidth="2" fill={step >= 1 ? "#fee2e2" : "white"} className="transition-colors duration-500" />
           {/* Red Alert Icon */}
           <path d="M20 10 L20 20 M20 25 L20 26" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" className={`transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`} />
        </g>

        {/* THE MANAGER (Abstract Line Art) */}
        <g transform="translate(100, 150)">
           {/* Head */}
           <circle cx="30" cy="30" r="20" stroke="#475569" strokeWidth="2" fill="white" />
           {/* Body */}
           <path d="M30 50 L30 130 L10 200 M30 130 L50 200" stroke="#475569" strokeWidth="2" fill="none" />
           
           {/* Arm (Animated) */}
           <g className={`transition-transform duration-700 ease-in-out ${step >= 2 ? 'rotate-[-110deg] translate-x-[-20px] translate-y-[10px]' : 'rotate-0'}`} style={{ transformOrigin: '30px 60px' }}>
              <path d="M30 60 L30 110" stroke="#475569" strokeWidth="2" />
              {/* Phone in hand */}
              <rect x="25" y="105" width="10" height="18" rx="2" fill="#0f172a" className={`transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`} />
           </g>
        </g>

        {/* CONNECTION LINE (Dotted line from phone to chat) */}
        <path d="M120 140 L160 100" stroke="#6b85a3" strokeWidth="1" strokeDasharray="4" className={`transition-all duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-0 translate-y-2'}`} />

      </svg>

      {/* --- THE CHAT BUBBLE (HTML Overlay) --- */}
      {/* Pops up when step 3 is active */}
      <div className={`absolute top-0 right-0 md:right-10 w-[280px] md:w-[320px] transition-all duration-700 ease-out transform ${
        step >= 3 
          ? 'opacity-100 translate-y-10 scale-100' 
          : 'opacity-0 translate-y-20 scale-95 pointer-events-none'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden h-[380px] relative z-20">
          {step >= 3 && <DemoChatInterface />}
        </div>
        {/* Shadow/Glow behind chat */}
        <div className="absolute -inset-4 bg-blue-500/20 blur-2xl -z-10 rounded-full opacity-50"></div>
      </div>

    </div>
  )
}

// --- 3. AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()

  useEffect(() => { setView(defaultView); setMessage(null) }, [isOpen, defaultView])

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true); setMessage(null)
    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, data: { county: 'washtenaw' } } })
        if (error) throw error
        if (data.session) window.location.href = '/pricing'
        else setMessage({ type: 'success', text: 'Verification link sent.' })
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase.from('user_profiles').select('is_subscribed').eq('id', data.session.user.id).single()
        if (profile?.is_subscribed) window.location.href = '/documents'
        else window.location.href = '/pricing'
      }
    } catch (error) { setMessage({ type: 'error', text: error.message }) } finally { setLoading(false) }
  }

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8fafc]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">✕</button>
        <h2 className="text-xl font-bold text-slate-900 mb-6 font-mono tracking-tight">{view === 'signup' ? 'Create Account' : 'Sign In'}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-lg" placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-lg" placeholder="Password" />
          <button type="submit" disabled={loading} className="w-full bg-[#6b85a3] hover:bg-[#5a728a] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all font-mono shadow-md">{loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}</button>
        </form>
        {message && <div className={`mt-4 p-3 text-xs font-mono border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{message.text}</div>}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center"><button onClick={() => setView(view === 'signup' ? 'login' : 'signup')} className="text-xs text-slate-400 hover:text-[#6b85a3] font-mono">{view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}</button></div>
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
      
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center fixed top-0 left-0 right-0 z-20 bg-[#f8fafc]/95 backdrop-blur-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900">protocol<span style={{ color: '#6b85a3' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-xs font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#6b85a3] border border-[#6b85a3] rounded-lg hover:bg-[#6b85a3] hover:text-white transition-all">Create Account</button>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-24 gap-12">
        
        {/* LEFT: TEXT & BUTTONS */}
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl md:text-5xl font-mono font-medium text-slate-900 tracking-tight leading-tight mb-8">
            Train Your Team Before the Health Department Does.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0 mb-10">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
          <button onClick={() => openAuth('signup')} className="bg-[#6b85a3] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#5a728a] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            Start 30-Day Free Trial
          </button>
        </div>

        {/* RIGHT: THE ANIMATED WORKPLACE SCENE */}
        <div className={`flex-1 w-full transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <AnimatedWorkplaceScene />
        </div>

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
