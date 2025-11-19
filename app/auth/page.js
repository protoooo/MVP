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
      setMessage('Check your email for the secure login link.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#ffffff',
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
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h1 style={{ color: '#0f172a', marginBottom: '10px', fontSize: '24px', fontWeight: '600' }}>
          protocol LM
        </h1>
        <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
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
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#0f172a',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Sending...' : 'Continue with Email'}
          </button>
        </form>

        {message && (
          <p style={{ 
            marginTop: '16px', 
            color: message.includes('Error') ? '#dc2626' : '#059669',
            fontSize: '13px',
            padding: '10px',
            backgroundColor: message.includes('Error') ? '#fee2e2' : '#d1fae5',
            borderRadius: '6px'
          }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
            Start your 7-day free trial
          </p>
          <button
            onClick={() => router.push('/pricing')}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View Plans & Pricing
          </button>
        </div>
      </div>
    </div>
  );
}
