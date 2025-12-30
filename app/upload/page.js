'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function UploadPageContent() {
  const searchParams = useSearchParams()
  const urlPasscode = searchParams.get('passcode')
  
  const [passcode, setPasscode] = useState(urlPasscode || '')
  const [session, setSession] = useState(null)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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
        
        // If already completed, redirect to report page
        if (data.session.upload_completed && data.session.status === 'completed') {
          window.location.href = `/report?passcode=${code}`
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

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    
    // Validate image count limit
    if (session?.type === 'image' && selectedFiles.length > 1000) {
      setError(`Maximum 1,000 images allowed per analysis session. You selected ${selectedFiles.length} images.`)
      setFiles([])
      e.target.value = '' // Reset file input
      return
    }
    
    // Validate video duration (client-side rough check based on file size)
    if (session?.type === 'video' && selectedFiles.length > 0) {
      const videoFile = selectedFiles[0]
      // Create a video element to check duration
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src)
        const durationMinutes = Math.round(video.duration / 60)
        
        if (video.duration > 3600) { // 60 minutes = 3600 seconds
          setError(`Maximum 60 minutes of video allowed per analysis session. Your video is ${durationMinutes} minutes long.`)
          setFiles([])
          e.target.value = '' // Reset file input
        } else {
          setError(null)
          setFiles(selectedFiles)
        }
      }
      
      video.src = URL.createObjectURL(videoFile)
      return
    }
    
    setError(null)
    setFiles(selectedFiles)
  }

  const handleUploadAndAnalyze = async () => {
    if (files.length === 0) {
      setError('Please select files to upload')
      return
    }

    if (session.upload_completed) {
      setError('This passcode has already been used to submit files for analysis')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Upload files
      const formData = new FormData()
      formData.append('passcode', passcode)
      
      // Note: Backend expects specific field names
      // - Image API expects keys starting with 'image' (e.g., 'image-0', 'image-1')
      // - Video API expects 'video' key
      if (session.type === 'image') {
        // For images, append each as 'image-N'
        files.forEach((file, index) => {
          formData.append(`image-${index}`, file)
        })
      } else {
        // For video, append as 'video'
        formData.append('video', files[0])
      }

      const uploadEndpoint = session.type === 'image' 
        ? '/api/image/analyze' 
        : '/api/video/analyze'

      const uploadResponse = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      setUploading(false)
      setAnalyzing(true)

      // Analysis result
      const analysisResult = await uploadResponse.json()

      // Redirect to report page
      window.location.href = `/report?passcode=${passcode}`

    } catch (err) {
      setError(err.message)
      setUploading(false)
      setAnalyzing(false)
    }
  }

  // Show passcode entry form if no valid session
  if (!session) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-[#E5E7EB] bg-white">
          <div className="max-w-4xl mx-auto px-6 py-5">
            <Link href="/" className="text-xl font-normal text-[#0F172A] hover:text-[#4F7DF3]">
              MI Health Inspection
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto px-6 py-20">
          <div className="bg-[#F7F8FA] rounded-xl p-8 border border-[#E5E7EB]">
            <h2 className="text-2xl font-medium text-[#0F172A] mb-2">Enter Your Passcode</h2>
            <p className="text-sm text-[#475569] mb-6">
              Enter the 5-digit passcode you received after payment
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
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
              <Link href="/" className="text-sm text-[#4F7DF3] hover:underline">
                Return to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const acceptedFormats = session.type === 'image'
    ? '.jpg,.jpeg,.png,.webp,.heic'
    : '.mp4,.mov,.webm,.m4v,.avi'

  const formatHint = session.type === 'image'
    ? 'Supported: JPG, JPEG, PNG, WEBP, HEIC'
    : 'Supported: MP4, MOV, WEBM, M4V, AVI'

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
          <h2 className="text-2xl font-medium text-[#0F172A] mb-2">
            {session.type === 'image' ? 'Upload Photos' : 'Upload Video'}
          </h2>
          <p className="text-sm text-[#475569] mb-2">{formatHint}</p>
          <p className="text-sm font-medium text-[#4F7DF3] mb-6">
            {session.type === 'image' 
              ? '📸 You can upload up to 1,000 images' 
              : '🎥 Video must be 60 minutes or less'}
          </p>

          {session.upload_completed && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                Files have already been submitted for this passcode. 
                <a href={`/report?passcode=${passcode}`} className="underline ml-1">View report</a>
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!session.upload_completed && (
            <>
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-[#0F172A]">
                  {session.type === 'image' ? 'Select Photos' : 'Select Video'}
                </label>
                <input
                  type="file"
                  accept={acceptedFormats}
                  multiple={session.type === 'image'}
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F7DF3] bg-white"
                />
                {files.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-[#475569]">
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </p>
                    {session.type === 'image' && (
                      <p className="text-xs text-[#4F7DF3] mt-1">
                        {Math.max(0, 1000 - files.length)} image{Math.max(0, 1000 - files.length) !== 1 ? 's' : ''} remaining (max 1,000)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleUploadAndAnalyze}
                disabled={uploading || analyzing || files.length === 0}
                className="w-full px-8 py-3 bg-[#4F7DF3] text-white rounded-xl hover:bg-[#3D6BE0] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Upload and Analyze'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#4F7DF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#475569]">Loading...</p>
      </div>
    </div>}>
      <UploadPageContent />
    </Suspense>
  )
}
