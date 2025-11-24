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
          setMessage({ type: 'success', text: 'Verification link sent to inbox.' })
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
      if (error.message.includes('Invalid login credentials')) errorMessage = 'Invalid credentials provided.'
      else if (error.message.includes('Email not confirmed')) errorMessage = 'Account pending confirmation.'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- CLEAN TEXT FEATURE (No Icons) ---
  const FeatureItem = ({ title, desc }) => (
    <div className="flex flex-col gap-2 p-6 bg-white border border-slate-200 hover:border-[#6b85a3] transition-colors duration-300">
      <h3 className="text-slate-900 font-bold text-xs uppercase tracking-widest">{title}</h3>
      <div className="h-px w-8 bg-[#6b85a3]"></div>
      <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-12 flex justify-between items-end border-b border-slate-200 pb-6">
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-xl font-bold tracking-tighter text-slate-900">
            protocol<span style={{ color: '#6b85a3' }}>LM</span>
          </h1>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          Authorized Use Only
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 flex flex-col gap-16">
        
        {/* INTRO SECTION */}
        <div className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <div className="inline-block px-3 py-1 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-[#6b85a3] mb-6 shadow-sm">
              Regulatory Intelligence Unit
            </div>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              Compliance<br />
              Infrastructure.
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed border-l-2 border-[#6b85a3] pl-4">
              Unified enforcement data for Michigan restaurant groups. Mitigate liability with county-level precision.
            </p>
          </div>

          {/* FEATURES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {/* LOGIN FORM (THE MONOLITH) */}
        <div className={`w-full max-w-md mx-auto mt-8 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-white p-8 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            
            <div className="flex gap-8 mb-8 border-b border-slate-100 pb-1">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'signup' ? 'border-[#6b85a3] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Create Account
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'login' ? 'border-[#6b85a3] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
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
                  className="w-full p-3 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-300" 
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
                  className="w-full p-3 bg-[#f8fafc] border border-slate-200 focus:border-[#6b85a3] focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-300" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full text-white font-bold py-4 shadow-sm transition-all hover:shadow-md mt-4 text-[10px] uppercase tracking-widest hover:opacity-90"
                style={{ backgroundColor: '#6b85a3' }}
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Initialize Account' : 'Authenticate')}
              </button>

              {message && (
                <div className={`p-4 text-[10px] font-bold uppercase tracking-wide border ${message.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-6 text-center pt-6 border-t border-slate-100">
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

      </div>

      {/* FOOTER */}
      <div className="w-full py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-200 pt-8">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            © 2025 protocolLM. Michigan.
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <a href="/terms" className="hover:text-[#6b85a3] transition">Terms</a>
            <a href="/privacy" className="hover:text-[#6b85a3] transition">Privacy</a>
            <a href="/contact" className="hover:text-[#6b85a3] transition">Contact</a>
          </div>
        </div>
      </div>
    </div>
  )
}
