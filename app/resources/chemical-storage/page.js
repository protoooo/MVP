// app/resources/chemical-storage/page.js
import { Suspense } from 'react'
import ChemicalStorageClient from './page.client'

export const metadata = {
  title: 'Michigan Chemical Storage Requirements | ProtocolLM',
  description: 'Learn about Priority violations related to chemical storage in Michigan food service. Proper storage prevents contamination of food, equipment, and utensils.',
  keywords: 'Michigan chemical storage, toxic materials, cleaning chemicals, Michigan food code, priority violation',
  openGraph: {
    title: 'Michigan Chemical Storage Requirements',
    description: 'Complete guide to proper chemical storage in Michigan food establishments',
    type: 'article'
  }
}

export default function ChemicalStoragePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <ChemicalStorageClient />
    </Suspense>
  )
}
