import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import CookieConsent from '@/components/CookieConsent'
import Analytics from '@/components/Analytics'

const appFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata = {
  title: 'Michigan Food Safety Photo Analysis - $50 Reports & API Access',
  description: 'Upload restaurant photos, get instant Michigan health code compliance reports. No signup required. $50 per report or buy API access.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icon-512.png" sizes="512x512" type="image/png" />
      </head>
      <body className={appFont.className}>
        <Analytics />
        {/* ✅ Flat background - NO IMAGE, just off-white color via CSS */}
        <div className="plm-bg" aria-hidden="true" />

        {/* ✅ App content wrapper above background */}
        <div className="plm-app">
          {/* Authentication removed - SessionGuard disabled */}
          {children}
          <CookieConsent />
        </div>
      </body>
    </html>
  )
}
