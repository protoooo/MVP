import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import CookieConsent from '@/components/CookieConsent'
import SessionGuard from '@/components/SessionGuard'
import Analytics from '@/components/Analytics'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '@/lib/supabaseConfig'

const appFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata = {
  title: 'protocolLM - Pre-Inspection Video Analysis for Michigan Restaurants',
  description: 'Find health code violations before the inspector does. Upload up to 1 hour video walkthrough of your Michigan restaurant and get a comprehensive compliance report with downloadable PDF. $149 per inspection. Allow time for video processing.',
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
          {!isSupabaseConfigured && (
            <div
              role="alert"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--ink)',
                padding: '12px 14px',
                borderRadius: '8px',
                margin: '12px',
                fontWeight: 600,
              }}
            >
              {missingSupabaseConfigMessage}
            </div>
          )}
          {isSupabaseConfigured && <SessionGuard />}
          {children}
          <CookieConsent />
        </div>
      </body>
    </html>
  )
}
