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

  // Helper component for the "Line Tracing" Card
  const TracingCard = ({ color, delay, children }) => (
    <div className="relative bg-white/90 backdrop-blur-sm rounded-xl p-5 shadow-sm group border border-slate-100">
      {/* The Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* The Animated Border (SVG Overlay) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-xl overflow-visible">
        <rect 
          x="1" y="1" 
          width="calc(100% - 2px)" 
          height="calc(100% - 2px)" 
          rx="11" 
          fill="none" 
          stroke={color} 
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="1200" 
          strokeDashoffset="1200"
          className={`draw-border ${mounted ? 'animate-draw' : ''}`}
          style={{ animationDelay: delay }}
        />
      </svg>
    </div>
  )

  return (
    <div className="h-screen w-full bg-white flex flex-col lg:flex-row overflow-hidden">
      
      <style jsx global>{`
        @keyframes drawBorder {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-draw {
          animation: drawBorder 3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* LEFT SIDE */}
      <div className="w-full lg:w-1/2 relative h-screen overflow-hidden bg-white">
        
        {/* Soft Background Texture (Blurred Blobs) - Darkened colors */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Orange Blob Top Left */}
          <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[#EA580C]/10 blur-[100px]" />
          {/* Pink Blob Middle Right */}
          <div className="absolute top-[30%] -right-[20%] w-[80%] h-[80%] rounded-full bg-[#E11D48]/10 blur-[120px]" />
          {/* Green Blob Bottom */}
          <div className="absolute -bottom-[20%] left-[10%] w-[60%] h-[60%] rounded-full bg-[#16A34A]/15 blur-[100px]" />
        </div>

        {/* Header */}
        <div className="relative z-10 px-8 pt-6 pb-2 lg:px-12 shrink-0">
          <div className={`inline-block transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-1">
              protocol<span className="font-normal">LM</span>
            </h1>
            {/* Multicolored Line - Darkened Gradient */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#16A34A] rounded-full"></div>
          </div>
          <div className={`text-xs text-slate-600 font-medium mt-1 transition-all duration-1000 delay-100 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            Michigan Restaurant Compliance
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex-1 px-8 lg:px-12 flex flex-col justify-start pt-8 lg:pt-12 min-h-0">
          <div className="relative max-w-xl pl-6 mx-auto w-full">
            {/* Multicolored Vertical Line Timeline - Darkened Gradient */}
            <div 
              className="absolute left-0 top-2 w-1 bg-gradient-to-b from-[#EA580C] via-[#E11D48] to-[#16A34A] rounded-full transition-all duration-[1500ms] ease-out"
              style={{ height: mounted ? '95%' : '0%' }}
            ></div>

            <div className="space-y-4">
              
              {/* CARD 1 - Darker Orange */}
              <TracingCard color="#EA580C" delay="100ms">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[#EA580C] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Health inspections happen without warning</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Be ready at all times with instant compliance checks.</p>
                  </div>
                </div>
              </TracingCard>

              {/* CARD 2 - Darker Pink */}
              <TracingCard color="#E11D48" delay="400ms">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[#E11D48] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Critical violations cost you money</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Re-inspections, closures, and lost revenue add up fast.</p>
                  </div>
                </div>
              </TracingCard>

              {/* CARD 3 - Darker Green */}
              <TracingCard color="#16A34A" delay="700ms">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[#16A34A] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Catch violations before inspectors do</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">AI analysis with exact regulatory citations.</p>
                  </div>
                </div>
              </TracingCard>

              {/* CARD 4 - Darker Orange */}
              <TracingCard color="#EA580C" delay="1000ms">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[#EA580C] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">Questions need immediate answers</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Your team needs answers in seconds, not hours.</p>
                  </div>
                </div>
              </TracingCard>

              {/* CARD 5 - Darker Green */}
              <TracingCard color="#16A34A" delay="1300ms">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[#16A34A] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1.5">One tool. All your answers.</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">Food Code, county guidelines, and AI analysis.</p>
                  </div>
                </div>
              </TracingCard>

            </div>
          </div>
        </div>

        {/* Footer - Increased spacing (mt-12) so it's not too close to the last card */}
        <div className={`text-slate-500 text-xs relative z-10 px-8 lg:px-12 mt-12 pb-6 font-medium transition-opacity duration-1000 delay-1000 shrink-0 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
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
              <div className="h-1.5 w-full bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#16A34A] rounded-full"></div>
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

          {/* Toggle with Matte Gradient for Active State - Darker Colors */}
          <div className="bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#16A34A] p-[2px] rounded-xl mb-5">
            <div className="flex rounded-[10px] bg-white overflow-hidden p-1">
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  view === 'signup' 
                    ? 'bg-gradient-to-r from-[#EA580C]/20 via-[#E11D48]/20 to-[#16A34A]/20 text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Sign up
              </button>
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  view === 'login' 
                    ? 'bg-gradient-to-r from-[#EA580C]/20 via-[#E11D48]/20 to-[#16A34A]/20 text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 bg-transparent'
                }`}
              >
                Sign in
              </button>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#EA580C] focus:ring-4 focus:ring-[#EA580C]/20 focus:outline-none text-slate-900 transition text-sm" placeholder="you@restaurant.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#E11D48] focus:ring-4 focus:ring-[#E11D48]/20 focus:outline-none text-slate-900 transition text-sm" placeholder="••••••••" />
            </div>
            
            {/* Multicolored Button - Darker Gradient */}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#16A34A] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm">
              {loading ? 'Processing...' : (view === 'signup' ? 'Start 30-day free trial' : 'Sign in')}
            </button>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-medium ${message.type === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-800' : 'bg-green-50 border-2 border-[#16A34A] text-green-800'}`}>
                {message.text}
              </div>
            )}
          </form>

          {view === 'signup' && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-center text-xs text-slate-600 mb-2 font-medium">30-day free trial • From $49/month</p>
              {/* View Pricing Button - White inside, colored border */}
              <button onClick={() => router.push('/pricing')} className="w-full bg-white border-2 border-[#EA580C] text-[#EA580C] hover:bg-orange-50 font-bold py-2.5 rounded-xl transition text-sm">View pricing plans</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
