// app/page.js (server wrapper) - No authentication required
import { Suspense } from 'react'
import PageClient from './page.client'

export default function Page() {
  // Authentication disabled - allow all users to access the app
  return (
    <Suspense fallback={<div className="landing-loading">Loading...</div>}>
      <PageClient />
    </Suspense>
  )
}
