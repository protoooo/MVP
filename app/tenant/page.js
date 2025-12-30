'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DETROIT_STATS } from '@/lib/constants'

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
      {/* Header - Mobile First */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">MI</span>
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Michigan Tenant Report
                </h1>
                <p className="text-xs text-slate-600 hidden sm:block">Document & Protect Your Rights</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <a 
                href="/privacy" 
                className="text-sm text-slate-600 hover:text-primary-600 transition-colors hidden md:block"
              >
                Privacy
              </a>
              <a 
                href="/terms" 
                className="text-sm text-slate-600 hover:text-primary-600 transition-colors hidden md:block"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile First */}
      <section className="bg-gradient-to-br from-slate-50 to-white py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight mb-6">
              Document Rental Issues
              <span className="block text-primary-600 mt-2">Get Professional Evidence</span>
            </h2>
            <p className="text-base md:text-lg text-slate-600 leading-relaxed mb-8">
              Upload photos of your rental unit to generate a professional forensic evidence package 
              documenting habitability violations, complete with verified timestamps, GPS validation, 
              and Michigan tenant rights references.
            </p>
          </div>
        </div>
      </section>

      {/* Critical Alert - Detroit Statistics */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-6 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 md:p-6 shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-base md:text-lg font-bold text-red-900 mb-2">
                    Critical: Michigan Landlord Non-Compliance Crisis
                  </h3>
                  <p className="text-sm md:text-base text-red-800 leading-relaxed">
                    Studies show nearly <strong>{DETROIT_STATS.NON_COMPLIANT_PERCENTAGE}% of evicting landlords in Detroit are not compliant with city codes</strong>, 
                    and only <strong>{DETROIT_STATS.COMPLIANT_PERCENTAGE}% of Detroit rentals</strong> meet full compliance standards. 
                    This report helps you document violations and assert your legal rights.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Analyze Section */}
      <section className="px-4 sm:px-6 lg:px-8 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 border-l-4 border-primary-600 rounded-xl p-4 md:p-6 shadow-md">
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4">
                What We Analyze (Visible Conditions Only):
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {[
                  'Mold, water damage, stains',
                  'Broken windows, doors, locks',
                  'Holes in walls, ceilings, floors',
                  'Visible pest infestations',
                  'Exposed/damaged electrical wiring',
                  'Leaking plumbing fixtures',
                  'Structural damage (cracks, sagging)',
                  'Peeling paint (lead hazard)',
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm md:text-base text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-primary-200">
                <p className="text-sm md:text-base text-slate-700">
                  <strong>Note:</strong> We cannot detect non-visible issues like heat/AC not working, 
                  no hot water, or non-functioning outlets from photos. We'll include a checklist 
                  in your report for these items.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Form - Mobile First */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 md:mb-8">
                Get Your Report
              </h3>
              
              {/* Pricing Display - Mobile First */}
              <div className="mb-6 md:mb-8 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-5 md:p-6 border-2 border-primary-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-lg md:text-xl font-bold text-slate-900 mb-1">One-Time Payment</p>
                    <p className="text-sm md:text-base text-slate-600">Up to 200 photos included</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary-50 text-secondary-700 text-xs font-semibold">
                        ✓ Instant Access
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary-50 text-secondary-700 text-xs font-semibold">
                        ✓ No Subscription
                      </span>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <div className="text-4xl md:text-5xl font-bold text-primary-600">
                      $20
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">per report</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 animate-shake">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="ml-3 text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleStartReport} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 md:h-14 px-4 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 bg-white"
                    placeholder="your@email.com"
                  />
                  <p className="mt-2 text-xs md:text-sm text-slate-600">
                    We'll email you the access code for your report
                  </p>
                </div>

                <div>
                  <label htmlFor="property" className="block text-sm font-semibold text-slate-900 mb-2">
                    Property Address (Optional)
                  </label>
                  <input
                    type="text"
                    id="property"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full h-12 md:h-14 px-4 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all duration-200 bg-white"
                    placeholder="123 Main St, Detroit, MI 48201"
                  />
                </div>

                <div>
                  <label htmlFor="photoCount" className="block text-sm font-semibold text-slate-900 mb-3">
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
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-slate-200"
                      style={{
                        background: `linear-gradient(to right, #1e40af 0%, #1e40af ${(photoCount / 200) * 100}%, #e2e8f0 ${(photoCount / 200) * 100}%, #e2e8f0 100%)`
                      }}
                    />
                    <span className="text-xl md:text-2xl font-bold text-primary-600 min-w-[60px] text-right">
                      {photoCount}
                    </span>
                  </div>
                  <p className="mt-2 text-xs md:text-sm text-slate-600">
                    You can upload up to 200 photos total
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 md:h-14 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-base md:text-lg rounded-xl shadow-lg hover:shadow-lift-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Continue to Secure Payment'
                  )}
                </button>

                <div className="flex items-center justify-center space-x-2 text-xs md:text-sm text-slate-600">
                  <svg className="w-4 h-4 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure payment powered by Stripe</span>
                </div>
              </form>
            </div>

            {/* What You'll Get */}
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
              <h4 className="text-lg md:text-xl font-bold text-slate-900 mb-4 md:mb-6">What You'll Receive:</h4>
              <ul className="space-y-3 md:space-y-4">
                {[
                  'Professional PDF report with cover page and analysis',
                  'Issues organized by room/area with photo references',
                  'Michigan tenant rights and legal code references',
                  'Required landlord actions with timelines',
                  'Consequences if issues are not corrected',
                  'Checklist for non-visible issues to track',
                  'Michigan tenant resources and contact information',
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm md:text-base text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-accent-50 border-l-4 border-accent-600 rounded-xl p-4 md:p-6 shadow-md">
              <div className="flex items-start space-x-3">
                <svg className="w-6 h-6 text-accent-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-base md:text-lg font-bold text-accent-900 mb-3">Important Legal Disclaimer</h4>
                  <p className="text-sm md:text-base text-accent-800 leading-relaxed">
                    This service provides documentation and informational tools only. It is <strong>NOT legal advice</strong> and 
                    does not create an attorney-client relationship. The analysis is based on AI review of photographs and 
                    may not capture all issues. Always consult with a qualified attorney or local housing authority before 
                    taking legal action. This report analyzes visible conditions only and cannot detect issues like 
                    heating/cooling functionality, hot water availability, working electrical outlets, or other non-visible problems.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-slate-600">
              © 2024 Michigan Tenant Condition Report. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-sm text-slate-600 hover:text-primary-600 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm text-slate-600 hover:text-primary-600 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
