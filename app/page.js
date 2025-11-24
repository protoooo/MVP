'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

// --- TYPEWRITER COMPONENT (CENTER STAGE) ---
const TypewriterTerminal = () => {
  const [displayText, setDisplayText] = useState('')
  const [phase, setPhase] = useState('typing_q') 
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  const scenarios = [
    {
      q: "> QUERY: Inspector flagged a 'Priority Foundation' on the dishwasher.",
      a: "RESPONSE: Pf violation. Likely temp < 160°F or sanitizer < 50ppm. Correct within 10 days to avoid escalation."
    },
    {
      q: "> QUERY: Proper storage for raw shell eggs?",
      a: "PROTOCOL: Store on bottom shelf (below ready-to-eat and cooked foods). Keep at 45°F or below. [FDA 3-202.11]"
    },
    {
      q: "> QUERY: Employee just vomited in the prep area.",
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
    <div className="w-full max-w-2xl bg-white border border-slate-200 p-8 font-mono text-sm leading-relaxed shadow-sm rounded-lg min-h-[160px] flex flex-col justify-center relative overflow-hidden">
      {/* Left Accent Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6b85a3]"></div>
      
      <div className="whitespace-pre-wrap pl-4">
        {displayText.split('\n\n').map((line, i) => (
          <div key={i} className={line.startsWith('RESPONSE') || line.startsWith('PROTOCOL') || line.startsWith('EMERGENCY') ? 'text-[#6b85a3] font-bold mt-3' : 'text-slate-500 font-medium'}>
            {line}
            {i === displayText.split('\n\n').length - 1 && (
              <span className="inline-block w-2 h-4 bg-[#6b85a3] ml-1 animate-pulse align-middle opacity-50"></span>
            )}
          </div>
        ))}
        {displayText === '' && <span className="inline-block w-2 h-4 bg-slate-300 animate-pulse align-middle"></span>}
      </div>
    </div>
  )
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('login') // Default to login
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

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-10 flex justify-between items-end">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-xl font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          Authorized Use Only
        </div>
      </nav>

      {/* MAIN CONTENT - CENTERED */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center -mt-12">
        
        {/* HERO TEXT */}
        <div className={`text-center mb-12 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
            Compliance Infrastructure.
          </h2>
          <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">
            Unified Regulatory Intelligence for Michigan
          </p>
        </div>

        {/* THE TERMINAL (HERO IMAGE) */}
        <div className={`w-full flex justify-center mb-12 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <TypewriterTerminal />
        </div>

        {/* AUTH FORM (COMPACT) */}
        <div className={`w-full max-w-sm transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          <div className="flex justify-center gap-8 mb-8 text-[10px] font-bold uppercase tracking-widest">
            <button 
              onClick={() => { setView('login'); setMessage(null); }} 
              className={`pb-2 border-b-2 transition-all ${view === 'login' ? 'border-[#6b85a3] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setView('signup'); setMessage(null); }} 
              className={`pb-2 border-b-2 transition-all ${view === 'signup' ? 'border-[#6b85a3] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="group">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={loading}
                className="w-full py-3 bg-transparent border-b border-slate-300 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-400 text-center" 
                placeholder="Email Address" 
              />
            </div>
            <div className="group">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                disabled={loading}
                className="w-full py-3 bg-transparent border-b border-slate-300 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-400 text-center" 
                placeholder="Password" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full text-white font-bold py-4 shadow-sm transition-all hover:opacity-90 hover:shadow-md mt-6 text-[10px] uppercase tracking-widest rounded-lg"
              style={{ backgroundColor: '#6b85a3' }}
            >
              {loading ? 'Processing...' : (view === 'signup' ? 'Initialize Account' : 'Authenticate')}
            </button>

            {message && (
              <div className={`p-3 text-[10px] font-bold uppercase tracking-wide text-center ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {message.text}
              </div>
            )}
          </form>

          {view === 'signup' && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => router.push('/pricing')}
                className="text-[10px] font-bold text-slate-400 hover:text-[#6b85a3] transition-colors uppercase tracking-widest"
              >
                View Fee Structure
              </button>
            </div>
          )}
        </div>

      </div>

      {/* FOOTER */}
      <div className="w-full py-8 text-center border-t border-slate-200">
        <div className="flex justify-center gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span className="text-slate-300">© 2025 protocolLM</span>
          <a href="/terms" className="hover:text-[#6b85a3] transition">Terms</a>
          <a href="/privacy" className="hover:text-[#6b85a3] transition">Privacy</a>
          <a href="/contact" className="hover:text-[#6b85a3] transition">Contact</a>
        </div>
      </div>
    </div>
  )
}
