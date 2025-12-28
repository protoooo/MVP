// app/resources/refrigeration-temperatures/page.js
import { Suspense } from 'react'
import RefrigerationTemperaturesClient from './page.client'

export const metadata = {
  title: 'Michigan Refrigeration Temperature Requirements | ProtocolLM',
  description: 'Learn about Michigan food safety refrigeration temperature requirements. Potentially hazardous foods must be stored at 41°F or below.',
  keywords: 'Michigan refrigeration, food temperature, cold storage, Michigan food code, food safety',
  openGraph: {
    title: 'Michigan Refrigeration Temperature Requirements',
    description: 'Complete guide to Michigan food safety refrigeration requirements',
    type: 'article'
  }
}

export default function RefrigerationTemperaturesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <RefrigerationTemperaturesClient />
    </Suspense>
  )
}
