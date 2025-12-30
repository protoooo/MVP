import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { extractExifMetadata, validateGpsLocation } from '@/backend/utils/exifMetadata'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

// Helper to ensure bucket exists
async function ensureBucketExists(bucketName) {
  if (!supabase) return false
  
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === bucketName)
  
  if (!bucketExists) {
    await supabase.storage.createBucket(bucketName, { public: true })
  }
  
  return true
}

// Calculate hash of file content for duplicate detection
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Upload photos for tenant report
 * POST /api/tenant/upload-photos
 */
export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const tempPaths = []

  try {
    const formData = await req.formData()
    const reportId = formData.get('reportId')
    const accessCode = formData.get('accessCode')
    const files = formData.getAll('photos')
    const roomAreas = formData.getAll('roomAreas') // Optional room/area tags

    // Validate report ID and access code
    if (!reportId || !accessCode) {
      return NextResponse.json({ 
        error: 'Report ID and access code are required' 
      }, { status: 400 })
    }

    // Verify report exists and payment is complete
    const { data: report, error: reportError } = await supabase
      .from('tenant_reports')
      .select('*')
      .eq('id', reportId)
      .eq('access_code', accessCode)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ 
        error: 'Invalid report ID or access code' 
      }, { status: 404 })
    }

    if (report.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Payment not completed. Please complete payment first.' 
      }, { status: 402 })
    }

    // Check rate limit for uploads
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown'

    const { data: rateLimitCheck } = await supabase
      .rpc('check_rate_limit', {
        p_ip_address: ip,
        p_action_type: 'upload',
        p_max_attempts: 10,
        p_window_minutes: 60
      })

    if (rateLimitCheck && rateLimitCheck.length > 0 && !rateLimitCheck[0].allowed) {
      return NextResponse.json({ 
        error: 'Too many upload attempts. Please try again later.',
        reset_time: rateLimitCheck[0].reset_time
      }, { status: 429 })
    }

    // Validate number of files
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
    }

    if (files.length > 200) {
      return NextResponse.json({ 
        error: 'Maximum 200 photos allowed per report' 
      }, { status: 400 })
    }

    // Check total photos already uploaded
    const { count: existingCount } = await supabase
      .from('tenant_photos')
      .select('*', { count: 'exact', head: true })
      .eq('report_id', reportId)

    if (existingCount + files.length > 200) {
      return NextResponse.json({ 
        error: `Cannot upload ${files.length} photos. Maximum 200 photos total. You have ${existingCount} already uploaded.` 
      }, { status: 400 })
    }

    // Ensure bucket exists
    await ensureBucketExists('tenant-photos')

    const uploadedPhotos = []
    const duplicates = []

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const roomArea = roomAreas[i] || 'general'
      
      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`[tenant-upload] Skipping non-image file: ${file.name}`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`[tenant-upload] File too large: ${file.name}`)
          continue
        }

        const photoId = uuidv4()
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Calculate content hash for duplicate detection
        const contentHash = calculateFileHash(buffer)
        
        // Check for duplicates in this report
        const { data: duplicateCheck } = await supabase
          .from('tenant_photos')
          .select('id')
          .eq('report_id', reportId)
          .eq('content_hash', contentHash)
          .limit(1)

        if (duplicateCheck && duplicateCheck.length > 0) {
          duplicates.push({
            filename: file.name,
            reason: 'Duplicate photo already uploaded to this report'
          })
          continue
        }

        // Check for abuse (same photo used in multiple reports)
        const { data: abuseCheck } = await supabase
          .rpc('check_duplicate_photos', {
            p_content_hash: contentHash,
            p_report_id: reportId,
            p_hours_window: 24
          })

        if (abuseCheck && abuseCheck.length > 0 && abuseCheck[0].is_duplicate) {
          console.warn(`[tenant-upload] Potential abuse: Same photo used in multiple reports`)
          // Log but don't block - could be legitimate (same unit, different tenants)
        }

        // Save to temp file
        const ext = path.extname(file.name) || '.jpg'
        const tempPath = path.join(os.tmpdir(), `${photoId}${ext}`)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)

        // Extract EXIF metadata
        const exifData = await extractExifMetadata(tempPath)
        const serverTimestamp = new Date().toISOString()
        
        // Validate GPS location if available
        let gpsValidation = null
        let metadataWarning = null
        
        if (exifData.latitude && exifData.longitude && report.property_latitude && report.property_longitude) {
          gpsValidation = validateGpsLocation(
            exifData.latitude,
            exifData.longitude,
            parseFloat(report.property_latitude),
            parseFloat(report.property_longitude),
            0.5 // 0.5 mile threshold
          )
          
          if (!gpsValidation.valid) {
            metadataWarning = gpsValidation.warning
          }
        } else if (!exifData.hasExif || !exifData.latitude) {
          metadataWarning = 'Photo does not contain GPS location data. Location will need manual verification.'
        }

        // Upload to storage
        const storagePath = `tenant-photos/${reportId}/${photoId}${ext}`
        const { error: uploadError } = await supabase.storage
          .from('tenant-photos')
          .upload(storagePath, buffer, { 
            upsert: false, 
            contentType: file.type 
          })

        if (uploadError) {
          console.error(`[tenant-upload] Failed to upload file:`, uploadError)
          continue
        }

        // Save photo record with EXIF metadata
        const { data: photoData, error: photoError } = await supabase
          .from('tenant_photos')
          .insert({
            id: photoId,
            report_id: reportId,
            file_path: storagePath,
            file_size: file.size,
            mime_type: file.type,
            room_area: roomArea,
            content_hash: contentHash,
            // EXIF metadata fields
            exif_date_time: exifData.dateTime,
            exif_latitude: exifData.latitude,
            exif_longitude: exifData.longitude,
            exif_make: exifData.make,
            exif_model: exifData.model,
            server_upload_timestamp: serverTimestamp,
            has_exif_metadata: exifData.hasExif,
            gps_validated: gpsValidation?.valid || false,
            gps_distance_miles: gpsValidation?.distance || null,
            metadata_warning: metadataWarning,
            analyzed: false
          })
          .select()
          .single()

        if (!photoError) {
          uploadedPhotos.push({
            id: photoId,
            filename: file.name,
            room_area: roomArea,
            size: file.size,
            hasExif: exifData.hasExif,
            gpsValidated: gpsValidation?.valid || false,
            warning: metadataWarning
          })
        }

      } catch (err) {
        console.error(`[tenant-upload] Error processing file ${i}:`, err)
      }
    }

    // Update report total photos
    await supabase
      .from('tenant_reports')
      .update({ 
        total_photos: existingCount + uploadedPhotos.length 
      })
      .eq('id', reportId)

    // Record upload attempt
    await supabase.rpc('record_rate_limit_attempt', {
      p_ip_address: ip,
      p_action_type: 'upload',
      p_window_minutes: 60
    })

    // Cleanup temp files
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })

    return NextResponse.json({
      success: true,
      uploaded: uploadedPhotos.length,
      duplicates: duplicates.length,
      total_photos: existingCount + uploadedPhotos.length,
      photos: uploadedPhotos,
      duplicate_files: duplicates
    })

  } catch (error) {
    // Cleanup temp files on error
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })
    
    console.error('[tenant-upload] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to upload photos' 
    }, { status: 500 })
  }
}
