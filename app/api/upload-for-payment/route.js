// API route to upload files before payment
// Stores files in Supabase storage and returns session ID for payment
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { ensureBucketExists } from '@/app/api/upload/storageHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const files = formData.getAll('files')
    const customerEmail = formData.get('email') || null

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 files per report' }, { status: 400 })
    }

    // Ensure media bucket exists
    await ensureBucketExists('media', { public: true }, supabase)

    // Create a temporary session for these files
    const sessionId = uuidv4()
    
    // Upload each file to storage
    const uploadedFiles = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const mediaId = uuidv4()
      const ext = file.name.split('.').pop() || 'jpg'
      const objectPath = `pending/${sessionId}/${mediaId}.${ext}`
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(objectPath, buffer, { 
          upsert: true, 
          contentType: file.type || 'image/jpeg'
        })

      if (uploadError) {
        console.error(`Failed to upload file ${i}:`, uploadError)
        continue
      }

      uploadedFiles.push({
        id: mediaId,
        name: file.name,
        path: objectPath,
        size: file.size,
        type: file.type,
      })
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'Failed to upload any files' }, { status: 500 })
    }

    // Store session info for later processing
    await supabase.from('pending_sessions').insert([{
      id: sessionId,
      files: uploadedFiles,
      customer_email: customerEmail,
      created_at: new Date().toISOString(),
    }])

    return NextResponse.json({
      sessionId,
      uploadedCount: uploadedFiles.length,
      totalFiles: files.length,
    })
  } catch (error) {
    console.error('[upload-for-payment] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
