import './globals.css'
import { Outfit } from 'next/font/google'
import SessionGuard from '@/components/SessionGuard'
import CookieConsent from '@/components/CookieConsent'
import SplineBackground from '@/components/SplineBackground'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
  title: 'protocolLM',
  description: 'Health Code Compliance for Washtenaw County',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {/* ✅ Spline background wrapper (we can hide this via body[data-plm-authed="1"]) */}
        <div id="plm-spline-bg" className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
          <SplineBackground />
        </div>

        {/* ✅ App content at z-index 10 (above background) */}
        <div className="relative z-10 min-h-screen w-full">
          <SessionGuard />
          {children}
          <CookieConsent />
        </div>
      </body>
    </html>
  )
}
