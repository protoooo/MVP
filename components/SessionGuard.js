// components/SessionGuard.js - Simplified (location checking moved to API layer)
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Simple session refresh - no complex tracking
    const refreshSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Just refresh the session
        await supabase.auth.refreshSession()
        
      } catch (error) {
        console.error('[SessionGuard] Error:', error)
      }
    }

    refreshSession()
    
    // Refresh every 5 minutes to keep session alive
    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [supabase, router])

  return null
}
