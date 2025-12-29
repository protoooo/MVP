import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { ensureBucketExists } from '../storageHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null
const BUCKET_NAME = 'audit-videos'
// TEMP STORAGE DEBUG (remove after verification)
if (supabase) {
  console.log('[TEMP STORAGE DEBUG] Supabase client initialized with URL:', supabaseUrl)
}

async function uploadMedia(filePath, fileBuffer, contentType = 'application/octet-stream') {
  if (!supabase) throw new Error('Supabase is not configured')
  console.log('[DEBUG] Supabase project URL:', supabase.supabaseUrl)
  console.log('[DEBUG] Bucket used for upload:', BUCKET_NAME)
  await ensureBucketExists(BUCKET_NAME, { public: false }, supabase)
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, { upsert: true, contentType })
  if (error) throw error
}

async function authorize(req) {
  const rawKey = req.headers.get('x-api-key') || req.headers.get('authorization') || ''
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim()

  // ✅ BYPASS AUTH for local testing - always return anonymous user
  if (!apiKey) return { id: uuidv4(), isAnonymous: true }

  const { data, error } = await supabase.from('users').select('id').eq('api_key', apiKey).single()
  if (error || !data) {
    // ✅ BYPASS AUTH - return anonymous user instead of null
    return { id: uuidv4(), isAnonymous: true }
  }
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
    const file = formData.get('file')

    if (!sessionId || !file) {
      return NextResponse.json({ error: 'Missing session or file' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    
    // Get file extension
    const fileName = file.name || ''
    const lastDot = fileName.lastIndexOf('.')
    const fileExt = lastDot > 0 ? fileName.slice(lastDot).toLowerCase() : ''
    
    // Validate that only images are accepted
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic']
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/heic']

    if (!allowedExtensions.includes(fileExt) && !allowedMimeTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Please upload photos only (.jpg, .png, .heic). Videos are not supported.' },
        { status: 400 }
      )
    }

    const mediaId = uuidv4()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const objectPath = `media/${sessionId}/${mediaId}${fileExt}`

    await uploadMedia(objectPath, buffer, contentType)

    const mediaRecord = {
      id: mediaId,
      session_id: sessionId,
      url: objectPath,
      type: 'image',
      user_id: user.id,
    }

    const { error } = await supabase.from('media').insert([mediaRecord])
    if (error) throw error

    return NextResponse.json({
      media_id: mediaId,
      path: objectPath,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
