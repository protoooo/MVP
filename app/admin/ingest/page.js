'use client'
import { useState } from 'react'

export default function AdminIngestPage() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])

  const addLog = (message) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const startIngestion = async () => {
    setLoading(true)
    setLogs([])
    addLog('Starting document ingestion...')

    try {
      const response = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.log) {
                addLog(data.log)
              }
              
              if (data.status) {
                setStatus(data.status)
              }
              
              if (data.complete) {
                addLog('✅ Ingestion complete!')
                setLoading(false)
              }
            } catch (e) {
              console.error('Parse error:', e)
            }
          }
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Document Ingestion Admin</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-slate-700 mb-4">
            {status || 'Ready to start ingestion'}
          </p>
          
          <button
            onClick={startIngestion}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Start Ingestion'}
          </button>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 text-green-400 font-mono text-sm overflow-auto max-h-96">
          {logs.length === 0 ? (
            <div className="text-slate-500">No logs yet...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))
          )}
        </div>

        <div className="mt-6 text-sm text-slate-600">
          <p><strong>Note:</strong> This will process all PDFs in public/documents/washtenaw/</p>
          <p className="mt-2">Make sure you have:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>Valid OpenAI API key with credits</li>
            <li>Supabase service role key configured</li>
            <li>PDFs uploaded to the correct folder</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
