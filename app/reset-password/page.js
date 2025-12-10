'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user has a valid session or if we need to verify token
    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type')
      
      // If we have a token_hash, verify it first
      if (tokenHash && type === 'recovery') {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          })
          
          if (verifyError) {
            console.error('Token verification failed:', verifyError)
            setError('Invalid or expired reset link. Please request a new password reset.')
            return
          }
          
          // Token verified successfully, session should be established
          console.log('Token verified successfully')
        } catch (err) {
          console.error('Verification exception:', err)
          setError('Failed to verify reset link. Please try again.')
          return
        }
      }
      
      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
    }
    
    checkSession()
  }, [supabase])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setMessage('✓ Password updated successfully! Redirecting...')
      
      // Wait a moment then redirect to home
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (err) {
      console.error('Reset error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
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
          Reset Your Password
        </h1>
        <p style={{ color: '#A1A1AA', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
          Enter your new password below
        </p>
        
        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#F87171',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            color: '#34D399',
            fontSize: '13px'
          }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label style={{ 
              display: 'block', 
              color: '#A1A1AA', 
              fontSize: '13px', 
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={!!error}
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '40px',
                  fontSize: '14px',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  color: 'white',
                  backgroundColor: '#0A0A0A',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#A1A1AA',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{ 
              display: 'block', 
              color: '#A1A1AA', 
              fontSize: '13px', 
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={!!error}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #333',
                borderRadius: '12px',
                color: 'white',
                backgroundColor: '#0A0A0A',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !!error}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: error ? '#555' : '#3E7BFA',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: (loading || error) ? 'not-allowed' : 'pointer',
              opacity: (loading || error) ? 0.7 : 1
            }}
          >
            {loading ? 'Updating...' : error ? 'Invalid Link' : 'Update Password'}
          </button>
        </form>

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
