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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            ProtocolLM
          </Link>
          <nav className="flex gap-4">
            <Link href="/resources" className="text-slate-300 hover:text-white">
              Q&A
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
              Get $149 Analysis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Michigan Food Safety Q&A
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
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
              className="flex-1 px-6 py-4 rounded-lg bg-slate-800 border border-slate-600 focus:border-blue-500 focus:outline-none text-lg"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Rate limit info */}
        {results?.remaining !== undefined && (
          <p className="text-sm text-slate-400">
            {results.remaining} of 50 free questions remaining this month
          </p>
        )}
      </section>

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          {results.results.length === 0 ? (
            <div className="text-center text-slate-400">
              <p className="text-lg mb-4">{results.message}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-6">
                Results for &quot;{results.query}&quot;
              </h2>

              {/* Main Results */}
              <div className="space-y-6 mb-8">
                {results.results.map((result, idx) => (
                  <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-sm text-slate-400">
                        {result.source} {result.page !== 'N/A' && `(Page ${result.page})`}
                      </div>
                      <div className="text-xs text-blue-400">
                        {Math.round((result.relevance || 0) * 100)}% relevant
                      </div>
                    </div>
                    <p className="text-slate-100 mb-4 leading-relaxed">
                      {result.regulation}
                    </p>
                    {result.example && (
                      <div className="bg-blue-900/20 border border-blue-700/30 rounded p-3 text-sm text-blue-200">
                        <strong>Practical Example:</strong> {result.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Related Requirements */}
              {results.relatedRequirements?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Related Requirements</h3>
                  <div className="grid gap-4">
                    {results.relatedRequirements.map((req, idx) => (
                      <div key={idx} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                        <div className="text-xs text-slate-400 mb-2">
                          {req.source} {req.page !== 'N/A' && `(Page ${req.page})`}
                        </div>
                        <p className="text-sm text-slate-300">{req.regulation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion CTA */}
              {results.conversionMessage && (
                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-lg p-6 text-center">
                  <p className="text-lg mb-4">{results.conversionMessage}</p>
                  <Link 
                    href="/signup?plan=video_analysis"
                    className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
                  >
                    Get $149 Video Analysis →
                  </Link>
                  <p className="text-sm text-slate-400 mt-3">
                    We recently caught violations in 34% of video analyses
                  </p>
                </div>
              )}

              {/* Image Upload Teaser */}
              {!showImageUpload && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="text-blue-400 hover:text-blue-300 underline"
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
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Free Image Compliance Check</h2>
            <p className="text-slate-300 mb-6">
              Upload a photo from your establishment to get a quick compliance check. 
              Limited to 10 free analyses per month.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-slate-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>

              {imageFile && (
                <div className="text-sm text-slate-400">
                  Selected: {imageFile.name}
                </div>
              )}

              <button
                onClick={handleAnalyzeImage}
                disabled={analyzingImage || !imageFile || !email}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {analyzingImage ? 'Analyzing...' : 'Analyze Image'}
              </button>
            </div>

            {/* Image Analysis Results */}
            {imageAnalysis && (
              <div className="mt-6 space-y-4">
                <div className="bg-slate-900 rounded-lg p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-3xl font-bold text-green-400">
                        {imageAnalysis.compliantItems}
                      </div>
                      <div className="text-sm text-slate-400">Compliant Items</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-orange-400">
                        {imageAnalysis.issuesDetected}
                      </div>
                      <div className="text-sm text-slate-400">Potential Issues</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {imageAnalysis.issues?.map((issue, idx) => (
                      <div key={idx} className="bg-orange-900/20 border border-orange-700/30 rounded p-3 text-sm">
                        {issue}
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-slate-400 mt-4">
                    {imageAnalysis.detailMessage}
                  </p>
                </div>

                {imageAnalysis.remaining !== undefined && (
                  <p className="text-sm text-slate-400 text-center">
                    {imageAnalysis.remaining} of 10 free analyses remaining this month
                  </p>
                )}

                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-lg p-6 text-center">
                  <p className="text-lg font-semibold mb-4">
                    {imageAnalysis.conversionCta}
                  </p>
                  <Link 
                    href="/signup?plan=video_analysis"
                    className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                  >
                    Get Full Video Analysis →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Questions */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Popular Questions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {POPULAR_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(q)
                handleSearch({ preventDefault: () => {} })
              }}
              className="text-left p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400">
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
