import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

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
  
  // Accept the anon key for anonymous users - generate a valid UUID for them
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (apiKey === anonKey) {
    // For anon key, generate a valid UUID so database inserts don't fail
    return { id: uuidv4(), isAnonymous: true }
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

    const formData = await req.formData()
    const sessionId = formData.get('session_id')
    const area = formData.get('area') || 'general'
    const file = formData.get('file')

    if (!sessionId || !file) {
      return NextResponse.json({ error: 'Missing session or file' }, { status: 400 })
    }

    const mediaId = uuidv4()
    const contentType = file.type || 'application/octet-stream'
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Get file extension
    const fileName = file.name || ''
    const lastDot = fileName.lastIndexOf('.')
    const fileExt = lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : ''
    const objectPath = `media/${sessionId}/${mediaId}${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(objectPath, buffer, { upsert: true, contentType })
    
    if (uploadError) throw uploadError

    // Save media record to database - omit user_id for anonymous users
    const mediaRecord = {
      id: mediaId,
      session_id: sessionId,
      url: objectPath,
      type: contentType.startsWith('video') ? 'video' : 'image',
      area,
    }
    if (!user.isAnonymous) {
      mediaRecord.user_id = user.id
    }

    const { error } = await supabase.from('media').insert([mediaRecord])
    if (error) throw error

    return NextResponse.json({
      media_id: mediaId,
      path: objectPath,
      area,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
