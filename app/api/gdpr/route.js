// app/api/gdpr/route.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Export user data (GDPR compliance)
export async function GET(request) {
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
          setAll() {}
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Collect all user data
    const userData = {
      profile: null,
      chats: [],
      messages: [],
      subscription: null,
      usage: null
    }

    // Profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    userData.profile = profile

    // Chats
    const { data: chats } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
    userData.chats = chats || []

    // Messages (limited to last 1000)
    if (chats && chats.length > 0) {
      const chatIds = chats.map(c => c.id)
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })
        .limit(1000)
      userData.messages = messages || []
    }

    // Subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    userData.subscription = subscription

    // Usage
    const { data: usage } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(12) // Last year
    userData.usage = usage || []

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      data: userData
    })

  } catch (error) {
    console.error('[GDPR Export] Error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

// Delete user account (GDPR compliance)
export async function DELETE(request) {
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
          setAll() {}
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use service role for deletions
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {}
        }
      }
    )

    // Delete in order (respecting foreign keys)
    await adminSupabase.from('messages').delete().eq('user_id', user.id)
    await adminSupabase.from('chats').delete().eq('user_id', user.id)
    await adminSupabase.from('usage_counters').delete().eq('user_id', user.id)
    await adminSupabase.from('subscriptions').delete().eq('user_id', user.id)
    await adminSupabase.from('user_profiles').delete().eq('id', user.id)
    await adminSupabase.from('user_sessions').delete().eq('user_id', user.id)

    // Delete auth user
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('[GDPR Delete] Error:', deleteError)
      return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    })

  } catch (error) {
    console.error('[GDPR Delete] Error:', error)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
