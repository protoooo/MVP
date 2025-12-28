'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function KnowledgeBase() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/knowledge-base/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" style={{ color: 'var(--ink)' }}>
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            ProtocolLM
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="px-4 py-2 rounded-lg font-medium text-white transition" style={{ background: 'var(--accent)' }}>
              Buy License
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6" style={{ color: 'var(--ink)' }}>
          Michigan Food Safety Q&A
        </h1>
        <p className="text-xl mb-8 max-w-3xl mx-auto" style={{ color: 'var(--ink-60)' }}>
          Ask questions about Michigan food safety regulations and get instant AI-powered answers. 
          50 free questions per month.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about Michigan food safety..."
              className="flex-1 px-4 sm:px-6 py-4 rounded-lg border focus:outline-none text-base sm:text-lg"
              style={{ 
                background: 'var(--surface)', 
                borderColor: 'var(--border)',
                color: 'var(--ink)'
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 sm:px-8 py-4 rounded-lg font-semibold text-base sm:text-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ background: 'var(--accent)' }}
            >
              <span className="hidden sm:inline">{loading ? 'Searching...' : 'Search'}</span>
              <span className="sm:hidden">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </div>
        </form>

        {/* Rate limit info */}
        {results?.remaining !== undefined && (
          <p className="text-sm" style={{ color: 'var(--ink-40)' }}>
            {results.remaining} of 50 free questions remaining this month
          </p>
        )}
      </section>

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="rounded-lg p-4" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' }}>
            {error}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          {results.results.length === 0 ? (
            <div className="text-center" style={{ color: 'var(--ink-60)' }}>
              <p className="text-lg mb-4">{results.message}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>
                Results for &quot;{results.query}&quot;
              </h2>

              {/* Main Results */}
              <div className="space-y-6 mb-8">
                {results.results.map((result, idx) => (
                  <div key={idx} className="rounded-lg p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-sm" style={{ color: 'var(--ink-60)' }}>
                        {result.source} {result.page !== 'N/A' && `(Page ${result.page})`}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--accent)' }}>
                        {Math.round((result.relevance || 0) * 100)}% relevant
                      </div>
                    </div>
                    <p className="mb-4 leading-relaxed" style={{ color: 'var(--ink)' }}>
                      {result.regulation}
                    </p>
                    {result.example && (
                      <div className="rounded p-3 text-sm" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                        <strong>Practical Example:</strong> {result.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Related Requirements */}
              {results.relatedRequirements?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--ink)' }}>Related Requirements</h3>
                  <div className="grid gap-4">
                    {results.relatedRequirements.map((req, idx) => (
                      <div key={idx} className="rounded-lg p-4" style={{ background: 'var(--clay)', border: '1px solid var(--border)' }}>
                        <div className="text-xs mb-2" style={{ color: 'var(--ink-60)' }}>
                          {req.source} {req.page !== 'N/A' && `(Page ${req.page})`}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>{req.regulation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion CTA */}
              {results.conversionMessage && (
                <div className="rounded-lg p-6 text-center" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
                  <p className="text-lg mb-4" style={{ color: 'var(--ink)' }}>{results.conversionMessage}</p>
                  <Link 
                    href="/"
                    className="inline-block px-8 py-3 rounded-lg font-semibold text-lg transition-colors text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    Buy License →
                  </Link>
                  <p className="text-sm mt-3" style={{ color: 'var(--ink-60)' }}>
                    We recently caught violations in 34% of video analyses
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Popular Questions */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--ink)' }}>Popular Questions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(q)
                handleSearch({ preventDefault: () => {} })
              }}
              className="text-left p-4 rounded-lg transition-colors"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)' }}
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-4 text-center" style={{ color: 'var(--ink-60)' }}>
          <p>© 2025 ProtocolLM. Michigan Food Safety Compliance.</p>
        </div>
      </footer>
    </div>
  )
}

const POPULAR_QUESTIONS = [
  "What are the refrigeration temperature requirements?",
  "How should I store cleaning chemicals?",
  "What are the handwashing requirements?",
  "How do I prevent cross-contamination?",
  "What temperature should hot food be held at?",
  "How long can I cool cooked food?",
  "What are the requirements for food labeling?",
  "How often should I clean equipment?"
]
