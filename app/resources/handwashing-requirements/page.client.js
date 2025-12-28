'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HandwashingRequirements() {
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      window.location.href = `/resources?q=${encodeURIComponent(query)}`
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
              Knowledge Base
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
              Get $149 Analysis
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">
          Michigan Handwashing Requirements for Food Service
        </h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-slate-300 mb-8">
            Proper handwashing is one of the most important practices to prevent foodborne illness. 
            Michigan food safety regulations have strict requirements for when and how to wash hands.
          </p>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">When to Wash Hands</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Before Activities
                </h3>
                <ul className="text-slate-300 space-y-1">
                  <li>• Before starting work</li>
                  <li>• Before handling clean equipment and utensils</li>
                  <li>• Before putting on single-use gloves</li>
                  <li>• Before handling ready-to-eat food</li>
                </ul>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 2-301.14
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  After Activities
                </h3>
                <ul className="text-slate-300 space-y-1">
                  <li>• After touching bare skin</li>
                  <li>• After using the restroom</li>
                  <li>• After coughing, sneezing, or touching face/hair</li>
                  <li>• After handling raw meat, poultry, or seafood</li>
                  <li>• After handling soiled equipment or utensils</li>
                  <li>• After eating, drinking, or using tobacco</li>
                  <li>• After any activity that contaminates hands</li>
                </ul>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 2-301.14
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Proper Handwashing Procedure
                </h3>
                <ol className="text-slate-300 space-y-2">
                  <li>1. Wet hands with warm running water (at least 100°F/38°C)</li>
                  <li>2. Apply soap and lather for at least <strong>20 seconds</strong></li>
                  <li>3. Scrub hands, wrists, between fingers, and under nails</li>
                  <li>4. Rinse thoroughly under warm running water</li>
                  <li>5. Dry hands with single-use paper towel or hand dryer</li>
                </ol>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 2-301.12
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Handwashing Sink Requirements</h2>
            
            <ul className="text-slate-300 space-y-2">
              <li>• Must be equipped for handwashing only (not food prep or dishwashing)</li>
              <li>• Must have hot and cold running water</li>
              <li>• Must provide soap and paper towels or hand dryer</li>
              <li>• Must have a waste receptacle</li>
              <li>• Must be accessible and convenient to work areas</li>
              <li>• Signage reminding employees to wash hands must be posted</li>
            </ul>
            <div className="mt-4 text-sm text-slate-400">
              Reference: Michigan Food Code, Sections 5-202.12, 6-301.11, 6-301.12, 6-301.14
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Practical Examples</h3>
            <ul className="space-y-2 text-slate-300">
              <li>✓ Employee washes hands for full 20 seconds after using restroom</li>
              <li>✓ Cook washes hands immediately after handling raw chicken before touching vegetables</li>
              <li>✓ Server washes hands after clearing dirty dishes before serving food</li>
              <li>✓ Employee changes gloves and washes hands after touching face</li>
              <li>✓ Handwashing sink is stocked with soap and paper towels at all times</li>
            </ul>
          </div>

          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Common Violations</h3>
            <ul className="space-y-2 text-orange-200">
              <li>✗ Employee fails to wash hands after using restroom</li>
              <li>✗ Handwashing only for 5-10 seconds (not full 20 seconds)</li>
              <li>✗ No soap or paper towels at handwashing sink</li>
              <li>✗ Using food prep sink for handwashing</li>
              <li>✗ Handwashing sink blocked by boxes or equipment</li>
              <li>✗ No handwashing signage posted</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Related Requirements</h3>
            <ul className="space-y-2 text-slate-300">
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Cross-contamination prevention
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Employee health policies
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Bare hand contact with ready-to-eat foods
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Glove use requirements
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Search Bar for Follow-up Questions */}
        <div className="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h3 className="text-2xl font-semibold mb-4">Have More Questions?</h3>
          <p className="text-slate-300 mb-4">
            Search our knowledge base for answers to other Michigan food safety questions.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about food safety..."
              className="flex-1 px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Conversion CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Automatic Compliance Checking
          </h3>
          <p className="text-lg text-slate-300 mb-6">
            This is 1 of 200+ requirements we check automatically in our video analysis. 
            See how your establishment measures up.
          </p>
          <Link 
            href="/signup?plan=video_analysis"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
          >
            Get $149 Video Analysis →
          </Link>
          <p className="text-sm text-slate-400 mt-4">
            We recently caught handwashing violations in 42% of video analyses
          </p>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400">
          <p>© 2024 ProtocolLM. Michigan Food Safety Compliance.</p>
        </div>
      </footer>
    </div>
  )
}
