// app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Database, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request password reset');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-brand-600/10 mb-4 border border-brand-600/20">
            <Database className="w-8 h-8 text-brand-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-400">
            {success 
              ? "Check your email for reset instructions"
              : "Enter your email to receive a password reset link"
            }
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          {success ? (
            <div>
              <div className="mb-6 p-4 rounded-lg bg-brand-500/10 border border-brand-500/20">
                <p className="text-sm text-brand-400">
                  If an account exists with that email, we've sent password reset instructions. 
                  Please check your inbox and spam folder.
                </p>
              </div>
              
              <Link
                href="/login"
                className="w-full px-6 py-3 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 border border-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    placeholder="you@company.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-brand-600 to-secondary-600 text-white font-medium hover:from-brand-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
