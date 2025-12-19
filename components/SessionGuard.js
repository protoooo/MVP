// components/SessionGuard.js - FIXED: Reduced grace period for security
'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()
  const initRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const manageSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let localToken = localStorage.getItem('session_token')
        const now = new Date()

        if (!localToken) {
          localToken = crypto.randomUUID()
          localStorage.setItem('session_token', localToken)
          localStorage.setItem('token_last_check', now.toISOString())

          await supabase.from('user_sessions').upsert({
            user_id: user.id,
            session_token: localToken,
            last_seen: now.toISOString(),
            device_info: navigator.userAgent
          }, { onConflict: 'user_id' })
          
          initRef.current = true
          return
        }

        const lastCheck = localStorage.getItem('token_last_check')
        // Check every 5 minutes instead of 30 seconds (better UX, less load)
        if (!initRef.current || !lastCheck || (now - new Date(lastCheck)) > 300000) {
          
          const { data: dbSession } = await supabase
            .from('user_sessions')
            .select('session_token, updated_at')
            .eq('user_id', user.id)
            .single()

          if (dbSession && dbSession.session_token !== localToken) {
            const tokenAge = new Date(dbSession.updated_at)
            const minutesSinceChange = (now - tokenAge) / 1000 / 60

            // ✅ FIXED: Reduced grace period from 30 to 10 minutes for security
            // This means if someone logs in on another device, the old device
            // gets kicked out within 10 minutes max instead of 30
            if (minutesSinceChange > 10) {
              await supabase.auth.signOut()
              localStorage.removeItem('session_token')
              router.push('/?error=session_conflict')
              return
            }
          } else {
             await supabase.from('user_sessions').update({ 
               last_seen: now.toISOString() 
             }).eq('user_id', user.id)
          }

          localStorage.setItem('token_last_check', now.toISOString())
          initRef.current = true
        }

      } catch (error) {
        console.error('[SessionGuard] Error:', error)
      }
    }

    manageSession()
    // Check every 5 minutes (increased from 30 seconds for better UX)
    const interval = setInterval(manageSession, 300000)

    return () => clearInterval(interval)
  }, [supabase, router])

  return null
}
