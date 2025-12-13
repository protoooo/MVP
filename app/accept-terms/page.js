'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function AcceptTermsPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  // ✅ Apply the same black-card background on this route too
  useEffect(() => {
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const { data, error: authErr } = await supabase.auth.getUser()
        if (authErr) throw authErr

        const u = data?.user
        if (!u) {
          router.replace('/')
          return
        }

        if (!alive) return
        setUser(u)

        // If already accepted, skip this screen
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', u.id)
          .maybeSingle()

        if (profile?.accepted_terms && profile?.accepted_privacy) {
          router.replace('/')
          return
        }
      } catch (e) {
        console.error('accept-terms init error:', e)
        if (alive) setError('Could not verify your account. Please sign in again.')
      } finally {
        if (alive) setChecking(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [supabase, router])

  const handleAgree = async () => {
    if (!user || saving) return
    setSaving(true)
    setError('')

    try {
      const now = new Date().toISOString()

      // ✅ Upsert so it works even if user_profiles row doesn't exist yet
      const { error: upsertErr } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: user.id,
            accepted_terms: true,
            accepted_privacy: true,
            terms_accepted_at: now,
            privacy_accepted_at: now,
            updated_at: now,
          },
          { onConflict: 'id' }
        )

      if (upsertErr) throw upsertErr

      // Keep your flow: go to pricing after accepting
      router.replace('/?showPricing=true')
    } catch (e) {
      console.error('accept-terms save error:', e)
      setError('Failed to save your acceptance. Please try again.')
      setSaving(false)
    }
  }

  const handleDecline = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('sign out error:', e)
    } finally {
      router.replace('/')
    }
  }

  if (checking) {
    return (
      <>
        <style jsx global>{baseStyles}</style>
        <div className="min-h-[100dvh] flex items-center justify-center">
          <div className="ui-spinner-lg" aria-label="Loading" />
        </div>
      </>
    )
  }

  return (
    <>
      <style jsx global>{baseStyles}</style>

      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="w-full max-w-md ui-modal p-6">
          <div className="text-center mb-6">
            <div className={`text-[13px] tracking-[0.18em] uppercase text-white/55 ${inter.className}`}>
              Update required
            </div>
            <h1 className={`mt-2 text-2xl font-semibold text-white tracking-tight ${outfit.className}`}>
              Accept Terms to Continue
            </h1>
            <p className={`mt-2 text-sm text-white/60 leading-relaxed ${inter.className}`}>
              Before using protocolLM, please review and agree to our Terms and Privacy Policy.
            </p>
          </div>

          {error && (
            <div className="mb-4 ui-alert ui-alert-err">
              <span className={`text-sm ${inter.className}`}>{error}</span>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <Link href="/terms" target="_blank" className="ui-linkcard">
              <span className={`text-sm font-semibold text-white/85 ${inter.className}`}>Terms of Service</span>
              <span className="ui-chev">›</span>
            </Link>

            <Link href="/privacy" target="_blank" className="ui-linkcard">
              <span className={`text-sm font-semibold text-white/85 ${inter.className}`}>Privacy Policy</span>
              <span className="ui-chev">›</span>
            </Link>
          </div>

          <button
            onClick={handleAgree}
            disabled={saving}
            className="ui-btn ui-btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="ui-btn-inner">
              {saving ? <span className="ui-spinner" aria-hidden="true" /> : null}
              I Agree & Continue
            </span>
          </button>

          <button
            onClick={handleDecline}
            disabled={saving}
            className={`mt-3 w-full text-xs text-white/35 hover:text-red-200 transition-colors ${inter.className}`}
          >
            Decline and sign out
          </button>

          <div className={`mt-5 text-center text-[11px] text-white/35 ${inter.className}`}>
            One site license per restaurant · 7-day trial · Cancel anytime
          </div>
        </div>
      </div>
    </>
  )
}

const baseStyles = `
  html, body { height: 100%; width: 100%; }

  body.ui-enterprise-bg {
    background: #050608;
    color: rgba(255,255,255,0.94);
    overflow: hidden;
    --ui-lamp: 1.38;
    --ui-vignette: 0.92;
  }

  body.ui-enterprise-bg::before {
    content: '';
    position: fixed;
    inset: -18%;
    pointer-events: none;
    background:
      radial-gradient(1100px 520px at 50% -10%, rgba(255, 255, 255, 0.13), transparent 62%),
      radial-gradient(900px 540px at 18% 0%, rgba(0, 255, 200, 0.055), transparent 62%),
      radial-gradient(900px 540px at 85% 0%, rgba(120, 90, 255, 0.055), transparent 62%),
      conic-gradient(from 210deg at 55% 18%,
        rgba(255, 255, 255, 0.06),
        transparent 28%,
        rgba(255, 255, 255, 0.025) 52%,
        transparent 74%,
        rgba(255, 255, 255, 0.045)
      );
    background-size: 100% 100%, 100% 100%, 100% 100%, 170% 170%;
    background-position: 50% 0%, 0% 0%, 100% 0%, 50% 50%;
    opacity: calc(0.85 * var(--ui-lamp));
    transform: translateZ(0);
    animation: uiAmbient 18s ease-in-out infinite;
  }

  @keyframes uiAmbient {
    0% { background-position: 50% 0%, 0% 0%, 100% 0%, 46% 42%; }
    50% { background-position: 50% -2%, 6% 2%, 94% 1%, 56% 60%; }
    100% { background-position: 50% 0%, 0% 0%, 100% 0%, 46% 42%; }
  }

  body.ui-enterprise-bg::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.62) 70%);
    opacity: var(--ui-vignette);
    transform: translateZ(0);
  }

  .ui-modal {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(6, 7, 9, 0.88);
    box-shadow: 0 36px 120px rgba(0,0,0,0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    position: relative;
    overflow: hidden;
  }

  .ui-modal::before {
    content: '';
    position: absolute;
    inset: -1px;
    pointer-events: none;
    background: radial-gradient(700px 240px at 20% 0%, rgba(255,255,255,0.06), transparent 60%);
    opacity: 0.75;
  }

  .ui-linkcard {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.02);
    text-decoration:none;
    transition: background 120ms ease, transform 120ms ease, border-color 120ms ease;
    position: relative;
    z-index: 1;
  }
  .ui-linkcard:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.14);
    transform: scale(1.01);
  }
  .ui-chev {
    color: rgba(255,255,255,0.5);
    font-size: 18px;
    line-height: 1;
  }

  .ui-btn {
    border-radius: 12px;
    padding: 11px 14px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    transition: transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease;
    user-select: none;
    position: relative;
    z-index: 1;
  }
  .ui-btn-inner {
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:10px;
  }
  .ui-btn:hover { transform: scale(1.02); }
  .ui-btn-primary {
    background: #ffffff;
    color: #000000;
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
  }

  .ui-alert {
    border-radius: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.03);
    position: relative;
    z-index: 1;
  }
  .ui-alert-err {
    border-color: rgba(239,68,68,0.35);
  }

  .ui-spinner {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: 2px solid rgba(0, 0, 0, 0.18);
    border-top-color: rgba(0, 0, 0, 0.65);
    animation: spin 700ms linear infinite;
  }
  .ui-spinner-lg {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.16);
    border-top-color: rgba(255, 255, 255, 0.75);
    animation: spin 700ms linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`
