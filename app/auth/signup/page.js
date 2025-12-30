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
    <div className="min-h-screen bg-bg-secondary font-sans text-text-primary">
      {/* Official Gov Banner */}
      <div className="bg-text-primary px-4 py-1.5">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <span className="text-white text-xs uppercase tracking-wider font-semibold">
            ProtocolLM — Food Service Compliance
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-bg-primary border-b border-border-default shadow-soft">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col">
            <Link href="/" className="text-3xl font-bold text-primary tracking-tight hover:text-primary-dark transition-colors">
              ProtocolLM
            </Link>
            <p className="text-base text-text-secondary mt-1">Image Compliance Analysis</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-16">
        <div className="card animate-fadeInUp">
          <h2 className="text-2xl font-bold text-primary mb-2">Create Account</h2>
          <p className="text-sm text-text-secondary mb-8">
            Sign up to start analyzing your food service compliance
          </p>

          {error && (
            <div className="mb-6 alert-danger animate-shake">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border-default text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-semibold hover:text-primary-dark transition-colors">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
