'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

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
          setMessage({ type: 'success', text: '>> ACKNOWLEDGED. CHECK INBOX FOR UPLINK.' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'ACCESS DENIED: INVALID CREDENTIALS.'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'ACCESS DENIED: PENDING CONFIRMATION.'
      setMessage({ type: 'error', text: errorMessage.toUpperCase() })
      setLoading(false)
    }
  }

  // --- 1999 STYLE ICONS ---
  const IconSquare = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" strokeWidth="2"/></svg>)
  const IconCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4"><path d="M20 6L9 17L4 12" strokeWidth="2"/></svg>)

  return (
    <div className="min-h-screen w-full bg-black font-mono text-green-500 selection:bg-green-500 selection:text-black overflow-hidden">
      {/* CRT SCANLINE EFFECT */}
      <style jsx global>{`
        .scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.2) 50%,
            rgba(0,0,0,0.2)
          );
          background-size: 100% 4px;
          animation: scanline 10s linear infinite;
          pointer-events: none;
          z-index: 50;
        }
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        .blink { animation: blinker 1s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
      `}</style>

      <div className="fixed inset-0 scanlines"></div>

      <div className="flex flex-col-reverse lg:flex-row min-h-screen border-x border-green-900/30 max-w-[1600px] mx-auto box-content relative z-10">
        
        {/* LEFT SIDE - "SYSTEM BOOT" */}
        <div className="w-full lg:w-1/2 bg-black text-green-500 relative overflow-hidden px-8 py-10 flex flex-col lg:pb-40 border-r border-green-900">
          
          {/* Matrix Grid Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          {/* Header */}
          <div className="lg:absolute lg:top-12 lg:left-12 z-20 mb-12 lg:mb-0 mt-4 lg:mt-0">
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-2xl font-bold tracking-tighter mb-2">
                PROTOCOL_LM <span className="blink">_</span>
              </h1>
              <p className="text-xs text-green-700">
                SYSTEM.ROOT.ACCESS // VER 2.4
              </p>
            </div>
          </div>
          
          {/* Feature List looks like boot sequence */}
          <div className="flex-1 flex flex-col justify-center z-10 pl-2">
            <div className="max-w-md w-full pt-4 lg:mt-12 font-mono text-xs space-y-4">
              <div>
                <p className="opacity-50 mb-1">{`> LOADING ENFORCEMENT_DATA...`}</p>
                <div className="flex items-center gap-2 text-green-400">
                  <IconCheck />
                  <span>WASHTENAW / WAYNE / OAKLAND MOUNTED</span>
                </div>
              </div>
              <div>
                <p className="opacity-50 mb-1">{`> INITIALIZING RISK_ASSESSMENT...`}</p>
                <div className="flex items-center gap-2 text-green-400">
                  <IconCheck />
                  <span>PRIORITY (P) LOGIC ACTIVE</span>
                </div>
              </div>
              <div>
                <p className="opacity-50 mb-1">{`> DECRYPTING UNIFIED_CODE...`}</p>
                <div className="flex items-center gap-2 text-green-400">
                  <IconCheck />
                  <span>FDA 2022 + MI MODIFIED SYNCED</span>
                </div>
              </div>
              <div>
                <p className="opacity-50 mb-1">{`> CHECKING HAZMAT_PROTOCOLS...`}</p>
                <div className="flex items-center gap-2 text-green-400">
                  <IconCheck />
                  <span>CONTAMINATION GUIDANCE READY</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-12 z-10 mt-10 lg:mt-0">
            <div className="text-green-900 text-[10px] font-bold uppercase tracking-widest">
              <p>LAT: 42.3314° N, LON: 83.0458° W</p>
              <p>STATUS: SECURE</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - "TERMINAL LOGIN" */}
        <div className="w-full lg:w-1/2 bg-[#050505] relative px-10 py-10 flex flex-col lg:pb-40">
          
          <div className="hidden lg:block lg:h-24"></div> 

          <div className="flex-1 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
              <div className="mb-12 border-l-2 border-green-500 pl-4">
                <h2 className="text-xl lg:text-3xl font-bold text-white mb-2 tracking-tighter uppercase">
                  Compliance<br/>Infrastructure.
                </h2>
                <p className="text-xs text-green-600 uppercase tracking-widest">
                  Michigan Restaurant Group Access
                </p>
              </div>

              {/* Toggle Buttons */}
              <div className="flex mb-8 gap-6 text-xs font-bold tracking-widest uppercase">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`pb-1 border-b-2 transition-all ${view === 'signup' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-700 hover:text-green-900'}`}
                >
                  [ Initialize ]
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`pb-1 border-b-2 transition-all ${view === 'login' ? 'border-green-500 text-green-500' : 'border-transparent text-gray-700 hover:text-green-900'}`}
                >
                  [ Login ]
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="group">
                  <label className="block text-[10px] text-green-700 uppercase tracking-widest mb-2">User_ID (Email)</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                    className="w-full p-3 bg-black border border-green-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-green-400 text-sm rounded-none placeholder-green-900/50 font-mono" 
                    placeholder="user@system.com" 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] text-green-700 uppercase tracking-widest mb-2">Passcode</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    disabled={loading}
                    className="w-full p-3 bg-black border border-green-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none text-green-400 text-sm rounded-none placeholder-green-900/50 font-mono" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-green-900/20 hover:bg-green-500 hover:text-black text-green-500 font-bold py-4 rounded-none border border-green-500 transition-all mt-6 text-xs uppercase tracking-[0.2em]"
                >
                  {loading ? 'PROCESSING...' : (view === 'signup' ? '>> EXECUTE_REGISTRATION' : '>> ENTER_SYSTEM')}
                </button>

                {message && (
                  <div className={`p-3 text-[10px] font-bold uppercase tracking-wide border ${message.type === 'error' ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}>
                    {message.text}
                  </div>
                )}
              </form>

              <div className="mt-8 text-center">
                {view === 'signup' && (
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="text-[10px] text-green-800 hover:text-green-500 hover:underline transition-all uppercase tracking-widest"
                  >
                    View_Fee_Structure.txt
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-8 z-10 mt-10 lg:mt-0 text-center lg:text-left w-full">
             <div className="flex justify-center lg:justify-start gap-6 text-[9px] text-green-900 font-bold uppercase tracking-widest">
                <a href="/terms" className="hover:text-green-500 transition">Terms</a>
                <a href="/privacy" className="hover:text-green-500 transition">Privacy</a>
                <a href="/contact" className="hover:text-green-500 transition">Signal</a>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
