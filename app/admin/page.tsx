"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to workspace - no admin system anymore
    router.push("/workspace");
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600 mx-auto mb-4"></div>
        <p className="text-sm text-text-secondary">Redirecting to workspace...</p>
      </div>
    </div>
  );
}
