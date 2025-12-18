'use client'

import { useState } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { Outfit } from 'next/font/google'
import InfoPageLayout from '@/components/InfoPageLayout'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const { isLoaded, executeRecaptcha } = useRecaptcha()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const captchaToken = await executeRecaptcha('contact')

      if (!captchaToken) {
        setError('Security verification failed. Please try again.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, captchaToken })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send message. Please try again.')
        setLoading(false)
        return
      }

      setSubmitted(true)
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      console.error('Contact form error:', err)
      setError('An unexpected error occurred. Please try emailing us directly at hello@protocollm.org')
    } finally {
      setLoading(false)
    }
  }

  return (
    <InfoPageLayout
      title="Contact"
      subtitle="Reach our compliance team for product questions, billing help, or data requests. We respond quickly during business hours."
      eyebrow="Support"
    >
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,18,32,0.05)]">
            <h2 className={`text-lg font-bold text-[#0B1220] ${outfit.className}`}>Get in touch</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3D4F5F]">We&apos;re local to Washtenaw County and here to support operators.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
                <p className={`text-[13px] font-semibold uppercase tracking-[0.16em] text-[#2F5D8A] ${outfit.className}`}>Email</p>
                <a href="mailto:hello@protocollm.org" className="mt-1 block text-[15px] font-semibold text-[#0B1220] underline-offset-4 hover:text-[#1F4E7A] hover:underline">
                  hello@protocollm.org
                </a>
                <p className="text-[13px] text-[#52637A]">Responses within 24-48 hours.</p>
              </div>

              <div className="rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
                <p className={`text-[13px] font-semibold uppercase tracking-[0.16em] text-[#2F5D8A] ${outfit.className}`}>Business hours</p>
                <p className="text-[15px] font-semibold text-[#0B1220]">Mon - Fri, 9:00 AM - 6:00 PM EST</p>
                <p className="text-[13px] text-[#52637A]">We monitor urgent production issues after hours.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#E8F0ED] bg-[#F6FAF9] px-4 py-3">
              <p className={`text-[13px] font-semibold uppercase tracking-[0.16em] text-[#2F5D8A] ${outfit.className}`}>Location</p>
              <p className="text-[15px] font-semibold text-[#0B1220]">Washtenaw County, Michigan</p>
              <p className="text-[13px] text-[#52637A]">Serving restaurants and food operators statewide.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#B8CFC8] bg-[#E8FAF4] px-6 py-5 shadow-[0_10px_30px_rgba(22,94,76,0.08)]">
            <p className={`text-[13px] font-semibold uppercase tracking-[0.18em] text-[#2F5D8A] ${outfit.className}`}>Response promise</p>
            <p className="mt-2 text-[15px] text-[#0B1220]">We prioritize health-code critical issues and strive to resolve support tickets quickly.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#D7E6E2] bg-white px-6 py-6 shadow-[0_1px_3px_rgba(11,18,32,0.05)] sm:px-8 sm:py-8">
          <h2 className={`text-lg font-bold text-[#0B1220] ${outfit.className}`}>Send us a message</h2>

          {submitted ? (
            <div className="mt-4 rounded-xl border border-[#B8CFC8] bg-[#E8FAF4] px-4 py-6 text-center">
              <p className={`text-lg font-bold text-[#0B1220] ${outfit.className}`}>Message sent!</p>
              <p className="mt-2 text-[15px] text-[#3D4F5F]">We&apos;ve received your message and will respond within 24-48 hours.</p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-[#0B1220]">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-[#D7E6E2] bg-white px-4 py-3 text-[15px] text-[#0B1220] placeholder:text-[#8A9BAD] shadow-[0_1px_2px_rgba(12,35,31,0.05)] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#55D6B2]/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[13px] font-semibold text-[#0B1220]">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-[#D7E6E2] bg-white px-4 py-3 text-[15px] text-[#0B1220] placeholder:text-[#8A9BAD] shadow-[0_1px_2px_rgba(12,35,31,0.05)] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#55D6B2]/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-semibold text-[#0B1220]">Subject</label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-xl border border-[#D7E6E2] bg-white px-4 py-3 text-[15px] text-[#0B1220] placeholder:text-[#8A9BAD] shadow-[0_1px_2px_rgba(12,35,31,0.05)] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#55D6B2]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-semibold text-[#0B1220]">Message</label>
                <textarea
                  name="message"
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-xl border border-[#D7E6E2] bg-white px-4 py-3 text-[15px] text-[#0B1220] placeholder:text-[#8A9BAD] shadow-[0_1px_2px_rgba(12,35,31,0.05)] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#55D6B2]/40"
                />
              </div>

              {error ? <p className="text-[14px] font-medium text-[#B45309]">{error}</p> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className="inline-flex items-center justify-center rounded-full bg-[#2F5D8A] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(47,93,138,0.28)] transition hover:bg-[#1F4E7A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#55D6B2] disabled:cursor-not-allowed disabled:bg-[#9BB6CF]"
                >
                  {loading ? 'Sending…' : 'Send message'}
                </button>
                <p className="text-[13px] text-[#52637A]">We use reCAPTCHA to protect this form.</p>
              </div>

              <RecaptchaBadge />
            </form>
          )}
        </div>
      </div>
    </InfoPageLayout>
  )
}
