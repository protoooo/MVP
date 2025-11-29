'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import TermsAcceptanceModal from '@/components/TermsAcceptanceModal'

export default function AcceptTermsPage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms, accepted_privacy, is_subscribed')
        .eq('id', session.user.id)
        .single()

      if (profile?.accepted_terms && profile?.accepted_privacy) {
        // Terms already accepted - route to appropriate page
        if (profile.is_subscribed) {
          router.push('/') // Dashboard is now at root
        } else {
          router.push('/pricing')
        }
        return
      }

      setSession(session)
      setLoading(false)
    }

    checkAuth()
  }, [supabase, router])

  const handleAccept = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/accept-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          acceptedTerms: true,
          acceptedPrivacy: true
        })
      })

      if (response.ok) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_subscribed')
          .eq('id', session.user.id)
          .single()

        // Route based on subscription status
        if (profile?.is_subscribed) {
          router.push('/') // Dashboard is now at root
        } else {
          router.push('/pricing')
        }
      } else {
        alert('Failed to record acceptance. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error accepting terms:', error)
      alert('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <TermsAcceptanceModal
      isOpen={true}
      onAccept={handleAccept}
      onDecline={handleDecline}
      userEmail={session?.user?.email}
    />
  )
}
