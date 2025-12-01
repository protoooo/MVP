// app/accept-terms/page.js
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function AcceptTermsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        console.log('❌ Not authenticated, redirecting to home')
        router.push('/')
        return
      }
      
      setUser(currentUser)
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms, accepted_privacy')
        .eq('id', currentUser.id)
        .single()
      
      if (profile?.accepted_terms && profile?.accepted_privacy) {
        console.log('✅ Terms already accepted, redirecting to pricing')
        router.push('/?showPricing=true')
      }
    }
    
    checkAuth()
  }, [])

  const handleAgree = async () => {
    if (!user) {
      setError('Not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('📝 Updating terms acceptance for user:', user.id)
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          accepted_terms: true,
          accepted_privacy: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('❌ Update failed:', updateError)
        setError('Failed to update profile. Please try again.')
        setLoading(false)
        return
      }

      console.log('✅ Terms accepted, redirecting to pricing')
      
      // ✅ FIX: Redirect to home with pricing modal trigger
      window.location.href = '/?showPricing=true'
      
    } catch (err) {
      console.error('❌ Exception:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3E7BFA] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#1C1C1C] border border-[#333] rounded-2xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Update Required</h1>
          <p className="text-[#A1A1AA] text-sm leading-relaxed">
            To continue using <span className="text-white font-semibold">protocolLM</span>, you must review and agree to our updated policies.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <a 
            href="/terms" 
            target="_blank" 
            className="flex items-center justify-between p-4 rounded-lg bg-[#121212] border border-[#2E2E2E] hover:border-[#555] transition-all group"
          >
            <span className="text-sm font-medium text-white group-hover:text-[#3E7BFA] transition-colors">Terms of Service</span>
            <svg className="w-4 h-4 text-[#555] group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <a 
            href="/privacy" 
            target="_blank" 
            className="flex items-center justify-between p-4 rounded-lg bg-[#121212] border border-[#2E2E2E] hover:border-[#555] transition-all group"
          >
            <span className="text-sm font-medium text-white group-hover:text-[#3E7BFA] transition-colors">Privacy Policy</span>
            <svg className="w-4 h-4 text-[#555] group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAgree}
            disabled={loading}
            className="w-full bg-[#3E7BFA] hover:bg-[#3469d4] text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
               <span className="flex items-center justify-center gap-2">
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 Updating...
               </span>
            ) : 'I Agree & Continue'}
          </button>

          <button
            onClick={handleDecline}
            disabled={loading}
            className="w-full text-xs text-[#525252] hover:text-red-400 py-2 transition-colors"
          >
            Decline and Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
