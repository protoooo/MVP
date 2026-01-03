'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/app/services/api';
import { Database } from 'lucide-react';

declare global {
  interface Window {
    turnstile: any;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileError, setTurnstileError] = useState(false);

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Turnstile script loaded');
      setTurnstileReady(true);
      
      // Check if we have the site key
      const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
      
      if (!siteKey) {
        console.error('Missing NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY');
        setTurnstileError(true);
        return;
      }

      if (window.turnstile) {
        try {
          window.turnstile.render('#turnstile-widget', {
            sitekey: siteKey,
            theme: 'dark',
            size: 'normal',
            callback: (token: string) => {
              console.log('Turnstile token received');
              setTurnstileToken(token);
              setTurnstileError(false);
            },
            'error-callback': (error: any) => {
              console.error('Turnstile error:', error);
              setError('Security verification failed. Please refresh the page and try again.');
              setTurnstileError(true);
            },
            'expired-callback': () => {
              console.log('Turnstile token expired');
              setTurnstileToken('');
            },
            'timeout-callback': () => {
              console.log('Turnstile timeout');
              setError('Security verification timed out. Please try again.');
              setTurnstileError(true);
            },
          });
        } catch (err) {
          console.error('Error rendering Turnstile:', err);
          setTurnstileError(true);
        }
      }
    };

    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      setTurnstileError(true);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check Turnstile token
    if (!turnstileToken && !turnstileError) {
      setError('Please complete the security verification');
      return;
    }

    // If Turnstile had an error, allow signup anyway (fallback)
    if (turnstileError) {
      console.warn('Proceeding with signup despite Turnstile error');
    }

    setLoading(true);

    try {
      await authAPI.register(email, password, businessName);
      router.push('/home');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      
      // Reset Turnstile on error
      if (window.turnstile && !turnstileError) {
        try {
          window.turnstile.reset();
        } catch (e) {
          console.error('Error resetting Turnstile:', e);
        }
        setTurnstileToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-emerald-600/10 mb-4 border border-emerald-600/20">
            <Database className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            protocolLM
          </h1>
          <p className="text-gray-400">Create your account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Start 14-Day Trial</h2>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-2">
                Business Name (optional)
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                placeholder="Company Inc."
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                placeholder="you@company.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
            </div>

            {/* Turnstile Widget */}
            <div className="flex justify-center py-2">
              <div id="turnstile-widget"></div>
              {turnstileError && (
                <div className="text-center">
                  <p className="text-xs text-yellow-400 mb-2">Security verification unavailable</p>
                  <p className="text-xs text-gray-500">You can still create an account</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!turnstileToken && !turnstileError)}
              className="w-full px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          14-day trial period • Credit card required • Cancel anytime
        </p>
      </div>
    </div>
  );
}
