// app/dashboard/multi-location-setup/page.js - UPDATED to match your UI
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import appleIcon from '@/app/apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['500', '600', '700', '800'] })

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
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth')
          return
        }

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

        const inviteCodes = purchase.invite_codes || []
        const allSent = inviteCodes.every(code => code.email_sent)

        if (allSent) {
          setError('Setup already completed. Check your email for the invite links.')
          setLoading(false)
          return
        }

        setPurchaseData(purchase)

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
      setTimeout(() => router.push('/'), 2000)
    } catch (err) {
      console.error('Submit error:', err)
      setError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <div className="text-white/70">Loading setup...</div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --bg-0: rgba(5, 7, 13, 0.72);
          --bg-1: rgba(7, 10, 18, 0.78);
          --bg-2: rgba(9, 13, 22, 0.82);
          --bg-3: rgba(255, 255, 255, 0.1);
          --ink-0: #f6f9ff;
          --ink-1: rgba(240, 244, 255, 0.86);
          --ink-2: rgba(214, 222, 240, 0.76);
          --accent: #5fa8ff;
          --accent-hover: #7bc2ff;
          --border-subtle: rgba(255, 255, 255, 0.18);
          --radius-sm: 8px;
          --radius-md: 12px;
        }

        body { background: var(--bg-0); color: var(--ink-0); }

        .setup-topbar {
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .setup-content {
          max-width: 760px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        /* Match your glass cards */
        .setup-card {
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.88));
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: var(--radius-md);
          padding: 32px;
          box-shadow: 0 20px 55px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.55);
        }

        .setup-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .setup-eyebrow {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 12px;
          padding: 6px 12px;
          background: rgba(95, 168, 255, 0.12);
          border-radius: 9999px;
          border: 1px solid rgba(95, 168, 255, 0.22);
        }

        .setup-title {
          font-size: 24px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.92);
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .setup-subtitle {
          font-size: 15px;
          color: rgba(30, 41, 59, 0.74);
          margin: 0;
          line-height: 1.6;
        }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: var(--radius-sm);
          padding: 20px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-value.blue { color: var(--accent); }
        .stat-value.green { color: #22c55e; }
        .stat-value.amber { color: #f59e0b; }

        .stat-label {
          font-size: 12px;
          color: rgba(15, 23, 42, 0.62);
          font-weight: 600;
        }

        /* Location cards */
        .locations-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .location-card {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-radius: var(--radius-sm);
          padding: 24px;
          transition: all 0.15s ease;
        }

        .location-card.sent {
          opacity: 0.6;
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.3);
        }

        .location-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .location-number {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
        }

        .location-badge {
          font-size: 11px;
          font-weight: 700;
          color: #22c55e;
          padding: 4px 10px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 9999px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.7);
        }

        .form-input {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: var(--radius-sm);
          color: rgba(15, 23, 42, 0.92);
          font-size: 14px;
          font-weight: 600;
          transition: border-color 0.15s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Info box */
        .info-box {
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: var(--radius-sm);
          padding: 16px;
          margin-bottom: 24px;
        }

        .info-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.82);
          margin-bottom: 8px;
        }

        .info-text {
          font-size: 13px;
          color: rgba(15, 23, 42, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        /* Alert messages */
        .alert {
          padding: 12px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          margin-bottom: 20px;
        }

        .alert.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
        }

        .alert.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #16a34a;
        }

        /* Submit button - matches your UI */
        .submit-btn {
          width: 100%;
          height: 46px;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
          box-shadow: 0 16px 40px rgba(95, 168, 255, 0.24);
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .footer-text {
          margin-top: 16px;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.62);
          text-align: center;
        }

        .footer-link {
          color: var(--accent);
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .setup-card {
            padding: 24px 20px;
          }
        }
      `}</style>

      <div className={`${plusJakarta.className}`} style={{ minHeight: '100vh' }}>
        <header className="setup-topbar">
          <Link href="/" style={{ color: 'var(--ink-0)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Image src={appleIcon} alt="" width={48} height={48} priority />
            <span style={{ fontSize: '17px', fontWeight: '600' }}>protocolLM</span>
          </Link>
        </header>

        <div className="setup-content">
          <div className="setup-card">
            <div className="setup-header">
              <div className="setup-eyebrow">Multi-Location Setup</div>
              <h1 className="setup-title">Add Your Location Managers</h1>
              <p className="setup-subtitle">
                We'll send each manager a signup link. They just need to click it to get started.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value blue">{purchaseData?.location_count || 0}</div>
                <div className="stat-label">Total Locations</div>
              </div>
              <div className="stat-card">
                <div className="stat-value green">{locations.filter((l) => l.emailSent).length}</div>
                <div className="stat-label">Invites Sent</div>
              </div>
              <div className="stat-card">
                <div className="stat-value amber">{locations.filter((l) => !l.emailSent).length}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>

            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">✓ Invites sent! Redirecting...</div>}

            <form onSubmit={handleSubmit}>
              <div className="locations-grid">
                {locations.map((loc, idx) => (
                  <div key={idx} className={`location-card ${loc.emailSent ? 'sent' : ''}`}>
                    <div className="location-header">
                      <div className="location-number">Location {loc.number}</div>
                      {loc.emailSent && <div className="location-badge">✓ Invite Sent</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Manager Email</label>
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
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Restaurant Name</label>
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
                        className="form-input"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="info-box">
                <div className="info-title">What Happens Next</div>
                <p className="info-text">
                  Each manager will receive an email with a unique signup link. They click the link, create their account (no payment needed), and start using protocolLM immediately.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || locations.filter((l) => !l.emailSent).length === 0}
                className="submit-btn"
              >
                {submitting ? 'Sending Invites...' : 'Send Signup Links'}
              </button>

              <p className="footer-text">
                Questions? Email <a href="mailto:support@protocollm.org" className="footer-link">support@protocollm.org</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
