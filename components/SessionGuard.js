'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function SessionGuard() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Get the token currently saved in this browser
      const localToken = localStorage.getItem('session_token')

      // 2. If we don't have one (fresh login), generate it and claim the session
      if (!localToken) {
        const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem('session_token', newToken)
        
        await supabase
          .from('user_sessions')
          .upsert({ user_id: user.id, session_token: newToken, updated_at: new Date() })
        return
      }

      // 3. Check what the database thinks is the "active" token
      const { data: dbSession, error } = await supabase
        .from('user_sessions')
        .select('session_token')
        .eq('user_id', user.id)
        .maybeSingle()

      // 4. If database has a DIFFERENT token, it means someone else logged in after us.
      // We are now the "old" session. Kick us out.
      if (dbSession && dbSession.session_token && dbSession.session_token !== localToken) {
        console.log('Session mismatch. Logging out.')
        await supabase.auth.signOut()
        localStorage.removeItem('session_token')
        alert('You have been logged out because this account was used on another device.')
        window.location.href = '/'
      } 
      // 5. If we have a token but the DB has nothing (rare edge case), claim it.
      else if (!dbSession) {
         await supabase
          .from('user_sessions')
          .upsert({ user_id: user.id, session_token: localToken, updated_at: new Date() })
      }
    }

    // Check immediately on mount
    checkSession()

    // Then check every 10 seconds
    const interval = setInterval(checkSession, 10000)

    return () => clearInterval(interval)
  }, [])

  return null
}
