import { createBrowserClient } from '@supabase/ssr'

let supabaseBrowser = null

export function createClient() {
  if (supabaseBrowser) {
    return supabaseBrowser
  }

  supabaseBrowser = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return supabaseBrowser
}
