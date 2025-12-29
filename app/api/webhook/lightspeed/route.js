// Lightspeed Webhook Endpoint
// POST /api/webhook/lightspeed - Receive inventory photos and auto-audit
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { analyzeImageBatch } from '@/backend/utils/aiAnalysis'
import { generateReport } from '@/backend/utils/reportGenerator'
import { ensureBucketExists, getPublicUrlSafe } from '@/app/api/upload/storageHelpers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

// Configuration constants
const MAX_IMAGES_PER_WEBHOOK = 100
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30000 // 30 seconds

async function verifyLightspeedWebhook(req, body) {
  // Verify webhook signature (Lightspeed sends X-Lightspeed-Signature header)
  const signature = req.headers.get('x-lightspeed-signature')
  const webhookSecret = process.env.LIGHTSPEED_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.warn('[webhook/lightspeed] Webhook secret not configured, skipping verification')
    return true
  }

  if (!signature) {
    return false
  }

  // Verify HMAC signature
  const crypto = await import('crypto')
  const hmac = crypto.createHmac('sha256', webhookSecret)
  hmac.update(JSON.stringify(body))
  const computedSignature = hmac.digest('hex')

  return signature === computedSignature
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()

    // Verify webhook signature
    const isValid = await verifyLightspeedWebhook(req, body)
    if (!isValid) {
      console.error('[webhook/lightspeed] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { user_id, images, location, event_type } = body

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images array is required and must not be empty' }, { status: 400 })
    }

    // Verify user has Pro subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, tier')
      .eq('user_id', user_id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (!subscription || subscription.tier !== 'pro') {
      return NextResponse.json({ 
        error: 'Pro subscription required',
        message: 'Lightspeed integration requires a Pro tier subscription ($99/mo)'
      }, { status: 403 })
    }

    // Ensure buckets exist
    await Promise.all([
      ensureBucketExists('media', { public: true }, supabase),
      ensureBucketExists('reports', { public: true }, supabase),
    ])

    // Create audit session
    const sessionId = uuidv4()
    await supabase
      .from('audit_sessions')
      .insert([{
        id: sessionId,
        user_id: user_id,
        type: 'lightspeed_webhook',
        area_tags: location ? [location] : ['inventory']
      }])

    // Download and analyze images
    const results = []
    const tempPaths = []

    try {
      for (let i = 0; i < Math.min(images.length, MAX_IMAGES_PER_WEBHOOK); i++) {
        const imageUrl = images[i]
        
        try {
          const imageResponse = await fetch(imageUrl, {
            headers: { 'User-Agent': 'ProtocolLM-Lightspeed/1.0' },
            signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS)
          })

          if (!imageResponse.ok) {
            console.error(`[webhook/lightspeed] Failed to download image: ${imageResponse.status}`)
            continue
          }

          const imageBuffer = await imageResponse.arrayBuffer()
          
          // Save to temp file
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
            user_id: user_id,
            area: location || 'inventory'
          }])
        } catch (err) {
          console.error(`[webhook/lightspeed] Failed to process image ${i}:`, err.message)
          results.push({
            index: i,
            url: imageUrl,
            error: err.message,
            violation: null,
            analyzed: false
          })
        }
      }

      // Analyze images
      if (tempPaths.length > 0) {
        const analysisResults = await analyzeImageBatch(tempPaths)
        
        // Save compliance results
        const insertRows = analysisResults.map((r) => ({
          id: uuidv4(),
          session_id: sessionId,
          user_id: user_id,
          media_id: null,
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

      await supabase.storage
        .from('reports')
        .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })

      await supabase
        .from('reports')
        .upsert({
          session_id: sessionId,
          user_id: user_id,
          json_report: jsonReport,
          pdf_path: pdfPath,
        }, { onConflict: 'session_id' })

      const publicPdfUrl = await getPublicUrlSafe('reports', pdfPath, supabase)

      // Cleanup temp files
      const fs = await import('fs')
      tempPaths.forEach(p => {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        } catch {}
      })

      // Calculate score
      const totalItems = results.length
      const violationItems = results.filter(r => r.violation && r.severity !== 'info').length
      const score = totalItems > 0 ? Math.round(((totalItems - violationItems) / totalItems) * 100) : 100

      // Format violations for response
      const violations = results
        .filter(r => r.violation)
        .map(r => ({
          description: r.violation,
          type: r.violation_type || r.type || 'General',
          severity: r.severity,
          confidence: r.confidence,
          location: r.area || location || 'inventory',
          citation: r.citation
        }))

      return NextResponse.json({
        success: true,
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
    console.error('[webhook/lightspeed] Processing failed:', error)
    return NextResponse.json({ 
      error: 'Processing failed',
      message: error.message 
    }, { status: 500 })
  }
}
