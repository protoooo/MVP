'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from '@/app/apple-icon.png'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function RegisterLocationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = 'chat'
  }, [])

  useEffect(() => {
    async function checkAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth')
          return
        }

        // Check if already registered
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('metadata')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        if (subscription?.metadata?.device_fingerprint || subscription?.metadata?.location_hash) {
          // Already registered - go to chat
          router.push('/')
          return
        }

        setLoading(false)
      } catch (err) {
        console.error('Access check failed:', err)
        setError('Failed to verify access')
        setLoading(false)
      }
    }

    checkAccess()
  }, [supabase, router])

  const handleRegister = async () => {
    if (registering) return

    setRegistering(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }

      // Call registration endpoint
      const res = await fetch('/api/register-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to register device')
        return
      }

      setSuccess(true)
      
      setTimeout(() => {
        router.push('/')
      }, 1500)

    } catch (err) {
      console.error('Registration error:', err)
      setError('An unexpected error occurred')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#09090b] flex items-center justify-center">
        <div className="text-white/70">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-0: #09090b;
          --bg-1: #0c0c0e;
          --bg-2: #131316;
          --bg-3: #1a1a1f;
          --ink-0: #fafafa;
          --ink-1: #a0a0a8;
          --ink-2: #636369;
          --accent: #3b82f6;
          --border-subtle: rgba(255, 255, 255, 0.05);
          --radius-md: 12px;
        }
        html, body { height: 100%; margin: 0; background: var(--bg-0); color: var(--ink-0); }
      `}</style>

      <div className={`${ibmMono.className}`} style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
        <header style={{ width: '100%', maxWidth: '880px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: 'var(--ink-0)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Image src={appleIcon} alt="" width={48} height={48} priority />
            <span style={{ fontSize: '17px', fontWeight: '600' }}>protocolLM</span>
          </Link>
        </header>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', minHeight: 'calc(100vh - 100px)' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '32px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
                One More Step
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px', color: 'var(--ink-0)' }}>
                Register Your Device
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--ink-1)', margin: 0, lineHeight: '1.6' }}>
                Each protocolLM license is valid for <strong>one device</strong>. 
                We'll register the device you are using right now to activate your account.
              </p>
            </div>

            <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink-0)', margin: '0 0 12px' }}>
                What We Track
              </h3>
              <ul style={{ fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.7', margin: 0, paddingLeft: '20px' }}>
                <li>Your network prefix and browser fingerprint</li>
                <li>Used to prevent license sharing across multiple devices</li>
                <li>One license = One device</li>
              </ul>
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '14px', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '14px', marginBottom: '20px' }}>
                ✓ Device registered! Redirecting to chat...
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={registering || success}
              style={{
                width: '100%',
                height: '44px',
                background: registering || success ? 'var(--bg-3)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: registering || success ? 'not-allowed' : 'pointer',
                opacity: registering || success ? 0.5 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              {registering ? 'Registering...' : success ? 'Redirecting...' : 'Register This Device'}
            </button>

            <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--ink-2)', textAlign: 'center' }}>
              Questions? Email{' '}
              <a href="mailto:support@protocollm.org" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                support@protocollm.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
