// app/(auth)/reset-password/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Database, Check } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  useEffect(() => {
    setPasswordStrength({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
    });
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!Object.values(passwordStrength).every(v => v)) {
      setError('Password must meet all requirements');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
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
          <h1 className="text-2xl font-bold text-white mb-2">
            Create New Password
          </h1>
          <p className="text-gray-400">
            {success 
              ? "Your password has been reset successfully"
              : "Enter your new password below"
            }
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          {success ? (
            <div>
              <div className="mb-6 p-4 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-start gap-3">
                <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-brand-400 mb-1">Password Reset Successful!</p>
                  <p className="text-sm text-brand-400/80">
                    Redirecting you to sign in...
                  </p>
                </div>
              </div>
              
              <Link
                href="/login"
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-brand-600 to-secondary-600 text-white font-medium hover:from-brand-700 hover:to-secondary-700 transition-all flex items-center justify-center"
              >
                Sign In Now
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
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    placeholder="••••••••"
                    disabled={loading || !token}
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

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    placeholder="••••••••"
                    disabled={loading || !token}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token || !allRequirementsMet}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-brand-600 to-secondary-600 text-white font-medium hover:from-brand-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="animate-spin w-8 h-8 border-4 border-brand-600/20 border-t-brand-600 rounded-full" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
