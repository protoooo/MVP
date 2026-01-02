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
      // Redirect authenticated users to dashboard
      router.push("/dashboard");
    } else {
      // Redirect non-authenticated users to login page
      router.push("/login");
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
