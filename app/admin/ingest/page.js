// app/admin/ingest/page.js - Web-based document ingestion interface

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminIngestPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const collection = 'michigan' // Fixed to Michigan only
  const [wipe, setWipe] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [healthChecks, setHealthChecks] = useState(null)
  
  // Check if already authenticated (session storage)
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuth = (e) => {
    e.preventDefault()
    // Simple password check - in production, use a secure token
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'change-me-in-production'
    
    if (password === adminPassword) {
      setIsAuthenticated(true)
      sessionStorage.setItem('admin_auth', 'true')
    } else {
      alert('Invalid password')
    }
  }

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { timestamp, message, type }])
  }

  const runHealthCheck = async () => {
    addLog('Running health checks...', 'info')
    setHealthChecks(null)
    
    try {
      const response = await fetch('/api/admin/health-check')
      const data = await response.json()
      
      setHealthChecks(data)
      
      if (data.allPassed) {
        addLog('✅ All health checks passed', 'success')
      } else {
        addLog('⚠️ Some health checks failed', 'warning')
      }
    } catch (error) {
      addLog(`❌ Health check failed: ${error.message}`, 'error')
    }
  }

  const runIngestion = async () => {
    setRunning(true)
    setLogs([])
    setStats(null)
    
    addLog(`Starting ingestion for collection: ${collection}`, 'info')
    if (wipe) addLog('⚠️ Wipe enabled - existing documents will be deleted', 'warning')
    if (dryRun) addLog('ℹ️ Dry run mode - no changes will be made', 'info')
    
    try {
      const response = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, wipe, dryRun })
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
        const lines = chunk.split('\n').filter(l => l.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'log') {
              addLog(data.message, data.level || 'info')
            } else if (data.type === 'stats') {
              setStats(data.stats)
            } else if (data.type === 'complete') {
              addLog('✅ Ingestion complete!', 'success')
              setStats(data.stats)
            } else if (data.type === 'error') {
              addLog(`❌ Error: ${data.message}`, 'error')
            }
          }
        }
      }
    } catch (error) {
      addLog(`❌ Fatal error: ${error.message}`, 'error')
    } finally {
      setRunning(false)
    }
  }

  // Auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-[#E5E7EB] bg-white">
          <div className="max-w-4xl mx-auto px-6 py-5">
            <Link href="/" className="text-xl font-normal text-[#0F172A] hover:text-[#4F7DF3]">
              MI Health Inspection
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto px-6 py-20">
          <div className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
            <h2 className="text-2xl font-medium text-[#0F172A] mb-2">Admin Access</h2>
            <p className="text-sm text-[#475569] mb-6">
              Enter admin password to access document ingestion
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] bg-white"
                required
              />
              <button
                type="submit"
                className="w-full px-6 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] font-medium"
              >
                Authenticate
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
              <p className="text-xs text-[#475569]">
                Set NEXT_PUBLIC_ADMIN_PASSWORD in environment variables
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Main admin interface
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <Link href="/" className="text-xl font-normal text-[#0F172A] hover:text-[#4F7DF3]">
              MI Health Inspection
            </Link>
            <p className="text-sm text-[#475569] mt-1">Admin - Document Ingestion</p>
          </div>
          <button
            onClick={() => {
              setIsAuthenticated(false)
              sessionStorage.removeItem('admin_auth')
            }}
            className="text-sm text-[#475569] hover:text-[#0F172A]"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-[#F7F8FA] rounded-xl p-6 border border-[#E5E7EB] sticky top-6">
              <h2 className="text-lg font-medium text-[#0F172A] mb-4">Control Panel</h2>

              {/* Collection - Fixed to Michigan */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Collection
                </label>
                <div className="w-full px-4 py-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg text-[#0F172A]">
                  Michigan (State-level)
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  Ingests all PDFs from public/documents/michigan/
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={wipe}
                    onChange={(e) => setWipe(e.target.checked)}
                    disabled={running}
                    className="mr-2"
                  />
                  <span className="text-sm text-[#475569]">
                    Wipe existing documents first
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    disabled={running}
                    className="mr-2"
                  />
                  <span className="text-sm text-[#475569]">
                    Dry run (no changes)
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={runHealthCheck}
                  disabled={running}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Run Health Check
                </button>

                <button
                  onClick={runIngestion}
                  disabled={running}
                  className="w-full px-4 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {running ? 'Running...' : 'Start Ingestion'}
                </button>

                <button
                  onClick={() => {
                    setLogs([])
                    setStats(null)
                    setHealthChecks(null)
                  }}
                  disabled={running}
                  className="w-full px-4 py-3 border-2 border-[#E5E7EB] text-[#475569] rounded-xl hover:bg-[#F7F8FA] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Clear Logs
                </button>
              </div>

              {/* Stats Display */}
              {stats && (
                <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                  <h3 className="text-sm font-medium text-[#0F172A] mb-3">Statistics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Files:</span>
                      <span className="font-medium text-[#0F172A]">{stats.processedFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Chunks:</span>
                      <span className="font-medium text-[#0F172A]">{stats.successfulChunks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Failed:</span>
                      <span className="font-medium text-red-600">{stats.failedChunks || 0}</span>
                    </div>
                    {stats.duration && (
                      <div className="flex justify-between">
                        <span className="text-[#475569]">Duration:</span>
                        <span className="font-medium text-[#0F172A]">{stats.duration}s</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Health Check Results */}
              {healthChecks && (
                <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                  <h3 className="text-sm font-medium text-[#0F172A] mb-3">Health Status</h3>
                  <div className="space-y-2 text-sm">
                    {Object.entries(healthChecks.checks || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-[#475569] capitalize">{key}:</span>
                        <span className={value ? 'text-green-600' : 'text-red-600'}>
                          {value ? '✓' : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="lg:col-span-2">
            <div className="bg-[#F7F8FA] rounded-xl p-6 border border-[#E5E7EB]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-[#0F172A]">Logs</h2>
                {running && (
                  <div className="flex items-center text-sm text-[#4F7DF3]">
                    <div className="w-2 h-2 bg-[#4F7DF3] rounded-full animate-pulse mr-2"></div>
                    Running...
                  </div>
                )}
              </div>

              <div className="bg-[#0F172A] rounded-lg p-4 h-[600px] overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-[#64748B] text-center py-8">
                    No logs yet. Run health check or start ingestion.
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`mb-1 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-[#94A3B8]'
                      }`}
                    >
                      <span className="text-[#64748B]">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
