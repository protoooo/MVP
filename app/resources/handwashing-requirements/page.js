// app/resources/handwashing-requirements/page.js
import { Suspense } from 'react'
import HandwashingRequirementsClient from './page.client'

export const metadata = {
  title: 'Michigan Handwashing Requirements for Food Service | ProtocolLM',
  description: 'Complete guide to Michigan food safety handwashing requirements. Learn when and how to wash hands properly in food service establishments.',
  keywords: 'Michigan handwashing, food safety, hand hygiene, Michigan food code, employee hygiene',
  openGraph: {
    title: 'Michigan Handwashing Requirements for Food Service',
    description: 'Complete guide to proper handwashing in Michigan food establishments',
    type: 'article'
  }
}

export default function HandwashingRequirementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <HandwashingRequirementsClient />
    </Suspense>
  )
}
