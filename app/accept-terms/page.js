// app/api/accept-terms/route.js - FIXED for Next.js 15
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const cookieStore = await cookies()  // ✅ NOW AWAITED
    
    // First, authenticate the user with anon key
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use service role for database operations
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const now = new Date().toISOString()

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      // Update existing profile
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
      // Create new profile
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
          code: insertError.code,
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
