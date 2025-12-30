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
      formData.append('userId', user.id)  // Pass user ID for server-side auth
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
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  const remainingImages = profile ? profile.monthly_image_limit - (profile.images_used_this_period || 0) : 0
  const usagePercentage = profile ? Math.round(((profile.images_used_this_period || 0) / profile.monthly_image_limit) * 100) : 0

  return (
    <div className="min-h-screen bg-bg-secondary font-sans text-text-primary">
      {/* Official Banner */}
      <div className="bg-text-primary px-4 py-1.5">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <span className="text-white text-xs uppercase tracking-wider font-semibold">
            ProtocolLM — Food Service Compliance
          </span>
        </div>
      </div>

      {/* Header with Superbase styling */}
      <header className="bg-bg-primary border-b border-border-default shadow-soft">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <Link href="/" className="text-3xl font-bold text-primary tracking-tight hover:text-primary-dark transition-colors">
                ProtocolLM
              </Link>
              <p className="text-base text-text-secondary mt-1">Upload Images for Analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-text-secondary">
                {user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="btn-tertiary"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Subscription Status Card */}
        {profile && (
          <div className="card mb-8 animate-fadeInUp">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-primary mb-1">Your Plan</h3>
                <p className="text-sm text-text-secondary capitalize">{profile.current_plan || 'No active plan'}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{remainingImages}</div>
                <div className="text-xs text-text-tertiary">images remaining</div>
              </div>
            </div>
            
            {/* Usage Progress Bar */}
            <div className="w-full bg-bg-tertiary rounded-pill h-3 mb-2 overflow-hidden">
              <div 
                className="h-3 rounded-pill transition-all duration-500 ease-out"
                style={{ 
                  width: `${usagePercentage}%`,
                  background: 'var(--gradient-primary)'
                }}
              ></div>
            </div>
            <p className="text-xs text-text-secondary">
              {profile.images_used_this_period || 0} of {profile.monthly_image_limit} images used this period
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 alert-success animate-slideDown">
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 alert-danger animate-shake">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Optional Checklist Card */}
        <div className="card mb-8 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-primary">Inspection Areas</h3>
              <p className="text-sm text-text-secondary">Optional reminders for common areas (not required)</p>
            </div>
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="btn-tertiary text-sm"
            >
              {showChecklist ? 'Hide' : 'Show'} Checklist
            </button>
          </div>
          
          {showChecklist && (
            <div className="grid md:grid-cols-2 gap-3 mt-6 animate-slideDown">
              {checklistItems.map((item, index) => (
                <label key={index} className="flex items-center gap-3 text-sm text-text-primary cursor-pointer hover:bg-bg-tertiary p-3 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      const newItems = [...checklistItems]
                      newItems[index].checked = e.target.checked
                      setChecklistItems(newItems)
                    }}
                    className="w-5 h-5"
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Upload Section Card */}
        <div className="card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold text-primary mb-2">Upload Images</h2>
          <p className="text-sm text-text-secondary mb-8">
            Select photos of your food service areas for compliance analysis
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Business Name (Optional)
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g., Main Street Diner"
              />
            </div>

            <div className="border-t border-border-default pt-6">
              <h4 className="text-sm font-semibold text-text-primary mb-4">
                Email Report (Optional)
              </h4>
              <p className="text-xs text-text-secondary mb-4">
                Send the PDF report via email to your GM or Owner
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    GM Email
                  </label>
                  <input
                    type="email"
                    value={gmEmail}
                    onChange={(e) => setGmEmail(e.target.value)}
                    placeholder="gm@restaurant.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@restaurant.com"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border-default pt-6">
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Select Images
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic"
                multiple
                onChange={handleFileChange}
                className="w-full"
              />
              {files.length > 0 && (
                <p className="text-sm text-text-secondary mt-3">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <button
              onClick={handleUploadAndAnalyze}
              disabled={uploading || analyzing || files.length === 0 || remainingImages === 0}
              className="w-full btn-primary py-4 text-lg"
            >
              {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Upload and Analyze'}
            </button>

            {remainingImages === 0 && (
              <div className="alert-warning animate-pulse">
                <p className="text-sm font-medium">
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
    <Suspense fallback={<div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>}>
      <UploadPageContent />
    </Suspense>
  )
}

