'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

export default function KnowledgeBase() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imageAnalysis, setImageAnalysis] = useState(null)
  const [email, setEmail] = useState('')
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const fileInputRef = useRef(null)

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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setImageFile(file)
    setError(null)
  }

  const handleAnalyzeImage = async () => {
    if (!imageFile || !email.trim()) {
      setError('Please provide an email and select an image')
      return
    }

    setAnalyzingImage(true)
    setError(null)

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const response = await fetch('/api/knowledge-base/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email,
              image: e.target.result 
            })
          })

          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || 'Analysis failed')
          }

          setImageAnalysis(data)
          
          // Show upgrade modal if needed
          if (data.showUpgradeModal) {
            setTimeout(() => {
              if (window.confirm(data.upgradeMessage + '\n\nGo to pricing page?')) {
                window.location.href = '/signup?plan=video_analysis'
              }
            }, 2000)
          }
        } catch (err) {
          setError(err.message)
        } finally {
          setAnalyzingImage(false)
        }
      }
      reader.readAsDataURL(imageFile)
    } catch (err) {
      setError(err.message)
      setAnalyzingImage(false)
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
          Analyze photos for compliance issues. 50 free questions and 10 free image analyses per month.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about Michigan food safety..."
              className="flex-1 px-6 py-4 rounded-lg border focus:outline-none text-lg"
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
              className="px-8 py-4 rounded-lg font-semibold text-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Searching...' : 'Search'}
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

              {/* Image Upload Teaser */}
              {!showImageUpload && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="underline transition"
                    style={{ color: 'var(--accent)' }}
                  >
                    Upload a photo to check compliance →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Image Upload Section */}
      {showImageUpload && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="rounded-lg p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>Free Image Compliance Check</h2>
            <p className="mb-6" style={{ color: 'var(--ink-60)' }}>
              Upload a photo from your establishment to get a quick compliance check. 
              Limited to 10 free analyses per month.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  style={{ background: 'var(--clay)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>Upload Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:text-white hover:file:opacity-90 file:cursor-pointer"
                  style={{ color: 'var(--ink)' }}
                />
                <style jsx>{`
                  input[type="file"]::file-selector-button {
                    background: var(--accent);
                  }
                `}</style>
              </div>

              {imageFile && (
                <div className="text-sm" style={{ color: 'var(--ink-60)' }}>
                  Selected: {imageFile.name}
                </div>
              )}

              <button
                onClick={handleAnalyzeImage}
                disabled={analyzingImage || !imageFile || !email}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)' }}
              >
                {analyzingImage ? 'Analyzing...' : 'Analyze Image'}
              </button>
            </div>

            {/* Image Analysis Results */}
            {imageAnalysis && (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg p-6" style={{ background: 'var(--clay)' }}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>
                        {imageAnalysis.compliantItems}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--ink-60)' }}>Compliant Items</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold" style={{ color: '#f97316' }}>
                        {imageAnalysis.issuesDetected}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--ink-60)' }}>Potential Issues</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {imageAnalysis.issues?.map((issue, idx) => (
                      <div key={idx} className="rounded p-3 text-sm" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                        {issue}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm mt-4" style={{ color: 'var(--ink-60)' }}>
                    {imageAnalysis.detailMessage}
                  </p>
                </div>

                {imageAnalysis.remaining !== undefined && (
                  <p className="text-sm text-center" style={{ color: 'var(--ink-60)' }}>
                    {imageAnalysis.remaining} of 10 free analyses remaining this month
                  </p>
                )}

                <div className="rounded-lg p-6 text-center" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
                  <p className="text-lg font-semibold mb-4" style={{ color: 'var(--ink)' }}>
                    {imageAnalysis.conversionCta}
                  </p>
                  <Link 
                    href="/"
                    className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors text-white"
                    style={{ background: 'var(--accent)' }}
                  >
                    Buy License →
                  </Link>
                </div>
              </div>
            )}
          </div>
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
          <p>© 2024 ProtocolLM. Michigan Food Safety Compliance.</p>
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
