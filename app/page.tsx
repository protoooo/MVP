'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has a token
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/home');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="spinner w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
    </div>
  );
}
