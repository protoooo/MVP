"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Simple redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
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
            Welcome back
          </h2>
          <p className="text-sm text-text-secondary">
            Business automation for small teams
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface rounded-2xl shadow-soft-lg border border-border p-8">
          <form onSubmit={handleLogin} className="space-y-5">
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
                  placeholder="Enter your password"
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
              className="w-full py-3.5 px-4 rounded-xl text-sm font-medium text-white 
                bg-sage-600 hover:bg-sage-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 
                disabled:opacity-50 disabled:cursor-not-allowed 
                transition duration-200 shadow-soft"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {/* Sign Up Link */}
            <div className="text-center text-sm pt-4">
              <span className="text-text-secondary">Don't have an account? </span>
              <Link 
                href="/signup" 
                className="font-medium text-sage-600 hover:text-sage-700 transition"
              >
                Sign up
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
