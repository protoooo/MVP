'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Outfit } from 'next/font/google'
import InfoPageLayout from '@/components/InfoPageLayout'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })

export default function AcceptTermsPage() {
  const router = useRouter()
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
      const res = await fetch('/api/accept-terms', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Unable to save your acceptance. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.replace('/'), 600)
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
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
            <h2 className={`text-lg font-bold text-[#0B1220] ${outfit.className}`}>What you&apos;re agreeing to</h2>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-[#3D4F5F]">
              <li>protocolLM is a reference tool; human review is required for compliance decisions.</li>
              <li>AI outputs may be imperfect; always verify with official Washtenaw County guidance.</li>
              <li>Data is protected with encryption, limited retention, and no use for public model training.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-3 text-[14px] font-semibold text-[#2F5D8A]">
              <Link href="/terms" className="inline-flex items-center gap-2 underline-offset-4 hover:text-[#1F4E7A] hover:underline">
                View Terms of Service
              </Link>
              <Link href="/privacy" className="inline-flex items-center gap-2 underline-offset-4 hover:text-[#1F4E7A] hover:underline">
                View Privacy Policy
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#B8CFC8] bg-[#E8FAF4] px-6 py-5 shadow-[0_10px_30px_rgba(22,94,76,0.08)]">
            <p className={`text-[13px] font-semibold uppercase tracking-[0.18em] text-[#2F5D8A] ${outfit.className}`}>Why this matters</p>
            <p className="mt-2 text-[15px] text-[#0B1220]">
              We partner with local operators on safety and compliance. Confirming these policies keeps your account active and helps us align with
              county standards.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-6 shadow-[0_1px_3px_rgba(11,18,32,0.05)] sm:px-8 sm:py-8">
          <h2 className={`text-lg font-bold text-[#0B1220] ${outfit.className}`}>Confirm &amp; continue</h2>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[#B8CFC8] text-[#2F5D8A] focus:ring-[#55D6B2]"
              />
              <span className="text-[15px] leading-relaxed text-[#0B1220]">
                I have read and agree to the Terms of Service, including the limits of AI guidance and my responsibility for compliance decisions.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-[#B8CFC8] text-[#2F5D8A] focus:ring-[#55D6B2]"
              />
              <span className="text-[15px] leading-relaxed text-[#0B1220]">
                I acknowledge the Privacy Policy describing data collection, retention, and protection practices.
              </span>
            </label>
          </div>

          {error ? <p className="mt-3 text-[14px] font-medium text-[#B45309]">{error}</p> : null}
          {success ? <p className="mt-3 text-[14px] font-semibold text-[#0B1220]">Saved. Redirecting you back to protocolLM…</p> : null}

          <button
            type="submit"
            disabled={!agreeTerms || !agreePrivacy || isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#2F5D8A] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(47,93,138,0.28)] transition hover:bg-[#1F4E7A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#55D6B2] disabled:cursor-not-allowed disabled:bg-[#9BB6CF]"
          >
            {isSubmitting ? 'Saving…' : 'Agree and continue'}
          </button>

          <p className="mt-3 text-[13px] text-[#52637A]">
            Need help? Email <a className="text-[#2F5D8A] underline-offset-4 hover:text-[#1F4E7A] hover:underline" href="mailto:hello@protocollm.org">hello@protocollm.org</a>.
          </p>
        </form>
      </div>
    </InfoPageLayout>
  )
}
