// components/LocationCodeAuth.js - Staff enters code on first launch
'use client'
import { useState, useEffect } from 'react'
import { IBM_Plex_Mono } from 'next/font/google'

const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'] })

// Generate device fingerprint (client-side only)
function generateDeviceFingerprint() {
  if (typeof window === 'undefined') return null
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency || 0,
    navigator.maxTouchPoints || 0
  ]
  
  const fingerprint = components.join('|')
  
  // Simple hash function (client-side)
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return Math.abs(hash).toString(36).toUpperCase().padStart(16, '0')
}

export default function LocationCodeAuth({ onAuthenticated }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deviceFingerprint, setDeviceFingerprint] = useState(null)
  const [storedAuth, setStoredAuth] = useState(null)

  useEffect(() => {
    // Generate device fingerprint on mount
    const fingerprint = generateDeviceFingerprint()
    setDeviceFingerprint(fingerprint)

    // Check if device is already authenticated
    try {
      const stored = localStorage.getItem('location_auth')
      if (stored) {
        const auth = JSON.parse(stored)
        // Verify fingerprint matches
        if (auth.deviceFingerprint === fingerprint) {
          setStoredAuth(auth)
          // Auto-authenticate if we have valid stored credentials
          onAuthenticated(auth)
        } else {
          // Fingerprint changed (new device), clear storage
          localStorage.removeItem('location_auth')
        }
      }
    } catch (err) {
      console.error('Failed to load stored auth:', err)
    }
  }, [onAuthenticated])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!code.trim() || code.trim().length !== 6) {
      setError('Please enter a 6-character location code')
      return
    }

    if (!deviceFingerprint) {
      setError('Device fingerprint not ready. Please refresh.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/locations/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: code.trim().toUpperCase(),
          deviceFingerprint
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid location code')
        setLoading(false)
        return
      }

      // Save authentication to localStorage
      const auth = {
        locationCode: code.trim().toUpperCase(),
        deviceFingerprint,
        locationId: data.location.id,
        locationName: data.location.name,
        authenticatedAt: new Date().toISOString()
      }

      localStorage.setItem('location_auth', JSON.stringify(auth))
      
      // Call parent callback
      onAuthenticated(auth)

    } catch (err) {
      console.error('Authentication error:', err)
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('location_auth')
    setStoredAuth(null)
    setCode('')
    window.location.reload()
  }

  // If already authenticated, show status
  if (storedAuth) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Device Registered</h2>
            <p className="text-slate-400 text-sm">
              Location: <span className="text-white font-semibold">{storedAuth.locationName}</span>
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition"
          >
            Switch Location
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            This device is locked to {storedAuth.locationName}. Contact your manager if this is incorrect.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">protocolLM</h1>
          <p className="text-slate-400 text-sm">Enter your location code to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Location Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MN4K2P"
              maxLength={6}
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-center text-2xl tracking-widest font-bold placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 ${ibmMono.className}`}
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
            <p className="text-xs text-slate-500 mt-2 text-center">
              Ask your manager for the 6-character code
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !deviceFingerprint}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            This device will be registered to your location. Each device can only be used at one physical location.
          </p>
        </div>
      </div>
    </div>
  )
}


// ============================================================================
// USAGE IN YOUR MAIN APP
// File: app/page.js (or wherever your main chat UI is)
// ============================================================================

'use client'
import { useState } from 'react'
import LocationCodeAuth from '@/components/LocationCodeAuth'
import ChatInterface from '@/components/ChatInterface' // Your existing chat UI

export default function Page() {
  const [auth, setAuth] = useState(null)

  if (!auth) {
    return <LocationCodeAuth onAuthenticated={setAuth} />
  }

  return <ChatInterface auth={auth} />
}
