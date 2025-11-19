'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  // Toggle between 'login' and 'signup'
  const [view, setView] = useState('signup')
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (view === 'signup') {
        // --- FLOW: SIGN UP -> PRICING ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // If email confirmation is disabled in Supabase, this logs them in immediately
            data: {
              is_subscribed: false // Default to false until they pay
            }
          }
        })

        if (error) throw error

        if (data.session) {
          // Success: Redirect immediately to Pricing to get them to pay
          router.push('/pricing')
        } else {
          // If Supabase requires email verification
          setMessage({ 
            type: 'success', 
            text: 'Account created! Please check your email to confirm, then Log In.' 
          })
          setView('login')
        }

      } else {
        // --- FLOW: LOG IN -> DASHBOARD (OR PRICING) ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // Check if they actually have a subscription
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', data.session.user.id)
          .single()

        if (profile && profile.is_subscribed) {
          router.push('/documents')
        } else {
          // Logged in but hasn't paid? Send to pricing.
          router.push('/pricing')
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1117] text-white p-4 font-sans">
      <div className="w-full max-w-md bg-[#161b22] p-8 rounded-2xl shadow-2xl border border-gray-800">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">PROTOCOL</h1>
          <p className="text-gray-500 text-sm">Washtenaw Food Safety Intelligence</p>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 gap-1 bg-gray-800 p-1 rounded-lg mb-6">
          <button
            onClick={() => { setView('signup'); setMessage(null); }}
            className={`py-2 text-sm font-semibold rounded-md transition-all ${
              view === 'signup' ? 'bg-[#161b22] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setView('login'); setMessage(null); }}
            className={`py-2 text-sm font-semibold rounded-md transition-all ${
              view === 'login' ? 'bg-[#161b22] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#0f1117] border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white transition"
              placeholder="name@restaurant.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-[#0f1117] border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Processing...' : (view === 'signup' ? 'Create Account & View Plans' : 'Access Dashboard')}
          </button>

          {message && (
            <div className={`p-4 rounded-xl text-sm text-center border ${
              message.type === 'error' 
                ? 'bg-red-900/20 border-red-900/50 text-red-200' 
                : 'bg-green-900/20 border-green-900/50 text-green-200'
            }`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
