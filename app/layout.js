import './globals.css'
import { Outfit } from 'next/font/google'
import SessionGuard from '@/components/SessionGuard'
import CookieConsent from '@/components/CookieConsent'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
  title: 'protocolLM',
  description: 'Health Code Compliance for Washtenaw County',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {/* ✅ Spline background wrapper - CRITICAL: Must have id="plm-spline-bg" */}
        <div 
          id="plm-spline-bg" 
          className="fixed inset-0 z-0 pointer-events-none" 
          aria-hidden="true"
          style={{ display: 'block' }}
        >
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
