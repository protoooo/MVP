'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard({ userId }) {
  const supabase = createClient()
  const router = useRouter()
  // Generate a random ID for THIS specific browser tab/window
  const currentBrowserId = useRef(Math.random().toString(36).substring(7))

  useEffect(() => {
    if (!userId) return

    const setupSession = async () => {
      // 1. CLAIM THE THRONE: Tell DB this browser is the active one
      await supabase
        .from('user_profiles')
        .update({ active_session_id: currentBrowserId.current })
        .eq('id', userId)

      // 2. WATCH THE THRONE: Listen for changes to this user's profile
      const channel = supabase
        .channel(`session_guard_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newSessionId = payload.new.active_session_id
            
            // If the session ID in DB doesn't match MY browser ID, someone else logged in
            if (newSessionId && newSessionId !== currentBrowserId.current) {
              alert('You have been logged out because this account was accessed from another device.')
              supabase.auth.signOut().then(() => {
                router.push('/?auth=login')
              })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupSession()
  }, [userId, supabase, router])

  return null // This component renders nothing visually
}
