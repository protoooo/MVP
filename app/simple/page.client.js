'use client'

import { useState, useRef } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

export default function SimpleLanding() {
  const [uploadFiles, setUploadFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFilesAdded = (fileList) => {
    const incoming = Array.from(fileList || []).slice(0, 50)
    const normalized = incoming.map((file, idx) => ({
      id: `${file.name}-${idx}-${file.lastModified || Date.now()}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type?.startsWith('image') ? 'image' : 'photo',
    }))
    setUploadFiles(normalized)
    setError('')
  }

  const handleDropFiles = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer?.files
    if (dropped?.length) handleFilesAdded(dropped)
  }

  const handlePayAndGenerate = async () => {
    if (!uploadFiles.length) {
      setError('Please upload at least one image')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Create Stripe Checkout session for $50 report
      const res = await fetch('/api/pay-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileCount: uploadFiles.length,
          fileData: uploadFiles.map(f => ({ name: f.name, size: f.size }))
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment initiation failed')

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError(err.message || 'Failed to initiate payment')
      setIsProcessing(false)
    }
  }

  const handleBuyApiKey = async (tier) => {
    // Redirect to Stripe Payment Link
    const paymentLinks = {
      small: process.env.NEXT_PUBLIC_STRIPE_LINK_500,
      medium: process.env.NEXT_PUBLIC_STRIPE_LINK_5000,
      large: process.env.NEXT_PUBLIC_STRIPE_LINK_500K,
    }

    const url = paymentLinks[tier]
    if (url) {
      window.location.href = url
    } else {
      setError('Payment link not configured')
    }
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #f8f9fa;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 60px;
        }

        .title {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 16px;
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
        }

        .sections {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          max-width: 900px;
          margin: 0 auto;
        }

        @media (min-width: 768px) {
          .sections {
            grid-template-columns: 1fr 1fr;
          }
        }

        .card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .card-title {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .card-subtitle {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
        }

        .drop-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 20px;
        }

        .drop-zone:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .drop-zone-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          color: #3b82f6;
        }

        .drop-zone-text {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .drop-zone-hint {
          font-size: 13px;
          color: #94a3b8;
        }

        .file-list {
          margin-bottom: 20px;
          max-height: 200px;
          overflow-y: auto;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #0f172a;
        }

        .btn {
          width: 100%;
          padding: 14px 24px;
          border-radius: 10px;
          border: none;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #0f172a;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
        }

        .api-tiers {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tier-btn {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .tier-btn:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .tier-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tier-amount {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }

        .tier-price {
          font-size: 20px;
          font-weight: 800;
          color: #3b82f6;
        }

        .code-sample {
          background: #0f172a;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          overflow-x: auto;
          margin-top: 20px;
        }

        .code-sample code {
          white-space: pre;
        }

        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          margin-top: 12px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className={plusJakarta.className}>
        <div className="container">
          <div className="header">
            <h1 className="title">Michigan Food Safety Photo Analysis</h1>
            <p className="subtitle">
              No signup. Plug into Jolt/Kroger. $0.01/image.
            </p>
          </div>

          <div className="sections">
            {/* SECTION 1: $50 Reports */}
            <div className="card">
              <h2 className="card-title">$50 Reports</h2>
              <p className="card-subtitle">
                Upload images. Get Michigan compliance report for $50.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/heic,.jpg,.jpeg,.png,.heic"
                style={{ display: 'none' }}
                onChange={(e) => handleFilesAdded(e.target.files)}
              />

              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDropFiles}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="drop-zone-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="drop-zone-text">Drop images here</div>
                <div className="drop-zone-hint">or click to select files</div>
              </div>

              {uploadFiles.length > 0 && (
                <div className="file-list">
                  {uploadFiles.map((file) => (
                    <div key={file.id} className="file-item">
                      📷 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handlePayAndGenerate}
                disabled={isProcessing || uploadFiles.length === 0}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner" />
                    Processing...
                  </>
                ) : (
                  'Generate Report ($50)'
                )}
              </button>

              {error && <div className="error">{error}</div>}
            </div>

            {/* SECTION 2: API Access */}
            <div className="card">
              <h2 className="card-title">API Access</h2>
              <p className="card-subtitle">
                No signup. Plug into Jolt/Kroger. $0.01/image.
              </p>

              <div className="api-tiers">
                <button className="tier-btn" onClick={() => handleBuyApiKey('small')}>
                  <div className="tier-info">
                    <div className="tier-amount">500 images</div>
                    <div className="tier-price">$49</div>
                  </div>
                  <span>→</span>
                </button>

                <button className="tier-btn" onClick={() => handleBuyApiKey('medium')}>
                  <div className="tier-info">
                    <div className="tier-amount">5,000 images</div>
                    <div className="tier-price">$399</div>
                  </div>
                  <span>→</span>
                </button>

                <button className="tier-btn" onClick={() => handleBuyApiKey('large')}>
                  <div className="tier-info">
                    <div className="tier-amount">500,000 images</div>
                    <div className="tier-price">$3,499</div>
                  </div>
                  <span>→</span>
                </button>
              </div>

              <div className="code-sample">
                <code>{`POST /api/audit-photos
{
  "images": [...],
  "api_key": "xyz123"
}`}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
