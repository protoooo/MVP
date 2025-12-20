'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Outfit } from 'next/font/google'
import InfoPageLayout from '@/components/InfoPageLayout'
import { createClient } from '@/lib/supabase-browser'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700'] })

export default function AcceptTermsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      // Accept terms
      const res = await fetch('/api/accept-terms', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Unable to save your acceptance. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      
      // ✅ NEW: Check if location needs registration
      setTimeout(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('metadata')
              .eq('user_id', user.id)
              .in('status', ['active', 'trialing'])
              .maybeSingle()

            if (sub && !sub.metadata?.location_hash) {
              router.replace('/register-location')
              return
            }
          }
        } catch (e) {
          console.error('Location check failed:', e)
        }

        router.replace('/')
      }, 600)
      
    } catch (err) {
      console.error('Accept terms error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <InfoPageLayout
      title="Accept updated policies"
      subtitle="To continue using protocolLM, please confirm you have read and agree to our Terms of Service and Privacy Policy."
      eyebrow="Action required"
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>What you&apos;re agreeing to</h2>
          <ul className="mt-3 space-y-2">
            <li>protocolLM is a reference tool; human review is required for compliance decisions.</li>
            <li>LLM outputs may be imperfect; always verify with official Washtenaw County guidance.</li>
            <li>Data is protected with encryption, limited retention, and no use for public model training.</li>
            <li>Each license is valid for ONE physical restaurant location only.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-[14px] font-semibold">
            <Link href="/terms" className="inline-flex items-center gap-2 text-[#2F5D8A] underline underline-offset-4 hover:text-[#1F4E7A]">
              View Terms of Service
            </Link>
            <Link href="/privacy" className="inline-flex items-center gap-2 text-[#2F5D8A] underline underline-offset-4 hover:text-[#1F4E7A]">
              View Privacy Policy
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-[#2F5D8A] border-l-4 bg-[#15151a] p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#1c1c22] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-[#2F5D8A]">
            Why this matters
          </div>
          <p className="mt-2">
            We partner with local operators on safety and compliance. Confirming these policies keeps your account active and helps us align with
            county standards.
          </p>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>Confirm &amp; continue</h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="flex items-start gap-3 rounded-lg border border-[#24242d] bg-[#121218] p-4">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[#2a2a32] text-[#2F5D8A] focus:ring-[#2F5D8A]"
              />
              <span className="text-[15px] leading-relaxed">
                I have read and agree to the Terms of Service, including the limits of LLM guidance and my responsibility for compliance decisions.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-[#24242d] bg-[#121218] p-4">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[#2a2a32] text-[#2F5D8A] focus:ring-[#2F5D8A]"
              />
              <span className="text-[15px] leading-relaxed">
                I acknowledge the Privacy Policy describing data collection, retention, and protection practices.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-[#24242d] bg-[#121218] p-4">
              <input
                type="checkbox"
                checked={agreeTerms && agreePrivacy}
                disabled
                className="mt-1 h-5 w-5 rounded border-[#2a2a32] text-[#2F5D8A] focus:ring-[#2F5D8A]"
              />
              <span className="text-[15px] leading-relaxed">
                I understand this license is valid for <strong>one physical location only</strong>. Multiple locations require separate licenses.
              </span>
            </label>

            {error ? <p className="mt-3 text-[14px] font-medium text-[#ef4444]">{error}</p> : null}
            {success ? <p className="mt-3 text-[14px] font-semibold">Saved. Redirecting you to location registration…</p> : null}

            <button
              type="submit"
              disabled={!agreeTerms || !agreePrivacy || isSubmitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#2F5D8A] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1F4E7A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#15151a] focus:ring-[#2F5D8A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Agree and continue'}
            </button>

            <p className="mt-3 text-[13px] text-[#9ca3af]">
              Need help? Email <a className="text-[#2F5D8A] underline underline-offset-4 hover:text-[#1F4E7A]" href="mailto:support@protocollm.org">support@protocollm.org</a>.
            </p>
          </form>
        </section>
      </div>
    </InfoPageLayout>
  )
}
