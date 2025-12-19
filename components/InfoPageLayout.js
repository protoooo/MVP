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
    <div className={`min-h-screen bg-[#0e0e11] text-[#f2f2f2] ${inter.className}`}>
      <div className="px-5 pb-16 pt-10 sm:px-8 lg:px-12">
        <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/" className={`inline-flex items-center gap-2 rounded-md bg-[#1c1c22] px-3 py-2 text-sm font-semibold text-[#f2f2f2] ring-1 ring-[#2a2a32] ${outfit.className}`}>
            <span className="tracking-tight">protocol</span>
            <span className="tracking-tight">LM</span>
          </Link>
          <Link href="/" className="text-[13px] text-[#d9d9df] hover:underline">
            ← Back to app
          </Link>
        </header>

        <main className="mx-auto mt-10 max-w-5xl space-y-6">
          <div className="rounded-2xl border border-[#2a2a32] bg-[#121218] px-6 py-8 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
            {eyebrow ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-[#1c1c22] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#f2f2f2] ring-1 ring-[#2a2a32]">
                {eyebrow}
              </div>
            ) : null}
            <h1 className={`text-3xl font-extrabold tracking-tight text-[#f2f2f2] sm:text-4xl ${outfit.className}`}>{title}</h1>
            {subtitle ? <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#d9d9df]">{subtitle}</p> : null}

            <div className="info-content mt-8 space-y-6 text-[15px] leading-relaxed text-[#d9d9df]">
              {children}
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        .info-content section,
        .info-content div,
        .info-content ul,
        .info-content li,
        .info-content p {
          background: transparent !important;
          color: #d9d9df !important;
          border: none !important;
          box-shadow: none !important;
        }
        .info-content h2,
        .info-content h3 {
          color: #f2f2f2 !important;
        }
        .info-content a {
          color: #f2f2f2 !important;
        }
        .info-content ul {
          list-style: disc;
          padding-left: 1.25rem;
        }
      `}</style>
    </div>
  )
}
