// components/SessionGuard.js - FIXED: Proper session expiry redirect
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
        
        // ✅ FIXED: Redirect to auth if session expired
        if (error || !user) {
          // Only redirect if we're not already on a public page
          const publicPaths = ['/auth', '/terms', '/privacy', '/contact', '/verify-email', '/reset-password']
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
        
        // On error, redirect to auth unless we're already there
        const publicPaths = ['/auth', '/terms', '/privacy', '/contact', '/verify-email', '/reset-password']
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
        // Redirect to auth unless already there
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
