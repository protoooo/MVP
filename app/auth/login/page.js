'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/supabaseAuth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { user, error: signInError } = await signIn(email, password)

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Redirect to upload page or dashboard
      router.push('/upload')
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] font-sans text-gray-900">
      {/* Official Gov Banner */}
      <div className="bg-[#1b1b1b] px-4 py-1">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="text-white text-[10px] uppercase tracking-wider font-semibold">
            ProtocolLM — Food Service Compliance
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b-4 border-[#1a4480]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col">
            <Link href="/" className="text-3xl font-bold text-[#1a4480] tracking-tight hover:text-[#112e5a]">
              ProtocolLM
            </Link>
            <p className="text-base text-gray-600 mt-1">Image Compliance Analysis</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-12">
        <div className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm">
          <h2 className="text-2xl font-bold text-[#1a4480] mb-2">Log In</h2>
          <p className="text-sm text-gray-600 mb-6">
            Access your compliance analysis account
          </p>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-[#1a4480] rounded-sm">
              <p className="text-sm text-blue-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-700 rounded-sm">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-[#1a4480] font-bold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1a4480] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
