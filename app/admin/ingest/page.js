'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function AdminIngestPage() {
  const supabase = createClient()
  const router = useRouter()

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleIngest = async () => {
    if (running) return
    setRunning(true)
    setResult(null)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL

      if (!user || (adminEmail && user.email !== adminEmail)) {
        setRunning(false)
        router.push('/')
        return
      }

      const res = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || 'Ingestion failed')
      }

      setResult(payload)
    } catch (err) {
      console.error('Ingestion error', err)
      setError(err.message || 'Unexpected error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Re-ingest Documents</h1>
            <p className="text-sm text-slate-600 mt-1">
              Run the ingestion job against the documents in <code className="font-mono">public/documents/washtenaw</code>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/analytics')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Analytics
            </button>
            <button
              onClick={() => router.push('/admin/locations')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Locations
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-700">
                This will read PDFs from your deployment bundle and re-write embeddings to the <code className="font-mono">documents</code> table using the Cohere v4 model.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                The job is throttled to respect Cohere rate limits and may take several minutes to finish.
              </p>
            </div>
            <button
              onClick={handleIngest}
              disabled={running}
              className={`px-4 py-2 text-sm font-semibold rounded-lg text-white ${
                running ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {running ? 'Running…' : 'Start ingestion'}
            </button>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
              <div className="font-semibold mb-1">Ingestion complete</div>
              <ul className="space-y-1">
                <li>Files processed: {result.files}</li>
                <li>Total chunks: {result.chunks}</li>
                <li>Model: {result.embed_model}</li>
                <li>Dimensions: {result.embed_dims}</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
              <div className="font-semibold mb-1">Error</div>
              <p>{error}</p>
            </div>
          )}

          {!result && !error && (
            <div className="bg-slate-50 border border-dashed border-slate-300 text-slate-600 rounded-lg p-4 text-sm">
              <p className="font-semibold">Tip</p>
              <p className="mt-1">
                Ensure your PDFs are present in <code className="font-mono">public/documents/washtenaw</code> before starting. If you recently deployed, redeploy with updated documents first.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
