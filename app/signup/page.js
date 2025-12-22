// app/signup/page.js (server wrapper)
import { Suspense } from 'react'
import SignupPageClient from './page.client'

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="landing-loading">Loading...</div>}>
      <SignupPageClient />
    </Suspense>
  )
}
