'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/supabaseAuth'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const { user, error: signUpError } = await signUp(email, password)

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Redirect to login or subscription page
      router.push('/auth/login?message=Account created! Please check your email to verify.')
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
          <h2 className="text-2xl font-bold text-[#1a4480] mb-2">Create Account</h2>
          <p className="text-sm text-gray-600 mb-6">
            Sign up to start analyzing your food service compliance
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-700 rounded-sm">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
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
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#1a4480] font-bold hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
