'use client'

import { useState } from 'react'

export default function AdminIngestPage() {
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleIngest = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ingestion failed')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Document Ingestion Console</h1>
        
        <div className="bg-[#1C1C1C] border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleIngest} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Ingestion Secret Key
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Enter secret key"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingesting Documents...' : 'Start Ingestion'}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm font-medium">Error:</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-3">
                ✓ Ingestion Complete
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Files:</span>
                  <span className="text-white font-medium">{result.totalFiles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Chunks:</span>
                  <span className="text-white font-medium">{result.totalChunks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Successfully Inserted:</span>
                  <span className="text-white font-medium">{result.successfulInserts}</span>
                </div>
              </div>

              {result.results && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-xs font-medium mb-2">Files Processed:</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {result.results.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 truncate">{file.filename}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded ${
                          file.status === 'success' 
                            ? 'bg-green-500/20 text-green-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {file.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 p-6 bg-[#1C1C1C] border border-white/10 rounded-lg">
          <h2 className="text-lg font-bold mb-3">Instructions</h2>
          <ol className="space-y-2 text-sm text-gray-300">
            <li>1. Make sure your PDFs are in: <code className="text-green-400">public/documents/washtenaw/</code></li>
            <li>2. Set <code className="text-green-400">INGEST_SECRET_KEY</code> in Railway environment variables</li>
            <li>3. Enter the secret key above and click "Start Ingestion"</li>
            <li>4. This will process all PDFs and create embeddings in your Supabase database</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
