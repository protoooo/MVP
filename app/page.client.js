'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import appleIcon from './apple-icon.png'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '/auth'

function useVisitorId() {
  const [visitorId, setVisitorId] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const existing = window.localStorage.getItem('plm_visitor_id')
    if (existing) {
      setVisitorId(existing)
      return
    }
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
    window.localStorage.setItem('plm_visitor_id', id)
    setVisitorId(id)
  }, [])

  return visitorId
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const visitorId = useVisitorId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const formDisabled = status === 'loading'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim()) {
      setMessage('Please enter an email address.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), visitorId }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Could not start your trial right now.')
      }

      setStatus('success')
      setMessage('You’re in! Opening the app and sending your welcome email…')

      const destination = data.appUrl || APP_URL
      setTimeout(() => {
        router.push(destination)
      }, 650)
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Something went wrong. Please try again.')
    }
  }

  const statusTone = useMemo(() => {
    if (status === 'success') return 'text-emerald-700'
    if (status === 'error') return 'text-rose-700'
    return 'text-slate-600'
  }, [status])

  return (
    <div className={`${plusJakarta.className} min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100`}>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-6 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Image src={appleIcon} alt="protocolLM logo" width={48} height={48} priority className="h-12 w-12" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">protocolLM</p>
            <p className="text-sm font-semibold text-slate-700">Built for Michigan food safety teams</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span>30-day free trial</span>
          <span className="text-slate-300">•</span>
          <span>No credit card</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">
              Made for Michigan Modified Food Code
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Catch Michigan Food Code Violations Before the Inspector Does
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-700">
              AI-powered compliance checking. Take a photo, get instant violation detection with specific code citations
              so you can fix issues before an inspector writes them up.
            </p>
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-5 shadow-sm">
              <div className="aspect-video w-full rounded-2xl bg-slate-100/80 ring-1 ring-slate-200/70">
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                  60-second demo video (placeholder)
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                We’ll drop in your video here. For now, this placeholder keeps the focus on the signup.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Trial length" value="30 days" />
              <Stat label="Scans during trial" value="Unlimited" />
              <Stat label="Per-device pricing" value="$50/mo after trial" />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Start 30-Day Free Trial</p>
              <h2 className="text-2xl font-bold text-slate-900">Email-only signup. Immediate access.</h2>
              <p className="text-sm text-slate-600">
                No credit card. Unlimited photo scans. Skip verification — go straight into the app and receive a welcome
                email with your login link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Work email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  autoComplete="email"
                  inputMode="email"
                  disabled={formDisabled}
                />
              </label>

              <button
                type="submit"
                disabled={formDisabled}
                className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'loading' ? 'Starting your trial…' : 'Start 30-Day Free Trial'}
              </button>
            </form>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              No credit card required · Unlimited scans during trial · Email required to start
            </p>

            {message && (
              <p className={`mt-3 text-sm font-semibold ${statusTone}`} role="status">
                {message}
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-800">What happens after you submit?</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                <li>• We capture your email via our email service.</li>
                <li>• You’re redirected straight into the app for immediate use.</li>
                <li>• A welcome email arrives with a login link you can save.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-100 text-center text-base font-extrabold text-sky-700">3</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Simple process</p>
              <h3 className="text-xl font-bold text-slate-900">Get value in three steps</h3>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Take a photo',
                text: 'Snap your kitchen, storage, or prep area right from your phone.',
              },
              {
                title: 'Instant analysis',
                text: 'We flag violations with Michigan Modified Food Code citations.',
              },
              {
                title: 'Fix before inspection',
                text: 'Resolve issues ahead of time and keep inspectors happy.',
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="flex h-full flex-col rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-extrabold text-white">
                  {idx + 1}
                </div>
                <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing after trial</p>
              <h3 className="text-2xl font-bold text-slate-900">$50/month per device</h3>
              <p className="text-sm text-slate-600">30-day free trial · Unlimited scans · No credit card to start</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Multi-location discounts available. Reply to your welcome email and we’ll tailor pricing for your stores.
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 px-4 pb-10 text-sm text-slate-500 sm:px-6 lg:px-8">
        <Link href="/terms" className="font-semibold text-slate-600 hover:text-slate-900">
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="font-semibold text-slate-600 hover:text-slate-900">
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/contact" className="font-semibold text-slate-600 hover:text-slate-900">
          Contact
        </Link>
      </footer>
    </div>
  )
}
