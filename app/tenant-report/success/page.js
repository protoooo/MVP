// app/tenant-report/success/page.js
import { Suspense } from 'react'
import SuccessPageClient from './page.client'

export const metadata = {
  title: 'Report Generating - Michigan Tenant Report',
  description: 'Your tenant condition report is being generated',
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessPageClient />
    </Suspense>
  )
}
