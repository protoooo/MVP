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

  useEffect(() => {
    // Load CloudFlare Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTurnstileReady(true);
      
      // Render Turnstile widget
      if (window.turnstile && process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY) {
        window.turnstile.render('#turnstile-widget', {
          sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setTurnstileToken(token);
          },
          'error-callback': () => {
            setError('Verification failed. Please try again.');
          },
        });
      }
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

    if (!turnstileToken) {
      setError('Please complete the security verification');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register(email, password, businessName);
      router.push('/home');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      
      // Reset Turnstile on error
      if (window.turnstile) {
        window.turnstile.reset();
        setTurnstileToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-4 border border-blue-500/20">
            <Database className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-text-primary">protocol</span>
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">LM</span>
          </h1>
          <p className="text-text-secondary">Start your 14-day free trial</p>
        </div>

        {/* Signup Form */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-dark">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Create your account</h2>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-text-primary mb-2">
                Business Name (optional)
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                placeholder="Acme Inc."
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-text-tertiary">At least 6 characters</p>
            </div>

            {/* CloudFlare Turnstile */}
            <div id="turnstile-widget" className="flex justify-center"></div>

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white font-medium hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating account...' : 'Start Free Trial'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/" onClick={(e) => { e.preventDefault(); window.history.back(); }} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-text-tertiary">
          14-day free trial • Credit card required • Cancel anytime
        </p>
      </div>
    </div>
  );
}
