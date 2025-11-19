'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [session, setSession] = useState(null)
  
  // States: 'signup', 'magic_link', 'password_login'
  const [authMode, setAuthMode] = useState('signup')
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }
    getSession()
  }, [supabase])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    baseUrl = baseUrl.replace(/\/$/, '')

    let error, data

    // --- SIGN UP (Magic Link for verification) ---
    if (authMode === 'signup') {
      const res = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${baseUrl}/auth/callback` },
      })
      error = res.error
    } 
    // --- LOGIN (Magic Link) ---
    else if (authMode === 'magic_link') {
      const res = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${baseUrl}/auth/callback` },
      })
      error = res.error
    }
    // --- LOGIN (Password) ---
    else if (authMode === 'password_login') {
      const res = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      error = res.error
      data = res.data
      if (data?.session) {
        router.push('/documents')
        return
      }
    }

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      if (authMode === 'password_login') {
        // Should have redirected, but just in case
        router.push('/documents')
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Link sent! Check your email to continue.' 
        })
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to Protocol</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Food safety intelligence & compliance.
        </p>

        {session ? (
          <div className="text-center space-y-4">
            <div className="p-3 bg-green-900/20 border border-green-800 rounded text-green-200 text-sm">
              Logged in as <strong>{session.user.email}</strong>
            </div>
            <Link href="/documents" className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* TABS */}
            <div className="flex border-b border-gray-700 mb-6">
              <button
                onClick={() => { setAuthMode('signup'); setMessage(null); }}
                className={`flex-1 pb-2 text-xs font-semibold ${authMode === 'signup' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setAuthMode('magic_link'); setMessage(null); }}
                className={`flex-1 pb-2 text-xs font-semibold ${authMode === 'magic_link' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}
              >
                Magic Link
              </button>
              <button
                onClick={() => { setAuthMode('password_login'); setMessage(null); }}
                className={`flex-1 pb-2 text-xs font-semibold ${authMode === 'password_login' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}
              >
                Password
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:outline-none text-white"
                />
              </div>

              {authMode === 'password_login' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:outline-none text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded transition"
              >
                {loading ? 'Processing...' : 
                  authMode === 'signup' ? 'Sign Up' : 
                  authMode === 'magic_link' ? 'Send Magic Link' : 'Log In'}
              </button>

              {message && (
                <div className={`p-3 rounded text-sm text-center ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                  {message.text}
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
