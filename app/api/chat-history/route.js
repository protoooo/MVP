import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper to get Supabase client
function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}

export async function GET(req) {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: chats, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ chats })
}

export async function POST(req) {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { chatId, title, messages, county } = body

    // Update existing chat
    if (chatId) {
      const { data, error } = await supabase
        .from('chat_history')
        .update({ 
          messages, 
          title, 
          county,
          updated_at: new Date().toISOString() 
        })
        .eq('id', chatId)
        .eq('user_id', session.user.id)
        .select()
        .maybeSingle() // <--- FIX: Prevents crash if chat was deleted

      if (error) throw error
      
      // If deleted during save, just return null (no error)
      if (!data) return NextResponse.json({ chat: null }) 
      
      return NextResponse.json({ chat: data })
    } 
    
    // Create new chat
    else {
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: session.user.id,
          title,
          messages,
          county
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ chat: data })
    }
  } catch (error) {
    console.error('Chat History Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const chatId = searchParams.get('chatId')

  if (!chatId) return NextResponse.json({ error: 'Missing Chat ID' }, { status: 400 })

  const { error } = await supabase
    .from('chat_history')
    .delete()
    .eq('id', chatId)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
