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
          setMessage({ type: 'success', text: 'VERIFICATION LINK DISPATCHED.' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'CREDENTIALS INVALID'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'ACCOUNT PENDING CONFIRMATION'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- ICONS (Technical Style) ---
  const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
  const IconWarning = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
  const IconGrid = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /><path d="M12 22V12" /></svg>)

  const FeatureItem = ({ icon: Icon, title, desc }) => (
    <div className="flex flex-col gap-2 p-5 border border-slate-700/50 bg-slate-800/50 rounded-lg backdrop-blur-sm hover:bg-slate-800 transition-colors">
      <div className="text-blue-200">
        <Icon />
      </div>
      <div>
        <h3 className="text-white font-bold text-xs tracking-widest uppercase mb-1 font-mono">{title}</h3>
        <p className="text-slate-400 text-[11px] leading-relaxed font-mono">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#0f172a] font-mono text-slate-200 selection:bg-blue-500 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Subtle Noise Texture for Matte Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* NAVBAR */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-20">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-lg font-bold tracking-tighter text-white border-b border-blue-500 inline-block pb-1">
            PROTOCOL_LM
          </h1>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          SYS.STATUS: ONLINE
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col justify-center relative w-full max-w-7xl mx-auto px-6 pb-20">
        
        <div className="grid lg:grid-cols-12 gap-16 items-center relative z-10">
          
          {/* LEFT SIDE: DATA DISPLAY */}
          <div className="lg:col-span-7 space-y-10">
            <div className={`transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="inline-block border border-blue-900/50 bg-blue-900/10 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-6">
                Regulatory Intelligence Unit
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold text-white tracking-tighter leading-tight mb-6">
                COMPLIANCE<br />
                INFRASTRUCTURE.
              </h2>
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed border-l-2 border-slate-700 pl-6 font-sans">
                Unified enforcement data for Michigan restaurant groups. Mitigate liability with county-level precision.
              </p>
            </div>

            {/* FEATURE GRID */}
            <div className={`grid sm:grid-cols-3 gap-4 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <FeatureItem 
                title="Enforcement" 
                desc="Washtenaw, Wayne & Oakland triggers." 
                icon={IconShield} 
              />
              <FeatureItem 
                title="Risk Logic" 
                desc="Priority (P) vs Core analysis." 
                icon={IconWarning} 
              />
              <FeatureItem 
                title="Unified Code" 
                desc="FDA 2022 + MI Modified Law." 
                icon={IconGrid} 
              />
            </div>
          </div>

          {/* RIGHT SIDE: THE LOGIN TERMINAL */}
          <div className="lg:col-span-5">
            <div className={`bg-white rounded-xl p-8 lg:p-10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wider font-mono">Terminal_Access</h3>
                <p className="text-slate-500 text-xs mt-2 font-sans">Enter authorized credentials to proceed.</p>
              </div>

              {/* TABS */}
              <div className="flex p-1 bg-slate-100 rounded-lg mb-8 font-sans">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${view === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Register
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${view === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email_Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-900 text-sm rounded-lg transition-all placeholder-slate-300 font-mono" 
                    placeholder="user@domain.com" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Passcode</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-900 text-sm rounded-lg transition-all placeholder-slate-300 font-mono" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#0f172a] hover:bg-blue-900 text-white font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-xs uppercase tracking-[0.15em] font-mono"
                >
                  {loading ? 'PROCESSING...' : (view === 'signup' ? 'INITIALIZE_ACCOUNT' : 'AUTHENTICATE')}
                </button>

                {message && (
                  <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    {message.text}
                  </div>
                )}
              </form>

              {view === 'signup' && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                  >
                    Ref: Fee_Structure.pdf
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full border-t border-white/10 py-8 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            © 2025 protocolLM. Michigan.
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="/contact" className="hover:text-white transition">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}
