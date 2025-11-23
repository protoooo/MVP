'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('signup')
  const [mounted, setMounted] = useState(false)
   
  const router = useRouter()
  const supabase = createClientComponentClient()

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
          options: {
            emailRedirectTo: redirectUrl,
            data: { county: 'washtenaw' }
          }
        })
        
        if (error) throw error
        
        if (data.session) {
          window.location.href = '/pricing'
        } else if (data.user && !data.session) {
          setMessage({ 
            type: 'success', 
            text: '✅ Account created. Please check your email to verify.' 
          })
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Account created. Check your email to continue.' 
          })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.is_subscribed) {
          window.location.href = '/documents'
        } else {
          window.location.href = '/pricing'
        }
      }
    } catch (error) {
      let errorMessage = error.message
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address.'
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'Account exists. Please sign in.'
      }
      
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // New "Feature Item" - High contrast, icon-based, concise
  const FeatureItem = ({ icon, title, desc, delay }) => (
    <div 
      className={`flex items-start gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
      style={{ transitionDelay: delay }}
    >
      <div className="shrink-0 w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-bold text-sm mb-1">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed max-w-sm">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        {/* LEFT SIDE (Dark Navy - High End Look) */}
        <div className="w-full lg:w-1/2 bg-slate-900 flex flex-col justify-center relative overflow-hidden px-6 sm:px-8 lg:px-12 py-12 lg:pb-32">
          
          {/* Subtle background radial gradient for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-900 pointer-events-none"></div>

          {/* Logo anchored to top-left */}
          <div className="absolute top-0 left-0 w-full p-6 sm:p-8 lg:p-12 z-20 pointer-events-none">
            <div className={`inline-block transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                protocol<span className="font-normal text-slate-400">LM</span>
              </h1>
              <div className="h-0.5 w-full bg-white/20"></div>
            </div>
          </div>
          
          <div className="max-w-xl mx-auto w-full z-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10">
              System Intelligence
            </p>

            <div className="space-y-10">
              <FeatureItem 
                delay="100ms"
                title="Local Enforcement Data"
                desc="Trained on specific Washtenaw & Wayne County enforcement triggers and priority violations."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <FeatureItem 
                delay="200ms"
                title="Time & Temp Controls"
                desc="Automated procedures for TPHC (Time as a Public Health Control) and cooling logs."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <FeatureItem 
                delay="300ms"
                title="State Code Synthesis"
                desc="A single source of truth combining the FDA Food Code with Michigan Modified Food Law."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              />
              <FeatureItem 
                delay="400ms"
                title="Contamination Protocols"
                desc="Immediate emergency guidance for vomit, diarrhea, and Norovirus events."
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              />
            </div>
          </div>

          {/* Footer anchored to bottom-left */}
          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 lg:p-12 text-slate-500 text-[10px] font-medium uppercase tracking-wider z-20">
            <div className={`flex flex-wrap gap-6 transition-opacity duration-1000 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <span>Bank-Grade Security</span>
              <span>Enterprise Ready</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (Login/Signup Form) */}
        <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center px-6 sm:px-8 lg:p-12 py-12 z-20 min-h-screen">
          
          <div className="w-full max-w-md mx-auto">
            
            {/* Mobile Logo */}
            <div className="mb-10 lg:hidden">
              <div className="inline-block">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">protocol<span className="font-normal">LM</span></h1>
                <div className="h-0.5 w-full bg-slate-900"></div>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                {view === 'signup' ? 'Join Michigan restaurant groups staying ahead of inspections.' : 'Sign in to dashboard.'}
              </h2>
            </div>

            {/* Toggle Switch */}
            <div className="flex border-b border-slate-200 mb-8">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`pb-2 text-sm font-bold mr-6 transition-all duration-200 border-b-2 ${view === 'signup' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
              >
                Create Account
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`pb-2 text-sm font-bold transition-all duration-200 border-b-2 ${view === 'login' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 rounded-none border border-slate-300 focus:border-slate-900 focus:ring-0 focus:outline-none text-slate-900 transition text-sm bg-white placeholder-slate-400" 
                  placeholder="name@company.com" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6} 
                  className="w-full px-4 py-3 rounded-none border border-slate-300 focus:border-slate-900 focus:ring-0 focus:outline-none text-slate-900 transition text-sm bg-white placeholder-slate-400" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-none shadow-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 tracking-wide text-sm"
              >
                {loading ? 'PROCESSING...' : (view === 'signup' ? 'START TRIAL' : 'ACCESS DASHBOARD')}
              </button>

              {message && (
                <div className={`p-4 text-xs font-medium border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                  {message.text}
                </div>
              )}
            </form>

            <div className="mt-8 text-center">
              {view === 'signup' && (
                <button 
                  onClick={() => router.push('/pricing')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 border-b border-slate-300 hover:border-slate-900 pb-0.5 transition-all"
                >
                  View Plans & Pricing
                </button>
              )}
            </div>

            <div className="mt-12 text-center">
               <div className="flex justify-center gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <a href="/terms" className="hover:text-slate-600">Terms</a>
                  <a href="/privacy" className="hover:text-slate-600">Privacy</a>
                  <a href="/contact" className="hover:text-slate-600">Contact</a>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
