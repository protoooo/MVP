'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- TYPEWRITER COMPONENT ---
const TypewriterTerminal = () => {
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState('typing_q') 
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  const scenarios = [
    {
      q: "> QUERY: How to store raw chicken in walk-in?",
      a: "RESPONSE: Store on bottom shelf to prevent cross-contamination drip. [FDA 3-302.11]"
    },
    {
      q: "> QUERY: Inspector found no hand soap at sink.",
      a: "RESPONSE: Priority Foundation (Pf) violation. Correct within 10 days (ideally immediately)."
    },
    {
      q: "> QUERY: Max temp for hot soup holding?",
      a: "RESPONSE: Must be 135°F or above. If found below for <4 hours, reheat to 165°F."
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
        }, 40) 
      } else {
        setPhase('pause_q')
      }
    } else if (phase === 'pause_q') {
      timeout = setTimeout(() => {
        setPhase('typing_a')
        setCharIndex(0) 
      }, 500) 
    } else if (phase === 'typing_a') {
      if (charIndex < currentScenario.a.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentScenario.q + '\n\n' + currentScenario.a.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        }, 20) 
      } else {
        setPhase('pause_a')
      }
    } else if (phase === 'pause_a') {
      timeout = setTimeout(() => {
        setPhase('deleting')
      }, 4000) 
    } else if (phase === 'deleting') {
      setDisplayText('')
      setCharIndex(0)
      setPhase('typing_q')
      setScenarioIndex((prev) => (prev + 1) % scenarios.length)
    }
    return () => clearTimeout(timeout)
  }, [charIndex, phase, scenarioIndex])

  return (
    <div className="w-full h-[120px] bg-[#1e293b] border border-slate-700/50 p-6 font-mono text-xs leading-relaxed shadow-lg rounded-sm mb-12">
      <div className="whitespace-pre-wrap">
        {displayText.split('\n\n').map((line, i) => (
          <div key={i} className={line.startsWith('RESPONSE') ? 'text-[#6b85a3] font-bold mt-2' : 'text-slate-400'}>
            {line}
            {i === displayText.split('\n\n').length - 1 && (
              <span className="inline-block w-2 h-4 bg-[#6b85a3] ml-1 animate-pulse align-middle"></span>
            )}
          </div>
        ))}
        {displayText === '' && <span className="inline-block w-2 h-4 bg-[#6b85a3] animate-pulse align-middle"></span>}
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
          setMessage({ type: 'success', text: 'VERIFICATION LINK SENT.' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'INVALID CREDENTIALS'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'ACCOUNT PENDING CONFIRMATION'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- TEXT FEATURE (Clean, No Icons) ---
  const FeatureItem = ({ title, desc }) => (
    <div className="group p-5 border border-slate-800 bg-[#0f172a] hover:border-[#6b85a3]/50 transition-colors duration-300 rounded-sm">
      <h3 className="text-[#6b85a3] font-bold text-[10px] uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-slate-400 text-[11px] leading-relaxed font-mono">{desc}</p>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#0f172a] font-mono text-slate-300 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* NAVBAR */}
      <nav className="w-full max-w-3xl mx-auto px-6 py-10 flex justify-between items-end border-b border-slate-800/50 pb-6">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-lg font-bold tracking-tighter text-white">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          Restricted Access
        </div>
      </nav>

      {/* MAIN CONTENT - CENTERED MONOLITH */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 flex flex-col">
        
        {/* HEADER SECTION */}
        <div className={`mb-12 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-block px-2 py-1 bg-slate-800/50 border border-slate-700 text-[10px] font-bold uppercase tracking-widest text-[#6b85a3] mb-6 rounded-sm">
            Regulatory Intelligence Unit
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
            Compliance Infrastructure.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
            Unified enforcement data for Michigan restaurant groups. Mitigate liability with county-level precision.
          </p>
        </div>

        {/* LIVE TYPEWRITER DEMO */}
        <div className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">System Preview</div>
           <TypewriterTerminal />
        </div>

        {/* FEATURE GRID */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <FeatureItem 
            title="Enforcement Data" 
            desc="Trained on Washtenaw, Wayne & Oakland County violation triggers." 
          />
          <FeatureItem 
            title="Violation Risk" 
            desc="Identify Priority P vs Core risks before they become fines." 
          />
          <FeatureItem 
            title="Unified Code" 
            desc="FDA 2022 and Michigan Modified Food Law integration." 
          />
          <FeatureItem 
            title="Hazmat Protocols" 
            desc="Immediate guidance for contamination events and recovery." 
          />
        </div>

        {/* LOGIN FORM */}
        <div className={`w-full border-t border-slate-800 pt-12 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="max-w-md mx-auto">
            
            <div className="flex gap-8 mb-8 border-b border-slate-800 pb-1 justify-center">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'signup' ? 'border-[#6b85a3] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Create Account
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'login' ? 'border-[#6b85a3] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                  className="w-full p-3 bg-[#1e293b] border border-slate-700 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-white text-xs transition-all placeholder-slate-600 rounded-sm" 
                  placeholder="user@domain.com" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6}
                  disabled={loading}
                  className="w-full p-3 bg-[#1e293b] border border-slate-700 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-white text-xs transition-all placeholder-slate-600 rounded-sm" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full text-white font-bold py-4 shadow-sm transition-all hover:opacity-90 mt-4 text-[10px] uppercase tracking-widest rounded-sm"
                style={{ backgroundColor: '#6b85a3' }}
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Initialize Account' : 'Authenticate')}
              </button>

              {message && (
                <div className={`p-4 text-[10px] font-bold uppercase tracking-wide border rounded-sm ${message.type === 'error' ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-green-900/20 border-green-800 text-green-400'}`}>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-8 text-center">
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-[10px] font-bold text-slate-500 hover:text-[#6b85a3] transition-colors uppercase tracking-widest"
                >
                  View Fee Structure
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="w-full py-8 border-t border-slate-800/50 mt-12">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
            © 2025 protocolLM. Michigan.
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <a href="/terms" className="hover:text-[#6b85a3] transition">Terms</a>
            <a href="/privacy" className="hover:text-[#6b85a3] transition">Privacy</a>
            <a href="/contact" className="hover:text-[#6b85a3] transition">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}
