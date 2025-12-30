'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TenantLandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [photoCount, setPhotoCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleStartReport = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate email
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      // Create checkout session
      const response = await fetch('/api/tenant/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
          propertyAddress: propertyAddress || null,
          photoCount: photoCount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Michigan Tenant Condition Report
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Document habitability issues with professional photo analysis
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-bold text-gray-900 leading-tight">
            Document Rental Unit Issues<br />
            <span className="text-blue-600">Get a Forensic Evidence Package</span>
          </h2>
          <p className="text-xl text-gray-600 mt-6 leading-relaxed">
            Upload photos of your rental unit to generate a professional forensic evidence package 
            documenting habitability violations, complete with verified timestamps, GPS validation, 
            landlord demand letter, and your tenant rights under Michigan law.
          </p>
          
          {/* Detroit Statistics Alert */}
          <div className="mt-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              Critical: Michigan Landlord Non-Compliance Crisis
            </h3>
            <p className="text-sm text-gray-800 leading-relaxed">
              <strong>Studies show nearly 90% of evicting landlords in Detroit are not compliant with city codes</strong>, 
              and only <strong>10% of Detroit rentals</strong> meet full compliance standards. This means most tenants 
              are living in conditions that violate Michigan housing law. This report helps you document violations 
              and assert your legal rights.
            </p>
          </div>
          
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">What We Analyze (Visible Conditions Only):</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Mold, water damage, stains</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Broken windows, doors, locks</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Holes in walls, ceilings, floors</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Visible pest infestations</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Exposed/damaged electrical wiring</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Leaking plumbing fixtures</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Structural damage (cracks, sagging)</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Peeling paint (lead hazard)</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-300">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> We cannot detect non-visible issues like heat/AC not working, 
                no hot water, or non-functioning outlets from photos. We'll include a checklist 
                in your report for these items.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Form */}
      <section className="max-w-6xl mx-auto px-6 py-12 bg-gray-50">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Get Your Report
            </h3>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">One-Time Payment</p>
                  <p className="text-sm text-gray-600">Up to 200 photos included</p>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  $20
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleStartReport} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  We'll email you the access code for your report
                </p>
              </div>

              <div>
                <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-2">
                  Property Address (Optional)
                </label>
                <input
                  type="text"
                  id="property"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main St, Detroit, MI 48201"
                />
              </div>

              <div>
                <label htmlFor="photoCount" className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Number of Photos
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    id="photoCount"
                    min="1"
                    max="200"
                    value={photoCount}
                    onChange={(e) => setPhotoCount(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-gray-900 w-16 text-right">
                    {photoCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  You can upload up to 200 photos total
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue to Payment'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Secure payment powered by Stripe. No account required.
              </p>
            </form>
          </div>

          {/* What You'll Get */}
          <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">What You'll Receive:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Professional PDF report with cover page and analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Issues organized by room/area with photo references</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Michigan tenant rights and legal code references</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Required landlord actions with timelines</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Consequences if issues are not corrected</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Checklist for non-visible issues to track</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Michigan tenant resources and contact information</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Important Legal Disclaimer</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            This service provides documentation and informational tools only. It is <strong>NOT legal advice</strong> and 
            does not create an attorney-client relationship. The analysis is based on AI review of photographs and 
            may not capture all issues. Always consult with a qualified attorney or local housing authority before 
            taking legal action. This report analyzes visible conditions only and cannot detect issues like 
            heating/cooling functionality, hot water availability, working electrical outlets, or other non-visible problems.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600">
              © 2024 Michigan Tenant Condition Report. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
