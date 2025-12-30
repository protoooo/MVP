'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const ROOM_AREAS = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'stairs', label: 'Stairs' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'basement', label: 'Basement' },
  { value: 'general', label: 'General/Other' }
]

function TenantUploadContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [reportId, setReportId] = useState(null)
  const [accessCode, setAccessCode] = useState(null)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  
  // Non-visible issues checklist
  const [nonVisibleIssues, setNonVisibleIssues] = useState({
    no_heat: false,
    no_hot_water: false,
    outlets_not_working: false,
    gas_leak: false,
    poor_ventilation: false,
    noise_issues: false,
    pest_not_visible: false,
    security_concerns: false,
    inadequate_lighting: false,
    water_pressure_issues: false,
    other_issues: ''
  })

  useEffect(() => {
    // Get session ID and access code from URL
    const sessionId = searchParams.get('session_id')
    const code = searchParams.get('access_code')
    
    if (code) {
      setAccessCode(code)
    }
    
    // Verify payment was completed
    if (sessionId) {
      verifyPayment(sessionId, code)
    } else if (!code) {
      setError('Missing payment information. Please start over.')
    }
  }, [searchParams])

  const verifyPayment = async (sessionId, code) => {
    try {
      // In production, you'd verify the Stripe session
      // For now, we'll use the access code to find the report
      // This will be handled by the backend when payment webhook completes
      setReportId(code) // Temporary - in production, fetch from backend
    } catch (err) {
      setError('Failed to verify payment. Please contact support.')
    }
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  const handleFiles = (files) => {
    const fileArray = Array.from(files)
    
    // Validate total count
    if (photos.length + fileArray.length > 200) {
      setError(`Cannot add ${fileArray.length} photos. Maximum 200 photos total. You have ${photos.length} already.`)
      return
    }
    
    // Validate file types and sizes
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        console.warn(`Skipping non-image file: ${file.name}`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`Skipping file too large: ${file.name}`)
        return false
      }
      return true
    })
    
    // Add to photos array with preview URLs
    const newPhotos = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      roomArea: 'general',
      id: Math.random().toString(36).substring(7)
    }))
    
    setPhotos(prev => [...prev, ...newPhotos])
    setError(null)
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removePhoto = (photoId) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== photoId)
      // Revoke object URL to free memory
      const removed = prev.find(p => p.id === photoId)
      if (removed) URL.revokeObjectURL(removed.preview)
      return updated
    })
  }

  const updatePhotoRoom = (photoId, roomArea) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, roomArea } : p
    ))
  }

  const handleUpload = async () => {
    if (photos.length === 0) {
      setError('Please select at least one photo')
      return
    }
    
    if (!accessCode) {
      setError('Missing access code. Please start over.')
      return
    }
    
    setUploading(true)
    setError(null)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('reportId', reportId || accessCode)
      formData.append('accessCode', accessCode)
      
      photos.forEach((photo, index) => {
        formData.append('photos', photo.file)
        formData.append('roomAreas', photo.roomArea)
      })
      
      const response = await fetch('/api/tenant/upload-photos', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photos')
      }
      
      setUploadProgress(100)
      
      // Automatically start report generation
      await generateReport()
      
    } catch (err) {
      setError(err.message)
      setUploading(false)
    }
  }

  const generateReport = async () => {
    setGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/tenant/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: reportId || accessCode,
          accessCode,
          nonVisibleIssues
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }
      
      // Redirect to report view/download page
      router.push(`/tenant/report?code=${accessCode}`)
      
    } catch (err) {
      setError(err.message)
      setGenerating(false)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Upload Photos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {accessCode && `Access Code: ${accessCode}`}
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Upload Photos ({photos.length}/200)
          </h2>

          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-6xl text-gray-400">📸</div>
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag and drop photos here
                </p>
                <p className="text-sm text-gray-600">
                  or click the button below to browse
                </p>
              </div>
              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                  Browse Files
                </span>
              </label>
              <p className="text-xs text-gray-500">
                Maximum 200 photos, up to 10MB each
              </p>
            </div>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Photos ({photos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <select
                      value={photo.roomArea}
                      onChange={(e) => updatePhotoRoom(photo.id, e.target.value)}
                      className="w-full mt-2 text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      {ROOM_AREAS.map(room => (
                        <option key={room.value} value={room.value}>
                          {room.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Non-Visible Issues Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Additional Issues (Not Visible in Photos)
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Check any issues that photos cannot show. This will be included in your report.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(nonVisibleIssues).filter(key => key !== 'other_issues').map(key => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nonVisibleIssues[key]}
                  onChange={(e) => setNonVisibleIssues(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Issues (Optional)
            </label>
            <textarea
              value={nonVisibleIssues.other_issues}
              onChange={(e) => setNonVisibleIssues(prev => ({
                ...prev,
                other_issues: e.target.value
              }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
              rows="3"
              placeholder="Describe any other issues not covered above..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleUpload}
            disabled={photos.length === 0 || uploading || generating}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : generating ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>

        {/* Progress */}
        {(uploading || generating) && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {uploading ? 'Uploading photos...' : 'Analyzing photos and generating report...'}
              </span>
              <span className="text-sm text-gray-600">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {generating && (
              <p className="text-sm text-gray-600 mt-4">
                This may take a few minutes depending on the number of photos...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TenantUploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TenantUploadContent />
    </Suspense>
  )
}
