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
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', session.user.id)
          .single()

        if (profile?.is_subscribed) {
          router.push('/documents')
        } else {
          router.push('/pricing')
        }
      }
    }
    
    checkAuth()
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
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        })
        
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
      console.error('❌ Auth error:', error)
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

  // --- ANIMATED ICONS ---
  
  const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const IconPriority = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1">
      <path d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3c4.97 0 9 1.79 9 4s-4.03 4-9 4-9-1.79-9-4 4.03-4 9-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const IconGrid = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const IconOrb = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full icon-trace" strokeWidth="1">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12h20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
    <div 
      // Adjusted padding to p-6 (was p-8) to fit better on screen
      className={`group flex items-center gap-5 p-6 rounded-xl border border-teal-900/50 bg-[#022c22]/50 hover:bg-[#042f2e] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: delay }}
    >
      {/* Adjusted size to w-16 (was w-20) */}
      <div className="relative shrink-0 w-16 h-16 flex items-center justify-center text-teal-100 group-hover:text-white transition-all duration-500 ease-out">
        <div className="absolute inset-0 bg-teal-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <Icon />
      </div>
      <div className="min-w-0 relative z-10">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-2">{title}</h3>
        <p className="text-teal-200/70 text-sm leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <style jsx global>{`
        .icon-trace path, .icon-trace circle {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: trace 3s ease-in-out forwards;
        }
        .group:hover .icon-trace path, .group:hover .icon-trace circle {
          animation: trace 2s ease-in-out infinite;
        }
        @keyframes trace {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 bg-[#022c22] relative overflow-hidden px-8 py-6 flex flex-col lg:pb-40">
          
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#0f5149] via-[#022c22] to-[#022c22] opacity-60 pointer-events-none"></div>

          {/* Header: Increased top margin/padding for safety */}
          <div className="lg:absolute lg:top-12 lg:left-12 z-20 mb-10 lg:mb-0 mt-4 lg:mt-0">
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                protocol<span className="font-normal text-teal-300">LM</span>
              </h1>
              <div className="h-[1px] w-24 bg-teal-500/30"></div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center z-10">
            {/* Added lg:mt-20 to push content down from header if needed */}
            <div className="max-w-lg mx-auto w-full pt-4 lg:mt-16">
              {/* Reduced gap from 6 to 4 to save vertical space */}
              <div className="grid gap-4">
                <FeatureCard 
                  delay="100ms"
                  title="Enforcement Data"
                  desc="Trained on Washtenaw & Wayne County violation triggers."
                  icon={IconShield}
                />
                <FeatureCard 
                  delay="200ms"
                  title="Priority Violations"
                  desc="Identify 'Priority (P)' and 'Foundation (Pf)' risks before they become fines."
                  icon={IconPriority}
                />
                <FeatureCard 
                  delay="300ms"
                  title="Unified Code"
                  desc="FDA Food Code synthesized with Michigan Food Law."
                  icon={IconGrid}
                />
                <FeatureCard 
                  delay="400ms"
                  title="Hazmat Protocols"
                  desc="Immediate guidance for Norovirus and contamination events."
                  icon={IconOrb}
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
                    className="w-full px-0 py-3 border-b border-slate-300 focus:border-[#022c22] focus:ring-0 focus:outline-none text-slate-900 transition text-base md:text-sm bg-transparent placeholder-slate-400 rounded-none" 
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
                    className="w-full px-0 py-3 border-b border-slate-300 focus:border-[#022c22] focus:ring-0 focus:outline-none text-slate-900 transition text-base md:text-sm bg-transparent placeholder-slate-400 rounded-none" 
                    placeholder="••••••••" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#022c22] hover:bg-[#0f3c3a] text-white font-bold py-4 rounded shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-xs uppercase tracking-widest"
                >
                  {loading ? 'Processing...' : (view === 'signup' ? 'Start Free Trial' : 'Access Dashboard')}
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
