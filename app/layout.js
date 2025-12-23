import './globals.css'
import { Outfit } from 'next/font/google'
import SessionGuard from '@/components/SessionGuard'
import CookieConsent from '@/components/CookieConsent'
import bg from '@/app/assets/background/protocolLM-bg.png'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
  title: 'protocolLM',
  description: 'Health Code Compliance for Washtenaw County',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={outfit.className}
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(7, 10, 18, 0.78)), url(${bg.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: '#05070D',
          minHeight: '100vh',
        }}
      >
        {/* App content wrapper */}
        <div className="relative z-10 min-h-screen w-full">
          <SessionGuard />
          {children}
          <CookieConsent />
        </div>
      </body>
    </html>
  )
}
