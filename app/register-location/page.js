'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function RegisterLocationPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [supabase, router])

  const handleRegister = async () => {
    setRegistering(true)
    setError('')

    try {
      const res = await fetch('/api/register-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to register location')
        setRegistering(false)
        return
      }

      // Success - redirect to app
      router.push('/')
      
    } catch (error) {
      setError('An unexpected error occurred')
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white/70">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-[0_40px_120px_rgba(0,0,0,0.75)]">
        
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div className={`text-white text-xl font-semibold text-center mb-2 ${outfit.className}`}>
          Register Your Location
        </div>
        
        <div className={`text-white/60 text-sm text-center mb-6 ${inter.className}`}>
          Each protocolLM license is valid for one physical restaurant location.
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-6">
          <h3 className="text-white/90 font-semibold mb-2 text-sm">Why we need this</h3>
          <ul className="text-white/60 text-xs space-y-2">
            <li>✓ Each location has different equipment and procedures</li>
            <li>✓ Health inspectors visit each location separately</li>
            <li>✓ One license = one address</li>
          </ul>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
          <p className="text-amber-200 text-xs">
            <strong>Multiple locations?</strong> Each restaurant needs its own license. 
            Contact us about multi-location pricing: hello@protocollm.org
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={registering}
          className="w-full rounded-xl bg-white text-black font-semibold py-3 disabled:opacity-50 hover:bg-white/90 transition"
        >
          {registering ? 'Registering…' : 'Register This Location'}
        </button>

        <p className="mt-4 text-center text-xs text-white/40">
          This will register: {user?.email}
        </p>
      </div>
    </div>
  )
}
