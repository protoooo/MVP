"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
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

      // Check if admin
      if (isAdminLogin) {
        // Check if user has admin role
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("id", data.user?.id)
          .single();

        if (!profile?.is_admin) {
          await supabase.auth.signOut();
          throw new Error("Unauthorized: Admin access required");
        }
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
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
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-sage-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-sage-600" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">naiborhood</h1>
          </div>
          <h2 className="text-xl font-medium text-text-primary mb-2">
            {isAdminLogin ? "Admin Sign In" : "Welcome back"}
          </h2>
          <p className="text-sm text-text-secondary">
            {isAdminLogin 
              ? "Access the admin dashboard" 
              : "Business automation for small teams"
            }
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface rounded-2xl shadow-soft-lg border border-border p-8">
          {/* Toggle Admin Login */}
          <div className="flex items-center justify-center gap-2 mb-6 pb-6 border-b border-border-light">
            <button
              type="button"
              onClick={() => setIsAdminLogin(!isAdminLogin)}
              className="text-xs text-text-tertiary hover:text-sage-600 transition"
            >
              {isAdminLogin ? "← Regular Login" : "Admin Login →"}
            </button>
          </div>

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

            {/* Sign Up Link - hide for admin login */}
            {!isAdminLogin && (
              <div className="text-center text-sm pt-4">
                <span className="text-text-secondary">Don't have an account? </span>
                <Link 
                  href="/signup" 
                  className="font-medium text-sage-600 hover:text-sage-700 transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-8">
          Built for small businesses in your neighborhood
        </p>
      </div>
    </div>
  );
}
