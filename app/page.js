'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [view, setView] = useState('login') // Default to login like ChatGPT
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
          setMessage({ type: 'success', text: 'Check your email to confirm.' })
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
      else if (error.message.includes('Email not confirmed')) errorMessage = 'Please confirm your email.'
      setMessage({ type: 'error', text: errorMessage })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white font-sans text-slate-900 selection:bg-[#6b85a3] selection:text-white flex flex-col items-center justify-center p-6">
      
      <div className={`w-full max-w-[320px] flex flex-col items-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* LOGO */}
        <div className="mb-10 text-center">
          <div className="w-12 h-12 bg-[#6b85a3] rounded-full mx-auto mb-6 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {view === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
        </div>

        {/* FORM */}
        <form onSubmit={handleAuth} className="w-full space-y-4">
          <div className="relative">
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
              className="peer w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg focus:border-[#6b85a3] focus:ring-1 focus:ring-[#6b85a3] focus:outline-none text-slate-900 text-[15px] transition-all placeholder-transparent" 
              placeholder="Email address" 
              id="email"
            />
            <label 
              htmlFor="email"
              className="absolute left-4 top-3.5 text-slate-500 text-[15px] transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#6b85a3] peer-focus:bg-white peer-focus:px-1 peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:bg-white peer-not-placeholder-shown:px-1 cursor-text"
            >
              Email address
            </label>
          </div>

          <div className="relative">
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength={6}
              disabled={loading}
              className="peer w-full px-4 py-3.5 bg-white border border-slate-300 rounded-lg focus:border-[#6b85a3] focus:ring-1 focus:ring-[#6b85a3] focus:outline-none text-slate-900 text-[15px] transition-all placeholder-transparent" 
              placeholder="Password" 
              id="password"
            />
            <label 
              htmlFor="password"
              className="absolute left-4 top-3.5 text-slate-500 text-[15px] transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-[#6b85a3] peer-focus:bg-white peer-focus:px-1 peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:bg-white peer-not-placeholder-shown:px-1 cursor-text"
            >
              Password
            </label>
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full text-white font-medium py-3.5 rounded-lg shadow-none hover:opacity-90 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed text-[15px]"
            style={{ backgroundColor: '#6b85a3' }}
          >
            {loading ? '...' : (view === 'signup' ? 'Continue' : 'Continue')}
          </button>

          {message && (
            <div className={`text-center text-xs mt-4 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {message.text}
            </div>
          )}
        </form>

        {/* TOGGLE */}
        <div className="mt-6 text-sm text-slate-600">
          {view === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => { setView('signup'); setMessage(null); }} 
                className="text-[#6b85a3] hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => { setView('login'); setMessage(null); }} 
                className="text-[#6b85a3] hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 w-full flex justify-center gap-6 text-xs text-slate-400">
          <button onClick={() => router.push('/pricing')} className="hover:text-slate-600">Pricing</button>
          <a href="/terms" className="hover:text-slate-600">Terms</a>
          <a href="/privacy" className="hover:text-slate-600">Privacy</a>
        </div>

      </div>
    </div>
  )
}
