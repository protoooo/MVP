// app/login/page.js (server wrapper)
import { Suspense } from 'react'
import LoginPageClient from './page.client'

export const metadata = {
  title: 'Sign In - ProtocolLM',
  description: 'Sign in to your ProtocolLM account',
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="landing-loading">Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  )
}
