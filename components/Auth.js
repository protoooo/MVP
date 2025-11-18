'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'reset'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'reset') {
        // Password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        
        if (error) throw error;
        
        setMessage('Password reset email sent! Check your inbox.');
        setEmail('');
      } else if (mode === 'login') {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Manually create profile and business if signup succeeds
        if (data.user) {
          try {
            const { data: business } = await supabase
              .from('businesses')
              .insert({ name: 'My Business' })
              .select()
              .single();
            
            if (business) {
              await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  business_id: business.id
                });
            }
          } catch (profileError) {
            console.error('Profile creation error:', profileError);
          }
        }
        
        setMessage('Account created! You can now sign in.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1419',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '32px 24px',
        background: '#1a2332',
        borderRadius: '8px',
        border: '1px solid #2d3748'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#f7fafc',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {mode === 'reset' ? 'Reset Password' : 'Employee Assistant'}
        </h2>

        {mode !== 'reset' && (
          <p style={{
            fontSize: '14px',
            color: '#a0aec0',
            textAlign: 'center',
            marginBottom: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        )}

        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#2f855a',
            color: '#f0fff4',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#c53030',
            color: '#fff5f5',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px',
              color: '#e2e8f0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#0f1419',
                color: '#f7fafc',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {mode !== 'reset' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: '#e2e8f0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #2d3748',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: '#0f1419',
                  color: '#f7fafc',
                  outline: 'none',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: '#f7fafc',
              color: '#0f1419',
              fontSize: '14px',
              fontWeight: '600',
              opacity: loading ? 0.7 : 1,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Loading...' : 
             mode === 'reset' ? 'Send Reset Link' :
             mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #2d3748',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {mode !== 'reset' && (
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setMessage('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#a0aec0',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.color = '#cbd5e0'}
              onMouseOut={(e) => e.target.style.color = '#a0aec0'}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          )}
          
          <button
            onClick={() => {
              setMode(mode === 'reset' ? 'login' : 'reset');
              setError('');
              setMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.color = '#cbd5e0'}
            onMouseOut={(e) => e.target.style.color = '#a0aec0'}
          >
            {mode === 'reset' ? '← Back to sign in' : 'Forgot password?'}
          </button>
        </div>
      </div>
      
      <style jsx>{`
        input::placeholder {
          color: #718096;
        }
      `}</style>
    </div>
  );
}
