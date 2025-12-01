import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // If Google sends a code, exchange it for a user session
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // Optional: Check if user exists in your profile table here
      // But usually, we just let the page.js handle the profile check
      
    } catch (error) {
      console.error('Auth Callback Error:', error)
    }
  }

  // ✅ REDIRECT TO HOME
  // We redirect to origin (https://protocollm.org) because that's where the 
  // logic lives (the modal, the chat, etc).
  // We do NOT redirect to /pricing because that page doesn't exist anymore.
  return NextResponse.redirect(requestUrl.origin)
}
