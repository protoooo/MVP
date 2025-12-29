import './globals.css'
import CookieConsent from '@/components/CookieConsent'
import Analytics from '@/components/Analytics'

export const metadata = {
  title: 'Michigan Food Safety Compliance API - Webhook & API Integration',
  description: 'Pure API/Webhook integration for automatic photo compliance checks. Powered by Cohere Vision. No UI. No accounts.',
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
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
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
