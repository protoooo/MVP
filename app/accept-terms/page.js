// app/accept-terms/page.js - FIXED (Works with webhook profile creation)
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function AcceptTermsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session

        if (!session) {
          router.replace('/')
          return
        }

        // ✅ Check if profile exists AND if already accepted
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('accepted_terms, accepted_privacy')
          .eq('id', session.user.id)
          .maybeSingle()

        // If profile exists and already accepted, redirect home
        if (profile && profile.accepted_terms && profile.accepted_privacy) {
          console.log('✅ Terms already accepted, redirecting home')
          router.replace('/')
          return
        }

        // ✅ If no profile yet (webhook hasn't fired), that's OK - we'll create it when they accept
        console.log('📋 Terms need acceptance or profile needs creation')
        
      } catch (e) {
        console.error('Accept terms check error:', e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [router, supabase])

  const handleAccept = async () => {
    if (saving) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/accept-terms', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        console.error('Accept terms API error:', data)
        setError(data.error || 'Could not save your acceptance. Please try again.')
        setSaving(false)
        return
      }

      console.log('✅ Terms accepted successfully')
      
      // ✅ Redirect to home
      router.replace('/')
      router.refresh()
      
    } catch (e) {
      console.error('Accept terms exception:', e)
      setError('Could not save your acceptance. Please try again.')
      setSaving(false)
    }
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
        <div className={`text-white text-lg font-semibold ${outfit.className}`}>protocolLM</div>
        <div className={`text-white/60 text-sm mt-1 ${inter.className}`}>
          Before you continue, you must review and accept our updated policies.
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <Link
            href="/terms"
            target="_blank"
            className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/85 hover:bg-white/[0.05] transition text-center"
          >
            Terms of Service
          </Link>

          <Link
            href="/privacy"
            target="_blank"
            className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/85 hover:bg-white/[0.05] transition text-center"
          >
            Privacy Policy
          </Link>

          <button
            onClick={handleAccept}
            disabled={saving}
            className="w-full rounded-xl bg-white text-black font-semibold py-3 disabled:opacity-50 hover:bg-white/90 transition"
          >
            {saving ? 'Saving…' : 'I AGREE & CONTINUE'}
          </button>

          <button
            onClick={() => supabase.auth.signOut().finally(() => router.replace('/'))}
            className="w-full rounded-xl border border-white/10 bg-transparent text-white/70 py-3 hover:bg-white/[0.04] transition"
          >
            DECLINE & SIGN OUT
          </button>
        </div>

        <div className={`mt-3 text-center text-[11px] text-white/35 ${inter.className}`}>
          You can cancel anytime during the trial.
        </div>
      </div>
    </div>
  )
}
