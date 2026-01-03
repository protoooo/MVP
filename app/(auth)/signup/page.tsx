// app/(auth)/signup/page.tsx - SECURE VERSION
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
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    // Validate password requirements
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    // Load Turnstile script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Turnstile script loaded');
      setTurnstileReady(true);
      
      const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
      
      if (!siteKey) {
        console.error('CRITICAL: NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY not set!');
        setError('Security verification not configured. Please contact support.');
        return;
      }

      if (window.turnstile) {
        try {
          const widgetId = window.turnstile.render('#turnstile-widget', {
            sitekey: siteKey,
            theme: 'dark',
            size: 'normal',
            callback: (token: string) => {
              console.log('Turnstile verified');
              setTurnstileToken(token);
              setError(''); // Clear any turnstile errors
            },
            'error-callback': (error: any) => {
              console.error('Turnstile error:', error);
              setError('Security verification failed. Please refresh and try again.');
              setTurnstileToken('');
            },
            'expired-callback': () => {
              console.log('Turnstile expired');
              setTurnstileToken('');
              setError('Security verification expired. Please complete it again.');
            },
            'timeout-callback': () => {
              console.log('Turnstile timeout');
              setTurnstileToken('');
              setError('Security verification timed out. Please try again.');
            },
          });
          setTurnstileWidgetId(widgetId);
        } catch (err) {
          console.error('Error rendering Turnstile:', err);
          setError('Failed to load security verification. Please refresh the page.');
        }
      }
    };

    script.onerror = () => {
      console.error('Failed to load Turnstile script');
      setError('Failed to load security verification. Please check your connection and refresh.');
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

    // Client-side validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    // Email validation - match backend validation pattern
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!Object.values(passwordStrength).every(v => v)) {
      setError('Password must meet all requirements');
      return;
    }

    // CRITICAL: Check Turnstile token - NO BYPASS
    if (!turnstileToken) {
      setError('Please complete the security verification');
      return;
    }

    setLoading(true);

    try {
      // Send turnstile token to backend
      await authAPI.register(email, password, businessName, turnstileToken);
      router.push('/home');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      
      // Reset Turnstile on error
      if (window.turnstile && turnstileWidgetId) {
        try {
          window.turnstile.reset(turnstileWidgetId);
        } catch (e) {
          console.error('Error resetting Turnstile:', e);
        }
        setTurnstileToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  const allRequirementsMet = Object.values(passwordStrength).every(v => v);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-brand-600/10 mb-4 border border-brand-600/20">
            <Database className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            protocolLM
          </h1>
          <p className="text-gray-400">Create your secure account</p>
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
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all"
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
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all"
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
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 transition-all"
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
              />
              
              {/* Password Requirements */}
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-gray-500 mb-1">Password must contain:</p>
                {[
                  { key: 'length', label: 'At least 8 characters' },
                  { key: 'uppercase', label: 'One uppercase letter' },
                  { key: 'lowercase', label: 'One lowercase letter' },
                  { key: 'number', label: 'One number' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      passwordStrength[key as keyof typeof passwordStrength]
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {passwordStrength[key as keyof typeof passwordStrength] && '✓'}
                    </div>
                    <span className={
                      passwordStrength[key as keyof typeof passwordStrength]
                        ? 'text-brand-400'
                        : 'text-gray-500'
                    }>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Turnstile Widget - REQUIRED */}
            <div className="flex justify-center py-2">
              <div id="turnstile-widget"></div>
              {!turnstileReady && (
                <div className="text-center">
                  <p className="text-xs text-gray-400">Loading security verification...</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !turnstileToken || !allRequirementsMet}
              className="w-full px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-500 hover:text-brand-400 font-medium transition-colors">
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
