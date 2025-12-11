'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)

  const [error, setError] = useState('')
  const [fatalError, setFatalError] = useState(false) // true = bad/expired link
  const [message, setMessage] = useState('')
  const [resetComplete, setResetComplete] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setError('Invalid or expired reset link. Please request a new password reset.')
          setFatalError(true)
        }
      } catch (err) {
        console.error('Error checking session for reset:', err)
        setError('Failed to verify reset link. Please try again.')
        setFatalError(true)
      } finally {
        setVerifying(false)
      }
    }

    checkSession()
  }, [supabase])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || resetComplete || fatalError) return

    setError('')
    setMessage('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        console.error('Update password error:', updateError)
        setError(updateError.message || 'Failed to update password.')
        setLoading(false)
        return
      }

      // Optional but matches your expectation: user should sign in again
      try {
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.warn('Sign out after reset failed:', signOutErr)
      }

      setResetComplete(true)
      setMessage('Your password has been reset. You can now sign in with your new password.')
    } catch (err) {
      console.error('Reset password exception:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
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

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ✅ Success state – only ONE green box */}
        {resetComplete && !fatalError && (
          <div className="space-y-4">
            {message && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push('/signin')}
              className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Go to sign in
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-2 w-full text-xs text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
            >
              Back to home
            </button>
          </div>
        )}

        {/* Show form only when:
            - not verifying
            - no fatal link error
            - not already completed */}
        {!verifying && !fatalError && !resetComplete && (
          <>
            {message && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="mt-6 border-t border-neutral-200 pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
              >
                Back to home
              </button>
            </div>
          </>
        )}

        {/* Fatal error + done verifying -> just show back-home */}
        {!verifying && fatalError && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
