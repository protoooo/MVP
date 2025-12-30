'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Download, Loader2, AlertCircle } from 'lucide-react'

export default function SuccessPageClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  
  const [status, setStatus] = useState('processing') // processing, completed, error
  const [reportUrl, setReportUrl] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!sessionId) return

    // Poll for report completion
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tenant-report/status?session_id=${sessionId}`)
        const data = await response.json()

        if (data.status === 'completed' && data.reportUrl) {
          setStatus('completed')
          setReportUrl(data.reportUrl)
          clearInterval(pollInterval)
        } else if (data.status === 'error') {
          setStatus('error')
          setError(data.error || 'Failed to generate report')
          clearInterval(pollInterval)
        } else if (data.progress) {
          setProgress(data.progress)
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [sessionId])

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="text-center">
            <div className="mb-6">
              <Loader2 className="w-16 h-16 text-gray-900 mx-auto animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Generating Your Report
            </h1>
            <p className="text-gray-600 mb-8">
              Analyzing photos and creating professional documentation...
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              This usually takes 2-5 minutes
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md w-full px-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Generation Failed
          </h1>
          <p className="text-gray-600 mb-8">
            {error}
          </p>
          <a
            href="/tenant-report"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full px-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Report Ready!
        </h1>
        <p className="text-gray-600 mb-8">
          Your professional tenant condition report has been generated.
        </p>
        
        <a
          href={reportUrl}
          download
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors mb-4"
        >
          <Download className="w-5 h-5" />
          Download Report
        </a>
        
        <p className="text-xs text-gray-500">
          PDF • Professional formatting • Michigan housing standards
        </p>
      </div>
    </div>
  )
}
