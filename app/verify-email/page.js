// app/verify-email/page.js - Light frosted theme matching landing page
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

export default function VerifyEmailPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.view = 'landing'
    }
  }, [])

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

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
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-slate-600">Loading…</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        html[data-view='landing'] body {
          background: transparent;
        }
      `}</style>

      <div className={`${plusJakarta.className} min-h-[100dvh] flex items-center justify-center px-4`}>
        <div className="w-full max-w-md">
          {/* Light frosted card matching landing page */}
          <div style={{
            background: 'linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.88))',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            borderRadius: '18px',
            padding: '32px',
            boxShadow: '0 20px 55px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.55)'
          }}>
            {/* Header with logo */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Link href="/" style={{ display: 'inline-block', marginBottom: '16px' }}>
                <Image src={appleIcon} alt="" width={64} height={64} priority />
              </Link>
            </div>

            {/* Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              borderRadius: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="32" height="32" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center',
              color: 'rgba(15, 23, 42, 0.92)',
              marginBottom: '8px'
            }}>
              Verify Your Email
            </h1>
            
            <p style={{
              textAlign: 'center',
              fontSize: '14px',
              color: 'rgba(30, 41, 59, 0.74)',
              marginBottom: '8px'
            }}>
              We sent a verification link to:
            </p>
            
            <p style={{
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: '600',
              color: 'rgba(15, 23, 42, 0.92)',
              marginBottom: '24px'
            }}>
              {user?.email}
            </p>

            {message && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '12px',
                border: messageType === 'error' 
                  ? '1px solid rgba(239, 68, 68, 0.3)' 
                  : '1px solid rgba(34, 197, 94, 0.3)',
                background: messageType === 'error'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(34, 197, 94, 0.1)',
                color: messageType === 'error' ? '#dc2626' : '#16a34a',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {message}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: '12px'
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(15, 23, 42, 0.92)', marginBottom: '8px' }}>
                  📧 Check your email
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(30, 41, 59, 0.74)', margin: 0 }}>
                  Click the verification link to activate your account and start your free trial.
                </p>
              </div>

              <div style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                borderRadius: '12px'
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(15, 23, 42, 0.92)', marginBottom: '8px' }}>
                  📂 Check spam folder
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(30, 41, 59, 0.74)', margin: 0 }}>
                  If you don't see it in your inbox, check your spam or junk folder.
                </p>
              </div>

              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  width: '100%',
                  height: '44px',
                  marginTop: '8px',
                  background: resending ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0.92)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: resending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease',
                  opacity: resending ? 0.7 : 1
                }}
              >
                {resending ? 'Sending…' : 'Resend Verification Email'}
              </button>

              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  color: 'rgba(15, 23, 42, 0.86)',
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'}
              >
                Sign Out
              </button>
            </div>

            <p style={{
              marginTop: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: 'rgba(100, 116, 139, 0.74)'
            }}>
              After verifying, you'll be redirected to start your 7-day free trial
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
