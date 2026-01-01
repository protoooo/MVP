"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;

      setMessage("Check your email for the password reset link!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-text-primary mb-2">
            Reset your password
          </h2>
          <p className="text-sm text-text-secondary">
            Enter your email address and we'll send you a reset link
          </p>
        </div>

        {/* Reset Card */}
        <div className="bg-surface rounded-2xl shadow-soft-lg border border-border p-8">
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-background-secondary 
                    text-text-primary placeholder:text-text-placeholder
                    focus:outline-none focus:ring-2 focus:ring-text-secondary focus:border-text-secondary
                    transition duration-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Success Message */}
            {message && (
              <div className="rounded-xl bg-success-light border border-success/20 p-4">
                <p className="text-sm text-success-dark">{message}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-error-light border border-error/20 p-4">
                <p className="text-sm text-error-dark">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-5 rounded-full text-sm font-medium text-white 
                bg-text-primary hover:bg-text-secondary 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-secondary 
                disabled:opacity-50 disabled:cursor-not-allowed 
                transition duration-200 shadow-soft"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            {/* Back to Login Link */}
            <div className="text-center pt-4">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-sm font-medium text-text-primary hover:text-text-secondary transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-8">
          Built for small and medium businesses
        </p>
      </div>
    </div>
  );
}
