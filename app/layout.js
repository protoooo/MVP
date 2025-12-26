import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import CookieConsent from '@/components/CookieConsent'
import SessionGuard from '@/components/SessionGuard'
import Image from 'next/image'
import bg from '@/app/assets/background/protocolLM-bg.png'
import Analytics from '@/components/Analytics'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '@/lib/supabaseConfig'

const appFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata = {
  title: 'protocolLM',
  description: 'Health Code Compliance for Michigan',
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
        {/* ✅ fixed, crisp background layer */}
        <div className="plm-bg" aria-hidden="true">
          <Image
            src={bg}
            alt=""
            fill
            priority
            sizes="100vw"
            className="plm-bg-img"
          />
          <div className="plm-bg-vignette" />
        </div>

        {/* ✅ App content wrapper above background */}
        <div className="plm-app">
          {!isSupabaseConfigured && (
            <div
              role="alert"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: '#f6f9ff',
                padding: '12px 14px',
                borderRadius: '12px',
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
