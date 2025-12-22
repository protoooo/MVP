// ============================================================================
// FILE 4: app/signup/page.js - NEW FILE
// ============================================================================
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function SignupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [inviteCode] = useState(searchParams?.get('invite') || '')
  const [inviteValid, setInviteValid] = useState(null)
  const [inviteDetails, setInviteDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Validate invite code on mount
  useEffect(() => {
    async function validateInvite() {
      if (!inviteCode) {
        setInviteValid(false)
        setError('No invite code provided')
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/validate-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode })
        })

        const data = await res.json()

        if (res.ok && data.valid) {
          setInviteValid(true)
          setInviteDetails(data.details)
        } else {
          setInviteValid(false)
          setError(data.error || 'Invalid invite code')
        }
      } catch (err) {
        console.error('Invite validation error:', err)
        setInviteValid(false)
        setError('Failed to validate invite code')
      } finally {
        setLoading(false)
      }
    }

    validateInvite()
  }, [inviteCode])

  const handleSignup = async (e) => {
    e.preventDefault()
    if (submitting) return

    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)

    try {
      // Create account
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?type=signup`,
          data: {
            invite_code: inviteCode,
            source: 'multi_location_invite',
            location_number: inviteDetails?.location_number,
            total_locations: inviteDetails?.total_locations
          }
        }
      })

      if (signupError) {
        setError(signupError.message)
        setSubmitting(false)
        return
      }

      if (!data.user) {
        setError('Failed to create account')
        setSubmitting(false)
        return
      }

      // Mark invite as used
      const useRes = await fetch('/api/use-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, userId: data.user.id })
      })

      if (!useRes.ok) {
        console.error('Failed to mark invite as used (non-blocking)')
      }

      // Redirect to verify email
      router.push('/verify-email')

    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={`${ibmMono.className} min-h-[100dvh] bg-[#09090b] flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white/70">Validating invite code...</div>
        </div>
      </div>
    )
  }

  if (!inviteValid) {
    return (
      <div className={`${ibmMono.className} min-h-[100dvh] bg-[#09090b] flex items-center justify-center px-4`}>
        <div className="max-w-md w-full bg-[#131316] border border-white/10 rounded-xl p-8 text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-3">Invalid Invite Code</h1>
          <p className="text-white/70 mb-6 text-sm leading-relaxed">
            {error || 'This invite code is invalid, expired, or has already been used.'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-semibold"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${ibmMono.className} min-h-[100dvh] bg-[#09090b]`}>
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0c0c0e]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src={appleIcon} alt="" width={40} height={40} />
            <span className="text-lg font-bold text-white">protocolLM</span>
          </Link>
          <Link href="/auth" className="text-sm text-white/70 hover:text-white">
            Already have an account? Sign in
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Location Badge */}
          <div className="text-center mb-6">
            <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-semibold mb-4">
              📍 Location {inviteDetails?.location_number} of {inviteDetails?.total_locations}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Create Your Account</h1>
            <p className="text-white/70 text-sm">
              Set up your protocolLM account for this location
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-[#131316] border border-white/10 rounded-xl p-8">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@restaurant.com"
                  required
                  className="w-full px-4 py-3 bg-[#0c0c0e] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full px-4 py-3 bg-[#0c0c0e] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none transition pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs font-semibold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-4 py-3 bg-[#0c0c0e] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 text-white font-semibold rounded-lg transition"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account & Start Trial'
                )}
              </button>
            </form>

            {/* Warning */}
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-xs leading-relaxed">
                ⚠️ <strong>Important:</strong> This account is for Location {inviteDetails?.location_number} only. Do not share login credentials across locations.
              </p>
            </div>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-white/50">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-400 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
