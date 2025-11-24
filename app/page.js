'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- 1. THE EXTENDED LIVE TERMINAL ---
const TypewriterTerminal = () => {
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState('typing_q') 
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  // 15 Real-World Scenarios
  const scenarios = [
    { q: "QUERY: Stacking order for walk-in cooler?", a: "PROTOCOL: 1. Ready-to-Eat (Top)\n2. Seafood (145°F)\n3. Whole Beef/Pork (145°F)\n4. Ground Meat (155°F)\n5. Poultry (Bottom - 165°F)" },
    { q: "QUERY: Inspector found quaternary sanitizer at 100ppm.", a: "VIOLATION: Priority Foundation (Pf). Concentration too low. Must be 200-400ppm. Correct immediately." },
    { q: "QUERY: Employee reported sore throat with fever.", a: "ACTION: EXCLUDE from establishment. Cannot return until medical clearance or 24hrs symptom-free on meds. [FDA 2-201.12]" },
    { q: "QUERY: Max temperature for cold holding cheese?", a: "LIMIT: 41°F (5°C). If found above 41°F for >4 hours, discard immediately." },
    { q: "QUERY: Can we use a 3-comp sink for handwashing?", a: "NEGATIVE: Priority Violation (P). Hands must be washed in a designated handwashing sink only." },
    { q: "QUERY: Cooling timeline for chili?", a: "PROCESS: 135°F to 70°F within 2 hours. Then 70°F to 41°F within 4 additional hours. Total: 6 hours." },
    { q: "QUERY: Storage of spray bottles?", a: "PROTOCOL: Must be stored below or away from food/prep surfaces. Violations are Priority (P) for chemical contamination risk." },
    { q: "QUERY: Reheating leftover soup for hot holding.", a: "TARGET: Must reach 165°F for 15 seconds within 2 hours before holding at 135°F." },
    { q: "QUERY: Bare hand contact with garnish?", a: "VIOLATION: Priority (P). Ready-to-eat foods require gloves, tongs, or deli tissue. Discard contaminated product." },
    { q: "QUERY: Date marking requirements?", a: "RULE: TCS foods held >24hrs must be marked. 7 day shelf life (Day 1 = Prep Day). Store at 41°F or below." },
    { q: "QUERY: Dish machine final rinse temp (High Temp).", a: "TARGET: Surface of utensils must reach 160°F. Manifold usually 180°F. Use thermolabel to verify." },
    { q: "QUERY: Evidence of pests in dry storage.", a: "ACTION: Priority Foundation (Pf). Contact PCO immediately. Seal entry points. Discard contaminated packaging." },
    { q: "QUERY: Thawing frozen fish in standing water?", a: "VIOLATION: Core/Pf. Thaw under running water (<70°F), in cooler (<41°F), or as part of cooking process." },
    { q: "QUERY: Hair restraint requirements?", a: "CODE: Food employees must wear hair restraints (hats/nets) and beard nets to prevent contamination. [Core]" },
    { q: "QUERY: Vomit event in dining room.", a: "EMERGENCY: Stop service. Isolate 25ft. Use Chlorine kit (1000-5000ppm). Double bag waste. Log incident." }
  ]

  useEffect(() => {
    let timeout
    const currentScenario = scenarios[scenarioIndex]

    if (phase === 'typing_q') {
      if (charIndex < currentScenario.q.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentScenario.q.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 30) 
      } else {
        setPhase('pause_q')
      }
    } else if (phase === 'pause_q') {
      timeout = setTimeout(() => {
        setPhase('typing_a')
        setCharIndex(0) 
      }, 400) 
    } else if (phase === 'typing_a') {
      if (charIndex < currentScenario.a.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentScenario.q + '\n\n' + currentScenario.a.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 10) // Faster typing for answers
      } else {
        setPhase('pause_a')
      }
    } else if (phase === 'pause_a') {
      timeout = setTimeout(() => {
        setPhase('deleting')
      }, 3000) // Read time
    } else if (phase === 'deleting') {
      setDisplayText('')
      setCharIndex(0)
      setPhase('typing_q')
      setScenarioIndex((prev) => (prev + 1) % scenarios.length)
    }
    return () => clearTimeout(timeout)
  }, [charIndex, phase, scenarioIndex])

  return (
    <div className="w-full max-w-3xl mx-auto font-mono text-sm md:text-base leading-relaxed min-h-[200px] flex flex-col items-center text-center justify-center">
      <div className="whitespace-pre-wrap">
        {displayText.split('\n\n').map((line, i) => (
          <div key={i} className={line.startsWith('QUERY') ? 'text-slate-400 mb-4' : 'text-[#6b85a3] font-bold'}>
            {line}
            {i === displayText.split('\n\n').length - 1 && (
              <span className="inline-block w-2 h-5 bg-[#6b85a3] ml-1 animate-pulse align-middle opacity-50"></span>
            )}
          </div>
        ))}
        {displayText === '' && <span className="inline-block w-2 h-5 bg-slate-300 animate-pulse align-middle"></span>}
      </div>
    </div>
  )
}

// --- 2. AUTH MODAL (Clean Overlay) ---
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
        // Simple check for profile existence/subs
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-8 rounded-lg relative">
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
            className="w-full p-3 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-sm" 
            placeholder="Email"
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="w-full p-3 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 outline-none text-slate-900 text-sm font-mono placeholder-slate-400 rounded-sm" 
            placeholder="Password"
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#6b85a3] hover:bg-[#5a728a] text-white font-bold py-3 rounded-sm text-xs uppercase tracking-widest transition-all font-mono"
          >
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 text-xs font-mono border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
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
      <nav className="w-full px-8 py-8 flex justify-between items-center fixed top-0 left-0 right-0 bg-[#f8fafc]/90 backdrop-blur-sm z-10">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-lg font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`flex gap-6 text-[10px] font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => openAuth('login')} className="text-slate-400 hover:text-[#6b85a3] transition-colors">
            Sign In
          </button>
          <button onClick={() => openAuth('signup')} className="text-[#6b85a3] border border-[#6b85a3] px-4 py-1.5 rounded-sm hover:bg-[#6b85a3] hover:text-white transition-all">
            Create Account
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT - CENTERED MONOLITH */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center">
        
        {/* THE LIVE TERMINAL (HERO) */}
        <div className={`w-full mb-16 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <TypewriterTerminal />
        </div>

        {/* VALUE PROP */}
        <div className={`text-center max-w-2xl transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">
            Unified Regulatory Intelligence.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            The only compliance infrastructure trained on FDA Code 2022, Michigan Modified Food Law, and county-specific enforcement data for Washtenaw, Wayne, and Oakland.
          </p>
          
          <div className="flex justify-center gap-8 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            <span>• Violation Risk Analysis</span>
            <span>• Hazmat Protocols</span>
            <span>• Priority P / Core Logic</span>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="w-full py-8 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
          © 2025 protocolLM
        </div>
      </div>

      {/* AUTH MODAL */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultView={authView} />
    </div>
  )
}
