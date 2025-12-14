// app/api/accept-terms/route.js - REPLACE ENTIRE FILE

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
      process.env.SUPABASE_SERVICE_ROLE_KEY, // ✅ Use service role for write access
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

    // ✅ First check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    const now = new Date().toISOString()

    if (existingProfile) {
      // Profile exists - update it
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          accepted_terms: true,
          accepted_privacy: true,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          updated_at: now
        })
        .eq('id', user.id)

      if (updateError) {
        logger.error('Failed to update terms acceptance', { 
          error: updateError.message,
          userId: user.id 
        })
        return NextResponse.json({ error: 'Failed to save acceptance' }, { status: 500 })
      }
    } else {
      // Profile doesn't exist - create it
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          accepted_terms: true,
          accepted_privacy: true,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          created_at: now,
          updated_at: now
        })

      if (insertError) {
        logger.error('Failed to create user profile', { 
          error: insertError.message,
          userId: user.id 
        })
        return NextResponse.json({ error: 'Failed to save acceptance' }, { status: 500 })
      }
    }

    logger.audit('Terms accepted', { userId: user.id, email: user.email })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Accept terms exception', { error: error.message })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
