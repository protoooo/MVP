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

  // 1. Grab the Env Variable
  let origin = process.env.NEXT_PUBLIC_BASE_URL 

  // 2. Safety Check: If variable is missing, fall back to request origin (localhost)
  if (!origin) {
    origin = requestUrl.origin
  }

  // 3. CRITICAL FIX: Remove the trailing slash if it exists
  // This turns "railway.app/" into "railway.app" so we don't get double slashes
  origin = origin.replace(/\/$/, '')

  // 4. Redirect to the dashboard
  return NextResponse.redirect(`${origin}/documents`)
}
