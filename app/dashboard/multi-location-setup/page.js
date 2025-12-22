// app/dashboard/multi-location-setup/page.js - COMPLETE setup dashboard
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { IBM_Plex_Mono } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import appleIcon from '@/app/apple-icon.png'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export default function MultiLocationSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [purchaseData, setPurchaseData] = useState(null)
  const [locations, setLocations] = useState([])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.view = 'chat'
  }, [])

  useEffect(() => {
    async function loadPurchase() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth')
          return
        }

        // Get the most recent purchase
        const { data: purchase, error: purchaseError } = await supabase
          .from('pending_multi_location_purchases')
          .select('*')
          .eq('buyer_user_id', user.id)
          .in('status', ['completed', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (purchaseError || !purchase) {
          setError('No pending setup found')
          setLoading(false)
          return
        }

        // Check if all invites already sent
        const inviteCodes = purchase.invite_codes || []
        const allSent = inviteCodes.every(code => code.email_sent)

        if (allSent) {
          setError('Setup already completed. Check your email for the invite links.')
          setLoading(false)
          return
        }

        setPurchaseData(purchase)

        // Initialize location fields
        const locationFields = inviteCodes.map((code) => ({
          number: code.location_number,
          inviteCode: code.code,
          managerEmail: code.manager_email || '',
          restaurantName: code.restaurant_name || '',
          used: code.used || false,
          emailSent: code.email_sent || false
        }))

        setLocations(locationFields)
        setLoading(false)
      } catch (err) {
        console.error('Setup load error:', err)
        setError('Failed to load setup')
        setLoading(false)
      }
    }

    loadPurchase()
  }, [supabase, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')

    try {
      // Validate all locations have email and name
      const pendingLocations = locations.filter(loc => !loc.emailSent)

      for (const loc of pendingLocations) {
        if (!loc.managerEmail || !loc.managerEmail.includes('@')) {
          setError(`Location ${loc.number} needs a valid email`)
          setSubmitting(false)
          return
        }

        if (!loc.restaurantName || loc.restaurantName.trim().length < 3) {
          setError(`Location ${loc.number} needs a restaurant name`)
          setSubmitting(false)
          return
        }
      }

      // Send invites
      const res = await fetch('/api/multi-location/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId: purchaseData.id,
          locations: pendingLocations.map((loc) => ({
            inviteCode: loc.inviteCode,
            managerEmail: loc.managerEmail,
            restaurantName: loc.restaurantName,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invites')
        setSubmitting(false)
        return
      }

      setSuccess(true)

      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      console.error('Submit error:', err)
      setError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#09090b] flex items-center justify-center">
        <div className="text-white/70">Loading setup...</div>
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
        }
        html, body { margin: 0; background: var(--bg-0); color: var(--ink-0); }
      `}</style>

      <div className={`${ibmMono.className}`} style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
        <header style={{ width: '100%', maxWidth: '880px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <Image src={appleIcon} alt="" width={48} height={48} priority />
            <span style={{ fontSize: '17px', fontWeight: '600', color: 'var(--ink-0)' }}>protocolLM</span>
          </Link>
        </header>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px' }}>
          <div style={{ width: '100%', maxWidth: '700px', background: 'var(--bg-2)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
                Multi-Location Setup
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 12px', color: 'var(--ink-0)' }}>
                Add Your Location Managers
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--ink-1)', margin: 0, lineHeight: '1.6' }}>
                We'll send each manager a signup link. They just need to click it to get started.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)', marginBottom: '4px' }}>
                  {purchaseData?.location_count || 0}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Total Locations</div>
              </div>
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e', marginBottom: '4px' }}>
                  {locations.filter((l) => l.emailSent).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Invites Sent</div>
              </div>
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
                  {locations.filter((l) => !l.emailSent).length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>Pending</div>
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '14px', marginBottom: '24px' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#6ee7b7', fontSize: '14px', marginBottom: '24px' }}>
                ✓ Invites sent! Redirecting...
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {locations.map((loc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: loc.emailSent ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-3)',
                      border: `1px solid ${loc.emailSent ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: '8px',
                      padding: '20px',
                      opacity: loc.emailSent ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)' }}>
                        Location {loc.number}
                      </div>
                      {loc.emailSent && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>
                          ✓ Invite Sent
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '8px' }}>
                          Manager Email
                        </label>
                        <input
                          type="email"
                          value={loc.managerEmail}
                          onChange={(e) => {
                            const updated = [...locations]
                            updated[idx].managerEmail = e.target.value
                            setLocations(updated)
                          }}
                          placeholder="manager@restaurant.com"
                          disabled={loc.emailSent}
                          required={!loc.emailSent}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            background: loc.emailSent ? 'var(--bg-2)' : 'var(--bg-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--ink-0)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--ink-1)', marginBottom: '8px' }}>
                          Restaurant Name
                        </label>
                        <input
                          type="text"
                          value={loc.restaurantName}
                          onChange={(e) => {
                            const updated = [...locations]
                            updated[idx].restaurantName = e.target.value
                            setLocations(updated)
                          }}
                          placeholder="Downtown Location"
                          disabled={loc.emailSent}
                          required={!loc.emailSent}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            background: loc.emailSent ? 'var(--bg-2)' : 'var(--bg-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--ink-0)',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '8px' }}>
                  What Happens Next
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink-1)', lineHeight: '1.6', margin: 0 }}>
                  Each manager will receive an email with a unique signup link. They click the link, create their account (no payment needed), and start using protocolLM immediately.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || locations.filter((l) => !l.emailSent).length === 0}
                style={{
                  width: '100%',
                  height: '48px',
                  background: submitting ? 'var(--bg-3)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                {submitting ? 'Sending Invites...' : 'Send Signup Links'}
              </button>

              <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--ink-2)', textAlign: 'center' }}>
                Questions? Email <a href="mailto:support@protocollm.org" style={{ color: 'var(--accent)' }}>support@protocollm.org</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
