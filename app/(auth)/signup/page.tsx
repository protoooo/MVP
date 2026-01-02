"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Check } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
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
            Create your account
          </h2>
          <p className="text-sm text-text-secondary">
            Get started with $50/month unlimited access
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-surface rounded-2xl shadow-soft-lg border border-border p-8">
          <form onSubmit={handleSignup} className="space-y-5">
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background-secondary 
                    text-text-primary placeholder:text-text-placeholder
                    focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-400
                    transition duration-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background-secondary
                    text-text-primary placeholder:text-text-placeholder
                    focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-400
                    transition duration-200"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background-secondary
                    text-text-primary placeholder:text-text-placeholder
                    focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-400
                    transition duration-200"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

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
              {loading ? "Creating account..." : "Create account"}
            </button>

            {/* Sign In Link */}
            <div className="text-center text-sm pt-4">
              <span className="text-text-secondary">Already have an account? </span>
              <Link 
                href="/login" 
                className="font-medium text-text-primary hover:text-text-secondary transition underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>

        {/* Features */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="w-5 h-5 rounded-full bg-background-tertiary flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-text-primary" />
            </div>
            <span>Unlimited agent interactions</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="w-5 h-5 rounded-full bg-background-tertiary flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-text-primary" />
            </div>
            <span>All 5 specialized agents included</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="w-5 h-5 rounded-full bg-background-tertiary flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-text-primary" />
            </div>
            <span>Cancel anytime, no hidden fees</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-8">
          Built for small and medium businesses
        </p>
      </div>
    </div>
  );
}
