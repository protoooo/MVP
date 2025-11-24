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
          setMessage({ type: 'success', text: 'CONFIRMATION EMAIL SENT. CHECK INBOX.' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'INVALID CREDENTIALS.'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'ACCOUNT PENDING CONFIRMATION.'
      setMessage({ type: 'error', text: errorMessage.toUpperCase() })
      setLoading(false)
    }
  }

  // --- ICONS (Technical / Wireframe Style) ---
  const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
  const IconWarning = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
  const IconGrid = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /><path d="M12 22V12" /></svg>)
  const IconHazmat = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>)

  // --- MICHIGAN MAP (Blueprint Style) ---
  const MichiganMap = () => (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="w-full h-full map-draw text-blue-200" strokeWidth="0.8">
      <path d="M130 180 L130 190 L80 190 L75 180 L70 150 L65 130 L70 110 L85 90 L110 75 L130 85 L140 100 L150 110 L155 130 L150 150 L145 160 L130 180 Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 80 L60 70 L80 65 L100 70 L120 75 L110 80 L90 85 L70 90 L60 85 L50 80 Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
    <div 
      className={`flex items-start gap-4 p-4 border-l-2 border-blue-200/20 hover:bg-white/5 transition-all duration-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
      style={{ transitionDelay: delay }}
    >
      <div className="shrink-0 w-8 h-8 flex items-center justify-center text-blue-300">
        <Icon />
      </div>
      <div className="min-w-0">
        <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-1 font-mono">{title}</h3>
        <p className="text-blue-100/60 text-[10px] leading-relaxed font-mono">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white font-mono text-slate-900 selection:bg-slate-900 selection:text-white">
      <style jsx global>{`
        .map-draw path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw 5s ease-out forwards;
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        {/* LEFT SIDE - The "Blueprint" (Matte Navy) */}
        <div className="w-full lg:w-1/2 bg-[#0f172a] text-white relative overflow-hidden px-10 py-10 flex flex-col lg:pb-40 border-r border-slate-200">
          
          {/* Technical Grid Background */}
          <div className="absolute inset-0 opacity-[0.03]" 
               style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          {/* Background Map */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <div className="w-[120%] h-[120%]">
                <MichiganMap />
             </div>
          </div>

          {/* Header */}
          <div className="lg:absolute lg:top-12 lg:left-12 z-20 mb-12 lg:mb-0 mt-4 lg:mt-0">
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-lg font-bold tracking-tighter border-b border-blue-500/50 inline-block pb-2 mb-1">
                PROTOCOL_LM
              </h1>
              <div className="flex gap-2 text-[9px] uppercase tracking-widest text-blue-300/50">
                <span>SYS.VER.2.4</span>
                <span>•</span>
                <span>MI.GOV.SYNC</span>
              </div>
            </div>
          </div>
          
          {/* Feature List */}
          <div className="flex-1 flex flex-col justify-center z-10 pl-2">
            <div className="max-w-md w-full pt-4 lg:mt-12 space-y-2">
              <FeatureCard 
                delay="100ms" title="Enforcement_Data" 
                desc="Washtenaw / Wayne / Oakland violation triggers." icon={IconShield} 
              />
              <FeatureCard 
                delay="200ms" title="Risk_Assessment" 
                desc="Priority (P) vs. Core Analysis logic." icon={IconWarning} 
              />
              <FeatureCard 
                delay="300ms" title="Unified_Code" 
                desc="FDA 2022 + MI Modified Food Law integration." icon={IconGrid} 
              />
              <FeatureCard 
                delay="400ms" title="Hazmat_Ops" 
                desc="Standard Operating Procedures for contamination." icon={IconHazmat} 
              />
            </div>
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-12 z-10 mt-10 lg:mt-0">
            <div className={`text-blue-200/30 text-[9px] font-bold uppercase tracking-[0.2em] flex flex-col gap-1 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <span>SECURE CONNECTION ESTABLISHED</span>
              <span>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - The "Form" (Stark White) */}
        <div className="w-full lg:w-1/2 bg-white relative px-10 py-10 flex flex-col lg:pb-40">
          
          <div className="hidden lg:block lg:h-24"></div> 

          <div className="flex-1 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                  Compliance Infrastructure.
                </h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold border-l-2 border-slate-900 pl-3">
                  For Michigan Restaurant Groups
                </p>
              </div>

              {/* Toggle Buttons */}
              <div className="flex mb-8 gap-6 text-xs font-bold tracking-widest uppercase">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`pb-1 border-b-2 transition-all ${view === 'signup' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-300 hover:text-slate-500'}`}
                >
                  New_Account
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`pb-1 border-b-2 transition-all ${view === 'login' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-300 hover:text-slate-500'}`}
                >
                  Login
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-blue-600 transition-colors">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-900 text-sm rounded-none transition-all placeholder-slate-300 font-mono" 
                    placeholder="user@domain.com" 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-blue-600 transition-colors">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    disabled={loading}
                    className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-900 text-sm rounded-none transition-all placeholder-slate-300 font-mono" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-slate-900 hover:bg-blue-700 text-white font-bold py-4 rounded-none transition-all mt-6 text-xs uppercase tracking-[0.15em] border border-transparent hover:shadow-lg"
                >
                  {loading ? 'AUTHENTICATING...' : (view === 'signup' ? 'INITIALIZE ACCOUNT' : 'ACCESS TERMINAL')}
                </button>

                {message && (
                  <div className={`p-3 text-[10px] font-bold uppercase tracking-wide border-l-4 ${message.type === 'error' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-blue-50 border-blue-500 text-blue-900'}`}>
                    {message.text}
                  </div>
                )}
              </form>

              <div className="mt-8 text-center">
                {view === 'signup' && (
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
                  >
                    [ View_Fee_Schedule ]
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-8 z-10 mt-10 lg:mt-0 text-center lg:text-left w-full">
             <div className="flex justify-center lg:justify-start gap-6 text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                <a href="/terms" className="hover:text-slate-900 transition">Terms</a>
                <a href="/privacy" className="hover:text-slate-900 transition">Privacy</a>
                <a href="/contact" className="hover:text-slate-900 transition">Support</a>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
