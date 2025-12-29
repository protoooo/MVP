'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const reportId = searchParams?.get('report_id')
  const sessionId = searchParams?.get('session_id')
  
  const [status, setStatus] = useState('loading')
  const [reportUrl, setReportUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!reportId || !sessionId) {
      setError('Missing payment information')
      setStatus('error')
      return
    }

    // Poll for report generation status
    const checkReport = async () => {
      try {
        const res = await fetch(`/api/check-report?report_id=${reportId}`)
        const data = await res.json()
        
        if (data.status === 'completed' && data.reportUrl) {
          setReportUrl(data.reportUrl)
          setStatus('completed')
        } else if (data.status === 'processing') {
          // Continue polling
          setTimeout(checkReport, 2000)
        } else if (data.status === 'failed') {
          setError('Report generation failed. Please contact support.')
          setStatus('error')
        }
      } catch (err) {
        console.error('Error checking report:', err)
        setError('Failed to check report status')
        setStatus('error')
      }
    }

    checkReport()
  }, [reportId, sessionId])

  return (
    <div className={plusJakarta.className}>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #f8f9fa;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-container {
          max-width: 600px;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 24px;
        }

        .icon.success {
          color: #10b981;
        }

        .icon.loading {
          color: #3b82f6;
          animation: spin 1s linear infinite;
        }

        .icon.error {
          color: #ef4444;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        h1 {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }

        p {
          font-size: 16px;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .btn {
          display: inline-block;
          padding: 14px 32px;
          background: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          transition: all 0.2s;
        }

        .btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .error-text {
          color: #ef4444;
        }

        .link {
          color: #3b82f6;
          text-decoration: underline;
          cursor: pointer;
        }
      `}</style>

      <div className="success-container">
        {status === 'loading' && (
          <>
            <div className="icon loading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="30" />
              </svg>
            </div>
            <h1>Processing Your Payment</h1>
            <p>Please wait while we generate your compliance report...</p>
          </>
        )}

        {status === 'completed' && reportUrl && (
          <>
            <div className="icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1>Payment Successful!</h1>
            <p>
              Your Michigan food safety compliance report is ready for download.
            </p>
            <a href={reportUrl} className="btn" download>
              Download Report (PDF)
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1>Something Went Wrong</h1>
            <p className="error-text">{error || 'An unexpected error occurred.'}</p>
            <a href="/simple" className="btn">
              Return to Home
            </a>
          </>
        )}
      </div>
    </div>
  )
}
