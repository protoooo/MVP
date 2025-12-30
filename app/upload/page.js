'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/supabaseAuth'

function UploadPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [restaurantName, setRestaurantName] = useState('')
  const [gmEmail, setGmEmail] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState([
    { name: 'Three-compartment sink', checked: false },
    { name: 'Handwashing station', checked: false },
    { name: 'Prep line', checked: false },
    { name: 'Make line', checked: false },
    { name: 'Cold holding', checked: false },
    { name: 'Hot holding', checked: false },
    { name: 'Walk-in cooler', checked: false },
    { name: 'Back of house', checked: false },
    { name: 'Front of house', checked: false },
    { name: 'Dish area', checked: false }
  ])

  // Load user and profile on mount
  useEffect(() => {
    async function loadUserData() {
      setLoading(true)
      const { user: currentUser } = await getCurrentUser()
      
      if (!currentUser) {
        // Redirect to login if not authenticated
        router.push('/auth/login')
        return
      }
      
      setUser(currentUser)
      
      // Load user profile with subscription data
      const { profile: userProfile } = await getUserProfile(currentUser.id)
      setProfile(userProfile)
      
      // Check if subscription is active
      if (!userProfile || !userProfile.subscription_status || userProfile.subscription_status !== 'active') {
        setError('No active subscription. Please subscribe to a plan.')
      }
      
      setLoading(false)
    }
    
    loadUserData()
  }, [router])

  // Check for success message
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription')
    if (subscriptionStatus === 'success') {
      setSuccess('Subscription activated! You can now upload images.')
    }
  }, [searchParams])

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    
    // Check quota
    if (profile) {
      const remaining = profile.monthly_image_limit - (profile.images_used_this_period || 0)
      
      if (selectedFiles.length > remaining) {
        setError(`You have ${remaining} image${remaining !== 1 ? 's' : ''} remaining in your quota. You selected ${selectedFiles.length} images.`)
        setFiles([])
        e.target.value = ''
        return
      }
    }
    
    setError(null)
    setFiles(selectedFiles)
  }

  const handleUploadAndAnalyze = async () => {
    if (files.length === 0) {
      setError('Please select images to upload')
      return
    }

    if (!profile || profile.subscription_status !== 'active') {
      setError('No active subscription')
      return
    }

    const remaining = profile.monthly_image_limit - (profile.images_used_this_period || 0)
    if (files.length > remaining) {
      setError(`Insufficient quota. You have ${remaining} image${remaining !== 1 ? 's' : ''} remaining.`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Upload and analyze images
      const formData = new FormData()
      formData.append('restaurantName', restaurantName || 'Restaurant')
      
      // Add email addresses if provided
      if (gmEmail) formData.append('gmEmail', gmEmail)
      if (ownerEmail) formData.append('ownerEmail', ownerEmail)
      
      // Append each file
      files.forEach((file, index) => {
        formData.append(`image-${index}`, file)
      })

      const uploadResponse = await fetch('/api/image/analyze-subscription', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      setUploading(false)
      setAnalyzing(true)

      const analysisResult = await uploadResponse.json()

      // Show success message
      let successMsg = 'Analysis complete! Your report is ready.'
      if (analysisResult.email_sent > 0) {
        successMsg += ` Report sent to ${analysisResult.email_sent} email address${analysisResult.email_sent !== 1 ? 'es' : ''}.`
      }
      setSuccess(successMsg)
      setAnalyzing(false)
      
      // Reload profile to get updated usage
      const { profile: updatedProfile } = await getUserProfile(user.id)
      setProfile(updatedProfile)

      // Optionally auto-download PDF
      if (analysisResult.pdf_url) {
        window.open(analysisResult.pdf_url, '_blank')
      }

    } catch (err) {
      setError(err.message)
      setUploading(false)
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1a4480] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const remainingImages = profile ? profile.monthly_image_limit - (profile.images_used_this_period || 0) : 0
  const usagePercentage = profile ? Math.round(((profile.images_used_this_period || 0) / profile.monthly_image_limit) * 100) : 0

  return (
    <div className="min-h-screen bg-[#F0F0F0] font-sans text-gray-900">
      {/* Official Banner */}
      <div className="bg-[#1b1b1b] px-4 py-1">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="text-white text-[10px] uppercase tracking-wider font-semibold">
            ProtocolLM — Food Service Compliance
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b-4 border-[#1a4480]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <Link href="/" className="text-3xl font-bold text-[#1a4480] tracking-tight hover:text-[#112e5a]">
                ProtocolLM
              </Link>
              <p className="text-base text-gray-600 mt-1">Upload Images for Analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm border-2 border-gray-400 text-gray-700 font-bold rounded-md hover:bg-gray-100 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Subscription Status */}
        {profile && (
          <div className="bg-white p-6 border border-gray-300 shadow-sm rounded-sm mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1a4480] uppercase tracking-wide">Your Plan</h3>
                <p className="text-sm text-gray-600 capitalize">{profile.current_plan || 'No active plan'}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#1a4480]">{remainingImages}</div>
                <div className="text-xs text-gray-500">images remaining</div>
              </div>
            </div>
            
            {/* Usage bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-[#1a4480] h-3 rounded-full transition-all duration-300"
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600">
              {profile.images_used_this_period || 0} of {profile.monthly_image_limit} images used this period
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-700 rounded-sm">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-700 rounded-sm">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Optional Checklist */}
        <div className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#1a4480] uppercase tracking-wide">Inspection Areas</h3>
              <p className="text-sm text-gray-600">Optional reminders for common areas (not required)</p>
            </div>
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="text-sm text-[#1a4480] font-bold hover:underline"
            >
              {showChecklist ? 'Hide' : 'Show'} Checklist
            </button>
          </div>
          
          {showChecklist && (
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {checklistItems.map((item, index) => (
                <label key={index} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const newItems = [...checklistItems]
                      newItems[index].checked = e.target.checked
                      setChecklistItems(newItems)
                    }}
                    className="w-4 h-4 text-[#1a4480]"
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-white p-8 border border-gray-300 shadow-sm rounded-sm">
          <h2 className="text-2xl font-bold text-[#1a4480] mb-2">Upload Images</h2>
          <p className="text-sm text-gray-600 mb-6">
            Select photos of your food service areas for compliance analysis
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Business Name (Optional)
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g., Main Street Diner"
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">
                Email Report (Optional)
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                Send the PDF report via email to your GM or Owner
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GM Email
                  </label>
                  <input
                    type="email"
                    value={gmEmail}
                    onChange={(e) => setGmEmail(e.target.value)}
                    placeholder="gm@restaurant.com"
                    className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@restaurant.com"
                    className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                Select Images
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic"
                multiple
                onChange={handleFileChange}
                className="w-full px-4 py-3 border-2 border-gray-400 rounded-none focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-[#1a4480] bg-white"
              />
              {files.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <button
              onClick={handleUploadAndAnalyze}
              disabled={uploading || analyzing || files.length === 0 || remainingImages === 0}
              className="w-full px-8 py-4 bg-[#1a4480] text-white font-bold rounded-md hover:bg-[#112e5a] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Upload and Analyze'}
            </button>

            {remainingImages === 0 && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-700 rounded-sm">
                <p className="text-sm text-yellow-800 font-medium">
                  You've reached your monthly image limit. Please upgrade your plan or wait for your next billing cycle.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#1a4480] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>}>
      <UploadPageContent />
    </Suspense>
  )
}

