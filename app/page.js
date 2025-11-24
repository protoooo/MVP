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
          setMessage({ type: 'success', text: 'Verification email sent. Please check your inbox.' })
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

  // --- SOLID, STABLE ICONS ---
  const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>)
  const IconWarning = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)
  const IconGrid = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /><path d="M12 22V12" /></svg>)
  const IconHazmat = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>)

  const FeatureItem = ({ icon: Icon, title, desc }) => (
    <div className="flex items-start gap-4 group">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-teal-100 border border-white/10 transition-colors group-hover:bg-white/10">
        <Icon />
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm tracking-wide mb-1">{title}</h3>
        <p className="text-teal-100/60 text-xs leading-relaxed max-w-xs">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white font-sans selection:bg-[#022c22] selection:text-white">
      
      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        {/* LEFT SIDE - "The Vault" */}
        <div className="w-full lg:w-[45%] bg-[#022c22] relative px-12 py-12 flex flex-col justify-between overflow-hidden">
          
          {/* Subtle Texture (Noise) - Adds "Premium Paper" feel */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          
          {/* Top Gradient for depth */}
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

          {/* Logo */}
          <div className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              protocol<span className="font-normal text-teal-400">LM</span>
            </h1>
          </div>
          
          {/* Center Content */}
          <div className={`relative z-10 space-y-10 my-auto transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="space-y-2">
              <h2 className="text-3xl font-light text-white tracking-tight">
                Unified Regulatory<br />Intelligence.
              </h2>
              <div className="h-1 w-12 bg-teal-500"></div>
            </div>

            <div className="space-y-8 pt-4">
              <FeatureItem 
                title="Enforcement Data" 
                desc="Washtenaw, Wayne & Oakland County violation triggers." icon={IconShield} 
              />
              <FeatureItem 
                title="Violation Risk" 
                desc="Identify Priority (P) vs. Core risks before they become fines." icon={IconWarning} 
              />
              <FeatureItem 
                title="Unified Code" 
                desc="FDA 2022 + Michigan Modified Food Law integration." icon={IconGrid} 
              />
            </div>
          </div>

          {/* Footer */}
          <div className={`relative z-10 text-teal-200/40 text-[10px] font-medium tracking-widest uppercase transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Secure Enterprise Access
          </div>
        </div>

        {/* RIGHT SIDE - "The Application" */}
        <div className="w-full lg:w-[55%] bg-white relative px-8 lg:px-20 py-12 flex flex-col justify-center">
          
          <div className="max-w-md w-full mx-auto">
            
            <div className="mb-12">
              <h3 className="text-slate-900 text-2xl font-bold tracking-tight mb-2">Welcome back</h3>
              <p className="text-slate-500 text-sm">Please enter your details to access the dashboard.</p>
            </div>

            {/* Toggle Tabs - Minimal */}
            <div className="flex space-x-8 border-b border-slate-100 mb-8">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${view === 'signup' ? 'border-[#022c22] text-[#022c22]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Create Account
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${view === 'login' ? 'border-[#022c22] text-[#022c22]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#022c22] focus:ring-1 focus:ring-[#022c22] focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-400" 
                  placeholder="name@company.com" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#022c22] focus:ring-1 focus:ring-[#022c22] focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-400" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#022c22] hover:bg-[#0f3c3a] text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-xs uppercase tracking-widest transform active:scale-[0.99]"
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Get Started' : 'Sign In')}
              </button>

              {message && (
                <div className={`p-4 rounded-lg text-xs font-medium flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-800'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${message.type === 'error' ? 'bg-red-500' : 'bg-teal-500'}`}></div>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500 mb-3">Not sure yet?</p>
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-xs font-bold text-[#022c22] hover:text-teal-800 transition-colors uppercase tracking-wide flex items-center justify-center gap-2 mx-auto group"
                >
                  View Plans & Pricing
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            )}
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-20 z-10 mt-12 lg:mt-0 w-full max-w-md mx-auto lg:mx-0">
             <div className="flex justify-center lg:justify-start gap-6 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <a href="/terms" className="hover:text-slate-900 transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
                <a href="/contact" className="hover:text-slate-900 transition-colors">Support</a>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
