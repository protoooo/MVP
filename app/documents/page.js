'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // If not logged in, kick back to home
        router.push('/')
      } else {
        setSession(session)
      }
      setLoading(false)
    }
    getSession()
  }, [supabase, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button 
            onClick={handleSignOut}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded transition"
          >
            Sign Out
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Welcome, {session.user.email}</h2>
          <p className="text-gray-400">
            You are now logged in. This is where your protected documents will appear.
          </p>
          
          {/* Placeholder for your document list */}
          <div className="mt-8 p-8 border-2 border-dashed border-gray-700 rounded-lg text-center text-gray-500">
             Document Viewer Coming Soon
          </div>
        </div>
      </div>
    </div>
  )
}
