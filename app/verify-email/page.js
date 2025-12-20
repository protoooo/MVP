// app/verify-email/page.js - COMPLETE FILE with auto-redirect after verification
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function VerifyEmailPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // If email is verified, redirect to pricing to start trial
      if (user.email_confirmed_at) {
        console.log('✅ Email already verified, redirecting to pricing')
        router.push('/?showPricing=true&emailVerified=true')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const handleResend = async () => {
    setResending(true)
    setMessage('')

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (!res.ok) {
        setMessageType('error')
        setMessage(data.error || 'Failed to send verification email')
      } else {
        setMessageType('success')
        setMessage('Verification email sent! Check your inbox and spam folder.')
      }
    } catch (error) {
      setMessageType('error')
      setMessage('An unexpected error occurred')
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white/70">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-[0_40px_120px_rgba(0,0,0,0.75)]">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div className={`text-white text-xl font-semibold text-center mb-2 ${outfit.className}`}>
          Verify Your Email
        </div>
        
        <div className={`text-white/60 text-sm text-center mb-6 ${inter.className}`}>
          We sent a verification link to:
          <div className="text-white/90 font-medium mt-1">{user?.email}</div>
        </div>

        {message && (
          <div className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
            messageType === 'error' 
              ? 'border-red-500/30 bg-red-500/10 text-red-200' 
              : 'border-green-500/30 bg-green-500/10 text-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-3">
          <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70 ${inter.className}`}>
            <p className="mb-2">📧 <strong className="text-white/90">Check your email</strong></p>
            <p className="text-xs">
              Click the verification link to activate your account and start your free trial.
            </p>
          </div>

          <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70 ${inter.className}`}>
            <p className="mb-2">📂 <strong className="text-white/90">Check spam folder</strong></p>
            <p className="text-xs">
              If you don't see it in your inbox, check your spam or junk folder.
            </p>
          </div>

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full rounded-xl bg-white text-black font-semibold py-3 disabled:opacity-50 hover:bg-white/90 transition"
          >
            {resending ? 'Sending…' : 'Resend Verification Email'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full rounded-xl border border-white/10 bg-transparent text-white/70 py-3 hover:bg-white/[0.04] transition"
          >
            Sign Out
          </button>
        </div>

        <div className={`mt-4 text-center text-xs text-white/40 ${inter.className}`}>
          After verifying, you'll be redirected to start your 7-day free trial
        </div>
      </div>
    </div>
  )
}
