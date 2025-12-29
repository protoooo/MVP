// app/page.js (server wrapper) - Full authentication system with Supabase Auth
import { Suspense } from 'react'
import PageClient from './page.client'
import { isSupabaseConfigured, missingSupabaseConfigMessage } from '@/lib/supabaseConfig'

export default function Page() {
  if (!isSupabaseConfigured) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          background: '#05070d',
          color: '#f6f9ff',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
          }}
        >
          <h1 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800 }}>Configuration required</h1>
          <p style={{ margin: '0 0 6px', lineHeight: 1.55 }}>{missingSupabaseConfigMessage}</p>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Add your Supabase project URL and anon key as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
            in Railway or your local <code>.env</code>, then redeploy.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="landing-loading">Loading...</div>}>
      <PageClient />
    </Suspense>
  )
}
