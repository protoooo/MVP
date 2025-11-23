import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper to create Supabase client
function createSupabaseServer() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
}

// Get chat history for current user
export async function GET(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ chats: data || [] })
  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
  }
}

// Save or update a chat
export async function POST(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { chatId, title, messages, county } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 })
    }

    const messagesJson = JSON.stringify(messages)
    if (messagesJson.length > 100000) {
      return NextResponse.json({ error: 'Chat too large' }, { status: 400 })
    }

    const chatData = {
      user_id: session.user.id,
      title: title || 'New Chat',
      messages: messages,
      county: county || 'washtenaw',
      updated_at: new Date().toISOString()
    }

    if (chatId) {
      const { data, error } = await supabase
        .from('chat_history')
        .update(chatData)
        .eq('id', chatId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ chat: data })
    } else {
      chatData.created_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('chat_history')
        .insert(chatData)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ chat: data })
    }
  } catch (error) {
    console.error('Error saving chat history:', error)
    return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 })
  }
}

// Delete a chat
export async function DELETE(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', chatId)
      .eq('user_id', session.user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat:', error)
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 })
  }
}
