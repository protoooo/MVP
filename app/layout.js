'use client'

import "./globals.css"
import { Inter } from "next/font/google"
import { useEffect, useState, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase-browser'

const inter = Inter({ subsets: ["latin"] })

// Auth Context
const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        console.log('✅ Session restored:', session?.user?.email || 'No user')
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event)
        setUser(session?.user ?? null)
      }
    )

    // Session refresh interval (every 30 minutes)
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.auth.refreshSession()
        console.log('🔄 Session refreshed automatically')
      }
    }, 30 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function RootLayout({ children }) {
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error:', event.error)
      
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(event.error)
      }
      
      setError(event.error)
    }

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(event.reason)
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (error) {
    return (
      <html lang="en">
        <body style={{ padding: '40px', fontFamily: 'monospace', background: '#1a1a1a', color: '#fff' }}>
          <h1>App Error Detected</h1>
          <pre style={{ background: '#000', padding: '20px', overflow: 'auto' }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>
            Reload App
          </button>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        {/* ✅ Updated Theme Color for Light Mode */}
        <meta name="theme-color" content="#FAFAFA" />
        
        {/* ✅ Updated Title & Description (No "AI" mentions) */}
        <title>ProtocolLM | Washtenaw County Food Safety Compliance</title>
        <meta name="description" content="Instant food safety compliance analysis for Washtenaw County restaurants. Identify Priority (P) violations before inspection." />
        
        {/* Open Graph / Social Sharing */}
        <meta property="og:title" content="ProtocolLM | Food Safety Intelligence" />
        <meta property="og:description" content="Protect your license. Identify Priority (P) violations instantly with Washtenaw County enforcement standards." />
        <meta property="og:type" content="website" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
