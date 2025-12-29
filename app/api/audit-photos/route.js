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
    .select('id, user_id, active')
    .eq('key', apiKey)
    .eq('active', true)
    .maybeSingle()
  
  if (error || !data) return null
  
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
    // Get API key from header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files')
    const location = formData.get('location') || 'general'

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 files per request' }, { status: 400 })
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

    // Process files
    const results = []
    
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

    return NextResponse.json({
      session_id: sessionId,
      score,
      report_url: publicPdfUrl,
      summary: jsonReport.summary,
      analyzed_count: totalItems,
      violation_count: violationItems,
      violations: results.filter(r => r.violation).map(r => ({
        description: r.violation,
        type: r.violation_type,
        severity: r.severity,
        confidence: r.confidence,
        location: r.area
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
