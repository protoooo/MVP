'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function AcceptTermsPage() {
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Ensure the same background class exists on this route
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  useEffect(() => {
    let alive = true

    async function init() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const currentUser = auth?.user

        if (!alive) return

        if (!currentUser) {
          router.replace('/')
          return
        }

        setUser(currentUser)

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', currentUser.id)
          .maybeSingle()

        // If already accepted, route based on subscription status
        if (profile?.accepted_terms && profile?.accepted_privacy) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status,current_period_end')
            .eq('user_id', currentUser.id)
            .in('status', ['active', 'trialing'])
            .maybeSingle()

          const active =
            sub &&
            (!sub.current_period_end || new Date(sub.current_period_end) > new Date())

          router.replace(active ? '/' : '/?showPricing=true')
          return
        }
      } catch (e) {
        console.error(e)
        setError('Could not load your account. Please try again.')
      } finally {
        if (alive) setBooting(false)
      }
    }

    init()
    return () => {
      alive = false
    }
  }, [supabase, router])

  const handleAgree = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const now = new Date().toISOString()

      // ✅ Upsert = works even if row doesn't exist yet
      const { error: upsertError } = await supabase
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

      if (upsertError) {
        console.error('Upsert failed:', upsertError)
        setError('Could not save your acceptance. Please try again.')
        setLoading(false)
        return
      }

      // Route based on subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status,current_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      const active =
        sub && (!sub.current_period_end || new Date(sub.current_period_end) > new Date())

      router.replace(active ? '/' : '/?showPricing=true')
    } catch (e) {
      console.error(e)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      router.replace('/')
    }
  }

  return (
    <>
      {/* Self-contained styles so this route matches your “black card” UI */}
      <style jsx global>{`
        body.ui-enterprise-bg {
          overflow: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.94);
          --ui-lamp: 1.38;
          --ui-vignette: 0.93;
        }

        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1100px 520px at 50% -12%, rgba(255, 255, 255, 0.11), transparent 60%),
            radial-gradient(980px 620px at 14% 8%, rgba(0, 255, 200, 0.065), transparent 62%),
            radial-gradient(980px 620px at 86% 10%, rgba(120, 90, 255, 0.065), transparent 62%),
            conic-gradient(from 210deg at 50% 18%,
              rgba(0, 255, 200, 0.05),
              rgba(120, 90, 255, 0.05),
              rgba(255, 255, 255, 0.02),
              rgba(0, 255, 200, 0.04)
            );
          opacity: calc(0.92 * var(--ui-lamp));
          transform: translateZ(0);
          filter: blur(0.25px);
          background-size: 120% 120%, 150% 150%, 150% 150%, 190% 190%;
          background-position: 50% -12%, 14% 8%, 86% 10%, 50% 18%;
          animation: uiAuroraDrift 22s ease-in-out infinite alternate;
        }

        body.ui-enterprise-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 25%, transparent 0%, rgba(0, 0, 0, 0.66) 72%);
          opacity: var(--ui-vignette);
          transform: translateZ(0);
        }

        @keyframes uiAuroraDrift {
          0%   { background-position: 50% -12%, 10% 6%, 90% 12%, 46% 20%; }
          50%  { background-position: 52% -10%, 18% 12%, 82% 6%, 54% 16%; }
          100% { background-position: 50% -12%, 14% 10%, 86% 14%, 50% 22%; }
        }

        .at-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(6, 7, 9, 0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 18px;
          box-shadow: 0 36px 120px rgba(0, 0, 0, 0.75);
        }

        .at-btn {
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          user-select: none;
        }

        .at-btn-primary {
          background: #ffffff;
          color: #000000;
        }

        .at-btn-secondary {
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
      `}</style>

      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <div className="w-full max-w-md at-card p-6">
          <div className="mb-5">
            <div className={`text-[13px] font-extrabold tracking-tight text-white ${outfit.className}`}>
              protocolLM
            </div>
            <div className={`mt-1 text-sm text-white/70 ${inter.className}`}>
              Before you continue, you must review and accept our updated policies.
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3">
              <div className={`text-sm text-red-200 ${inter.className}`}>{error}</div>
            </div>
          )}

          <div className="space-y-2 mb-5">
            <Link
              href="/terms"
              target="_blank"
              className="block rounded-xl border border-white/12 bg-white/3 hover:bg-white/5 px-4 py-3 text-white/85"
            >
              <span className={`text-sm font-semibold ${inter.className}`}>Terms of Service</span>
            </Link>

            <Link
              href="/privacy"
              target="_blank"
              className="block rounded-xl border border-white/12 bg-white/3 hover:bg-white/5 px-4 py-3 text-white/85"
            >
              <span className={`text-sm font-semibold ${inter.className}`}>Privacy Policy</span>
            </Link>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleAgree}
              disabled={loading || booting}
              className={`w-full at-btn at-btn-primary ${loading || booting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving…' : 'I agree & continue'}
            </button>

            <button
              onClick={handleDecline}
              disabled={loading || booting}
              className={`w-full at-btn at-btn-secondary ${loading || booting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Decline & sign out
            </button>

            <div className={`pt-2 text-[11px] text-white/45 ${inter.className}`}>
              {booting ? 'Checking your account…' : 'You can cancel anytime during the trial.'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
