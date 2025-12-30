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
          <h2 className="text-2xl font-bold text-primary mb-2">Log In</h2>
          <p className="text-sm text-text-secondary mb-8">
            Access your compliance analysis account
          </p>

          {message && (
            <div className="mb-6 alert-info animate-slideDown">
              <p className="text-sm">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 alert-danger animate-shake">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5"
            >
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border-default text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-primary font-semibold hover:text-primary-dark transition-colors">
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
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
