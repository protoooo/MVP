"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("setup_completed")
        .eq("id", user.id)
        .single();

      if (profile?.setup_completed) {
        router.push("/workspace");
      } else {
        router.push("/onboarding");
      }
    } else {
      // Redirect non-authenticated users to landing page
      router.push("/landing");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
