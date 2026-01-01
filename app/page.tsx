"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is logged in, check if onboarding is complete
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("setup_completed")
        .eq("id", user.id)
        .single();

      if (profile?.setup_completed) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } else {
      // Not logged in, show landing page
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Sparkles className="w-16 h-16 text-blue-600" />
          <h1 className="text-5xl font-semibold text-gray-900">naiborhood</h1>
        </div>

        <h2 className="text-3xl font-semibold text-gray-900">
          Business Automation for Small Teams
        </h2>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          A lightweight, powerful platform designed specifically for small businesses. 
          Get AI-powered agents that actually do work, not just chat.
        </p>

        <div className="flex gap-4 justify-center pt-8">
          <button
            onClick={() => router.push("/signup")}
            className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started - $50/month
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-4 bg-white text-gray-700 rounded-full text-lg font-medium hover:bg-gray-50 transition-all border-2 border-gray-300"
          >
            Sign In
          </button>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Real Actions</h3>
            <p className="text-sm text-gray-600">
              Draft emails, create invoices, schedule interviews - not just suggestions
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Know Your Business</h3>
            <p className="text-sm text-gray-600">
              Upload your docs - agents learn your operations, policies, and data
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Unlimited Usage</h3>
            <p className="text-sm text-gray-600">
              One simple price. No usage limits. Built for small businesses.
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500 pt-8">
          Perfect for bakeries, bars, breweries, retail shops, and small teams everywhere
        </p>
      </div>
    </div>
  );
}
