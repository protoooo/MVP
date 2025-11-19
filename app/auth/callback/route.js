import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // CRITICAL FIX: Force the redirect to use the Env Variable if it exists.
  // This prevents the "localhost" bounce-back.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
    ? process.env.NEXT_PUBLIC_BASE_URL 
    : requestUrl.origin

  // Redirect to the documents dashboard
  return NextResponse.redirect(`${baseUrl}/documents`)
}
