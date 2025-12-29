// Public API for photo analysis
// POST /api/audit-photos - Analyze photos (same logic as webhook but with files)
// Requires API key authentication

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { analyzeImage } from '@/backend/utils/aiAnalysis'
import { generateReport } from '@/backend/utils/reportGenerator'
import { ensureBucketExists, getPublicUrlSafe } from '@/app/api/upload/storageHelpers'
import fs from 'fs'
import path from 'path'
import os from 'os'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

async function authorizeApiKey(apiKey) {
  if (!apiKey || !supabase) return null
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, active, remaining_credits, customer_email')
    .eq('key', apiKey)
    .eq('active', true)
    .maybeSingle()
  
  if (error || !data) return null
  
  // Check if credits are available
  if (data.remaining_credits <= 0) {
    return { ...data, insufficient_credits: true }
  }
  
  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
  
  return data
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const tempPaths = []

  try {
    // Get API key from header or body
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }
    
    if (authData.insufficient_credits) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'
      return NextResponse.json({ 
        error: 'Insufficient credits',
        remaining_credits: 0,
        buy_more: `${baseUrl}#pricing`
      }, { status: 402 })
    }

    // Support both JSON payload and multipart/form-data
    const contentType = req.headers.get('content-type') || ''
    let files = []
    let location = 'general'
    let imageUrls = []

    if (contentType.includes('application/json')) {
      // JSON payload with image URLs
      const body = await req.json()
      imageUrls = body.images || []
      location = body.location || 'general'
      
      if (!apiKey && body.api_key) {
        // Re-authorize with api_key from body if not in header
        const authData2 = await authorizeApiKey(body.api_key)
        if (!authData2 || authData2.insufficient_credits) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'
          return NextResponse.json({ 
            error: 'Invalid API key or insufficient credits',
            buy_more: `${baseUrl}#pricing`
          }, { status: authData2?.insufficient_credits ? 402 : 401 })
        }
      }
      
      if (!imageUrls || imageUrls.length === 0) {
        return NextResponse.json({ error: 'No images provided' }, { status: 400 })
      }
    } else {
      // Multipart form-data
      const formData = await req.formData()
      files = formData.getAll('files')
      location = formData.get('location') || 'general'

      if (!files || files.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 })
      }
    }

    const totalImages = imageUrls.length + files.length
    if (totalImages === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 })
    }

    if (totalImages > 200) {
      return NextResponse.json({ error: 'Maximum 200 images per request' }, { status: 400 })
    }
    
    // Check if enough credits for this request
    if (authData.remaining_credits < totalImages) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'
      return NextResponse.json({ 
        error: 'Insufficient credits for this request',
        remaining_credits: authData.remaining_credits,
        required_credits: totalImages,
        buy_more: `${baseUrl}#pricing`
      }, { status: 402 })
    }

    // Ensure buckets exist
    await Promise.all([
      ensureBucketExists('media', { public: true }, supabase),
      ensureBucketExists('reports', { public: true }, supabase),
    ])

    // Create session
    const sessionId = uuidv4()
    await supabase
      .from('audit_sessions')
      .insert([{
        id: sessionId,
        user_id: authData.user_id,
        type: 'api',
        area_tags: [location]
      }])

    // Process files and URLs
    const results = []
    
    // Process uploaded files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const mediaId = uuidv4()
      
      try {
        // Save to temp file
        const ext = path.extname(file.name) || '.jpg'
        const tempPath = path.join(os.tmpdir(), `${uuidv4()}${ext}`)
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)

        // Upload to storage
        const objectPath = `media/${sessionId}/${mediaId}${ext}`
        await supabase.storage
          .from('media')
          .upload(objectPath, buffer, { upsert: true, contentType: file.type })

        // Save media record
        await supabase.from('media').insert([{
          id: mediaId,
          session_id: sessionId,
          url: objectPath,
          type: 'image',
          user_id: authData.user_id,
          area: location
        }])

        // Analyze image
        const analysis = await analyzeImage(tempPath)
        results.push({
          media_id: mediaId,
          media_type: 'image',
          area: location,
          ...analysis
        })
      } catch (err) {
        console.error(`[audit-photos] Failed to process file ${i}:`, err)
        results.push({
          media_id: mediaId,
          media_type: 'image',
          area: location,
          violation: null,
          findings: [],
          severity: 'info',
          confidence: 0,
          analyzed: false,
          error: err.message
        })
      }
    }

    // Process image URLs
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      const mediaId = uuidv4()
      
      try {
        // Download image from URL
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Detect extension from URL or content-type
        const urlPath = new URL(imageUrl).pathname
        let ext = path.extname(urlPath) || '.jpg'
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('png')) ext = '.png'
        else if (contentType?.includes('jpeg') || contentType?.includes('jpg')) ext = '.jpg'
        
        // Save to temp file
        const tempPath = path.join(os.tmpdir(), `${uuidv4()}${ext}`)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)

        // Upload to storage
        const objectPath = `media/${sessionId}/${mediaId}${ext}`
        await supabase.storage
          .from('media')
          .upload(objectPath, buffer, { upsert: true, contentType: contentType || 'image/jpeg' })

        // Save media record
        await supabase.from('media').insert([{
          id: mediaId,
          session_id: sessionId,
          url: objectPath,
          type: 'image',
          user_id: authData.user_id,
          area: location
        }])

        // Analyze image
        const analysis = await analyzeImage(tempPath)
        results.push({
          media_id: mediaId,
          media_type: 'image',
          area: location,
          image_url: imageUrl,
          ...analysis
        })
      } catch (err) {
        console.error(`[audit-photos] Failed to process URL ${i}:`, err)
        results.push({
          media_id: mediaId,
          media_type: 'image',
          area: location,
          image_url: imageUrl,
          violation: null,
          findings: [],
          severity: 'info',
          confidence: 0,
          analyzed: false,
          error: err.message
        })
      }
    }

    // Save compliance results
    const insertRows = results.map(r => ({
      id: uuidv4(),
      session_id: sessionId,
      user_id: authData.user_id,
      media_id: r.media_id,
      violation: r.violation,
      violation_type: r.violation_type || r.type || 'General',
      severity: r.severity || 'info',
      confidence: r.confidence || 0,
      citation: r.citation || null,
      findings: r.findings || [],
      citations: r.citations || [],
    }))

    if (insertRows.length > 0) {
      await supabase.from('compliance_results').insert(insertRows)
    }

    // Generate report
    const { jsonReport, pdfBuffer } = await generateReport(sessionId, results)
    const pdfPath = `reports/${sessionId}.pdf`

    // Upload PDF
    await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })

    // Save report
    await supabase
      .from('reports')
      .upsert({
        session_id: sessionId,
        user_id: authData.user_id,
        json_report: jsonReport,
        pdf_path: pdfPath,
      }, { onConflict: 'session_id' })

    const publicPdfUrl = await getPublicUrlSafe('reports', pdfPath, supabase)
    
    // Deduct credits for processed images
    const creditsUsed = totalImages
    await supabase
      .from('api_keys')
      .update({ 
        remaining_credits: authData.remaining_credits - creditsUsed,
        total_used: (authData.total_used || 0) + creditsUsed
      })
      .eq('id', authData.id)

    // Cleanup temp files
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })

    // Calculate score
    const totalItems = results.length
    const violationItems = results.filter(r => r.violation && r.severity !== 'info').length
    const score = totalItems > 0 ? Math.round(((totalItems - violationItems) / totalItems) * 100) : 100

    // Extract Michigan code references from citations
    const michiganCodeRefs = []
    results.forEach(r => {
      if (r.citations && Array.isArray(r.citations)) {
        r.citations.forEach(citation => {
          // Extract code reference like "3-501.16" from citation text
          const codeMatch = citation.match(/(\d+-\d+\.\d+)/g)
          if (codeMatch) {
            michiganCodeRefs.push(...codeMatch)
          }
        })
      }
      // Also check citation field (singular)
      if (r.citation) {
        const codeMatch = r.citation.match(/(\d+-\d+\.\d+)/g)
        if (codeMatch) {
          michiganCodeRefs.push(...codeMatch)
        }
      }
    })

    // Return format matching specification
    return NextResponse.json({
      violations: results.filter(r => r.violation).map(r => r.violation),
      score,
      michigan_code_refs: [...new Set(michiganCodeRefs)], // Remove duplicates
      // Additional useful data
      session_id: sessionId,
      report_url: publicPdfUrl,
      summary: jsonReport.summary,
      analyzed_count: totalItems,
      violation_count: violationItems,
      credits_used: creditsUsed,
      remaining_credits: authData.remaining_credits - creditsUsed,
      detailed_violations: results.filter(r => r.violation).map(r => ({
        description: r.violation,
        type: r.violation_type,
        severity: r.severity,
        confidence: r.confidence,
        location: r.area,
        citations: r.citations || []
      }))
    })

  } catch (error) {
    // Cleanup on error
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })
    console.error('[audit-photos] Processing failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
