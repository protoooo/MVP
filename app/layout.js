import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import CookieConsent from '@/components/CookieConsent'
import SessionGuard from '@/components/SessionGuard'
import Image from 'next/image'
import bg from '@/app/assets/background/protocolLM-bg.png'
import Analytics from '@/components/Analytics'

const appFont = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata = {
  title: 'protocolLM',
  description: 'Health Code Compliance for Michigan',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
          <SessionGuard />
          {children}
          <CookieConsent />
        </div>
      </body>
    </html>
  )
}
