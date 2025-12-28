// app/resources/page.js
import { Suspense } from 'react'
import KnowledgeBaseClient from './page.client'

export const metadata = {
  title: 'Michigan Food Safety Q&A | ProtocolLM',
  description: 'Ask questions about Michigan food safety regulations and get instant AI-powered answers. 50 free questions per month.',
  keywords: 'Michigan food safety, food code, restaurant regulations, health inspection, compliance, Q&A',
  openGraph: {
    title: 'Michigan Food Safety Q&A',
    description: 'Free Q&A about Michigan food safety regulations with AI-powered answers',
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
