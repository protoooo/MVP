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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-light-gray bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-dark-gray">
            Michigan Tenant Condition Report
          </h1>
          <p className="text-sm text-medium-gray mt-1">
            Document habitability issues with professional photo analysis
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-bold text-dark-gray leading-tight">
            Document Rental Unit Issues<br />
            <span className="text-matte-blue">Get a Forensic Evidence Package</span>
          </h2>
          <p className="text-xl text-medium-gray mt-6 leading-relaxed">
            Upload photos of your rental unit to generate a professional forensic evidence package 
            documenting habitability violations, complete with verified timestamps, GPS validation, 
            landlord demand letter, and your tenant rights under Michigan law.
          </p>
          
          {/* Detroit Statistics Alert */}
          <div className="mt-6 alert-danger">
            <h3 className="font-bold text-dark-gray mb-2 flex items-center">
              <span className="text-red-600 mr-2 text-xl">⚠️</span>
              Critical: Michigan Landlord Non-Compliance Crisis
            </h3>
            <p className="text-sm text-dark-gray leading-relaxed">
              <strong>Studies show nearly 90% of evicting landlords in Detroit are not compliant with city codes</strong>, 
              and only <strong>10% of Detroit rentals</strong> meet full compliance standards. This means most tenants 
              are living in conditions that violate Michigan housing law. This report helps you document violations 
              and assert your legal rights.
            </p>
          </div>
          
          <div className="mt-8 alert-info">
            <h3 className="font-semibold text-dark-gray mb-3">What We Analyze (Visible Conditions Only):</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-dark-gray">
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
            
            <div className="mt-4 pt-4 border-t border-matte-blue/30">
              <p className="text-sm text-dark-gray">
                <strong>Note:</strong> We cannot detect non-visible issues like heat/AC not working, 
                no hot water, or non-functioning outlets from photos. We'll include a checklist 
                in your report for these items.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Form */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div className="card">
            <h3 className="text-2xl font-bold text-dark-gray mb-6">
              Get Your Report
            </h3>
            
            <div className="mb-6 p-5 bg-cream rounded-xl border border-light-gray">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-dark-gray">One-Time Payment</p>
                  <p className="text-sm text-medium-gray">Up to 200 photos included</p>
                </div>
                <div className="text-3xl font-bold text-matte-blue">
                  $20
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 alert-danger">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleStartReport} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-gray mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-matte-blue focus:border-transparent transition-all"
                  placeholder="your@email.com"
                />
                <p className="mt-1 text-xs text-medium-gray">
                  We'll email you the access code for your report
                </p>
              </div>

              <div>
                <label htmlFor="property" className="block text-sm font-medium text-dark-gray mb-2">
                  Property Address (Optional)
                </label>
                <input
                  type="text"
                  id="property"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-matte-blue focus:border-transparent transition-all"
                  placeholder="123 Main St, Detroit, MI 48201"
                />
              </div>

              <div>
                <label htmlFor="photoCount" className="block text-sm font-medium text-dark-gray mb-2">
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
                    className="flex-1 accent-matte-blue"
                  />
                  <span className="text-lg font-semibold text-matte-blue w-16 text-right">
                    {photoCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-medium-gray">
                  You can upload up to 200 photos total
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue to Payment'}
              </button>

              <p className="text-xs text-medium-gray text-center">
                Secure payment powered by Stripe. No account required.
              </p>
            </form>
          </div>

          {/* What You'll Get */}
          <div className="mt-8 card">
            <h4 className="font-semibold text-dark-gray mb-4">What You'll Receive:</h4>
            <ul className="space-y-2 text-sm text-dark-gray">
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Professional PDF report with cover page and analysis</span>
              </li>
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Issues organized by room/area with photo references</span>
              </li>
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Michigan tenant rights and legal code references</span>
              </li>
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Required landlord actions with timelines</span>
              </li>
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Consequences if issues are not corrected</span>
              </li>
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Checklist for non-visible issues to track</span>
              </li>
              <li className="flex items-start">
                <span className="text-matte-blue mr-2">✓</span>
                <span>Michigan tenant resources and contact information</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto alert-warning">
          <h4 className="font-semibold text-dark-gray mb-3">Important Legal Disclaimer</h4>
          <p className="text-sm text-dark-gray leading-relaxed">
            This service provides documentation and informational tools only. It is <strong>NOT legal advice</strong> and 
            does not create an attorney-client relationship. The analysis is based on AI review of photographs and 
            may not capture all issues. Always consult with a qualified attorney or local housing authority before 
            taking legal action. This report analyzes visible conditions only and cannot detect issues like 
            heating/cooling functionality, hot water availability, working electrical outlets, or other non-visible problems.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-light-gray mt-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-medium-gray">
              © 2024 Michigan Tenant Condition Report. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-sm text-medium-gray hover:text-matte-blue transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-medium-gray hover:text-matte-blue transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
