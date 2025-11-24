'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- 1. THE LIVE TERMINAL (SMOOTH & FACTUAL) ---
const LiveDataTerminal = () => {
  const [index, setIndex] = useState(0)
  const [showQ, setShowQ] = useState(false)
  const [showA, setShowA] = useState(false)
  
  // 100% Factual Scenarios based on MI Food Law & FDA 2022
  const scenarios = [
    {
      q: "QUERY: Can I store raw burger patties on the same shelf as the brisket?",
      a: "Priority Violation (P). Raw ground beef (155°F cook temp) must be stored BELOW whole cuts of beef (145°F cook temp) to prevent cross-contamination."
    },
    {
      q: "QUERY: Inspector flagged the dishwasher final rinse at 152°F.",
      a: "Priority Violation (P). High-temperature machines must reach 160°F at the utensil surface. Switch to 3-compartment sink sanitizing immediately until serviced."
    },
    {
      q: "QUERY: Employee just reported they have Norovirus.",
      a: "Emergency Protocol. EXCLUDE the employee from the establishment immediately. They cannot return until 48 hours after symptoms have ended. Notify the Health Department."
    },
    {
      q: "QUERY: What is the max cooling time for the chili?",
      a: "Process Control. Cool from 135°F to 70°F within 2 hours. Then from 70°F to 41°F within 4 additional hours. Total time cannot exceed 6 hours."
    },
    {
      q: "QUERY: Hand sink is blocked by a trash can.",
      a: "Priority Foundation (Pf). Handwashing sinks must be accessible at all times and used for no other purpose. Move the obstruction immediately."
    },
    {
      q: "QUERY: We found mouse droppings in dry storage.",
      a: "Priority Foundation (Pf). Contact PCO immediately. Discard any food with compromised packaging. Clean and sanitize the area. Check for entry points."
    },
    {
      q: "QUERY: Date marking rule for opened deli ham?",
      a: "Compliance Rule. TCS foods held longer than 24 hours must be marked. 7-day shelf life maximum, where the day of opening counts as Day 1. Hold at 41°F."
    },
    {
      q: "QUERY: Quat sanitizer bucket tested at 500ppm.",
      a: "Priority Foundation (Pf). Chemical Hazard. Concentration is too high (toxic). Dilute immediately to manufacturer specs (typically 150-400ppm)."
    },
    {
      q: "QUERY: Reheating yesterday's soup for the hot well.",
      a: "Critical Limit. You must reheat rapidly to 165°F for 15 seconds within 2 hours. Once reached, you can hold at 135°F."
    },
    {
      q: "QUERY: Can we thaw frozen fish in vacuum packaging?",
      a: "Critical Hazard. Remove fish from Reduced Oxygen Packaging (ROP) BEFORE thawing to prevent Clostridium botulinum growth."
    }
  ]

  useEffect(() => {
    const runSequence = async () => {
      // 1. Fade In Question
      setShowQ(true)
      
      // 2. Wait for reading (Natural pause)
      await new Promise(r => setTimeout(r, 1500))
      
      // 3. Fade In Answer
      setShowA(true)

      // 4. Hold for reading (Longer for complex answers)
      await new Promise(r => setTimeout(r, 5500))

      // 5. Fade Out Both
      setShowQ(false)
      setShowA(false)
      
      // 6. Wait for fade out to finish, then swap index
      await new Promise(r => setTimeout(r, 800))
      setIndex(prev => (prev + 1) % scenarios.length)
    }

    runSequence()
  }, [index])

  const current = scenarios[index]

  return (
    <div className="w-full max-w-3xl mx-auto font-mono text-sm md:text-base leading-relaxed min-h-[180px] flex flex-col justify-center items-center text-center relative">
      
      {/* QUESTION */}
      <div className={`text-slate-400 mb-4 font-medium uppercase tracking-wide transition-all duration-700 ease-in-out transform ${showQ ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        {current.q}
      </div>

      {/* ANSWER */}
      <div className={`text-[#6b85a3] transition-all duration-1000 ease-in-out transform ${showA ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="font-bold mr-2">PROTOCOL_LM:</span>
        <span className="font-medium">{current.a}</span>
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
  const router = useRouter()
   
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
          <h1 className="text-2xl font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`flex gap-4 text-[11px] font-bold uppercase tracking-widest transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
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
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center">
        
        {/* HERO TEXT */}
        <div className={`text-center mb-12 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} w-full`}>
          <h2 className="text-3xl md:text-4xl font-mono font-medium text-slate-900 tracking-tight leading-tight mb-6">
            Local Regulatory Intelligence.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mx-auto">
            The only compliance infrastructure trained specifically on enforcement data for <strong>Washtenaw, Wayne, and Oakland County</strong>, the Michigan Modified Food Law, and the Federal Food Code.
          </p>
        </div>

        {/* THE LIVE TERMINAL (CENTERPIECE) */}
        <div className={`w-full mt-4 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <LiveDataTerminal />
        </div>

      </div>

      {/* FOOTER */}
      <div className="w-full py-12 text-center bg-white border-t border-slate-200">
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
