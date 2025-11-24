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

  // --- TEXT-ONLY FEATURE COMPONENT ---
  const FeatureItem = ({ title, desc }) => (
    <div className="group border-l-2 border-slate-200 pl-6 py-1 hover:border-slate-400 transition-colors duration-500">
      <h3 className="text-slate-900 font-bold text-xs uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed max-w-sm">{desc}</p>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] font-mono text-slate-900 selection:bg-slate-200 selection:text-black">
      
      <div className="flex flex-col-reverse lg:flex-row min-h-screen border-x border-slate-200 max-w-[1600px] mx-auto box-content">
        
        {/* LEFT SIDE - "The Briefing" */}
        {/* Matte Light Steel Blue Background */}
        <div className="w-full lg:w-[45%] bg-[#f1f5f9] relative px-12 py-12 flex flex-col justify-between border-r border-slate-200">
          
          {/* Header */}
          <div className="relative z-10">
            <div className={`transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-lg font-bold tracking-tighter text-slate-900">
                protocol<span className="text-slate-400">LM</span>
              </h1>
              <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                <span>Ver 2.4</span>
                <span className="text-slate-300">|</span>
                <span>Michigan Systems</span>
              </div>
            </div>
          </div>
          
          {/* Center Content */}
          <div className={`relative z-10 space-y-12 my-auto transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="space-y-6">
              <div className="inline-block px-3 py-1 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Regulatory Intelligence Unit
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Compliance<br />
                Infrastructure.
              </h2>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed border-l border-slate-300 pl-4">
                Unified enforcement data for Michigan restaurant groups. Mitigate liability with county-level precision.
              </p>
            </div>

            <div className="space-y-8 pt-4">
              <FeatureItem 
                title="Enforcement Data" 
                desc="Trained on Washtenaw, Wayne, and Oakland County violation triggers." 
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

          {/* Footer */}
          <div className={`relative z-10 flex gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            System Active
          </div>
        </div>

        {/* RIGHT SIDE - "The Form" */}
        <div className="w-full lg:w-[55%] bg-white relative px-8 lg:px-24 py-12 flex flex-col justify-center">
          
          <div className="max-w-md w-full mx-auto">
            
            <div className="mb-12 pt-8 lg:pt-0">
              <h3 className="text-slate-900 text-xl font-bold tracking-tight uppercase mb-2">Authorized Access</h3>
              <p className="text-slate-500 text-xs">Enter credentials to proceed.</p>
            </div>

            {/* Minimal Text Tabs */}
            <div className="flex gap-8 mb-10 border-b border-slate-100 pb-px">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'signup' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Create Account
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${view === 'login' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                  className="w-full py-3 bg-transparent border-b border-slate-200 focus:border-slate-900 focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-300 rounded-none" 
                  placeholder="user@domain.com" 
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6}
                  disabled={loading}
                  className="w-full py-3 bg-transparent border-b border-slate-200 focus:border-slate-900 focus:ring-0 focus:outline-none text-slate-900 text-sm transition-all placeholder-slate-300 rounded-none" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-sm shadow-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-8 text-xs uppercase tracking-widest"
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Initialize Account' : 'Authenticate')}
              </button>

              {message && (
                <div className={`p-4 text-[10px] font-bold uppercase tracking-wide bg-slate-50 border border-slate-200 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-8 text-center">
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
                >
                  View Fee Structure
                </button>
              </div>
            )}
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-24 z-10 mt-16 lg:mt-0 w-full max-w-md mx-auto lg:mx-0 border-t border-slate-100 pt-6 lg:border-none lg:pt-0">
             <div className="flex justify-center lg:justify-start gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <a href="/terms" className="hover:text-slate-900 transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
                <a href="/contact" className="hover:text-slate-900 transition-colors">Contact</a>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
