'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'

// --- 1. THE LIVE TERMINAL (Human Typing Q + Fade A) ---
const LiveDataTerminal = () => {
  const [qText, setQText] = useState('')
  const [aText, setAText] = useState('')
  const [phase, setPhase] = useState('init') 
  const [index, setIndex] = useState(0)

  // 10 Real-World Scenarios
  const scenarios = [
    {
      q: "QUERY: Can I just thaw the chicken on the prep table? It's frozen solid.",
      a: "NEGATIVE: Priority Violation (P). Thawing at room temperature puts food in the Danger Zone (>41°F). PROTOCOL: Use cold running water, the walk-in cooler, or the microwave."
    },
    {
      q: "QUERY: Is wiping the cutting board with a bleach rag enough between raw beef and produce?",
      a: "CRITICAL: Priority Violation (P). Wiping is NOT sanitizing. You must Wash, Rinse, and Sanitize (3-step process) to prevent Salmonella transfer."
    },
    {
      q: "QUERY: We forgot to log cooler temps yesterday. Inspector is coming.",
      a: "WARNING: Priority Foundation (Pf). Missing documentation is an automatic violation. ACTION: Document the gap in the log. Do not falsify data. Verify current temps immediately."
    },
    {
      q: "QUERY: We keep the sani bucket out all day, just top it off when it gets low.",
      a: "VIOLATION: Priority Foundation (Pf). Quat sanitizer degrades with time and food debris. You must dump and test with strips every 4 hours (Target: 200ppm)."
    },
    {
      q: "QUERY: Can I store raw burger patties on the same shelf as the brisket?",
      a: "NEGATIVE: Priority Violation (P). Raw ground beef (155°F cook temp) must be stored BELOW whole cuts of beef (145°F cook temp) to prevent cross-contamination."
    },
    {
      q: "QUERY: Inspector flagged the dishwasher final rinse at 152°F.",
      a: "VIOLATION: Priority (P). High-temperature machines must reach 160°F at the utensil surface. Switch to 3-compartment sink sanitizing immediately until serviced."
    },
    {
      q: "QUERY: Employee just reported they have Norovirus.",
      a: "EMERGENCY PROTOCOL: EXCLUDE the employee from the establishment immediately. They cannot return until 48 hours after symptoms have ended. Notify Health Dept."
    },
    {
      q: "QUERY: Hand sink is blocked by a trash can.",
      a: "VIOLATION: Priority Foundation (Pf). Handwashing sinks must be accessible at all times and used for no other purpose. Move the obstruction immediately."
    }
  ]

  // Realistic Human Typing Algorithm
  const typeHuman = async (text) => {
    let current = ''
    for (let i = 0; i < text.length; i++) {
      current += text[i]
      setQText(current)
      
      // Base speed + Human Variance
      let delay = Math.random() * 50 + 30; 
      
      // Human pauses
      if (text[i] === ' ') delay += 40; 
      if ([':', '.', '?'].includes(text[i])) delay += 200; 
      
      await new Promise(r => setTimeout(r, delay))
    }
  }

  useEffect(() => {
    const runSequence = async () => {
      const current = scenarios[index]

      // 1. Human Types Question
      setPhase('typing_q')
      setQText('') 
      setAText('')
      await typeHuman(current.q)

      // 2. System Processing (Thinking)
      setPhase('thinking')
      await new Promise(r => setTimeout(r, 800))

      // 3. System Response (Fade In)
      setPhase('showing_a')
      setAText(current.a) 

      // 4. Hold for Reading
      await new Promise(r => setTimeout(r, 5500))

      // 5. Fade Out
      setPhase('out')
      await new Promise(r => setTimeout(r, 600))
      
      // Loop
      setIndex(prev => (prev + 1) % scenarios.length)
    }

    runSequence()
  }, [index])

  return (
    <div className="w-full max-w-4xl mx-auto font-mono text-sm md:text-base leading-relaxed min-h-[180px] flex flex-col justify-center items-center text-center relative px-4">
      
      {/* QUESTION (Human Typed) */}
      <div className={`text-slate-400 mb-4 font-medium uppercase tracking-wide transition-opacity duration-500 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}>
        {qText}
        {phase === 'typing_q' && (
          <span className="inline-block w-2.5 h-5 bg-slate-300 ml-1.5 animate-pulse align-middle"></span>
        )}
      </div>

      {/* ANSWER (Smooth Fade In) */}
      <div className={`text-[#6b85a3] transition-all duration-700 ease-out transform ${phase === 'showing_a' || phase === 'out' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        {aText && (
          <>
            <span className="font-bold mr-2 tracking-wide text-slate-900">PROTOCOL_LM:</span>
            <span className="font-medium">{aText}</span>
          </>
        )}
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
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center pt-16">
        
        {/* HERO TEXT */}
        <div className={`text-center mb-12 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} w-full`}>
          
          {/* System Status Pill */}
          <div className="flex justify-center gap-4 mb-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
             <span className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               DB: v2025.11
             </span>
             <span className="text-slate-300">|</span>
             <span>WASHTENAW / WAYNE / OAKLAND</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-mono font-medium text-slate-900 tracking-tight leading-tight mb-6 whitespace-normal lg:whitespace-nowrap">
            Train Your Team Before the Health Department Does
          </h2>
          
          <p className="text-sm text-slate-500 leading-relaxed max-w-3xl mx-auto">
            Avoid violations and prevent fines with intelligence trained on <strong>Washtenaw, Wayne, and Oakland County</strong> enforcement data, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
        </div>

        {/* THE LIVE CHAT DEMO */}
        <div className={`w-full mt-2 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <LiveDataTerminal />
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
