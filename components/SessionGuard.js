// components/SessionGuard.js - FIXED: Simplified session management
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function SessionGuard() {
  const supabase = createClient()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Simple session refresh - location checking happens in API layer
    const refreshSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Just refresh the session token
        await supabase.auth.refreshSession()
        
      } catch (error) {
        console.error('[SessionGuard] Session refresh failed:', error)
      }
    }

    // Initial refresh
    refreshSession()
    
    // Refresh every 5 minutes to keep session alive
    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear any cached data
        console.log('[SessionGuard] User signed out')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[SessionGuard] Token refreshed')
      }
    })

    return () => {
      clearInterval(interval)
      subscription?.unsubscribe()
    }
  }, [supabase])

  return null
}
