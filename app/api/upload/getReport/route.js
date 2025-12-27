import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

async function authorize(req) {
  const rawKey = req.headers.get('x-api-key') || req.headers.get('authorization') || ''
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  if (!apiKey) return null
  
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (apiKey === anonKey) {
    return { id: 'anonymous' }
  }
  
  const { data, error } = await supabase.from('users').select('id').eq('api_key', apiKey).single()
  if (error || !data) return null
  return data
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 })
  }

  try {
    const user = await authorize(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const sessionId = body.session_id
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()
    if (error) throw error

    // Get public URL for PDF
    const pdfUrl = data?.pdf_path
      ? supabase.storage.from('reports').getPublicUrl(data.pdf_path).data?.publicUrl
      : null

    return NextResponse.json({ ...data, pdf_url: pdfUrl })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Report lookup failed' }, { status: 500 })
  }
}
