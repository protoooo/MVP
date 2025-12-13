'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function AcceptTermsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    document.body.classList.add('ui-enterprise-bg')
    return () => document.body.classList.remove('ui-enterprise-bg')
  }, [])

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/')
        return
      }

      setUser(currentUser)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms, accepted_privacy, terms_accepted_at')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (profile?.accepted_terms && profile?.accepted_privacy) {
        // Check if they have a subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', currentUser.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        if (sub) {
          router.push('/')
        } else {
          router.push('/?showPricing=true')
        }
      }
    }

    checkAuth()
  }, [supabase, router])

  const handleAgree = async () => {
    if (!user) {
      setError('Not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const now = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          accepted_terms: true,
          accepted_privacy: true,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          updated_at: now,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Update failed:', updateError)
        setError('Failed to update profile. Please try again.')
        setLoading(false)
        return
      }

      // ✅ redirect to pricing (home page now actually reads showPricing=true)
      router.push('/?showPricing=true')
    } catch (err) {
      console.error('Exception:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <style jsx global>{`
          body.ui-enterprise-bg {
            overflow-x: hidden;
            background: #050608;
            color: rgba(255, 255, 255, 0.94);
            --ui-lamp: 1.08;
            --ui-vignette: 0.93;
          }
          body.ui-enterprise-bg::before {
            content: '';
            position: fixed;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(1100px 520px at 50% -10%, rgba(255, 255, 255, 0.11), transparent 58%),
              radial-gradient(900px 540px at 18% 0%, rgba(0, 255, 200, 0.05), transparent 60%),
              radial-gradient(900px 540px at 85% 0%, rgba(120, 90, 255, 0.05), transparent 60%),
              repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 12px),
              repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 24px);
            opacity: 0.9;
            filter: brightness(var(--ui-lamp));
            transform: translateZ(0);
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
        `}</style>
        <div className="w-8 h-8 border-2 border-white/25 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${inter.className}`}>
      <style jsx global>{`
        body.ui-enterprise-bg {
          overflow-x: hidden;
          background: #050608;
          color: rgba(255, 255, 255, 0.94);
          --ui-lamp: 1.08;
          --ui-vignette: 0.93;
        }
        body.ui-enterprise-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1100px 520px at 50% -10%, rgba(255, 255, 255, 0.11), transparent 58%),
            radial-gradient(900px 540px at 18% 0%, rgba(0, 255, 200, 0.05), transparent 60%),
            radial-gradient(900px 540px at 85% 0%, rgba(120, 90, 255, 0.05), transparent 60%),
            repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 12px),
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 24px);
          opacity: 0.9;
          filter: brightness(var(--ui-lamp));
          transform: translateZ(0);
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
      `}</style>

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className={`inline-flex items-baseline gap-0 select-none ${outfit.className}`}>
            <span className="text-[15px] sm:text-[16px] font-extrabold tracking-[-0.03em] text-white/90">protocol</span>
            <span className="text-[15px] sm:text-[16px] font-black tracking-[-0.03em] text-white/90">LM</span>
          </Link>
          <div className="text-[12px] text-white/65 hidden sm:block">Policy update</div>
        </div>

        <div className="rounded-[22px] border border-white/12 bg-white/[0.03] shadow-[0_40px_120px_rgba(0,0,0,0.7)] overflow-hidden p-6 sm:p-7">
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-extrabold text-white tracking-tight ${outfit.className}`}>Update Required</h1>
            <p className="mt-2 text-white/70 text-[13px] leading-relaxed">
              To continue using <span className="text-white font-semibold">protocolLM</span>, you must review and agree to our updated policies.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-400/25 rounded-xl">
              <p className="text-red-100/90 text-[13px]">{error}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <a
              href="/terms"
              target="_blank"
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/12 hover:bg-white/[0.05] transition-all group"
            >
              <span className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">Terms of Service</span>
              <svg className="w-4 h-4 text-white/40 group-hover:text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href="/privacy"
              target="_blank"
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/12 hover:bg-white/[0.05] transition-all group"
            >
              <span className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">Privacy Policy</span>
              <svg className="w-4 h-4 text-white/40 group-hover:text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAgree}
              disabled={loading}
              className="w-full rounded-xl bg-white text-black font-extrabold py-3.5 transition-all shadow-[0_20px_60px_rgba(0,0,0,0.45)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Updating...
                </span>
              ) : (
                'I Agree & Continue'
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={loading}
              className="w-full text-[12px] text-white/55 hover:text-red-200 py-2 transition-colors"
            >
              Decline and Sign Out
            </button>

            <p className="pt-2 text-center text-[11px] text-white/55">
              Made in Washtenaw County for Washtenaw County.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
