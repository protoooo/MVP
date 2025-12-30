'use client'

import { useState } from 'react'

export default function MIHealthInspectionPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  const handleQASubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAnswer('')
    
    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setAnswer(data.answer)
      } else {
        setAnswer(`Error: ${data.error || 'Failed to get answer'}`)
      }
    } catch (error) {
      setAnswer(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImageAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'image' })
      })
      
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVideoAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'video' })
      })
      
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <h1 className="text-xl font-normal text-[#0F172A]">MI Health Inspection</h1>
          <p className="text-sm text-[#475569] mt-1">mihealthinspection.com</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-6">
          {/* Free Q&A Section */}
          <section className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
            <h2 className="text-lg font-medium text-[#0F172A] mb-2">Ask a Compliance Question (Free)</h2>
            <p className="text-sm text-[#475569] mb-6">Get answers grounded in Michigan food safety regulations. No hallucination.</p>
            
            <form onSubmit={handleQASubmit} className="space-y-4">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: What temperature must hot food be held at?"
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] focus:border-transparent resize-none bg-white text-[#0F172A]"
                rows={4}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Processing...' : 'Ask Question'}
              </button>
            </form>
            
            {answer && (
              <div className="mt-6 p-4 bg-white border border-[#E5E7EB] rounded-xl">
                <p className="text-sm text-[#0F172A] whitespace-pre-wrap">{answer}</p>
              </div>
            )}
          </section>

          {/* Paid Image Analysis */}
          <section className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-lg font-medium text-[#0F172A] mb-2">Image Analysis</h2>
                <p className="text-sm text-[#475569] mb-4">Analyze photos of your kitchen, prep areas, and storage against Michigan health codes</p>
                <p className="text-xs text-[#475569]">Supported: JPG, JPEG, PNG, WEBP, HEIC</p>
              </div>
              <div className="text-right ml-6">
                <div className="text-2xl font-normal text-[#0F172A]">$50</div>
                <div className="text-xs text-[#475569]">one-time</div>
              </div>
            </div>
            
            <ul className="space-y-2 mb-6 text-sm text-[#475569]">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Upload or take photos (mobile camera + desktop)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Violations identified with severity levels</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Plain-language explanations</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Downloadable PDF report</span>
              </li>
            </ul>
            
            <button
              onClick={handleImageAnalysis}
              disabled={loading}
              className="px-8 py-3 bg-[#0F172A] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Upload or Take Photos
            </button>
          </section>

          {/* Paid Video Analysis */}
          <section className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h2 className="text-lg font-medium text-[#0F172A] mb-2">Video Analysis</h2>
                <p className="text-sm text-[#475569] mb-4">Record or upload walkthrough video of your establishment for comprehensive analysis</p>
                <p className="text-xs text-[#475569]">Supported: MP4, MOV, WEBM, M4V, AVI</p>
              </div>
              <div className="text-right ml-6">
                <div className="text-2xl font-normal text-[#0F172A]">$200</div>
                <div className="text-xs text-[#475569]">30 min window</div>
              </div>
            </div>
            
            <ul className="space-y-2 mb-6 text-sm text-[#475569]">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Upload or record video (mobile camera + desktop)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Intelligent frame extraction and analysis</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Timeline-based violation reporting</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Downloadable PDF report</span>
              </li>
            </ul>
            
            <button
              onClick={handleVideoAnalysis}
              disabled={loading}
              className="px-8 py-3 bg-[#0F172A] text-white rounded-xl hover:bg-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Upload or Take Video
            </button>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="text-xs text-[#475569]">
            MI Health Inspection helps Michigan food service establishments prepare for health inspections. 
            Analysis grounded in Michigan state food safety regulations.
          </p>
        </div>
      </footer>
    </div>
  )
}
