'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- 1. THE LIVE TERMINAL (THE "HERO") ---
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
    <div className="w-full bg-white border-y border-slate-200 py-10 mb-12 font-mono text-sm leading-relaxed relative overflow-hidden">
      {/* Background Noise for texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
      
      <div className="max-w-2xl mx-auto px-6 relative z-10 h-[100px] flex flex-col justify-center">
        <div className="whitespace-pre-wrap">
          {displayText.split('\n\n').map((line, i) => (
            <div key={i} className={line.startsWith('QUERY') ? 'text-slate-400 mb-2 uppercase tracking-wider text-[10px]' : 'text-[#6b85a3] font-bold text-base'}>
              {line}
              {i === displayText.split('\n\n').length - 1 && (
                <span className="inline-block w-2 h-4 bg-[#6b85a3] ml-1 animate-pulse align-middle opacity-50"></span>
              )}
            </div>
          ))}
          {displayText === '' && <span className="inline-block w-2 h-4 bg-slate-300 animate-pulse align-middle"></span>}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('signup')
  const [mounted, setMounted] = useState(false)
   
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

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
          const { data: profile } = await supabase
            .from('user_profiles').select('accepted_terms, accepted_privacy').eq('id', data.session.user.id).single()
          if (!profile?.accepted_terms || !profile?.accepted_privacy) window.location.href = '/accept-terms'
          else window.location.href = '/pricing'
        } else if (data.user && !data.session) {
          setMessage({ type: 'success', text: 'Verification link sent.' })
          setLoading(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        const maxRetries = 3
        let profile = null
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles').select('is_subscribed, accepted_terms, accepted_privacy').eq('id', data.session.user.id).single()
            if (profileError) {
              if (profileError.code === 'PGRST116' && attempt === maxRetries - 1) {
                window.location.href = '/accept-terms'
                return
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
              continue
            }
            profile = profileData
            break
          } catch (retryError) { if (attempt === maxRetries - 1) throw retryError }
        }
        if (!profile || !profile.accepted_terms || !profile.accepted_privacy) {
          window.location.href = '/accept-terms'
          return
        }
        if (profile.is_subscribed) window.location.href = '/documents'
        else window.location.href = '/pricing'
      }
    } catch (error) {
      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials')) errorMessage = 'Invalid credentials.'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'Account pending confirmation.'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- TEXT ONLY CARDS ---
  const InfoCard = ({ title, desc }) => (
    <div className="p-6 border-l-2 border-slate-200 hover:border-[#6b85a3] transition-colors duration-500">
      <h3 className="text-slate-900 font-bold text-[10px] uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full px-8 py-8 flex justify-between items-center">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-lg font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Regulatory Intelligence Unit
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row">
        
        {/* LEFT COLUMN - The "Product Experience" */}
        <div className="flex-1 lg:pr-20 flex flex-col justify-center py-12 px-8 lg:px-0">
          
          {/* 1. Main Headline */}
          <div className={`mb-8 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
              Compliance<br />Infrastructure.
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md">
              Unified enforcement data for Michigan restaurant groups. 
              Mitigate liability with county-level precision.
            </p>
          </div>

          {/* 2. The Live Terminal (Centerpiece) */}
          <div className={`w-full -ml-0 lg:-ml-6 w-[calc(100%+3rem)] transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <TypewriterTerminal />
          </div>

          {/* 3. The Info Cards */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <InfoCard title="Enforcement Data" desc="Trained on Washtenaw, Wayne & Oakland County violation triggers." />
            <InfoCard title="Risk Assessment" desc="Identify Priority P vs Core risks before they become fines." />
            <InfoCard title="Unified Code" desc="FDA 2022 and Michigan Modified Food Law integration." />
            <InfoCard title="Hazmat Protocols" desc="Immediate guidance for contamination events and recovery." />
          </div>

        </div>

        {/* RIGHT COLUMN - The "Access Portal" */}
        <div className="w-full lg:w-[400px] shrink-0 bg-white border-l border-slate-200 flex flex-col justify-center px-10 py-12 lg:min-h-[calc(100vh-80px)]">
          
          <div className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <div className="mb-10">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-2">Authorized Access</h3>
              <p className="text-xs text-slate-500">Enter credentials to proceed.</p>
            </div>

            {/* Minimal Tabs */}
            <div className="flex gap-6 mb-8 border-b border-slate-100 pb-1">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'signup' ? 'border-[#6b85a3] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Register
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`pb-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'login' ? 'border-[#6b85a3] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-[#6b85a3] transition-colors">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                  className="w-full py-2 bg-transparent border-b border-slate-200 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-transparent rounded-none" 
                  placeholder="Email"
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-[#6b85a3] transition-colors">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6}
                  disabled={loading}
                  className="w-full py-2 bg-transparent border-b border-slate-200 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-transparent rounded-none" 
                  placeholder="Password"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full text-white font-bold py-4 shadow-sm transition-all hover:opacity-90 mt-6 text-[10px] uppercase tracking-widest rounded-sm"
                style={{ backgroundColor: '#6b85a3' }}
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Initialize Account' : 'Authenticate')}
              </button>

              {message && (
                <div className={`text-[10px] font-bold uppercase tracking-wide text-center mt-4 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-8 text-center">
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#6b85a3] transition-colors uppercase tracking-widest"
                >
                  View Fee Structure
                </button>
              </div>
            )}
            
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center gap-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              <a href="/terms" className="hover:text-slate-500">Terms</a>
              <a href="/privacy" className="hover:text-slate-500">Privacy</a>
              <a href="/contact" className="hover:text-slate-500">Contact</a>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
