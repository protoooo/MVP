'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#111827',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      margin: 0
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ color: '#111827', marginBottom: '10px', fontSize: '24px' }}>Welcome to Protocol</h1>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>Sign in with your email</p>
        
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '20px',
              color: '#000000',
              backgroundColor: '#f9fafb',
              boxSizing: 'border-box'
            }}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              backgroundColor: '#5D4037',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <p style={{ 
            marginTop: '20px', 
            color: message.includes('Error') ? '#dc2626' : '#059669',
            fontSize: '14px'
          }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
            Want premium features?
          </p>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View Pricing Plans
          </button>
        </div>
      </div>
    </div>
  );
}
