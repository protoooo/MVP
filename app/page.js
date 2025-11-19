'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [session, setSession] = useState(null)
  const [view, setView] = useState('signup') // 'signup' or 'login'
  
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

    // CRITICAL: Use the Railway URL variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ 
        type: 'success', 
        text: view === 'login' 
          ? 'Magic link sent! Check your email to log in.' 
          : 'Account created! Check your email to confirm.' 
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
        
        {/* LOGO / TITLE */}
        <h1 className="text-2xl font-bold text-center mb-2">Welcome to Protocol</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Food safety intelligence and compliance for Washtenaw County.
        </p>

        {session ? (
          /* --- VIEW: ALREADY LOGGED IN --- */
          <div className="text-center space-y-4">
            <div className="p-3 bg-green-900/20 border border-green-800 rounded text-green-200 text-sm">
              You are logged in as <strong>{session.user.email}</strong>
            </div>
            <Link 
              href="/documents" 
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition"
            >
              Go to Dashboard
            </Link>
            <Link 
              href="/pricing" 
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              Upgrade Plan
            </Link>
          </div>
        ) : (
          /* --- VIEW: LOGIN / SIGNUP FORM --- */
          <>
            {/* TOGGLE BUTTONS */}
            <div className="flex border-b border-gray-700 mb-6">
              <button
                onClick={() => { setView('signup'); setMessage(null); }}
                className={`flex-1 pb-2 text-sm font-semibold ${view === 'signup' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}
              >
                Sign Up
              </button>
              <button
                onClick={() => { setView('login'); setMessage(null); }}
                className={`flex-1 pb-2 text-sm font-semibold ${view === 'login' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500'}`}
              >
                Log In
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {view === 'login' ? 'Email Address' : 'Work Email'}
                </label>
                <input
                  type="email"
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:border-indigo-500 focus:outline-none text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded transition"
              >
                {loading ? 'Sending Link...' : (view === 'login' ? 'Log In with Email' : 'Create Account')}
              </button>

              {message && (
                <div className={`p-3 rounded text-sm text-center ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                  {message.text}
                </div>
              )}
            </form>
          </>
        )}

        {/* FOOTER LINK TO PRICING */}
        {!session && (
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <Link 
              href="/pricing"
              className="text-sm text-gray-400 hover:text-white underline"
            >
              View Plans & Pricing
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
