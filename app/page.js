'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

const COUNTIES = [
  { value: 'washtenaw', label: 'Washtenaw County' },
  { value: 'wayne', label: 'Wayne County' },
  { value: 'oakland', label: 'Oakland County' }
]

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [county, setCounty] = useState('washtenaw')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('signup')
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              county: county
            }
          }
        })

        if (error) throw error

        if (data.session) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ county: county })
            .eq('id', data.session.user.id)

          if (profileError) {
            console.error('Profile update error:', profileError)
          }

          router.push('/pricing')
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Account created! Please check your email to confirm before logging in.' 
          })
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.is_subscribed) {
          router.push('/documents')
        } else {
          router.push('/pricing')
        }
      }
    } catch (error) {
      console.error("Auth Error:", error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 to-black p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float-delayed"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
            protocol<span className="font-black">LM</span>
          </h1>
          <p className="text-slate-300 text-base font-medium">Southeast Michigan Restaurant Compliance</p>
        </div>
        
        <div className="space-y-8 relative z-10">
          <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.1s' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-lg">Instant Compliance Answers</h3>
              <p className="text-slate-300 text-sm leading-relaxed">Get immediate answers to food safety questions using AI trained on FDA, Michigan, and county-specific regulations</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-lg">Multi-County Coverage</h3>
              <p className="text-slate-300 text-sm leading-relaxed">Access county-specific regulations for Washtenaw, Wayne, and Oakland counties with one simple interface</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-lg">Photo Violation Analysis</h3>
              <p className="text-slate-300 text-sm leading-relaxed">Upload images to identify potential violations and get instant remediation guidance</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.4s' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-lg">Complete Reference Library</h3>
              <p className="text-slate-300 text-sm leading-relaxed">Access FDA Food Code, Michigan regulations, and county enforcement guidelines all in one place</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.5s' }}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2 text-lg">Mobile-First Design</h3>
              <p className="text-slate-300 text-sm leading-relaxed">Access compliance tools on any device, optimized for use during kitchen inspections</p>
            </div>
          </div>
        </div>
        
        <div className="text-slate-400 text-xs relative z-10 font-medium">
          © 2024 protocolLM. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
              protocol<span className="font-black">LM</span>
            </h1>
            <p className="text-slate-600 text-base">Southeast Michigan Restaurant Compliance</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.03em' }}>
              {view === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-slate-600 text-base">
              {view === 'signup' 
                ? 'Start your 7-day free trial today' 
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 mb-8">
            <button
              onClick={() => { setView('signup'); setMessage(null); }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                view === 'signup' 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign up
            </button>
            <button
              onClick={() => { setView('login'); setMessage(null); }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                view === 'login' 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {view === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Your County
                </label>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 focus:outline-none text-slate-900 transition font-medium"
                >
                  {COUNTIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Select where your restaurant operates. You can change this later.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 focus:outline-none text-slate-900 transition"
                placeholder="you@restaurant.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 focus:outline-none text-slate-900 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Processing...' : (view === 'signup' ? 'Create account' : 'Sign in')}
            </button>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium ${
                message.type === 'error' 
                  ? 'bg-red-50 border-2 border-red-200 text-red-800' 
                  : 'bg-green-50 border-2 border-green-200 text-green-800'
              }`}>
                {message.text}
              </div>
            )}
          </form>

          {view === 'signup' && (
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-center text-sm text-slate-600 mb-4 font-medium">
                7-day free trial • No credit card required
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 rounded-xl transition"
              >
                View pricing plans
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(10px); }
        }
        
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
