'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function AcceptTermsPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 1. Agree Function
  const handleAgree = async () => {
    setLoading(true)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Update DB directly
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          accepted_terms: true,
          accepted_privacy: true 
        })
        .eq('id', user.id)

      if (!error) {
        // Success: Send them back to the chat (Home)
        // The Home page will handle the "Is Subscribed?" check
        router.push('/') 
        router.refresh()
      } else {
        alert('Error updating profile. Please try again.')
        setLoading(false)
      }
    }
  }

  // 2. Decline Function
  const handleDecline = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#1C1C1C] border border-[#333] rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Update Required</h1>
          <p className="text-[#A1A1AA] text-sm leading-relaxed">
            To continue using <span className="text-white font-semibold">protocolLM</span>, you must review and agree to our updated policies.
          </p>
        </div>

        {/* Links */}
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

        {/* Actions */}
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
