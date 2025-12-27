import { supabase, getPublicUrl } from '../utils/storage.js'

async function authorize(req) {
  const rawKey = req.headers.get('x-api-key') || req.headers.get('authorization') || ''
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  if (!apiKey) return null
  const { data, error } = await supabase.from('users').select('id').eq('api_key', apiKey).single()
  if (error || !data) return null
  return data
}

export default async function getReport(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase is not configured' }), { status: 500 })
  }

  try {
    const user = await authorize(req)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { session_id: sessionId } = await req.json()
    if (!sessionId) return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 })

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()
    if (error) throw error

    const pdfUrl = data?.pdf_path ? getPublicUrl('reports', data.pdf_path) : null

    return new Response(JSON.stringify({ ...data, pdf_url: pdfUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Report lookup failed' }), { status: 500 })
  }
}
