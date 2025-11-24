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
          setMessage({ type: 'success', text: 'Verification email sent. Check inbox.' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'Invalid email or password.'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'Account pending confirmation.'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- ICONS ---
  const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8" strokeWidth="1.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
  const IconWarning = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8" strokeWidth="1.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
  const IconGrid = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8" strokeWidth="1.2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /><path d="M12 22V12" /></svg>)

  const FeatureItem = ({ icon: Icon, title, desc }) => (
    <div className="flex flex-col gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="text-teal-300 opacity-80">
        <Icon />
      </div>
      <div>
        <h3 className="text-white font-bold text-lg tracking-wide mb-2">{title}</h3>
        <p className="text-teal-100/60 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#022c22] font-sans selection:bg-teal-500 selection:text-white flex flex-col">
      
      {/* NAVBAR */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center z-20">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            protocol<span className="font-normal text-teal-400">LM</span>
          </h1>
        </div>
        <div className={`text-xs font-bold uppercase tracking-widest text-teal-400/60 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          Authorized Access Only
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col justify-center relative w-full max-w-7xl mx-auto px-6 pb-20">
        
        {/* BACKGROUND GLOW */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* LEFT SIDE: HUGE TYPOGRAPHY */}
          <div className="lg:col-span-7 space-y-12">
            <div className={`transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]">
                Regulatory<br />
                <span className="text-teal-400">Intelligence</span> Unit.
              </h2>
              <p className="text-xl text-teal-100/70 mt-6 max-w-lg leading-relaxed">
                Unified compliance infrastructure for Michigan restaurant groups. Mitigate liability with county-level enforcement data.
              </p>
            </div>

            {/* BIGGER FEATURE CARDS */}
            <div className={`grid sm:grid-cols-3 gap-4 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <FeatureItem 
                title="Enforcement" 
                desc="Washtenaw, Wayne & Oakland triggers." 
                icon={IconShield} 
              />
              <FeatureItem 
                title="Risk Logic" 
                desc="Priority (P) vs Core violation analysis." 
                icon={IconWarning} 
              />
              <FeatureItem 
                title="Unified Code" 
                desc="FDA 2022 + MI Modified Food Law." 
                icon={IconGrid} 
              />
            </div>
          </div>

          {/* RIGHT SIDE: THE LOGIN CARD (THE MONOLITH) */}
          <div className="lg:col-span-5">
            <div className={`bg-white rounded-3xl p-8 lg:p-10 shadow-2xl shadow-black/30 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Access</h3>
                <p className="text-slate-500 text-sm">Enter credentials to initialize session.</p>
              </div>

              {/* TABS */}
              <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${view === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  New Account
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${view === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#022c22] focus:ring-1 focus:ring-[#022c22] focus:outline-none text-slate-900 text-base transition-all placeholder-slate-400" 
                    placeholder="name@company.com" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    minLength={6}
                    disabled={loading}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#022c22] focus:ring-1 focus:ring-[#022c22] focus:outline-none text-slate-900 text-base transition-all placeholder-slate-400" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#022c22] hover:bg-[#064e3b] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm uppercase tracking-widest"
                >
                  {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Secure Login')}
                </button>

                {message && (
                  <div className={`p-4 rounded-xl text-xs font-medium flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-800'}`}>
                    {message.text}
                  </div>
                )}
              </form>

              {view === 'signup' && (
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="text-xs font-bold text-slate-400 hover:text-[#022c22] transition-colors uppercase tracking-wide"
                  >
                    View Pricing & Fees
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-teal-100/40 text-[10px] font-bold uppercase tracking-widest">
            © 2025 protocolLM. Michigan.
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-teal-100/60">
            <a href="/terms" className="hover:text-white transition">Terms</a>
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="/contact" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}
