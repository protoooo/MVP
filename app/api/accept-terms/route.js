// app/api/accept-terms/route.js - NEW FILE (Critical for terms flow)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Update or insert user profile with acceptance
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        accepted_terms: true,
        accepted_privacy: true,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })

    if (upsertError) {
      logger.error('Failed to update terms acceptance', { 
        error: upsertError.message,
        userId: user.id 
      })
      return NextResponse.json({ error: 'Failed to save acceptance' }, { status: 500 })
    }

    logger.audit('Terms accepted', { userId: user.id, email: user.email })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Accept terms exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
