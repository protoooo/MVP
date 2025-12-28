'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ChemicalStorage() {
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
          Michigan Chemical Storage Requirements for Food Service
        </h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-slate-300 mb-8">
            Proper storage of cleaning chemicals and toxic materials is critical for food safety. 
            Improper chemical storage is a Priority violation that can lead to serious contamination risks.
          </p>

          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3 text-red-200">⚠️ Priority Violation</h3>
            <p className="text-red-200">
              Chemical storage violations are classified as <strong>Priority items</strong> because they 
              directly contribute to foodborne illness or contamination. Inspectors will require immediate 
              correction of these violations.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Key Storage Requirements</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Storage Location
                </h3>
                <p className="text-slate-300 mb-2">
                  Poisonous or toxic materials must be stored to prevent contamination of:
                </p>
                <ul className="text-slate-300 space-y-1">
                  <li>• Food</li>
                  <li>• Equipment</li>
                  <li>• Utensils</li>
                  <li>• Linens</li>
                  <li>• Single-service and single-use articles</li>
                </ul>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 7-206.11
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Acceptable Storage Methods
                </h3>
                <ul className="text-slate-300 space-y-2">
                  <li>
                    <strong>• Separate Storage Area:</strong> Designate a specific area away from food and clean equipment
                  </li>
                  <li>
                    <strong>• Locked Cabinet:</strong> Store chemicals in a locked cabinet inaccessible during food prep
                  </li>
                  <li>
                    <strong>• Below Food:</strong> Never store chemicals above food or food-contact surfaces
                  </li>
                  <li>
                    <strong>• Proper Containers:</strong> Keep chemicals in original labeled containers
                  </li>
                </ul>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 7-206.12
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Labeling Requirements
                </h3>
                <ul className="text-slate-300 space-y-1">
                  <li>• All chemicals must be in labeled containers</li>
                  <li>• Labels must identify contents</li>
                  <li>• Working containers must be clearly labeled</li>
                  <li>• Labels must include usage instructions if applicable</li>
                  <li>• Never use food containers for chemicals</li>
                </ul>
                <div className="mt-2 text-sm text-slate-400">
                  Reference: Michigan Food Code, Section 7-207.11
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Practical Examples - Correct Storage</h3>
            <ul className="space-y-2 text-slate-300">
              <li>✓ All cleaning chemicals stored in locked cabinet away from kitchen</li>
              <li>✓ Spray bottles labeled with chemical name and instructions</li>
              <li>✓ Sanitizer solution stored below counter, not above food prep surface</li>
              <li>✓ Dish detergent stored at dish sink but separated from clean dishes</li>
              <li>✓ Floor cleaner stored in separate mop closet</li>
              <li>✓ Sanitizer test strips kept with chemicals, not near food</li>
            </ul>
          </div>

          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-semibold mb-3">Common Violations</h3>
            <ul className="space-y-2 text-orange-200">
              <li>✗ Spray bottle of cleaner sitting on dish drainboard with clean dishes</li>
              <li>✗ Windex or glass cleaner stored on shelf above food prep counter</li>
              <li>✗ Bleach bottle in same sink basin as dishes being washed</li>
              <li>✗ Unlabeled spray bottle with unknown chemical</li>
              <li>✗ Degreaser stored in empty food container</li>
              <li>✗ Chemical spray bottle left on cutting board or prep surface</li>
              <li>✗ Cleaning supplies stored in refrigerator with food</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">What Inspectors Look For</h2>
            
            <p className="text-slate-300 mb-4">
              During a health inspection, inspectors specifically check:
            </p>
            <ul className="text-slate-300 space-y-2">
              <li>• Any chemicals in contact with food or food-contact surfaces</li>
              <li>• Chemicals stored above or adjacent to food storage areas</li>
              <li>• Unlabeled containers that could contain chemicals</li>
              <li>• Spray bottles left in food prep or dishwashing areas</li>
              <li>• Chemical storage that could lead to contamination</li>
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
                  → Equipment sanitization
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Dishwashing procedures
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-blue-400 hover:text-blue-300">
                  → Storage requirements
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
            We recently caught chemical storage violations in 34% of video analyses
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
