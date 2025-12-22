// app/page.js (server wrapper)
import { Suspense } from 'react'
import PageClient from './page.client'

export default function Page() {
  return (
    <Suspense fallback={<div className="landing-loading">Loading...</div>}>
      <PageClient />
    </Suspense>
  )
}
