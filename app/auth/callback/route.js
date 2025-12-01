import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // ✅ CRITICAL FIX: Use the actual public domain, not the internal container URL
  // If the env var is missing, fall back to the requested origin (for localhost dev)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to the home page using the correct public domain
  return NextResponse.redirect(baseUrl)
}
