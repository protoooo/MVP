import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { supabase, uploadFile } from '../utils/storage.js'

async function authorize(req) {
  const rawKey = req.headers.get('x-api-key') || req.headers.get('authorization') || ''
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  if (!apiKey) return null
  const { data, error } = await supabase.from('users').select('id').eq('api_key', apiKey).single()
  if (error || !data) return null
  return data
}

export default async function uploadMedia(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase is not configured' }), { status: 500 })
  }

  try {
    const user = await authorize(req)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const formData = await req.formData()
    const sessionId = formData.get('session_id')
    const area = formData.get('area') || 'general'
    const file = formData.get('file')

    if (!sessionId || !file) {
      return new Response(JSON.stringify({ error: 'Missing session or file' }), { status: 400 })
    }

    // Validate that only images are accepted
    const contentType = file.type || 'application/octet-stream'
    const fileExt = (path.extname(file.name || '') || '').toLowerCase()
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic']
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/heic']

    if (!allowedExtensions.includes(fileExt) && !allowedMimeTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: 'Please upload photos only (.jpg, .png, .heic). Videos are not supported.' }),
        { status: 400 }
      )
    }

    const mediaId = uuidv4()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const objectPath = `media/${sessionId}/${mediaId}${fileExt}`

    await uploadFile('audit-videos', objectPath, buffer, contentType)

    const { error } = await supabase.from('media').insert([
      {
        id: mediaId,
        session_id: sessionId,
        user_id: user.id,
        url: objectPath,
        type: 'image',
        area,
      },
    ])
    if (error) throw error

    return new Response(
      JSON.stringify({
        media_id: mediaId,
        path: objectPath,
        area,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), { status: 500 })
  }
}
