import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../utils/storage.js'

async function authorize(req) {
  const rawKey = req.headers.get('x-api-key') || req.headers.get('authorization') || ''
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  if (!apiKey) return null
  const { data, error } = await supabase.from('users').select('id').eq('api_key', apiKey).single()
  if (error || !data) return null
  return data
}

export default async function createSession(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase is not configured' }), { status: 500 })
  }

  try {
    const user = await authorize(req)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { type = 'restaurant', area_tags = [] } = await req.json()
    const sessionId = uuidv4()

    const { error } = await supabase
      .from('audit_sessions')
      .insert([{ id: sessionId, user_id: user.id, type, area_tags }])

    if (error) throw error

    return new Response(JSON.stringify({ session_id: sessionId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to create session' }), { status: 500 })
  }
}
