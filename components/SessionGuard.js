'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard({ userId }) {
  const supabase = createClient()
  const router = useRouter()
  
  // SECURITY FIX: Use cryptographically secure random ID
  const currentBrowserId = useRef(
    typeof window !== 'undefined' && window.crypto
      ? crypto.randomUUID() // Cryptographically secure
      : Math.random().toString(36).substring(7) // Fallback for old browsers
  )

  useEffect(() => {
    if (!userId) return

    const setupSession = async () => {
      try {
        // 1. CLAIM THE THRONE: Tell DB this browser is the active one
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ 
            active_session_id: currentBrowserId.current,
            last_active: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Failed to update session ID:', updateError)
          return
        }

        console.log('✅ Session guard activated:', currentBrowserId.current.substring(0, 8))

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
                console.warn('🚨 Concurrent session detected - logging out')
                
                // Cleanup channel before redirecting
                supabase.removeChannel(channel)
                
                alert('You have been logged out because this account was accessed from another device.')
                
                supabase.auth.signOut().then(() => {
                  router.push('/?auth=login')
                })
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Session guard listening for changes')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Session guard channel error')
            }
          })

        // 3. HEARTBEAT: Update last_active every 5 minutes
        const heartbeatInterval = setInterval(async () => {
          const { error } = await supabase
            .from('user_profiles')
            .update({ 
              last_active: new Date().toISOString() 
            })
            .eq('id', userId)
            .eq('active_session_id', currentBrowserId.current) // Only update if still active session

          if (error) {
            console.error('Heartbeat failed:', error)
          }
        }, 5 * 60 * 1000) // 5 minutes

        return () => {
          clearInterval(heartbeatInterval)
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('Session guard setup error:', error)
      }
    }

    setupSession()
  }, [userId, supabase, router])

  // Optional: Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && userId) {
        // When user returns to tab, verify they're still the active session
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('active_session_id')
          .eq('id', userId)
          .single()

        if (profile && profile.active_session_id !== currentBrowserId.current) {
          console.warn('🚨 Session changed while tab was hidden')
          alert('You have been logged out because this account was accessed from another device.')
          await supabase.auth.signOut()
          router.push('/?auth=login')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId, supabase, router])

  return null // This component renders nothing visually
}
