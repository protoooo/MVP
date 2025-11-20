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
      
      {/* LEFT SIDE - Animated gradient background with geometric shapes */}
      <div className="w-full lg:w-1/2 animated-gradient flex flex-col relative h-screen overflow-hidden">
        {/* Decorative geometric shapes */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          {/* Spearmint circles */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#86EFAC] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#FB923C] rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-[#FB7185] rounded-full blur-3xl"></div>
        </div>
        
        {/* Header - Minimal spacing */}
        <div className="relative z-10 px-8 pt-5 pb-2 lg:px-12 shrink-0">
          <div className={`inline-block transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-1">
              protocol<span className="font-normal">LM</span>
            </h1>
            <div className="h-1 w-full bg-gradient-to-r from-[#86EFAC] via-[#FB923C] to-[#FB7185] rounded-full"></div>
          </div>
          <div className={`text-xs text-slate-600 font-medium mt-1 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Michigan Restaurant Compliance
          </div>
        </div>
        
        {/* Content - Minimal gap, larger cards */}
        <div className="relative z-10 flex-1 px-8 lg:px-12 flex flex-col justify-center min-h-0 py-1">
          <div className="relative max-w-xl pl-6 mx-auto w-full">
            {/* Animated gradient line */}
            <div 
              className="absolute left-0 top-2 w-1 bg-gradient-to-b from-[#86EFAC] via-[#FB923C] to-[#FB7185] rounded-full transition-all duration-[1500ms] ease-out shadow-lg"
              style={{ height: mounted ? '95%' : '0%' }}
            ></div>

            <div className="space-y-3.5">
              
              {/* CARD 1 */}
              <div className="card-reveal bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-5 shadow-lg" style={{ animationDelay: '0ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#FB923C]/70 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Health inspections happen without warning</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Be ready at all times with instant compliance checks.</p>
                  </div>
                </div>
              </div>

              {/* CARD 2 */}
              <div className="card-reveal bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-5 shadow-lg" style={{ animationDelay: '200ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB7185] to-[#FB7185]/70 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Critical violations cost you money</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Re-inspections, closures, and lost revenue add up fast.</p>
                  </div>
                </div>
              </div>

              {/* CARD 3 */}
              <div className="card-reveal bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-5 shadow-lg" style={{ animationDelay: '400ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#86EFAC] to-[#86EFAC]/70 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Catch violations before inspectors do</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">AI analysis with exact regulatory citations.</p>
                  </div>
                </div>
              </div>

              {/* CARD 4 */}
              <div className="card-reveal bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-5 shadow-lg" style={{ animationDelay: '600ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#FB923C] to-[#FB923C]/70 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Questions need immediate answers</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Your team needs answers in seconds, not hours.</p>
                  </div>
                </div>
              </div>

              {/* CARD 5 */}
              <div className="card-reveal bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-5 shadow-lg" style={{ animationDelay: '800ms' }}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#86EFAC] to-[#86EFAC]/70 flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">One tool. All your answers.</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Food Code, county guidelines, and AI analysis.</p>
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
              <div className="h-1 w-full bg-gradient-to-r from-[#86EFAC] via-[#FB923C] to-[#FB7185] rounded-full"></div>
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#86EFAC] focus:ring-4 focus:ring-[#86EFAC]/20 focus:outline-none text-slate-900 transition text-sm" placeholder="you@restaurant.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#86EFAC] focus:ring-4 focus:ring-[#86EFAC]/20 focus:outline-none text-slate-900 transition text-sm" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#86EFAC] to-[#4ADE80] hover:from-[#4ADE80] hover:to-[#22C55E] text-slate-900 font-semibold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm">
              {loading ? 'Processing...' : (view === 'signup' ? 'Start 30-day free trial' : 'Sign in')}
            </button>
            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-green-50 border-2 border-[#86EFAC] text-green-800'}`}>
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
