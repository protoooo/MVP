// components/SessionGuard.js - FIXED: Add accept-terms to public paths
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const refreshSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        // ✅ FIXED: Complete public paths list
        if (error || !user) {
          const publicPaths = [
            '/auth', 
            '/terms', 
            '/privacy', 
            '/contact', 
            '/verify-email', 
            '/reset-password',
            '/accept-terms'  // ✅ ADDED
          ]
          const isPublicPage = publicPaths.some(path => window.location.pathname.startsWith(path))
          
          if (!isPublicPage && window.location.pathname !== '/') {
            console.error('[SessionGuard] Session expired - redirecting to auth')
            window.location.href = '/auth?session_expired=true'
            return
          }
          return
        }

        // Session valid - refresh token
        await supabase.auth.refreshSession()
        console.log('[SessionGuard] Session refreshed successfully')
        
      } catch (error) {
        console.error('[SessionGuard] Session refresh failed:', error)
        
        const publicPaths = [
          '/auth', 
          '/terms', 
          '/privacy', 
          '/contact', 
          '/verify-email', 
          '/reset-password',
          '/accept-terms'
        ]
        const isPublicPage = publicPaths.some(path => window.location.pathname.startsWith(path))
        
        if (!isPublicPage && window.location.pathname !== '/') {
          window.location.href = '/auth?session_error=true'
        }
      }
    }

    // Initial refresh
    refreshSession()
    
    // Refresh every 5 minutes
    const interval = setInterval(refreshSession, 5 * 60 * 1000)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('[SessionGuard] User signed out')
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth'
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[SessionGuard] Token refreshed')
      } else if (event === 'USER_UPDATED') {
        console.log('[SessionGuard] User updated')
      }
    })

    return () => {
      clearInterval(interval)
      subscription?.unsubscribe()
    }
  }, [supabase, router])

  return null
}
