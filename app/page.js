'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- 1. THE LIVE TERMINAL (NO CARD, JUST TEXT) ---
const TypewriterTerminal = () => {
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState('typing_q') 
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  const scenarios = [
    {
      q: "QUERY: Inspector flagged a 'Priority Foundation' on the dishwasher.",
      a: "ANALYSIS: Pf violation. Likely temp < 160°F or sanitizer < 50ppm. Correct within 10 days to avoid escalation."
    },
    {
      q: "QUERY: Proper storage for raw shell eggs?",
      a: "PROTOCOL: Store on bottom shelf (below ready-to-eat and cooked foods). Keep at 45°F or below. [FDA 3-202.11]"
    },
    {
      q: "QUERY: Employee just vomited in the prep area.",
      a: "EMERGENCY PROTOCOL: 1. Stop service. 2. Isolate area (25ft radius). 3. Use Norovirus cleanup kit (chlorine > 1000ppm)."
    },
    {
      q: "QUERY: Cooling timeline for chili?",
      a: "PROCESS: 135°F to 70°F within 2 hours. Then 70°F to 41°F within 4 additional hours. Total: 6 hours."
    },
    {
      q: "QUERY: Date marking requirements for deli meat?",
      a: "RULE: 7 day shelf life (Day 1 = Open Day). Must be stored at 41°F or below. Discard if undated."
    }
  ]

  useEffect(() => {
    let timeout
    const currentScenario = scenarios[scenarioIndex]

    if (phase === 'typing_q') {
      if (charIndex < currentScenario.q.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentScenario.q.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 35) 
      } else {
        setPhase('pause_q')
      }
    } else if (phase === 'pause_q') {
      timeout = setTimeout(() => {
        setPhase('typing_a')
        setCharIndex(0) 
      }, 600) 
    } else if (phase === 'typing_a') {
      if (charIndex < currentScenario.a.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentScenario.q + '\n\n' + currentScenario.a.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 15) 
      } else {
        setPhase('pause_a')
      }
    } else if (phase === 'pause_a') {
      timeout = setTimeout(() => {
        setPhase('deleting')
      }, 4500) 
    } else if (phase === 'deleting') {
      setDisplayText('')
      setCharIndex(0)
      setPhase('typing_q')
      setScenarioIndex((prev) => (prev + 1) % scenarios.length)
    }
    return () => clearTimeout(timeout)
  }, [charIndex, phase, scenarioIndex])

  return (
    // Removed bg-white, border, shadow. Just text.
    <div className="w-full max-w-3xl font-mono text-base md:text-lg leading-relaxed min-h-[180px] flex flex-col justify-center relative">
      {/* Left Accent Line to anchor the text */}
      <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#6b85a3]/30"></div>
      
      <div className="whitespace-pre-wrap pl-6">
        {displayText.split('\n\n').map((line, i) => (
          <div key={i} className={line.startsWith('QUERY') ? 'text-slate-400 mb-3 uppercase tracking-wider text-xs font-bold' : 'text-[#6b85a3] font-bold'}>
            {line}
            {i === displayText.split('\n\n').length - 1 && (
              <span className="inline-block w-2.5 h-5 bg-[#6b85a3] ml-1.5 animate-pulse align-middle opacity-60"></span>
            )}
          </div>
        ))}
        {displayText === '' && <span className="inline-block w-2.5 h-5 bg-slate-300 animate-pulse align-middle ml-6"></span>}
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
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8fafc]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">✕</button>
        
        <h2 className="text-xl font-bold text-slate-900 mb-6 font-mono tracking-tight">
          {view === 'signup' ? 'Initialize_Account' : 'Authenticate'}
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
            {loading ? 'Processing...' : 'Submit'}
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

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [authView, setAuthView] = useState('login')
   
  useEffect(() => {
    setMounted(true)
  }, [])

  const openAuth = (view) => {
    setAuthView(view)
    setShowAuth(true)
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center fixed top-0 left-0 right-0 z-20 bg-[#f8fafc]/90 backdrop-blur-sm">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* LOGO SIZE INCREASED */}
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`flex gap-4 text-[11px] font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {/* BUTTONS SIZE INCREASED SLIGHTLY */}
          <button onClick={() => openAuth('login')} className="px-4 py-2 text-slate-500 hover:text-[#6b85a3] transition-colors">
            Sign In
          </button>
          <button onClick={() => openAuth('signup')} className="px-5 py-2.5 text-[#6b85a3] border border-[#6b85a3] rounded-lg hover:bg-[#6b85a3] hover:text-white transition-all">
            Create Account
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT - CENTERED */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center">
        
        {/* HERO TEXT (Centered Above) */}
        <div className={`text-center mb-16 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-block px-3 py-1 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-[#6b85a3] mb-6 rounded-md shadow-sm">
            Regulatory Intelligence Unit
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
            Unified Regulatory<br/>Intelligence.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto">
            The only compliance infrastructure trained on FDA Code 2022, Michigan Modified Food Law, and county-specific enforcement data for <strong>Washtenaw, Wayne, and Oakland.</strong>
          </p>
        </div>

        {/* THE LIVE TERMINAL (CENTERPIECE) */}
        <div className={`w-full transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Live System Preview</div>
          <TypewriterTerminal />
        </div>

      </div>

      {/* FOOTER (Features) */}
      <div className="w-full py-12 text-center bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          
          <div className="flex flex-col md:flex-row gap-8 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            <span>Violation Risk Analysis</span>
            <span>Hazmat Protocols</span>
            <span>Priority P / Core Logic</span>
          </div>

          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            <a href="/terms" className="hover:text-[#6b85a3]">Terms</a>
            <a href="/privacy" className="hover:text-[#6b85a3]">Privacy</a>
            <span>© 2025 protocolLM</span>
          </div>
        </div>
      </div>

      {/* AUTH MODAL */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
    </div>
  )
}
