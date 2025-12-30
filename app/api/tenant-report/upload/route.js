// app/api/tenant-report/upload/route.js
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const photos = formData.getAll('photos')

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos uploaded' },
        { status: 400 }
      )
    }

    if (photos.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 photos allowed' },
        { status: 400 }
      )
    }

    // Create session ID
    const sessionId = uuidv4()
    const uploadDir = join(process.cwd(), 'uploads', sessionId)
    
    // Create upload directory
    await mkdir(uploadDir, { recursive: true })

    // Save all photos
    const savedFiles = []
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const bytes = await photo.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const filename = `photo_${i + 1}_${Date.now()}.${photo.name.split('.').pop()}`
      const filepath = join(uploadDir, filename)
      
      await writeFile(filepath, buffer)
      savedFiles.push({
        filename,
        originalName: photo.name,
        size: photo.size,
      })
    }

    return NextResponse.json({
      sessionId,
      photoCount: savedFiles.length,
      photos: savedFiles,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload photos' },
      { status: 500 }
    )
  }
}
