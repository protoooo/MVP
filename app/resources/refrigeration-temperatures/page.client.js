'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RefrigerationTemperatures() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

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
          Michigan Refrigeration Temperature Requirements
        </h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-slate-300 mb-8">
            Understanding proper refrigeration temperatures is critical for food safety 
            and compliance with Michigan food safety regulations.
          </p>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Key Requirements</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  General Refrigeration
                </h3>
                <p className="text-slate-300">
                  According to the Michigan Modified Food Code, potentially hazardous foods (PHF) 
                  must be stored at <strong>41°F (5°C) or below</strong> to prevent bacterial growth.
                </p>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 3-501.16
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Freezer Storage
                </h3>
                <p className="text-slate-300">
                  Frozen foods must be maintained at <strong>0°F (-18°C) or below</strong> 
                  to ensure food quality and safety.
                </p>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 3-501.17
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Temperature Monitoring
                </h3>
                <p className="text-slate-300">
                  Food establishments must monitor and document refrigeration temperatures 
                  regularly. A calibrated thermometer must be easily readable and accurate 
                  to ±3°F (±1.5°C).
                </p>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 4-204.112
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Practical Examples</h3>
            <ul className="space-y-2 text-slate-300">
              <li>✓ Store raw chicken at 38°F in a properly functioning refrigerator</li>
              <li>✓ Keep dairy products below 41°F at all times</li>
              <li>✓ Monitor and log temperatures at least twice daily</li>
              <li>✓ Take corrective action immediately if temperatures exceed limits</li>
              <li>✓ Discard food that has been in the temperature danger zone (41°F-135°F) for more than 4 hours</li>
            </ul>
          </div>

          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Common Violations</h3>
            <ul className="space-y-2 text-orange-200">
              <li>✗ Refrigerator running at 45°F (too warm)</li>
              <li>✗ No thermometer in refrigeration units</li>
              <li>✗ Thermometer not calibrated or broken</li>
              <li>✗ No temperature logs or incomplete documentation</li>
              <li>✗ Overstocked refrigerators preventing proper air circulation</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Related Requirements</h3>
            <ul className="space-y-2 text-slate-300">
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Hot holding temperatures
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Cooling procedures for cooked foods
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Food storage requirements
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Cross-contamination prevention
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
              disabled={loading}
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
            We recently caught temperature violations in 28% of video analyses
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
