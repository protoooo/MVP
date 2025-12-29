import { Suspense } from 'react'
import LoginPageClient from './page.client'

export const metadata = {
  title: 'Sign In - ProtocolLM',
  description: 'Sign in to your ProtocolLM account',
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  )
}
