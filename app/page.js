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
      {/* Left Side - Urgent Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float-delayed"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-1">
            protocol<span className="font-normal">LM</span>
          </h1>
          <div className="text-xs text-slate-300 font-medium">Michigan Restaurant Compliance</div>
        </div>
        
        {/* NEW: Urgent problem statement */}
        <div className="relative z-10 space-y-8">
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-6">
            <div className="text-sm text-slate-300 mb-2 font-semibold uppercase tracking-wide">The Reality</div>
            <p className="text-white text-2xl font-bold leading-tight mb-3">
              Health inspections happen without warning
            </p>
            <p className="text-slate-300 text-base leading-relaxed">
              Every restaurant in Michigan gets inspected 1-3 times per year. Most violations are preventable—but only if your staff knows exactly what inspectors are looking for.
            </p>
          </div>

          <div className="space-y-5">
            {/* Pain Point 1 */}
            <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-10 h-10 rounded-xl bg-red-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-red-400/30">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2 text-lg">Critical violations cost you money</h3>
                <p className="text-slate-300 text-sm leading-relaxed">Temperature violations, cross-contamination, improper storage—these aren&apos;t just notes on a report. They mean re-inspections, potential closures, and lost revenue.</p>
              </div>
            </div>

            {/* Pain Point 2 */}
            <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-orange-400/30">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2 text-lg">Food code books gather dust</h3>
                <p className="text-slate-300 text-sm leading-relaxed">You have the FDA Food Code somewhere. Your staff has never read it. When the inspector shows up, everyone scrambles. There&apos;s a better way.</p>
              </div>
            </div>
            
            {/* Pain Point 3 */}
            <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.3s' }}>
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-yellow-400/30">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2 text-lg">Questions need immediate answers</h3>
                <p className="text-slate-300 text-sm leading-relaxed">&quot;Can I cool soup in the walk-in?&quot; &quot;What temp for chicken?&quot; &quot;How long can this be out?&quot; Your team needs answers in seconds, not after digging through binders.</p>
              </div>
            </div>

            {/* Pain Point 4 */}
            <div className="flex items-start space-x-4 animate-slide-in" style={{ animationDelay: '0.4s' }}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2 text-lg">Catch violations before inspectors do</h3>
                <p className="text-slate-300 text-sm leading-relaxed">Take a photo of your line, cooler, or storage area. Get instant feedback on potential violations with exact regulatory citations and how to fix them—before it ends up on your inspection report.</p>
              </div>
            </div>

            {/* Solution Statement */}
            <div className="flex items-start space-x-4 animate-slide-in pt-4 border-t border-white/10" style={{ animationDelay: '0.5s' }}>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-green-400/30">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2 text-lg">One tool. All your answers.</h3>
                <p className="text-slate-300 text-sm leading-relaxed">FDA Food Code, Michigan regulations, county enforcement guidelines, and AI-powered image analysis—all accessible from your phone in seconds. No more guessing. No more violations you could have prevented.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-slate-400 text-xs relative z-10 font-medium">
          © 2025 protocolLM. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
              protocol<span className="font-normal">LM</span>
            </h1>
            <div className="text-xs text-slate-600 font-medium">Michigan Restaurant Compliance</div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.03em' }}>
              {view === 'signup' ? 'Stop guessing. Start knowing.' : 'Welcome back'}
            </h2>
            <p className="text-slate-600 text-base">
              {view === 'signup' 
                ? 'Join Michigan restaurants staying ahead of inspections' 
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
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Processing...' : (view === 'signup' ? 'Start 30-day free trial' : 'Sign in')}
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
                30-day free trial • From $49/month
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
