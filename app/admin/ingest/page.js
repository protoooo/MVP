'use client'
import { useState } from 'react'

export default function AdminIngestPage() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  const startIngestion = async () => {
    setLoading(true)
    setLogs([])
    addLog("Starting ingestion...")

    const res = await fetch("/api/admin/ingest", { method: "POST" })
    if (!res.ok) addLog("❌ Error during ingestion")

    addLog("✅ Ingestion complete!")
    setLoading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Document Ingestion Admin</h1>

      <button
        className="bg-blue-600 text-white px-6 py-3 rounded-lg mb-4 disabled:opacity-50"
        disabled={loading}
        onClick={startIngestion}
      >
        {loading ? "Processing..." : "Start Ingestion"}
      </button>

      <div className="bg-black text-green-400 font-mono p-4 rounded-lg h-96 overflow-auto">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  )
}
