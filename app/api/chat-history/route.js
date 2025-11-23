import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

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

export async function GET(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ 
      chats: data || [],
      pagination: {
        page,
        limit,
        total: count,
        hasMore: offset + limit < count
      }
    })
  } catch (error) {
    logError(error, { context: 'Failed to fetch chat history', userId: session.user.id })
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
  }
}

export async function POST(request) {
  const supabase = createSupabaseServer()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { chatId, title, messages, county } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 })
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'Chat cannot be empty' }, { status: 400 })
    }

    if (messages.length > 100) {
      return NextResponse.json({ error: 'Too many messages (max 100)' }, { status: 400 })
    }

    const messagesJson = JSON.stringify(messages)
    const sizeInKB = messagesJson.length / 1024

    if (messagesJson.length > 50000) {
      return NextResponse.json({ 
        error: `Chat too large (${sizeInKB.toFixed(1)}KB). Max 50KB.` 
      }, { status: 400 })
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
      }
      
      if (msg.content.length > 10000) {
        return NextResponse.json({ error: 'Individual message too large' }, { status: 400 })
      }
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
    logError(error, { context: 'Failed to save chat', userId: session.user.id })
    return NextResponse.json({ error: 'Failed to save chat' }, { status: 500 })
  }
}

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
    logError(error, { context: 'Failed to delete chat', userId: session.user.id })
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 })
  }
}
