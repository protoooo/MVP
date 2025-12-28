// app/page-simple.client.js - Simplified version for access code system
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import appleIcon from './apple-icon.png'
import { Plus_Jakarta_Sans } from 'next/font/google'
import SmartProgress from '@/components/SmartProgress'
import NotificationOptInModal from '@/components/NotificationOptInModal'
import AccessCodeRetrieval from '@/components/AccessCodeRetrieval'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

// Payment is handled via API endpoint - no direct link needed

const Icons = {
  ArrowUp: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Camera: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path
        d="M5.5 7H9l1.3-2.3c.2-.4.6-.7 1-.7h2.4c.4 0 .8.3 1 .7L16 7h3.5A2.5 2.5 0 0 1 22 9.5v8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-8A2.5 2.5 0 0 1 4.5 7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="4" />
    </svg>
  ),
}

export default function SimplePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef(null)

  const [accessCode, setAccessCode] = useState('')
  const [accessCodeError, setAccessCodeError] = useState('')
  const [validatedCode, setValidatedCode] = useState(null)
  const [isValidating, setIsValidating] = useState(false)

  const [uploadFiles, setUploadFiles] = useState([])
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [purchaseEmail, setPurchaseEmail] = useState('')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')

  // Notification opt-in modal state
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [customerEmailForNotification, setCustomerEmailForNotification] = useState('')

  // Check for payment success and show notification modal
  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    const sessionId = searchParams.get('session_id')
    
    if (paymentStatus === 'success' && sessionId) {
      // Extract email from localStorage or session if available
      const storedEmail = localStorage.getItem('checkout_email')
      if (storedEmail) {
        setCustomerEmailForNotification(storedEmail)
        setShowNotificationModal(true)
        localStorage.removeItem('checkout_email') // Clean up
      }
      
      // Remove payment params from URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  const handleNotificationOptInSubmit = async (preferences) => {
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmailForNotification,
          inspectionReminders: preferences.inspectionReminders,
          regulationUpdates: preferences.regulationUpdates,
          establishmentType: preferences.establishmentType,
        }),
      })

      if (response.ok) {
        setShowNotificationModal(false)
        // Optionally show a success message
        console.log('Notification preferences saved')
      } else {
        const data = await response.json()
        console.error('Failed to save preferences:', data.error)
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }

  const handleAccessCodeSubmit = async (e) => {
    e.preventDefault()
    setAccessCodeError('')
    setIsValidating(true)

    try {
      const res = await fetch('/api/access-code/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode }),
      })

      const data = await res.json()

      if (!res.ok || !data.valid) {
        setAccessCodeError(data.error || 'Invalid access code')
        setValidatedCode(null)
        return
      }

      setValidatedCode(data)
      
      // If code has a report, load it
      if (data.hasReport && data.reportData) {
        setReportData(data.reportData)
      }
    } catch (error) {
      setAccessCodeError('Failed to validate code. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleFilesAdded = (files) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const newFiles = fileArray.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }))

    setUploadFiles((prev) => [...prev, ...newFiles])
    setUploadError('')
  }

  const handleDropFiles = (e) => {
    e.preventDefault()
    handleFilesAdded(e.dataTransfer.files)
  }

  const handleUploadAndProcess = async () => {
    if (!validatedCode || !validatedCode.canProcess) {
      setUploadError('This access code cannot be used for processing')
      return
    }

    if (uploadFiles.length === 0) {
      setUploadError('Please select files to upload')
      return
    }

    setIsProcessing(true)
    setUploadError('')
    setUploadStatus('Uploading files...')
    setUploadProgress(0)

    try {
      // TODO: Implement actual upload logic with access code
      // For now, simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setUploadStatus('Processing video...')
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate report generation
      setReportData({ generated: true })
      setUploadStatus('Complete!')
    } catch (error) {
      setUploadError(error.message || 'Upload failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePurchaseClick = () => {
    // Show email prompt to collect user's email
    setPurchaseError('')
    setShowEmailPrompt(true)
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setPurchaseError('')
    
    // Basic email validation (HTML5 input type='email' provides additional validation)
    if (!purchaseEmail || !purchaseEmail.includes('@') || !purchaseEmail.includes('.')) {
      setPurchaseError('Please enter a valid email address')
      return
    }

    setIsCreatingCheckout(true)

    try {
      // Store email in localStorage so we can use it for notification opt-in after redirect
      localStorage.setItem('checkout_email', purchaseEmail)

      // Call the API to create a checkout session
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: purchaseEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (!data.url) {
        throw new Error('Invalid response from server')
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error) {
      setPurchaseError(error.message || 'Failed to start checkout. Please try again.')
      setIsCreatingCheckout(false)
      localStorage.removeItem('checkout_email') // Clean up on error
    }
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --paper: #f6f9ff;
          --surface: #ffffff;
          --clay: #f1f3f5;
          --border: rgba(15, 23, 42, 0.1);
          --border-strong: rgba(15, 23, 42, 0.14);
          --ink: #0f172a;
          --ink-60: rgba(15, 23, 42, 0.6);
          --ink-40: rgba(15, 23, 42, 0.4);
          --accent: #5fa8ff;
          --accent-bg: rgba(95, 168, 255, 0.1);
          --accent-green: #10b981;
          --accent-green-bg: rgba(16, 185, 129, 0.1);
          --accent-red: #ef4444;
          --accent-red-bg: rgba(239, 68, 68, 0.1);
          --accent-yellow: #f59e0b;
          --accent-yellow-bg: rgba(245, 158, 11, 0.1);
          --shadow-sm: 0 2px 8px rgba(5, 7, 13, 0.06);
          --shadow-md: 0 4px 16px rgba(5, 7, 13, 0.08);
          --radius-sm: 8px;
          --radius-md: 12px;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: var(--paper);
        }

        .hidden {
          display: none;
        }
      `}</style>

      <div className={plusJakarta.className}>
        <main className="min-h-screen" style={{ background: 'var(--paper)' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => handleFilesAdded(e.target.files)}
          />

          {/* Header */}
          <header className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <Link href="/" className="flex items-center gap-3">
                <Image src={appleIcon} alt="protocolLM" width={48} height={48} priority />
                <span className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                  protocolLM
                </span>
              </Link>
              <a
                href={`mailto:support@protocollm.org`}
                className="text-sm font-medium"
                style={{ color: 'var(--ink-60)' }}
              >
                Support
              </a>
            </div>
          </header>

          {/* Main Content */}
          <section className="mx-auto max-w-4xl px-6 py-12">
            {/* Title */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
                Pre-Inspection Video Analysis
              </h1>
              <p className="mt-2 text-base" style={{ color: 'var(--ink-60)' }}>
                Upload restaurant walkthrough videos. Get comprehensive compliance reports for Michigan health codes. $149 per inspection.
              </p>
            </div>

            {!validatedCode ? (
              /* Access Code Entry or Purchase */
              <div className="mx-auto max-w-md space-y-6">
                {/* Have a code? */}
                <div
                  className="rounded-xl p-6"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                >
                  <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                    Have an access code?
                  </h2>
                  <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={accessCode}
                        onChange={(e) => {
                          setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          setAccessCodeError('')
                        }}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="w-full rounded-md border px-4 py-3 text-center font-semibold"
                        style={{
                          borderColor: accessCodeError ? 'var(--accent-red)' : 'var(--border)',
                          color: 'var(--ink)',
                          fontSize: '15px',
                          letterSpacing: '0.05em'
                        }}
                      />
                      {accessCodeError && (
                        <p className="mt-2 text-sm" style={{ color: 'var(--accent-red)' }}>
                          {accessCodeError}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={accessCode.length !== 6 || isValidating}
                      className="w-full rounded-md px-6 py-3 font-semibold text-white transition disabled:opacity-50"
                      style={{ background: 'var(--accent)' }}
                    >
                      {isValidating ? 'Validating...' : 'Continue'}
                    </button>
                  </form>
                </div>

                {/* Or Purchase */}
                <div className="text-center">
                  <p className="mb-4 text-sm font-medium" style={{ color: 'var(--ink-40)' }}>
                    — or —
                  </p>
                  
                  {!showEmailPrompt ? (
                    <>
                      <button
                        type="button"
                        onClick={handlePurchaseClick}
                        className="w-full rounded-md px-6 py-3 font-semibold text-white transition"
                        style={{ background: 'var(--accent-green)' }}
                      >
                        Purchase License ($149)
                      </button>
                      <p className="mt-3 text-xs" style={{ color: 'var(--ink-40)' }}>
                        One-time payment • Up to 1 hour of video • Non-refundable
                      </p>
                    </>
                  ) : (
                    <div
                      className="rounded-xl p-6"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                    >
                      <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                        Enter your email
                      </h3>
                      <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div>
                          <input
                            type="email"
                            value={purchaseEmail}
                            onChange={(e) => {
                              setPurchaseEmail(e.target.value)
                              setPurchaseError('')
                            }}
                            placeholder="your@email.com"
                            className="w-full rounded-md border px-4 py-3"
                            style={{
                              borderColor: purchaseError ? 'var(--accent-red)' : 'var(--border)',
                              color: 'var(--ink)',
                            }}
                            required
                          />
                          {purchaseError ? (
                            <p className="mt-2 text-sm" style={{ color: 'var(--accent-red)' }}>
                              {purchaseError}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs" style={{ color: 'var(--ink-40)' }}>
                              You'll receive your access code at this email after payment
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEmailPrompt(false)
                              setPurchaseEmail('')
                              setPurchaseError('')
                            }}
                            className="flex-1 rounded-md px-6 py-3 font-semibold transition"
                            style={{ background: 'var(--clay)', color: 'var(--ink-60)' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingCheckout}
                            className="flex-1 rounded-md px-6 py-3 font-semibold text-white transition disabled:opacity-50"
                            style={{ background: 'var(--accent-green)' }}
                          >
                            {isCreatingCheckout ? 'Processing...' : 'Continue to Payment'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Support Info */}
                <div
                  className="rounded-md p-4 text-center"
                  style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>
                    Having issues with your purchase?{' '}
                    <a href="mailto:support@protocollm.org" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      Contact support
                    </a>
                  </p>
                </div>

                {/* Access Code Retrieval */}
                <AccessCodeRetrieval />
              </div>
            ) : (
              /* Upload Interface */
              <div>
                {/* Code Status */}
                <div
                  className="mb-6 rounded-xl p-4"
                  style={{ background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                        Access Code: {validatedCode.code}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--ink-60)' }}>
                        {validatedCode.canProcess
                          ? `${Math.floor(validatedCode.remainingSeconds / 60)} minutes remaining`
                          : 'Processing complete'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setValidatedCode(null)
                        setAccessCode('')
                        setUploadFiles([])
                        setReportData(null)
                      }}
                      className="text-sm font-medium"
                      style={{ color: 'var(--ink-60)' }}
                    >
                      Use different code
                    </button>
                  </div>
                </div>

                {/* Upload Card */}
                {validatedCode.canProcess && !reportData && (
                  <div
                    className="rounded-xl"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                  >
                    {/* Drop Zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDropFiles}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-t-xl px-8 py-12 text-center"
                      style={{ background: 'var(--clay)', borderBottom: '1px solid var(--border)' }}
                    >
                      <div
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl"
                        style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                      >
                        <Icons.ArrowUp />
                      </div>
                      <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                        Drop video files here to upload
                      </p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--ink-60)' }}>
                        Video up to 1 hour · MP4, MOV, or AVI format
                      </p>
                    </div>

                    {/* File List */}
                    {uploadFiles.length > 0 && (
                      <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                            {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setUploadFiles([])}
                            className="text-sm font-medium"
                            style={{ color: 'var(--accent-red)' }}
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="space-y-2">
                          {uploadFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 rounded-md px-3 py-2"
                              style={{ background: 'var(--clay)' }}
                            >
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-md"
                                style={{ background: 'var(--surface)' }}
                              >
                                {file.previewUrl ? (
                                  <Image src={file.previewUrl} alt={file.name} width={40} height={40} className="rounded-md" unoptimized />
                                ) : (
                                  <Icons.Camera />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                                  {file.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--ink-40)' }}>
                                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Progress & Status */}
                    <div className="px-6 py-4">
                      {isProcessing && uploadProgress < 100 && (
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--ink-60)' }}>Uploading...</span>
                            <span style={{ color: 'var(--ink-60)' }}>{uploadProgress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/60">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {isProcessing && uploadProgress === 100 && (
                        <div className="mb-4">
                          <SmartProgress active={isProcessing} mode="vision" requestKey={Date.now()} />
                        </div>
                      )}

                      {uploadStatus && (
                        <div className="mb-3 text-center">
                          <span className="text-sm font-medium" style={{ color: 'var(--ink-60)' }}>
                            {uploadStatus}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleUploadAndProcess}
                          disabled={isProcessing || !uploadFiles.length}
                          className="rounded-md px-6 py-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ background: 'var(--accent)' }}
                        >
                          {isProcessing ? 'Processing…' : 'Upload & Process'}
                        </button>
                      </div>

                      {uploadError && (
                        <div className="mt-4 rounded-md px-4 py-3 text-sm" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
                          {uploadError}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Report Ready */}
                {reportData && (
                  <div
                    className="rounded-xl px-6 py-6"
                    style={{ background: 'var(--accent-green-bg)', border: '1px solid var(--accent-green)' }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ background: 'var(--accent-green)', color: '#fff' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                          Report Ready
                        </p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--ink-60)' }}>
                          Your compliance report has been generated and is ready for download.
                        </p>
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => alert('Download report functionality here')}
                            className="rounded-md px-5 py-2 font-semibold text-white transition"
                            style={{ background: 'var(--accent-green)' }}
                          >
                            Download Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mx-auto max-w-6xl px-6 py-6">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                <Link
                  href="/terms"
                  className="font-medium transition hover:underline"
                  style={{ color: 'var(--ink-60)' }}
                >
                  Terms
                </Link>
                <Link
                  href="/privacy"
                  className="font-medium transition hover:underline"
                  style={{ color: 'var(--ink-60)' }}
                >
                  Privacy
                </Link>
                <Link
                  href="/resources"
                  className="font-medium transition hover:underline"
                  style={{ color: 'var(--ink-60)' }}
                >
                  Resources
                </Link>
              </div>
              <div className="mt-3 text-center text-xs" style={{ color: 'var(--ink-40)' }}>
                Resources is our free tier Q&A about ingested documents
              </div>
            </div>
          </footer>
        </main>

        {/* Notification Opt-In Modal */}
        <NotificationOptInModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onSubmit={handleNotificationOptInSubmit}
          customerEmail={customerEmailForNotification}
        />
      </div>
    </>
  )
}
