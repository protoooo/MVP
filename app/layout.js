import './globals.css'
import { Outfit } from 'next/font/google'
import SessionGuard from '@/components/SessionGuard'
import CookieConsent from '@/components/CookieConsent'
import AmexBackground from '@/components/AmexBackground'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
  title: 'protocolLM',
  description: 'Health Code Compliance for Washtenaw County',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {/* ✅ Background at z-index 0 (behind everything) */}
        <AmexBackground />

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
