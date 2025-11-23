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

  // Enterprise Brand Colors
  const brandColor = '#0f172a' // Slate 900
  const accentColor = '#ea580c' // Orange 600

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
            text: '✅ Account created! Please check your email and click the confirmation link.' 
          })
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Account created! Check your email to continue.' 
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
        errorMessage = 'Invalid email or password. Please try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before signing in.'
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.'
      }
      
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  // Updated to use a uniform professional color (Orange) for the tracing effect
  const TracingCard = ({ delay, icon, title, desc }) => (
    <div className="relative bg-white border border-slate-200 rounded-lg p-5 shadow-sm transition-all duration-300 z-10">
      <div className="relative z-10 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-md bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-700">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-slate-900 font-bold text-sm sm:text-base mb-1">{title}</h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{desc}</p>
        </div>
      </div>
      {/* The tracing line is now uniform Orange for a cohesive brand look */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-lg overflow-visible">
        <rect 
          x="1" y="1" 
          width="calc(100% - 2px)" 
          height="calc(100% - 2px)" 
          rx="7" 
          fill="none" 
          stroke={accentColor} 
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="800" 
          strokeDashoffset="800"
          className={`draw-border ${mounted ? 'animate-draw' : ''}`}
          style={{ animationDelay: delay }}
        />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-white">
      <style jsx global>{`
        @keyframes drawBorder {
          to { stroke-dashoffset: 0; }
        }
        .animate-draw {
          animation: drawBorder 2s ease-out forwards;
        }
        /* Subtle Technical Grid Background */
        .bg-tech-grid {
          background-size: 40px 40px;
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
        }
      `}</style>

      <div className="flex flex-col-reverse lg:flex-row min-h-screen">
        
        {/* LEFT SIDE (Informational) */}
        <div className="w-full lg:w-1/2 bg-slate-50 border-t lg:border-t-0 lg:border-r border-slate-200 flex flex-col lg:pt-20 relative overflow-hidden">
          
          {/* Static Background Pattern */}
          <div className="absolute inset-0 bg-tech-grid opacity-40 pointer-events-none"></div>
          
          {/* Header */}
          <div className="hidden lg:block px-6 sm:px-8 lg:px-12 pt-6 pb-4 shrink-0 lg:absolute lg:top-0 lg:left-0 lg:w-full z-10">
            <div className={`inline-block transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                protocol<span className="font-normal text-slate-500">LM</span>
              </h1>
              {/* Brand Accent Line */}
              <div className="h-1 w-12 bg-orange-600 rounded-full"></div>
            </div>
            <div className={`text-xs text-slate-500 font-bold mt-2 uppercase tracking-wider transition-all duration-700 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              Michigan Restaurant Compliance
            </div>
          </div>
          
          {/* Content Cards */}
          <div className="flex-1 flex flex-col justify-start px-6 sm:px-8 lg:px-12 py-8 lg:pb-8 lg:mt-8 z-10">
            <div className="relative max-w-xl pl-6 mx-auto w-full">
              {/* Connecting Vertical Line */}
              <div 
                className="absolute left-0 top-2 w-0.5 bg-slate-200 rounded-full transition-all duration-[1500ms] ease-out"
                style={{ height: mounted ? '95%' : '0%' }}
              ></div>

              <div className="space-y-4">
                <TracingCard 
                  delay="100ms" 
                  title="Unannounced Inspections"
                  desc="Health inspections happen without warning. Be ready instantly."
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                />

                <TracingCard 
                  delay="300ms" 
                  title="Protect Revenue"
                  desc="Critical violations cause closures. Protect your bottom line."
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />

                <TracingCard 
                  delay="500ms" 
                  title="Visual Verification"
                  desc="Snap a photo of equipment. We verify compliance against County & State codes."
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>}
                />

                <TracingCard 
                  delay="700ms" 
                  title="Instant Answers"
                  desc="Your managers need answers in seconds, not hours. 24/7 Availability."
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />

                <TracingCard 
                  delay="900ms" 
                  title="Unified Standards"
                  desc="One tool for FDA Food Code, Michigan Law, and County specifics."
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />

              </div>
            </div>
          </div>

          <div className={`px-6 sm:px-8 lg:px-12 pb-6 text-slate-400 text-xs font-medium transition-opacity duration-1000 delay-1000 shrink-0 z-10 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-2">
              <a href="/privacy" className="hover:text-slate-600 transition">Privacy Policy</a>
              <span>•</span>
              <a href="/terms" className="hover:text-slate-600 transition">Terms of Service</a>
              <span>•</span>
              <a href="/contact" className="hover:text-slate-600 transition">Contact</a>
            </div>
            <div className="text-center lg:text-left">
              © 2025 protocolLM. All rights reserved.
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (Login/Signup Form) */}
        <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center lg:justify-start items-center px-6 sm:px-8 lg:p-12 lg:pt-32 z-20 min-h-screen">
          
          <div className="w-full max-w-lg mx-auto">
            
            <div className="mb-8 lg:hidden">
              <div className="inline-block">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">protocol<span className="font-normal">LM</span></h1>
                <div className="h-1 w-12 bg-orange-600 rounded-full"></div>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                {view === 'signup' ? 'Stop guessing. Start knowing.' : 'Welcome back'}
              </h2>
              
              <p className="text-base text-slate-600 font-normal w-full mx-auto leading-relaxed">
                {view === 'signup' ? 'Join Michigan restaurant groups staying ahead of inspections.' : 'Sign in to access your dashboard.'}
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="bg-slate-100 p-1 rounded-lg mb-6 max-w-sm mx-auto w-full">
              <div className="flex rounded-md overflow-hidden relative">
                <button 
                  onClick={() => { setView('signup'); setMessage(null); }} 
                  className={`flex-1 py-2 text-sm font-semibold transition-all duration-200 rounded-md z-10 ${view === 'signup' ? 'text-slate-900 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign up
                </button>

                <button 
                  onClick={() => { setView('login'); setMessage(null); }} 
                  className={`flex-1 py-2 text-sm font-semibold transition-all duration-200 rounded-md z-10 ${view === 'login' ? 'text-slate-900 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign in
                </button>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Email address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none text-slate-900 transition text-sm bg-white" 
                  placeholder="you@company.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6} 
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none text-slate-900 transition text-sm bg-white" 
                  placeholder="••••••••" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Processing...' : (view === 'signup' ? 'Start 30-Day Free Trial' : 'Sign In')}
              </button>

              {message && (
                <div className={`p-4 rounded-lg text-sm font-medium border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                  {message.text}
                </div>
              )}
            </form>

            {view === 'signup' && (
              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Enterprise Grade Compliance</p>
                <div className="flex justify-center gap-2 items-center text-xs text-slate-400">
                   <span>Secure</span> • <span>Private</span> • <span>Reliable</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
