'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function InfoPageLayout({ title, eyebrow, subtitle, children }) {
  useEffect(() => {
    const previousView = document.documentElement.dataset.view
    document.documentElement.dataset.view = 'landing'
    return () => {
      if (previousView) {
        document.documentElement.dataset.view = previousView
      } else {
        document.documentElement.removeAttribute('data-view')
      }
    }
  }, [])

  return (
    <div className={`min-h-screen bg-[#F6FAF9] text-[#0B1220] ${inter.className}`}>
      <div className="relative isolate overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(85,214,178,0.12),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(47,93,138,0.14),transparent_38%),radial-gradient(circle_at_50%_80%,rgba(85,214,178,0.18),transparent_32%)]" />
          <div className="absolute inset-x-10 top-8 h-32 rounded-full bg-white/60 blur-3xl shadow-[0_20px_60px_rgba(31,78,122,0.08)]" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className={`inline-flex items-baseline gap-0 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[#0B1220] shadow-[0_1px_3px_rgba(11,18,32,0.08)] ring-1 ring-[#D7E6E2] backdrop-blur ${outfit.className}`}>
            <span className="tracking-tight">protocol</span>
            <span className="tracking-tight text-[#2F5D8A]">LM</span>
          </Link>
          <div className="hidden sm:flex items-center gap-3 text-[13px] font-medium text-[#3D4F5F]">
            <span className="hidden sm:inline-block rounded-full bg-white/80 px-3 py-1 text-[12px] uppercase tracking-[0.18em] text-[#2F5D8A] ring-1 ring-[#D7E6E2]">Compliance ready</span>
            <span className="text-[#3D4F5F]">Made in Washtenaw County.</span>
          </div>
        </header>

        <main className="relative z-10 mx-auto mt-8 max-w-6xl space-y-6">
          <div className="overflow-hidden rounded-3xl border border-[#D7E6E2] bg-white/90 shadow-[0_18px_45px_rgba(11,18,32,0.08)] backdrop-blur">
            <div className="border-b border-[#E8F0ED] px-6 py-6 sm:px-10 sm:py-8">
              {eyebrow ? (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E8FAF4] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2F5D8A] ring-1 ring-[#B8CFC8]">
                  {eyebrow}
                </div>
              ) : null}
              <h1 className={`text-3xl font-extrabold tracking-tight text-[#0B1220] sm:text-4xl ${outfit.className}`}>{title}</h1>
              {subtitle ? <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#3D4F5F]">{subtitle}</p> : null}
            </div>

            <div className="px-6 py-8 sm:px-10 sm:py-10">{children}</div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 text-center text-[13px] text-[#3D4F5F] sm:flex-row sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 ring-1 ring-[#D7E6E2]">Health code compliance for Washtenaw County operators.</div>
            <Link href="/" className="inline-flex items-center gap-2 text-[#2F5D8A] underline-offset-4 hover:text-[#1F4E7A] hover:underline">
              <span aria-hidden>←</span> Return to landing
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
