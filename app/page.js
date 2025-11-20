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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { county: 'washtenaw' }
          }
        })
        if (error) throw error
        if (data.session) {
          router.push('/pricing')
        } else {
          setMessage({ type: 'success', text: 'Account created! Check email to confirm.' })
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
    <div className="h-screen w-full bg-white flex flex-col lg:flex-row overflow-hidden">
      
      {/* LEFT SIDE */}
      <div className="w-full lg:w-1/2 bg-slate-900 flex flex-col relative h-screen overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950"></div>
          {/* Animated grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Header */}
        <div className="relative z-10 px-8 pt-5 pb-2 lg:px-12 shrink-0">
          <div className={`inline-block transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-1">
              protocol<span className="font-normal">LM</span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-orange-400 to-pink-400 rounded-full"></div>
          </div>
          <div className={`text-xs text-slate-400 font-medium mt-1 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Michigan Restaurant Compliance
          </div>
        </div>
        
        {/* Content - Larger cards, minimal gaps */}
        <div className="relative z-10 flex-1 px-8 lg:px-12 flex flex-col justify-center min-h-0 py-2">
          <div className="relative max-w-xl pl-6 mx-auto w-full">
            {/* Animated Line */}
            <div 
              className="absolute left-0 top-2 w-0.5 bg-gradient-to-b from-emerald-400 via-orange-400 to-pink-400 rounded-full transition-all duration-[1500ms] ease-out"
              style={{ height: mounted ? '95%' : '0%' }}
            ></div>

            <div className="space-y-3">
              
              {/* CARD 1 */}
              <div className={`card-reveal bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '200ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">Health inspections happen without warning</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Be ready at all times with instant compliance checks.</p>
                  </div>
                </div>
              </div>

              {/* CARD 2 */}
              <div className={`card-reveal bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '400ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">Critical violations cost you money</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Re-inspections, closures, and lost revenue add up fast.</p>
                  </div>
                </div>
              </div>

              {/* CARD 3 */}
              <div className={`card-reveal bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '600ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">Catch violations before inspectors do</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">AI analysis with exact regulatory citations.</p>
                  </div>
                </div>
              </div>

              {/* CARD 4 */}
              <div className={`card-reveal bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '800ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">Questions need immediate answers</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Your team needs answers in seconds, not hours.</p>
                  </div>
                </div>
              </div>

              {/* CARD 5 */}
              <div className={`card-reveal bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: '1000ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">One tool. All your answers.</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">Food Code, county guidelines, and AI analysis.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-slate-500 text-xs relative z-10 px-8 lg:px-12 pb-3 font-medium transition-opacity duration-1000 delay-1000 shrink-0 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          © 2025 protocolLM. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 h-screen overflow-hidden">
        <div className="w-full max-w-md">
          
          {/* Mobile Header */}
          <div className="mb-4 lg:hidden">
            <div className="inline-block">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">protocol<span className="font-normal">LM</span></h1>
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-orange-400 to-pink-400 rounded-full"></div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2 tracking-tight">
              {view === 'signup' ? 'Stop guessing. Start knowing.' : 'Welcome back'}
            </h2>
            <p className="text-slate-600 text-sm">
              {view === 'signup' ? 'Join Michigan restaurants staying ahead of inspections' : 'Sign in to access your dashboard'}
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
            <button onClick={() => { setView('signup'); setMessage(null); }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${view === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Sign up</button>
            <button onClick={() => { setView('login'); setMessage(null); }} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${view === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Sign in</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none text-slate-900 transition text-sm" placeholder="you@restaurant.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none text-slate-900 transition text-sm" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm">
              {loading ? 'Processing...' : (view === 'signup' ? 'Start 30-day free trial' : 'Sign in')}
            </button>
            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-emerald-50 border-2 border-emerald-200 text-emerald-800'}`}>
                {message.text}
              </div>
            )}
          </form>

          {view === 'signup' && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-center text-xs text-slate-600 mb-2 font-medium">30-day free trial • From $49/month</p>
              <button onClick={() => router.push('/pricing')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2.5 rounded-xl transition text-sm">View pricing plans</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
