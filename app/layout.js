'use client'

import "./globals.css";
import { Inter } from "next/font/google";
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ["latin"] });

// Validate environment on app startup
if (typeof window === 'undefined') {
  const { validateEnvOnStartup } = require('@/lib/validate-env');
  validateEnvOnStartup();
}

export default function RootLayout({ children }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error:', event.error);
      
      // Send to monitoring
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(event.error);
      }
      
      setError(event.error);
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(event.reason);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (error) {
    return (
      <html lang="en">
        <body style={{ padding: '40px', fontFamily: 'monospace', background: '#1a1a1a', color: '#fff' }}>
          <h1>App Error Detected</h1>
          <pre style={{ background: '#000', padding: '20px', overflow: 'auto' }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>
            Reload App
          </button>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
