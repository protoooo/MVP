'use client'

import { useState, useCallback } from 'react'
import { Upload, FileImage, Download, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'

export default function TenantReportClient() {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [reportReady, setReportReady] = useState(false)
  const [reportUrl, setReportUrl] = useState(null)
  const [error, setError] = useState(null)
  const [sessionId, setSessionId] = useState(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (files.length + droppedFiles.length > 200) {
      setError('Maximum 200 photos allowed')
      return
    }
    
    setFiles(prev => [...prev, ...droppedFiles].slice(0, 200))
    setError(null)
  }, [files])

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/')
    )
    
    if (files.length + selectedFiles.length > 200) {
      setError('Maximum 200 photos allowed')
      return
    }
    
    setFiles(prev => [...prev, ...selectedFiles].slice(0, 200))
    setError(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCheckout = async () => {
    if (files.length === 0) {
      setError('Please upload at least one photo')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Create a new session and upload files
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append('photos', file)
      })

      const uploadResponse = await fetch('/api/tenant-report/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload photos')
      }

      const { sessionId: newSessionId } = await uploadResponse.json()
      setSessionId(newSessionId)

      // Redirect to Stripe checkout
      const checkoutResponse = await fetch('/api/tenant-report/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId, photoCount: files.length })
      })

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await checkoutResponse.json()
      window.location.href = url
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const price = 20
  const photoLimit = 200

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Michigan Tenant Report
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Professional rental condition documentation
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Info Banner */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-4">
            <FileImage className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">
                How it works
              </h2>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Upload photos of your rental unit (up to 200)</li>
                <li>2. Pay $20 one-time fee</li>
                <li>3. Get professional PDF report based on Michigan housing standards</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div className="space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-1">
                Drop photos here or click to upload
              </p>
              <p className="text-sm text-gray-500">
                Up to {photoLimit} photos • PNG, JPG, or HEIC
              </p>
            </label>
          </div>

          {/* File Counter */}
          {files.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  {files.length} photo{files.length !== 1 ? 's' : ''} ready
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                ${price}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Thumbnails */}
          {files.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="relative aspect-square group"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover rounded border border-gray-200"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleCheckout}
            disabled={files.length === 0 || uploading}
            className="w-full py-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                Continue to Payment
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Disclaimer:</strong> This report documents observed conditions in uploaded photos. 
            It does not constitute legal advice or guarantee any particular outcome. Michigan housing 
            laws and local enforcement may vary. For legal advice, please consult with a qualified attorney.
          </p>
        </div>
      </main>
    </div>
  )
}
