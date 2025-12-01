'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser' // ✅ FIXED: Points to correct file
import { useRouter } from 'next/navigation'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient() // ✅ FIXED: Initialized correctly

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Check your email for the secure login link.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#121212',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      margin: 0,
      color: 'white'
    }}>
      <div style={{
        backgroundColor: '#1C1C1C',
        padding: '40px',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 4px 60px rgba(0,0,0,0.5)',
        border: '1px solid #333'
      }}>
        <h1 style={{ color: 'white', marginBottom: '10px', fontSize: '24px', fontWeight: '600' }}>
          protocol LM
        </h1>
        <p style={{ color: '#A1A1AA', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
          Access food safety compliance resources for Washtenaw County restaurants.
        </p>
        
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '1px solid #333',
              borderRadius: '12px',
              marginBottom: '16px',
              color: 'white',
              backgroundColor: '#0A0A0A',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#3E7BFA',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Sending...' : 'Continue with Email'}
          </button>
        </form>

        {message && (
          <p style={{ 
            marginTop: '16px', 
            color: message.includes('Error') ? '#F87171' : '#34D399',
            fontSize: '13px',
            padding: '10px',
            backgroundColor: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            borderRadius: '8px'
          }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              color: '#A1A1AA',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
