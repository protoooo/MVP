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
          setMessage({ type: 'success', text: 'VERIFICATION_LINK_SENT' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'CREDENTIALS_INVALID'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'ACCOUNT_PENDING'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- ICONS (Precision Style) ---
  const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
  const IconWarning = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
  const IconGrid = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /><path d="M12 22V12" /></svg>)

  const FeatureItem = ({ icon: Icon, title, desc }) => (
    <div className="flex flex-col gap-2 p-5 border border-slate-200 bg-white hover:border-slate-400 transition-colors">
      <div className="text-slate-800">
        <Icon />
      </div>
      <div>
        <h3 className="text-slate-900 font-bold text-sm tracking-wide uppercase">{title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] font-mono text-slate-900 selection:bg-slate-300 selection:text-black flex flex-col">
      
      {/* Technical Grid Background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* NAVBAR */}
      <nav className="w-full max-w-[1400px] mx-auto px-6 py-6 flex justify-between items-center z-20 relative border-b border-slate-300/50">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            PROTOCOL_LM<span className="text-slate-400">_SYS</span>
          </h1>
        </div>
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          MI_NETWORK_ACTIVE
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col justify-center relative w-full max-w-[1400px] mx-auto px-6 pb-20 pt-10">
        
        <div className="grid lg:grid-cols-12 gap-16 items-center relative z-10">
          
          {/* LEFT SIDE: DATA DISPLAY */}
          <div className="lg:col-span-7 space-y-12">
            <div className={`transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="inline-block border border-slate-300 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 bg-white">
                Regulatory Intelligence Unit
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 tracking-tighter leading-none mb-6">
                COMPLIANCE<br />
                INFRASTRUCTURE.
              </h2>
              <p className="text-lg text-slate-600 max-w-lg leading-relaxed border-l-2 border-slate-300 pl-4">
                Unified enforcement data for Michigan restaurant groups. Mitigate liability with county-level precision.
              </p>
            </div>

            {/* FEATURE GRID */}
            <div className={`grid sm:grid-cols-3 gap-0 border border-slate-300 bg-white shadow-sm transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="p-6 border-r border-slate-300">
                <div className="text-slate-900 mb-3"><IconShield /></div>
                <h3 className="font-bold text-xs uppercase mb-1">Enforcement</h3>
                <p className="text-[10px] text-slate-500">Washtenaw / Wayne / Oakland triggers.</p>
              </div>
              <div className="p-6 border-r border-slate-300">
                <div className="text-slate-900 mb-3"><IconWarning /></div>
                <h3 className="font-bold text-xs uppercase mb-1">Risk Logic</h3>
                <p className="text-[10px] text-slate-500">Priority (P) vs Core analysis.</p>
              </div>
              <div className="p-6">
                <div className="text-slate-900 mb-3"><IconGrid /></div>
                <h3 className="font-bold text-xs uppercase mb-1">Unified Code</h3>
                <p className="text-[10px] text-slate-500">FDA 2022 + MI Modified Law.</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: THE LOGIN TERMINAL */}
          <div className="lg:col-span-5">
            <div className={`bg-white border-2 border-slate-900 p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,0.1)] transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              
              <div className="mb-8 border-b border-slate-200 pb-4">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Terminal_Access</h3>
                <p className="text-slate-500 text-xs mt-1">Enter authorized credentials.</p>
              </div>

              {/* TABS */}
              <div className="flex mb-6 text-xs font-bold uppercase tracking-widest">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`flex-1 py-2 border-b-2 transition-all text-center ${view === 'signup' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Register
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`flex-1 py-2 border-b-2 transition-all text-center ${view === 'login' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-slate-900 focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-400 rounded-none" 
                    placeholder="CORP_ID@DOMAIN.COM" 
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-slate-900 focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-400 rounded-none" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-slate-900 hover:bg-blue-900 text-white font-bold py-4 rounded-none shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-xs uppercase tracking-[0.2em]"
                >
                  {loading ? 'PROCESSING...' : (view === 'signup' ? 'INITIALIZE_ACCOUNT' : 'AUTHENTICATE')}
                </button>

                {message && (
                  <div className={`p-3 text-[10px] font-bold uppercase tracking-wide border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    {message.text}
                  </div>
                )}
              </form>

              {view === 'signup' && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest border-b border-transparent hover:border-slate-900"
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
      <div className="w-full border-t border-slate-200 py-6 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            © 2025 protocolLM. Michigan.
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <a href="/terms" className="hover:text-slate-900 transition">Terms_Svc</a>
            <a href="/privacy" className="hover:text-slate-900 transition">Privacy_Pol</a>
            <a href="/contact" className="hover:text-slate-900 transition">Admin_Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}
