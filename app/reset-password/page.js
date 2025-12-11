'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // separate errors:
  const [linkError, setLinkError] = useState('')   // problems with the email link / session
  const [formError, setFormError] = useState('')   // problems with what the user typed
  const [verifying, setVerifying] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  // 1) Check that we actually have a valid session from /auth/callback
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data?.session

        if (!session && isMounted) {
          setLinkError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        console.error('Error checking session for reset:', err)
        if (isMounted) {
          setLinkError('Failed to verify reset link. Please try again.')
        }
      } finally {
        if (isMounted) {
          setVerifying(false)
        }
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [supabase])

  // 2) Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setFormError('')

    // basic validation
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
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        console.error('Update password error:', updateError)
        setFormError(updateError.message || 'Failed to update password.')
        setLoading(false)
        return
      }

      setMessage('Password updated successfully. Please sign in with your new password.')
      setLoading(false)

      // Important: sign the user OUT after changing the password
      // so they are forced to log in again.
      try {
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.error('Error signing out after password reset:', signOutErr)
      }

      // small delay so they see the success message, then go home / sign-in
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      console.error('Reset password exception:', err)
      setFormError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // 3) Back to home should NOT leave them silently logged in
  const handleBackHome = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out on back to home:', err)
    }
    router.push('/')
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

        {/* verifying state */}
        {verifying && !linkError && (
          <div className="mb-4 text-sm text-neutral-500 text-center">
            Verifying your reset link…
          </div>
        )}

        {/* link-level error (bad / expired email link) */}
        {linkError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {linkError}
          </div>
        )}

        {/* success message after updating */}
        {message && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* Only hide the form if the link itself is invalid.
            For normal form errors, keep the form visible so they can retry. */}
        {!verifying && !linkError && (
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

            {/* form-level errors (password too short, mismatch, etc.) */}
            {formError && (
              <p className="text-xs text-red-600">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-neutral-200 pt-4 flex justify-center">
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
