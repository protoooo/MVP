'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [verifying, setVerifying] = useState(true)
  const [fatalError, setFatalError] = useState('')
  const [formError, setFormError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const tokenHash = params.get('token_hash')
        const type = params.get('type')

        if (!tokenHash || type !== 'recovery') {
          setFatalError('Invalid or expired reset link. Please request a new password reset.')
          setVerifying(false)
          return
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })

        if (error) {
          console.error('verifyOtp error:', error)
          setFatalError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        console.error('verifyOtp exception:', err)
        setFatalError('Failed to verify reset link. Please try again.')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [supabase])

  const handleBackHome = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut error (back home):', e)
    }
    router.push('/')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setFormError('')

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.error('updateUser error:', error)
        setFormError(error.message || 'Failed to update password.')
        setLoading(false)
        return
      }

      // Sign out the recovery session
      try {
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.error('signOut after reset error:', signOutErr)
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      console.error('Reset password exception:', err)
      setFormError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-md p-8">
        <h1 className="text-xl font-semibold mb-2 text-center">
          Reset your password
        </h1>
        <p className="text-sm text-neutral-600 mb-6 text-center">
          Choose a new password to secure your account.
        </p>

        {verifying && !fatalError && (
          <div className="mb-4 text-sm text-neutral-500 text-center">
            Verifying your reset link…
          </div>
        )}

        {fatalError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {fatalError}
          </div>
        )}

        {!verifying && !fatalError && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        {success && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Your password has been reset successfully! You can now sign in with your new password.
            </div>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Go to sign in
            </button>
          </div>
        )}

        <div className="mt-6 border-top border-neutral-200 pt-4 flex justify-center">
          <button
            type="button"
            onClick={handleBackHome}
            className="text-xs text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
