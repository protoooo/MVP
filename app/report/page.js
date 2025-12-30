'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ReportPage() {
  const searchParams = useSearchParams()
  const urlPasscode = searchParams.get('passcode')
  
  const [passcode, setPasscode] = useState(urlPasscode || '')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const verifyPasscode = async (code) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/session/verify?passcode=${code}`)
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Invalid passcode')
        setSession(null)
      } else {
        setSession(data.session)
        
        // If upload not completed, redirect to upload page
        if (!data.session.upload_completed) {
          window.location.href = `/upload?passcode=${code}`
        }
      }
    } catch (err) {
      setError('Failed to verify passcode')
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (urlPasscode) {
      verifyPasscode(urlPasscode)
    }
  }, [urlPasscode])

  const handlePasscodeSubmit = (e) => {
    e.preventDefault()
    if (passcode.length === 5) {
      verifyPasscode(passcode)
    }
  }

  // Show passcode entry form if no valid session
  if (!session) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-[#E5E7EB] bg-white">
          <div className="max-w-4xl mx-auto px-6 py-5">
            <a href="/" className="text-xl font-normal text-[#0F172A] hover:text-[#4F7DF3]">
              MI Health Inspection
            </a>
          </div>
        </header>

        <main className="max-w-md mx-auto px-6 py-20">
          <div className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
            <h2 className="text-2xl font-medium text-[#0F172A] mb-2">Access Your Report</h2>
            <p className="text-sm text-[#475569] mb-6">
              Enter your 5-digit passcode to view and download your report
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <input
                type="text"
                maxLength={5}
                pattern="\d{5}"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="12345"
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] bg-white text-center text-2xl tracking-widest"
                required
              />
              <button
                type="submit"
                disabled={loading || passcode.length !== 5}
                className="w-full px-6 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Verifying...' : 'View Report'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
              <a href="/" className="text-sm text-[#4F7DF3] hover:underline">
                Return to Home
              </a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Show processing message if not completed
  if (session.status !== 'completed') {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-[#E5E7EB] bg-white">
          <div className="max-w-4xl mx-auto px-6 py-5">
            <h1 className="text-xl font-normal text-[#0F172A]">MI Health Inspection</h1>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-20">
          <div className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB] text-center">
            <div className="mb-6">
              <div className="w-16 h-16 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
            <h2 className="text-2xl font-medium text-[#0F172A] mb-4">
              {session.status === 'processing' ? 'Analyzing...' : 'Preparing...'}
            </h2>
            <p className="text-[#475569] mb-6">
              Your {session.type} analysis is in progress. This may take a few minutes.
            </p>
            <button
              onClick={() => verifyPasscode(passcode)}
              className="px-6 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] font-medium"
            >
              Refresh Status
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Show completed report
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-normal text-[#0F172A]">MI Health Inspection</h1>
            <div className="text-sm text-[#475569]">
              Passcode: <span className="font-mono font-medium text-[#0F172A]">{passcode}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
          <div className="text-center mb-8">
            <div className="mb-6">
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-medium text-[#0F172A] mb-2">Analysis Complete!</h2>
            <p className="text-[#475569] mb-6">Your compliance report is ready.</p>
          </div>

          {session.pdf_url ? (
            <div className="text-center">
              <a 
                href={session.pdf_url}
                download
                className="inline-block px-8 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] font-medium mb-4"
              >
                Download Report (PDF)
              </a>
              <p className="text-xs text-[#475569] mb-6">
                Save your passcode <span className="font-mono font-medium">{passcode}</span> to access this report anytime
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[#475569] mb-4">Report generation in progress...</p>
              <button
                onClick={() => verifyPasscode(passcode)}
                className="px-6 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] font-medium"
              >
                Refresh
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-[#E5E7EB] text-center">
            <a href="/" className="text-[#4F7DF3] hover:underline">
              Return to Home
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
