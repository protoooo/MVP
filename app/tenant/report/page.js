'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TenantReportPage() {
  const searchParams = useSearchParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const accessCode = searchParams.get('code')

  useEffect(() => {
    if (accessCode) {
      fetchReport()
    } else {
      setError('No access code provided')
      setLoading(false)
    }
  }, [accessCode])

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/tenant/get-report?code=${accessCode}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report')
      }
      
      setReport(data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (report?.pdfUrl) {
      window.open(report.pdfUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Michigan Tenant Condition Report
            </h1>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Your Tenant Condition Report
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Access Code: {accessCode}
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 mb-8">
          <div className="flex items-start">
            <div className="text-4xl mr-4">✅</div>
            <div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Report Generated Successfully!
              </h2>
              <p className="text-green-800">
                Your Michigan Tenant Condition Report has been generated and is ready to download.
              </p>
            </div>
          </div>
        </div>

        {/* Report Summary */}
        {report?.summary && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Summary</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {report.summary.total_photos}
                </div>
                <div className="text-sm text-gray-600 mt-1">Photos Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {report.summary.violations_found}
                </div>
                <div className="text-sm text-gray-600 mt-1">Issues Found</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {report.summary.clear_violations || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Clear Violations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {report.summary.likely_issues || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Likely Issues</div>
              </div>
            </div>

            {report.summary.violations_found > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Severity Breakdown:</h4>
                <div className="space-y-2">
                  {report.summary.high_severity > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">High Severity</span>
                      <span className="text-sm font-semibold text-red-600">
                        {report.summary.high_severity}
                      </span>
                    </div>
                  )}
                  {report.summary.medium_severity > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Medium Severity</span>
                      <span className="text-sm font-semibold text-orange-600">
                        {report.summary.medium_severity}
                      </span>
                    </div>
                  )}
                  {report.summary.low_severity > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Low Severity</span>
                      <span className="text-sm font-semibold text-yellow-600">
                        {report.summary.low_severity}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Your Report</h3>
          <p className="text-gray-600 mb-6">
            Your comprehensive PDF report includes detailed findings, legal references, 
            landlord obligations, and Michigan tenant resources.
          </p>
          
          <button
            onClick={handleDownload}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <span className="mr-2">📄</span>
            Download PDF Report
          </button>
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            Your report will be available for 90 days
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What to Do Next</h3>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <span>Review the full report and all identified issues</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <span>Fill out the non-visible issues checklist if you haven't already</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <span>Send written notice to your landlord describing all issues</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">4.</span>
              <span>Keep copies of this report and all communications</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">5.</span>
              <span>Allow reasonable time for your landlord to respond and make repairs</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">6.</span>
              <span>If issues persist, contact local code enforcement or consult with a tenant rights attorney</span>
            </li>
          </ol>
          
          <div className="mt-6 pt-6 border-t border-amber-300">
            <p className="text-sm text-gray-700 font-semibold mb-2">
              Important Reminder:
            </p>
            <p className="text-sm text-gray-700">
              This report is for documentation purposes only and is not legal advice. 
              Always consult with a qualified attorney before taking legal action.
            </p>
          </div>
        </div>

        {/* Michigan Resources */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Michigan Tenant Resources</h3>
          <div className="space-y-3 text-sm">
            <div>
              <a 
                href="https://michiganlegalhelp.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Michigan Legal Help →
              </a>
              <p className="text-gray-600 mt-1">Free legal information and resources</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Legal Aid Organizations</p>
              <p className="text-gray-600 mt-1">Contact your local legal aid office for free legal assistance</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Local Housing Code Enforcement</p>
              <p className="text-gray-600 mt-1">Report violations to your city or county building department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
