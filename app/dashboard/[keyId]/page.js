'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const keyId = params.keyId
  const isNew = searchParams.get('new') === 'true'
  
  const [apiKeyData, setApiKeyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [keyRevealed, setKeyRevealed] = useState(isNew)

  useEffect(() => {
    async function fetchKeyData() {
      try {
        const res = await fetch(`/api/dashboard/key-info?keyId=${keyId}`)
        if (!res.ok) {
          throw new Error('Failed to fetch API key data')
        }
        const data = await res.json()
        setApiKeyData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (keyId) {
      fetchKeyData()
    }
  }, [keyId])

  const copyToClipboard = () => {
    if (apiKeyData?.key) {
      navigator.clipboard.writeText(apiKeyData.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-8 max-w-md">
          <h1 className="text-red-400 text-xl font-bold mb-2">Error</h1>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  if (!apiKeyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">API key not found</div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            API Dashboard
          </h1>
          <p className="text-slate-400">
            Manage your API key and monitor usage
          </p>
        </div>

        {/* New Key Alert */}
        {isNew && keyRevealed && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-yellow-400 font-semibold mb-1">
                  Important: Save Your API Key Now
                </h3>
                <p className="text-yellow-300 text-sm">
                  This is the only time you'll see your full API key. After you leave this page, you'll only see a masked version. Copy it now and store it securely.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Key Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">API Key</h2>
            <span className={`px-3 py-1 rounded-full text-sm ${
              apiKeyData.active 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {apiKeyData.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              <code className="text-sm font-mono text-slate-300 break-all flex-1">
                {keyRevealed ? apiKeyData.key : apiKeyData.maskedKey}
              </code>
              {keyRevealed && (
                <button
                  onClick={copyToClipboard}
                  className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {!keyRevealed && isNew && (
            <button
              onClick={() => setKeyRevealed(true)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              → Reveal full API key (one time only)
            </button>
          )}

          {!isNew && !keyRevealed && (
            <p className="text-slate-400 text-sm">
              For security, your API key is masked. If you've lost it, you'll need to regenerate a new key.
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-1">Credits Remaining</div>
            <div className="text-3xl font-bold text-white">
              {apiKeyData.remaining_credits.toLocaleString()}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              of {apiKeyData.total_credits.toLocaleString()} total
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-1">Credits Used</div>
            <div className="text-3xl font-bold text-white">
              {(apiKeyData.total_used || 0).toLocaleString()}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {((apiKeyData.total_used || 0) / apiKeyData.total_credits * 100).toFixed(1)}% utilized
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm mb-1">Plan</div>
            <div className="text-2xl font-bold text-white capitalize">
              {apiKeyData.tier || 'Standard'}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {apiKeyData.expires ? `Expires ${formatDate(apiKeyData.expires)}` : 'No expiration'}
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">1. Use in API requests</h3>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <pre className="text-sm text-slate-300 overflow-x-auto">
{`curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL || 'https://api.protocollm.com'}/api/audit-photos \\
  -H "X-Api-Key: ${keyRevealed ? apiKeyData.key : 'your_api_key_here'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "images": ["https://example.com/image.jpg"],
    "location": "warehouse"
  }'`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">2. View API Documentation</h3>
              <a 
                href="/api-documentation" 
                className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                View Full Documentation →
              </a>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-slate-500 text-sm">
          <p>Need help? Contact support or check the documentation</p>
          <p className="mt-2">Key ID: {apiKeyData.id}</p>
        </div>
      </div>
    </div>
  )
}
