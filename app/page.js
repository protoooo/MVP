'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- 1. THE REAL-TIME CHAT SIMULATION ---
const DemoChatInterface = () => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false) // User typing state
  const [isThinking, setIsThinking] = useState(false) // AI thinking state
  
  const scrollRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, inputValue, isThinking])

  const SEQUENCE = [
    {
      // Scenario 1: The Typo Correction (Human behavior)
      text: "Can I store raw chikin", 
      backspace: 6, 
      correction: "chicken above the cooked brisket?",
      response: "NEGATIVE: Priority Violation (P). Raw poultry (165°F cook temp) must be stored on the BOTTOM shelf to prevent cross-contamination drip onto beef/brisket."
    },
    {
      // Scenario 2: Quick follow up
      text: "Generate a corrective action memo for this.",
      response: "CORRECTIVE ACTION NOTICE\n\nTOPIC: Poultry Storage Hierarchy\nCODE: FDA 3-302.11\nACTION: Effective immediately, all raw poultry must be moved to the bottom shelf. Discard any ready-to-eat items found below raw chicken."
    },
    {
      // Scenario 3: New Topic
      text: "Inspector found the Quat sanitizer at 500ppm.",
      response: "VIOLATION: Priority Foundation (Pf). Chemical Hazard. Concentration is too high (Toxic). Dilute immediately to manufacturer specs (typically 200-400ppm)."
    }
  ]

  useEffect(() => {
    let isMounted = true
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    const typeChar = async (char) => {
      setInputValue(prev => prev + char)
      // Randomize typing speed (30ms - 90ms) for realism
      await wait(Math.random() * 60 + 30)
    }

    const backspace = async (count) => {
      for (let i = 0; i < count; i++) {
        setInputValue(prev => prev.slice(0, -1))
        await wait(100)
      }
    }

    const runSimulation = async () => {
      while (isMounted) {
        // Loop through scenarios
        for (const step of SEQUENCE) {
          
          // 1. USER TYPES IN INPUT BOX
          setIsTyping(true)
          await wait(1000) // Pause before starting

          for (const char of step.text) {
            if (!isMounted) return
            await typeChar(char)
          }

          // 2. Handle Typos (if any)
          if (step.backspace) {
            await wait(400) // Realize mistake
            await backspace(step.backspace)
            await wait(200)
            for (const char of step.correction) {
              if (!isMounted) return
              await typeChar(char)
            }
          }

          await wait(600) // Pause before hitting enter
          
          // 3. SEND MESSAGE (Move from Input to Bubble)
          const fullUserMessage = step.backspace ? step.text.slice(0, -step.backspace) + step.correction : step.text
          
          setInputValue('')
          setIsTyping(false)
          setMessages(prev => [...prev, { role: 'user', content: fullUserMessage }])

          // 4. AI THINKING
          setIsThinking(true)
          await wait(1200) // Processing time
          setIsThinking(false)

          // 5. AI STREAMS RESPONSE
          let currentResponse = ""
          const words = step.response.split(' ')
          
          // Add empty message placeholder
          setMessages(prev => [...prev, { role: 'assistant', content: '' }])
          
          for (let i = 0; i < words.length; i++) {
            currentResponse += (i === 0 ? '' : ' ') + words[i]
            setMessages(prev => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content = currentResponse
              return newMsgs
            })
            await wait(40) // Fast AI stream speed
          }
          
          await wait(4000) // Read time
        }

        // Clear and Restart Sequence
        await wait(1000)
        setMessages([])
      }
    }

    runSimulation()

    return () => { isMounted = false }
  }, [])

  return (
    // CHAT WINDOW CONTAINER (Light Steel Blue Border)
    <div className="w-full max-w-3xl mx-auto bg-white border-2 border-[#6b85a3]/30 rounded-xl shadow-2xl shadow-[#6b85a3]/10 overflow-hidden flex flex-col h-[480px] relative">
      
      {/* HEADER */}
      <div className="h-12 border-b border-slate-100 bg-[#f8fafc] flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Washtenaw County DB // Active
          </span>
        </div>
      </div>

      {/* MESSAGES SCROLL AREA */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 bg-white scroll-smooth">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
             <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-slate-200 rounded-full"></div>
             </div>
             <span className="text-[10px] font-mono uppercase tracking-widest">System Ready</span>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] px-5 py-3 rounded-xl text-sm leading-relaxed font-medium shadow-sm ${
              msg.role === 'user' 
                ? 'bg-[#6b85a3] text-white rounded-tr-sm' 
                : 'bg-[#f8fafc] text-slate-700 rounded-tl-sm border border-slate-100'
            }`}>
               <div className="whitespace-pre-wrap font-mono text-xs md:text-sm">
                 {msg.role === 'assistant' && <span className="block text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">protocol_lm</span>}
                 {msg.content}
               </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-[#f8fafc] px-4 py-3 rounded-xl rounded-tl-sm border border-slate-100 flex gap-1.5 items-center h-[38px]">
                <div className="w-1.5 h-1.5 bg-[#6b85a3] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-[#6b85a3] rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                <div className="w-1.5 h-1.5 bg-[#6b85a3] rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
             </div>
          </div>
        )}
      </div>

      {/* INPUT AREA (This updates visually now!) */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-inner">
           <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center">
              <span className="text-slate-400 text-[10px] font-bold">+</span>
           </div>
           
           {/* The Input Field Simulation */}
           <div className="flex-1 text-sm text-slate-700 font-mono font-medium h-[20px] overflow-hidden relative flex items-center">
              {inputValue}
              {/* Cursor Blinks only when typing in the box */}
              {isTyping && <span className="inline-block w-0.5 h-4 bg-[#6b85a3] ml-0.5 animate-pulse"></span>}
              {!inputValue && !isTyping && <span className="text-slate-300 text-xs uppercase tracking-wide">Enter regulatory query...</span>}
           </div>

           {/* Send Button - Lights up when typing */}
           <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-300 ${inputValue ? 'bg-[#6b85a3]' : 'bg-slate-200'}`}>
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. AUTH MODAL ---
const AuthModal = ({ isOpen, onClose, defaultView = 'login' }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState(defaultView)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setView(defaultView)
    setMessage(null)
  }, [isOpen, defaultView])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (view === 'signup') {
        const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { county: 'washtenaw' } }
        })
        if (error) throw error
        if (data.session) {
          const { data: profile } = await supabase.from('user_profiles').select('accepted_terms, accepted_privacy').eq('id', data.session.user.id).single()
          if (!profile?.accepted_terms || !profile?.accepted_privacy) window.location.href = '/accept-terms'
          else window.location.href = '/pricing'
        } else if (data.user && !data.session) {
          setMessage({ type: 'success', text: 'Verification link sent to email.' })
          setLoading(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: profile } = await supabase.from('user_profiles').select('is_subscribed').eq('id', data.session.user.id).single()
        if (profile?.is_subscribed) window.location.href = '/documents'
        else window.location.href = '/pricing'
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8fafc]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">✕</button>
        
        <h2 className="text-xl font-bold text-slate-900 mb-6 font-mono tracking-tight">
          {view === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-lg" 
            placeholder="Email"
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="w-full p-3.5 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-lg" 
            placeholder="Password"
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#6b85a3] hover:bg-[#5a728a] text-white font-bold py-3.5 rounded-lg text-xs uppercase tracking-widest transition-all font-mono shadow-md"
          >
            {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 text-xs font-mono border rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button 
            onClick={() => { setView(view === 'signup' ? 'login' : 'signup'); setMessage(null); }}
            className="text-xs text-slate-400 hover:text-[#6b85a3] font-mono"
          >
            {view === 'signup' ? 'Already have an account? Sign In' : 'Need access? Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Content Logic
function MainContent() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
  const router = useRouter()
  const searchParams = useSearchParams()
   
  useEffect(() => {
    setMounted(true)
    const authParam = searchParams.get('auth')
    if (authParam) {
      setAuthView(authParam)
      setShowAuth(true)
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams])

  const openAuth = (view) => {
    setAuthView(view)
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center fixed top-0 left-0 right-0 z-20 bg-[#f8fafc]/90 backdrop-blur-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-3xl font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`flex gap-6 text-xs font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => router.push('/pricing')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">
            Pricing
          </button>
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">
            Sign In
          </button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#6b85a3] border border-[#6b85a3] rounded-lg hover:bg-[#6b85a3] hover:text-white transition-all">
            Create Account
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT - CENTERED */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center pt-24 md:pt-32">
        
        {/* HERO TEXT (Moved Up) */}
        <div className={`text-center mb-10 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} w-full`}>
          
          <h2 className="text-3xl md:text-4xl font-mono font-medium text-slate-900 tracking-tight leading-tight mb-6 whitespace-normal lg:whitespace-nowrap">
            Food Safety & Inspection Intelligence.
          </h2>
          
          <p className="text-sm text-slate-500 leading-relaxed max-w-3xl mx-auto">
            Avoid violations and prepare for health inspections with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
        </div>

        {/* THE REAL-TIME CHAT DEMO */}
        <div className={`w-full mt-2 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <DemoChatInterface />
        </div>

      </div>

      {/* FOOTER */}
      <div className="w-full py-12 text-center bg-white border-t border-slate-200 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex justify-center items-center">
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <a href="/terms" className="hover:text-[#6b85a3] transition">Terms</a>
            <a href="/privacy" className="hover:text-[#6b85a3] transition">Privacy</a>
            <span>© 2025 protocolLM</span>
          </div>
        </div>
      </div>

      {/* AUTH MODAL */}
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
