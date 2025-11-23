import { createBrowserClient } from '@supabase/ssr'

let supabaseBrowser = null

export function createClient() {
  if (supabaseBrowser) {
    return supabaseBrowser
  }

  supabaseBrowser = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'protocollm-auth-token',
        flowType: 'pkce'
      },
      cookies: {
        name: 'protocollm-auth',
        lifetime: 60 * 60 * 24 * 365, // 1 year
        domain: process.env.NODE_ENV === 'production' 
          ? '.protocollm.com'  // Adjust to your domain
          : undefined,
        path: '/',
        sameSite: 'lax'
      }
    }
  )

  return supabaseBrowser
}
