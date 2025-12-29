// Universal Webhook Endpoint for External Systems (Jolt/Kroger/in-house)
// POST /api/webhook/audit
// Accepts: { images: [urls], api_key, location: "fridge" }
// Returns: { violations: [...], score: 85, report_url }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { analyzeImageBatch } from '@/backend/utils/aiAnalysis'
import { generateReport } from '@/backend/utils/reportGenerator'
import { ensureBucketExists, getPublicUrlSafe } from '@/app/api/upload/storageHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

// Rate limiting: 100 requests per hour per API key
const rateLimits = new Map()
const RATE_LIMIT = 100
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(apiKey) {
  const now = Date.now()
  const record = rateLimits.get(apiKey) || { count: 0, resetAt: now + RATE_WINDOW }
  
  if (now > record.resetAt) {
    record.count = 0
    record.resetAt = now + RATE_WINDOW
  }
  
  if (record.count >= RATE_LIMIT) {
    return false
  }
  
  record.count++
  rateLimits.set(apiKey, record)
  return true
}

async function authorizeApiKey(apiKey) {
  if (!apiKey || !supabase) return null
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, active')
    .eq('key', apiKey)
    .eq('active', true)
    .maybeSingle()
  
  if (error || !data) return null
  return data
}

async function downloadImageFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ProtocolLM-Audit/1.0'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }
    
    return await response.arrayBuffer()
  } catch (error) {
    console.error(`[webhook/audit] Failed to download image from ${url}:`, error.message)
    throw error
  }
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { images, api_key, location } = body

    // Validate API key
    const authData = await authorizeApiKey(api_key)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    // Check rate limit
    if (!checkRateLimit(api_key)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        limit: RATE_LIMIT,
        window: '1 hour'
      }, { status: 429 })
    }

    // Validate images array
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images array is required and must not be empty' }, { status: 400 })
    }

    if (images.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 images per request' }, { status: 400 })
    }

    // Ensure buckets exist
    await Promise.all([
      ensureBucketExists('media', { public: true }, supabase),
      ensureBucketExists('reports', { public: true }, supabase),
    ])

    // Create session
    const sessionId = uuidv4()
    const { error: sessionError } = await supabase
      .from('audit_sessions')
      .insert([{
        id: sessionId,
        user_id: authData.user_id,
        type: 'webhook',
        area_tags: location ? [location] : []
      }])

    if (sessionError) {
      console.error('[webhook/audit] Session creation failed:', sessionError)
      return NextResponse.json({ error: 'Failed to create audit session' }, { status: 500 })
    }

    // Download and analyze images
    const results = []
    const tempPaths = []

    try {
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i]
        
        try {
          // Download image
          const imageBuffer = await downloadImageFromUrl(imageUrl)
          
          // Save to temp file for analysis
          const tempPath = `/tmp/${uuidv4()}.jpg`
          const fs = await import('fs')
          fs.writeFileSync(tempPath, Buffer.from(imageBuffer))
          tempPaths.push(tempPath)
          
          // Store media reference
          const mediaId = uuidv4()
          const objectPath = `media/${sessionId}/${mediaId}.jpg`
          
          await supabase.storage
            .from('media')
            .upload(objectPath, Buffer.from(imageBuffer), { 
              upsert: true, 
              contentType: 'image/jpeg' 
            })
          
          await supabase.from('media').insert([{
            id: mediaId,
            session_id: sessionId,
            url: objectPath,
            type: 'image',
            user_id: authData.user_id,
            area: location || 'general'
          }])
          
        } catch (downloadError) {
          console.error(`[webhook/audit] Failed to process image ${i}:`, downloadError.message)
          results.push({
            index: i,
            url: imageUrl,
            error: downloadError.message,
            violation: null,
            analyzed: false
          })
        }
      }

      // Analyze all valid images
      if (tempPaths.length > 0) {
        const analysisResults = await analyzeImageBatch(tempPaths)
        
        // Save compliance results
        const insertRows = analysisResults.map((r, idx) => ({
          id: uuidv4(),
          session_id: sessionId,
          user_id: authData.user_id,
          media_id: null, // Will be linked separately
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
        
        results.push(...analysisResults)
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

      // Get public URL
      const publicPdfUrl = await getPublicUrlSafe('reports', pdfPath, supabase)

      // Calculate overall score (0-100)
      const totalItems = results.length
      const violationItems = results.filter(r => r.violation && r.severity !== 'info').length
      const score = totalItems > 0 ? Math.round(((totalItems - violationItems) / totalItems) * 100) : 100

      // Cleanup temp files
      const fs = await import('fs')
      tempPaths.forEach(p => {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        } catch {}
      })

      // Format violations for response
      const violations = results
        .filter(r => r.violation)
        .map(r => ({
          description: r.violation,
          type: r.violation_type || r.type || 'General',
          severity: r.severity,
          confidence: r.confidence,
          location: r.area || location || 'general',
          citation: r.citation
        }))

      return NextResponse.json({
        session_id: sessionId,
        violations,
        score,
        report_url: publicPdfUrl,
        summary: jsonReport.summary,
        analyzed_count: totalItems,
        violation_count: violationItems
      })

    } catch (processingError) {
      // Cleanup on error
      const fs = await import('fs')
      tempPaths.forEach(p => {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        } catch {}
      })
      throw processingError
    }

  } catch (error) {
    console.error('[webhook/audit] Processing failed:', error)
    return NextResponse.json({ 
      error: 'Processing failed',
      message: error.message 
    }, { status: 500 })
  }
}
