// app/resources/page.js
import { Suspense } from 'react'
import KnowledgeBaseClient from './page.client'

export const metadata = {
  title: 'Michigan Food Safety Knowledge Base | ProtocolLM',
  description: 'Free semantic search for Michigan food safety regulations. Get instant answers about the Michigan Modified Food Code.',
  keywords: 'Michigan food safety, food code, restaurant regulations, health inspection, compliance',
  openGraph: {
    title: 'Michigan Food Safety Knowledge Base',
    description: 'Free semantic search for Michigan food safety regulations',
    type: 'website'
  }
}

export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>}>
      <KnowledgeBaseClient />
    </Suspense>
  )
}
