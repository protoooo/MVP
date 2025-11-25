'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- 1. THE REAL-TIME CHAT SIMULATION (Content Only) ---
const DemoChatContent = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) 
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, inputValue, isThinking])

  // SCENARIOS
  const SEQUENCE = [
    {
      text: "Can I store raw chikin", backspace: 6, correction: "chicken above the cooked brisket?",
      response: "NEGATIVE: Priority Violation (P). Raw poultry (165°F) must be stored on the BOTTOM shelf to prevent cross-contamination."
    },
    {
      text: "Generate a corrective action memo.",
      response: "CORRECTIVE ACTION NOTICE\n\nTOPIC: Poultry Storage\nCODE: FDA 3-302.11\nACTION: Move raw poultry to bottom shelf immediately."
    },
    {
      text: "Inspector found Quat sanitizer at 500ppm.",
      response: "VIOLATION: Priority Foundation (Pf). Chemical Hazard (Toxic). Dilute to 200-400ppm immediately."
    }
  ]

  useEffect(() => {
    let isMounted = true
    const wait = (ms) => new Promise(r => setTimeout(r, ms))

    const typeChar = async (char) => {
      setInputValue(p => p + char); await wait(Math.random() * 60 + 30)
    }
    const backspace = async (count) => {
      for (let i = 0; i < count; i++) { setInputValue(p => p.slice(0, -1)); await wait(100) }
    }

    const run = async () => {
      while (isMounted) {
        for (const step of SEQUENCE) {
          setIsTyping(true); await wait(1000)
          for (const char of step.text) { if(!isMounted) return; await typeChar(char) }
          if (step.backspace) { await wait(400); await backspace(step.backspace); await wait(200); for (const char of step.correction) { if(!isMounted) return; await typeChar(char) } }
          
          await wait(600)
          const finalMsg = step.backspace ? step.text.slice(0, -step.backspace) + step.correction : step.text
          setInputValue(''); setIsTyping(false); setMessages(p => [...p, { role: 'user', content: finalMsg }])
          
          setIsThinking(true); await wait(1200); setIsThinking(false)
          setMessages(p => [...p, { role: 'assistant', content: step.response }])
          await wait(3000)
        }
        await wait(2000); setMessages([])
      }
    }
    run()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* APP HEADER */}
      <div className="h-14 bg-white border-b border-slate-100 flex items-center px-4 justify-between shrink-0 z-10">
        <span className="font-bold text-slate-900 text-xs tracking-tight">protocol<span className="text-[#6b85a3]">LM</span></span>
        <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full border border-green-100">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[8px] font-bold text-green-700 uppercase">Active</span>
        </div>
      </div>

      {/* CHAT AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc]">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
             <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <div className="w-4 h-4 border-2 border-slate-100 rounded-full"></div>
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest">System Ready</span>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed font-medium shadow-sm ${
              msg.role === 'user' 
                ? 'bg-[#6b85a3] text-white rounded-tr-sm' 
                : 'bg-white text-slate-600 rounded-tl-sm border border-slate-100'
            }`}>
               <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isThinking && (
           <div className="flex justify-start animate-in fade-in zoom-in duration-200">
              <div className="bg-white px-3 py-2 rounded-xl rounded-tl-sm border border-slate-100 flex gap-1 items-center shadow-sm">
                 <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                 <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-150"></div>
              </div>
           </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <div className="w-full bg-slate-50 border border-slate-200 rounded-full px-3 py-2 flex items-center gap-2">
           <div className="flex-1 text-[11px] text-slate-600 font-medium h-[16px] overflow-hidden relative flex items-center">
              {inputValue}
              {isTyping && <span className="inline-block w-0.5 h-3 bg-[#6b85a3] ml-0.5 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-300">Ask protocolLM...</span>}
           </div>
           <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${inputValue ? 'bg-[#6b85a3]' : 'bg-slate-200'}`}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                 <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. THE PHONE FRAME CONTAINER ---
const PhoneFrame = () => {
  return (
    <div className="relative mx-auto w-[300px] h-[600px] bg-slate-900 rounded-[3rem] shadow-2xl border-[8px] border-slate-900 ring-1 ring-slate-900/50 overflow-hidden transform transition-transform hover:scale-[1.02] duration-500">
      {/* Screen Content */}
      <div className="absolute inset-0 bg-white rounded-[2.5rem] overflow-hidden">
         <DemoChatContent />
      </div>

      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-900 rounded-b-xl z-20"></div>
      
      {/* Reflection Shine */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 via-transparent to-transparent pointer-events-none rounded-[2.5rem] z-30"></div>
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
  const router = useRouter()

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
    const authParam = searchParams.get('auth'); if (authParam) { setAuthView(authParam); setShowAuth(true); window.history.replaceState({}, '', '/') }
  }, [searchParams])

  const openAuth = (view) => { setAuthView(view); setShowAuth(true) }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center fixed top-0 left-0 right-0 z-20 bg-[#f8fafc]/90 backdrop-blur-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900">protocol<span style={{ color: '#6b85a3' }}>LM</span></h1>
        </div>
        <div className={`flex gap-6 text-xs font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Pricing</button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">Sign In</button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#6b85a3] border border-[#6b85a3] rounded-lg hover:bg-[#6b85a3] hover:text-white transition-all">Create Account</button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center pt-24 gap-16">
        
        {/* LEFT: TEXT */}
        <div className={`flex-1 text-center md:text-left transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl md:text-5xl font-mono font-medium text-slate-900 tracking-tight leading-tight mb-8">
            Train Your Team Before the Health Department Does.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto md:mx-0 mb-10">
            The only compliance infrastructure trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
          <button onClick={() => openAuth('signup')} className="bg-[#6b85a3] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#5a728a] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            Start 30-Day Free Trial
          </button>
        </div>

        {/* RIGHT: THE PHONE (HERO IMAGE) */}
        <div className={`flex-1 flex justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <PhoneFrame />
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
