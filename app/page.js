'use client'

import { useState, useEffect } from 'react'

export default function MIHealthInspectionPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileImageToken, setTurnstileImageToken] = useState(null)
  const [turnstileVideoToken, setTurnstileVideoToken] = useState(null)
  const [turnstileLoaded, setTurnstileLoaded] = useState(false)

  // Check if Turnstile script is loaded
  useEffect(() => {
    const checkTurnstile = setInterval(() => {
      if (window.turnstile) {
        setTurnstileLoaded(true)
        clearInterval(checkTurnstile)
      }
    }, 100)

    return () => clearInterval(checkTurnstile)
  }, [])

  // Render Turnstile widgets after script loads
  useEffect(() => {
    if (!turnstileLoaded) return

    // Render Turnstile for image analysis
    const imageWidget = document.getElementById('turnstile-image')
    if (imageWidget && !imageWidget.hasAttribute('data-rendered')) {
      window.turnstile.render('#turnstile-image', {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token) => {
          setTurnstileImageToken(token)
        },
        'error-callback': () => {
          setTurnstileImageToken(null)
        },
        'expired-callback': () => {
          setTurnstileImageToken(null)
        }
      })
      imageWidget.setAttribute('data-rendered', 'true')
    }

    // Render Turnstile for video analysis
    const videoWidget = document.getElementById('turnstile-video')
    if (videoWidget && !videoWidget.hasAttribute('data-rendered')) {
      window.turnstile.render('#turnstile-video', {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token) => {
          setTurnstileVideoToken(token)
        },
        'error-callback': () => {
          setTurnstileVideoToken(null)
        },
        'expired-callback': () => {
          setTurnstileVideoToken(null)
        }
      })
      videoWidget.setAttribute('data-rendered', 'true')
    }
  }, [turnstileLoaded])

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
    if (!turnstileImageToken) {
      alert('Please complete the verification challenge')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'image',
          turnstileToken: turnstileImageToken 
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(`Error: ${data.error || 'Failed to create payment session'}`)
        // Reset Turnstile widget
        setTurnstileImageToken(null)
        if (window.turnstile) {
          window.turnstile.reset('#turnstile-image')
        }
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
      // Reset Turnstile widget
      setTurnstileImageToken(null)
      if (window.turnstile) {
        window.turnstile.reset('#turnstile-image')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVideoAnalysis = async () => {
    if (!turnstileVideoToken) {
      alert('Please complete the verification challenge')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'video',
          turnstileToken: turnstileVideoToken 
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(`Error: ${data.error || 'Failed to create payment session'}`)
        // Reset Turnstile widget
        setTurnstileVideoToken(null)
        if (window.turnstile) {
          window.turnstile.reset('#turnstile-video')
        }
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
      // Reset Turnstile widget
      setTurnstileVideoToken(null)
      if (window.turnstile) {
        window.turnstile.reset('#turnstile-video')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] font-sans text-gray-900">
      {/* Official Gov Banner */}
      <div className="bg-[#1b1b1b] px-4 py-1">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="text-white text-[10px] uppercase tracking-wider font-semibold">
            An official Michigan compliance tool
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b-4 border-[#1a4480]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-[#1a4480] tracking-tight">MI Health Inspection</h1>
            <p className="text-base text-gray-600 mt-1">mihealthinspection.com — Food Safety Regulation Assistance</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 gap-8">
          
          {/* Free Q&A Section - Styled as a Gov Form */}
          <section className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm">
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold text-[#1a4480]">Regulation Inquiry</h2>
              <p className="text-gray-600 mt-2">Get answers grounded in Michigan food safety regulations (Free).</p>
            </div>
            
            <form onSubmit={handleQASubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                  Your Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., What temperature must hot food be held at?"
                  className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900 min-h-[120px]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {loading ? 'Processing Inquiry...' : 'Submit Question'}
              </button>
            </form>
            
            {answer && (
              <div className="mt-8 bg-blue-50 border-l-8 border-[#1a4480] p-6">
                <h3 className="text-sm font-bold text-[#1a4480] uppercase mb-2">Response</h3>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
          </section>

          {/* Services Container */}
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Paid Image Analysis */}
            <section className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm flex flex-col h-full">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-[#1a4480]">Image Analysis</h2>
                <p className="text-sm text-gray-600 mt-1">Upload photos of kitchen/prep areas.</p>
              </div>

              <div className="flex-grow">
                <div className="bg-gray-100 p-4 border border-gray-200 mb-6 rounded-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">Fee</span>
                    <span className="text-xl font-bold text-[#1a4480]">$100.00</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Up to 1,000 images</p>
                </div>
                
                <ul className="list-disc pl-5 space-y-2 mb-8 text-sm text-gray-700">
                  <li>Detect violations via photo upload</li>
                  <li>Severity level assessment</li>
                  <li>Plain-language explanations</li>
                  <li>Official PDF report generation</li>
                </ul>
              </div>

              <div className="mt-auto space-y-6">
                {/* Turnstile Widget */}
                <div className="bg-gray-50 p-4 border border-gray-200 flex justify-center rounded-sm">
                  <div id="turnstile-image"></div>
                  {!turnstileLoaded && (
                    <span className="text-sm text-gray-500">Loading security check...</span>
                  )}
                </div>
                
                <button
                  onClick={handleImageAnalysis}
                  disabled={loading || !turnstileImageToken}
                  className="w-full py-4 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Proceed to Image Upload'}
                </button>
                
                {!turnstileImageToken && turnstileLoaded && (
                  <p className="text-xs text-red-700 font-medium text-center bg-red-50 p-2 border border-red-100">
                    Verification required
                  </p>
                )}
              </div>
            </section>

            {/* Paid Video Analysis */}
            <section className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm flex flex-col h-full">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-[#1a4480]">Video Analysis</h2>
                <p className="text-sm text-gray-600 mt-1">Comprehensive walkthrough analysis.</p>
              </div>

              <div className="flex-grow">
                <div className="bg-gray-100 p-4 border border-gray-200 mb-6 rounded-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">Fee</span>
                    <span className="text-xl font-bold text-[#1a4480]">$300.00</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Up to 60 minutes</p>
                </div>
                
                <ul className="list-disc pl-5 space-y-2 mb-8 text-sm text-gray-700">
                  <li>Upload or record walkthrough</li>
                  <li>Frame-by-frame extraction</li>
                  <li>Timeline-based reporting</li>
                  <li>Official PDF report generation</li>
                </ul>
              </div>

              <div className="mt-auto space-y-6">
                {/* Turnstile Widget */}
                <div className="bg-gray-50 p-4 border border-gray-200 flex justify-center rounded-sm">
                  <div id="turnstile-video"></div>
                  {!turnstileLoaded && (
                    <span className="text-sm text-gray-500">Loading security check...</span>
                  )}
                </div>
                
                <button
                  onClick={handleVideoAnalysis}
                  disabled={loading || !turnstileVideoToken}
                  className="w-full py-4 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processing...' : 'Proceed to Video Upload'}
                </button>
                
                {!turnstileVideoToken && turnstileLoaded && (
                  <p className="text-xs text-red-700 font-medium text-center bg-red-50 p-2 border border-red-100">
                    Verification required
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1b1b1b] text-white mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4">About this tool</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                The MI Health Inspection tool assists Michigan food service establishments in preparing for official health inspections. 
                All analysis is grounded in current Michigan state food safety regulations.
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-sm text-gray-400">© {new Date().getFullYear()} MI Health Inspection</p>
              <p className="text-xs text-gray-500 mt-2">Not an official government agency. For informational purposes only.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
