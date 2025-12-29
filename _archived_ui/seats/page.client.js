'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { MAX_DEVICE_QUANTITY } from '@/lib/deviceConstants'

function SeatRow({ seat, onRevoke, revealedCode }) {
  const statusLabel = seat.status === 'claimed' ? 'Claimed' : 'Available'
  const device = seat.device_fingerprint ? seat.device_fingerprint.slice(0, 10) + '…' : '—'
  const claimedAt = seat.claimed_at ? new Date(seat.claimed_at).toLocaleString() : '—'

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1014] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-white font-semibold flex items-center gap-2">
          {statusLabel}
          {seat.invite_code_last4 && seat.status === 'available' && (
            <span className="text-xs text-white/50">…{seat.invite_code_last4}</span>
          )}
        </div>
        <div className="text-sm text-white/60">Device: {device}</div>
        <div className="text-xs text-white/40">Claimed at: {claimedAt}</div>
        {revealedCode && (
          <div className="text-sm text-emerald-300 mt-1 break-all">
            Invite code: <code>{revealedCode}</code>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRevoke(seat.id)}
          className="px-3 py-2 text-sm rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition"
        >
          {seat.status === 'claimed' ? 'Revoke seat' : 'Regenerate code'}
        </button>
      </div>
    </div>
  )
}

export default function SeatsClient() {
  const supabase = createClient()
  const [seats, setSeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revealedCodes, setRevealedCodes] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const { isLoaded: captchaLoaded, execute: executeRecaptcha } = useRecaptcha('recaptcha_seats')

  useEffect(() => {
    loadSeats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSeats() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/invites/list')
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to load seats')
      setSeats(payload.seats || [])
    } catch (err) {
      setError(err.message || 'Unable to load seats')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(seatId) {
    try {
      const res = await fetch('/api/invites/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to revoke seat')

      if (payload.inviteCode) {
        setRevealedCodes((prev) => ({ ...prev, [seatId]: payload.inviteCode }))
      }
      await loadSeats()
    } catch (err) {
      setError(err.message || 'Unable to revoke seat')
    }
  }

  async function handlePurchase() {
    setCheckoutLoading(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        window.location.href = '/'
        return
      }

      if (!captchaLoaded) {
        throw new Error('Security verification still loading')
      }

      const captchaToken = await executeRecaptcha('checkout')

      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ quantity, captchaToken }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to start checkout')
      if (payload.url) window.location.href = payload.url
    } catch (err) {
      setError(err.message || 'Unable to start checkout')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0c11] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invite Codes &amp; Device Seats</h1>
            <p className="text-white/60 text-sm mt-1">Manage purchased seats, copy invite codes, and revoke devices.</p>
          </div>
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Back
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0f1014] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-white/70">Purchase more device licenses</div>
            <div className="text-lg font-semibold">$25 per device / month</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={MAX_DEVICE_QUANTITY}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(MAX_DEVICE_QUANTITY, parseInt(e.target.value) || 1)))}
              className="w-24 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
            />
            <button
              onClick={handlePurchase}
              disabled={checkoutLoading}
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              {checkoutLoading ? 'Starting…' : 'Buy devices'}
            </button>
          </div>
        </div>

        {loading && <div className="text-white/70">Loading seats…</div>}
        {error && <div className="text-red-400 text-sm">{error}</div>}

        {!loading && !seats.length && (
          <div className="text-white/60 text-sm">No seats yet. Purchase devices to generate invite codes.</div>
        )}

        <div className="space-y-3">
          {seats.map((seat) => (
            <SeatRow key={seat.id} seat={seat} onRevoke={handleRevoke} revealedCode={revealedCodes[seat.id]} />
          ))}
        </div>

        <RecaptchaBadge />
      </div>
    </div>
  )
}
