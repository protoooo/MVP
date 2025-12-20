'use client'

import { useState } from 'react'
import { useRecaptcha, RecaptchaBadge } from '@/components/Captcha'
import { Outfit } from 'next/font/google'
import InfoPageLayout from '@/components/InfoPageLayout'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700'] })

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
      setError('An unexpected error occurred. Please try emailing us directly at support@protocollm.org')
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
      <div className="space-y-6">
        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>Get in touch</h2>
          <p className="mt-3">We&apos;re local to Washtenaw County and here to support operators.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#24242d] bg-[#121218] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F5D8A]">Email</p>
              <a href="mailto:support@protocollm.org" className="mt-1 block text-[15px] font-semibold underline underline-offset-2">
                support@protocollm.org
              </a>
              <p className="mt-1 text-[13px] text-[#9ca3af]">Responses within 24-48 hours.</p>
            </div>

            <div className="rounded-lg border border-[#24242d] bg-[#121218] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F5D8A]">Business hours</p>
              <p className="mt-1 text-[15px] font-semibold">Mon - Fri, 9:00 AM - 6:00 PM EST</p>
              <p className="mt-1 text-[13px] text-[#9ca3af]">We monitor urgent production issues after hours.</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#24242d] bg-[#121218] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F5D8A]">Location</p>
            <p className="mt-1 text-[15px] font-semibold">Washtenaw County, Michigan</p>
            <p className="mt-1 text-[13px] text-[#9ca3af]">Serving restaurants and food operators statewide.</p>
          </div>
        </section>

        <section className="rounded-xl border border-[#2F5D8A] border-l-4 bg-[#15151a] p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#1c1c22] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-[#2F5D8A]">
            Response promise
          </div>
          <p className="mt-2">We prioritize health-code critical issues and strive to resolve support tickets quickly.</p>
        </section>

        <section className="rounded-xl border border-[#2a2a32] bg-[#15151a] p-6">
          <h2 className={`text-xl font-bold ${outfit.className}`}>Send us a message</h2>

          {submitted ? (
            <div className="mt-4 rounded-xl border border-[#2F5D8A] bg-[#1c1c22] p-6 text-center">
              <p className={`text-lg font-bold ${outfit.className}`}>Message sent!</p>
              <p className="mt-2 text-[15px]">We&apos;ve received your message and will respond within 24-48 hours.</p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[13px] font-semibold">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-[#2a2a32] bg-[#121218] px-4 py-3 text-[15px] placeholder:text-[#52637A] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#2F5D8A]/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[13px] font-semibold">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-[#2a2a32] bg-[#121218] px-4 py-3 text-[15px] placeholder:text-[#52637A] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#2F5D8A]/40"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-semibold">Subject</label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2a32] bg-[#121218] px-4 py-3 text-[15px] placeholder:text-[#52637A] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#2F5D8A]/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-semibold">Message</label>
                <textarea
                  name="message"
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-lg border border-[#2a2a32] bg-[#121218] px-4 py-3 text-[15px] placeholder:text-[#52637A] focus:border-[#2F5D8A] focus:outline-none focus:ring-2 focus:ring-[#2F5D8A]/40"
                />
              </div>

              {error ? <p className="text-[14px] font-medium text-[#ef4444]">{error}</p> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading || !isLoaded}
                  className="inline-flex items-center justify-center rounded-full bg-[#2F5D8A] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1F4E7A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#15151a] focus:ring-[#2F5D8A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send message'}
                </button>
                <p className="text-[13px] text-[#9ca3af]">We use reCAPTCHA to protect this form.</p>
              </div>

              <RecaptchaBadge />
            </form>
          )}
        </section>
      </div>
    </InfoPageLayout>
  )
}
