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
          setMessage({ type: 'success', text: '✅ Check your email to confirm your account, then you can sign in.' })
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
      else if (error.message.includes('Email not confirmed')) errorMessage = 'Please check your email and confirm your account first.'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  // --- ICONS ---
  const IconShield = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" /></svg>)
  const IconWarning = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeLinejoin="round" /></svg>)
  const IconGrid = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 22V12" strokeLinecap="round" strokeLinejoin="round" /></svg>)
  const IconHazmat = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1"><circle cx="12" cy="8" r="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="15" r="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16" cy="15" r="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 10v3" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 13.5l-2 1" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 13.5l2 1" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" /></svg>)

  // --- MICHIGAN MAP COMPONENT ---
  const MichiganMap = () => (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" className="w-full h-full map-trace text-teal-400/30" strokeWidth="2">
      {/* Lower Peninsula */}
      <path d="M130 180 L130 190 L80 190 L75 180 L70 150 L65 130 L70 110 L85 90 L110 75 L130 85 L140 100 L150 110 L155 130 L150 150 L145 160 L130 180 Z" strokeLinecap="round" strokeLinejoin="round" />
      {/* Upper Peninsula */}
      <path d="M50 80 L60 70 L80 65 L100 70 L120 75 L110 80 L90 85 L70 90 L60 85 L50 80 Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const FeatureCard = ({ icon: Icon, title, desc, delay, iconColor, glowColor }) => (
    <div 
      className={`group flex items-center gap-5 p-6 rounded-xl border border-teal-900/50 bg-[#022c22]/50 hover:bg-[#042f2e] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: delay }}
    >
      <div className={`relative shrink-0 w-16 h-16 flex items-center justify-center ${iconColor} transition-all duration-500 ease-out`}>
        <div className={`absolute inset-0 ${glowColor} blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
        <Icon />
      </div>
      <div className="min-w-0 relative z-10">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-2">{title}</h3>
        <p className="text-teal-200/70 text-sm leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white font-sans selection:bg-[#022c22] selection:text-white">
      <style jsx global>{`
        /* ICONS */
        .icon-trace path, .icon-trace circle, .icon-trace line {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: trace 3s ease-in-out forwards;
        }
        
        /* MAP - Slower, longer trace */
        .map-trace path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: trace 8s ease-out forwards;
        }

        .group:hover .icon-trace path, 
        .group:hover .icon-trace circle,
        .group:hover .icon-trace line {
          animation: trace 2s ease-in-out infinite;
        }

        @keyframes trace {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes traceMap {
           0% { stroke-dashoffset: 1000; }
           100% { stroke-dashoffset: 0; }
        }
        .map-trace path {
           animation-name: traceMap;
        }
      `}</style>

      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 bg-[#022c22] relative overflow-hidden px-8 py-6 flex flex-col lg:pb-40">
          
          {/* BACKGROUND GRADIENT - Moved BEHIND map */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#0f5149]/40 via-[#022c22] to-[#022c22] opacity-80 pointer-events-none z-0"></div>

          {/* BACKGROUND MAP - Moved ON TOP of gradient, z-index 0 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
             <div className="w-[140%] h-[140%] -translate-x-5 translate-y-10 opacity-40 rotate-3">
                <MichiganMap />
             </div>
          </div>

          {/* TOP LOGO - z-index 20 to sit above everything */}
          <div className="lg:absolute lg:top-12 lg:left-12 z-20 mb-10 lg:mb-0 mt-4 lg:mt-0">
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                protocol<span className="font-normal text-teal-300">LM</span>
              </h1>
              <div className="h-[1px] w-24 bg-teal-500/30"></div>
            </div>
          </div>
          
          {/* FEATURE CARDS - z-index 10 */}
          <div className="flex-1 flex flex-col justify-center z-10 relative">
            <div className="max-w-lg mx-auto w-full pt-4 lg:mt-12">
              <div className="grid gap-4">
                <FeatureCard 
                  delay="100ms"
                  title="Enforcement Data"
                  desc="Trained on Washtenaw, Wayne & Oakland County violation triggers."
                  icon={IconShield}
                  iconColor="text-teal-300 group-hover:text-teal-100"
                  glowColor="bg-teal-500/30"
                />
                <FeatureCard 
                  delay="200ms"
                  title="Violation Risk"
                  desc="Identify Priority, Foundation, and Core risks before they become fines."
                  icon={IconWarning}
                  iconColor="text-rose-400 group-hover:text-rose-200"
                  glowColor="bg-rose-500/30"
                />
                <FeatureCard 
                  delay="300ms"
                  title="Unified Code"
                  desc="FDA Food Code synthesized with Michigan Food Law."
                  icon={IconGrid}
                  iconColor="text-sky-400 group-hover:text-sky-200"
                  glowColor="bg-sky-500/30"
                />
                <FeatureCard 
                  delay="400ms"
                  title="Hazmat Protocols"
                  desc="Immediate guidance for contamination events."
                  icon={IconHazmat}
                  iconColor="text-amber-400 group-hover:text-amber-200"
                  glowColor="bg-amber-500/30"
                />
              </div>
            </div>
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-12 z-10 mt-10 lg:mt-0">
            <div className={`text-teal-400/50 text-[10px] font-bold uppercase tracking-widest flex gap-8 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <span>Encrypted</span>
              <span>Private</span>
              <span>Institutional</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 bg-white relative px-8 py-6 flex flex-col lg:pb-40">
          <div className="hidden lg:block lg:h-24"></div> 
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-full max-w-md mx-auto">
              <div className="mb-12">
                <h2 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-[1.1] text-balance">
                  {view === 'signup' ? 'Join Michigan restaurant groups staying ahead of inspections.' : 'Welcome back.'}
                </h2>
              </div>

              <div className="flex border-b border-slate-200 mb-8">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`pb-2 text-xs font-bold uppercase tracking-wide mr-8 transition-all duration-200 border-b-2 ${view === 'signup' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                >
                  Create Account
                </button>
                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`pb-2 text-xs font-bold uppercase tracking-wide transition-all duration-200 border-b-2 ${view === 'login' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
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
                    className="w-full px-0 py-3 border-b border-slate-300 focus:border-[#022c22] focus:ring-0 focus:outline-none text-slate-900 transition text-base md:text-sm bg-transparent placeholder-slate-400 rounded-none disabled:opacity-50" 
                    placeholder="name@company.com" 
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
                    className="w-full px-0 py-3 border-b border-slate-300 focus:border-[#022c22] focus:ring-0 focus:outline-none text-slate-900 transition text-base md:text-sm bg-transparent placeholder-slate-400 rounded-none disabled:opacity-50" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#022c22] hover:bg-[#0f3c3a] text-white font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-xs uppercase tracking-widest"
                >
                  {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Access Dashboard')}
                </button>

                {message && (
                  <div className={`p-4 text-xs font-medium border ${message.type === 'error' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-teal-50 border-teal-100 text-teal-900'}`}>
                    {message.text}
                  </div>
                )}
              </form>

              <div className="mt-8 text-center">
                {view === 'signup' && (
                  <button 
                    onClick={() => router.push('/pricing')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-wider"
                  >
                    View Plans & Pricing
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:absolute lg:bottom-12 lg:left-8 z-10 mt-10 lg:mt-0 text-center lg:text-left w-full">
             <div className="flex justify-center lg:justify-start gap-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <a href="/terms" className="hover:text-slate-600 transition">Terms</a>
                <a href="/privacy" className="hover:text-slate-600 transition">Privacy</a>
                <a href="/contact" className="hover:text-slate-600 transition">Contact</a>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
