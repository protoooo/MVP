import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import os from 'os'

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

async function downloadFile(bucket, filePath) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath)
  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function downloadToTemp(bucket, filePath) {
  const buffer = await downloadFile(bucket, filePath)
  const filename = path.basename(filePath)
  const destPath = path.join(os.tmpdir(), `${uuidv4()}-${filename}`)
  fs.writeFileSync(destPath, buffer)
  return destPath
}

// TODO: Implement actual image analysis using an AI/ML service
// This is a placeholder that returns neutral results until real analysis is integrated
async function analyzeImage(imagePath) {
  // In production, this would call an AI service for compliance analysis
  // For now, return a pending/neutral result to indicate analysis is needed
  return {
    findings: [],
    compliant: null, // null indicates pending/no analysis performed
    analyzed_at: new Date().toISOString(),
    notes: 'Pending manual review - automated analysis not yet configured',
  }
}

// TODO: Use pdfkit or similar library for proper PDF generation
// This is a placeholder that generates a text-based report
async function generateReport(sessionId, results) {
  const summary = {
    session_id: sessionId,
    total_media: results.length,
    compliant_count: results.filter((r) => r.compliant === true).length,
    pending_count: results.filter((r) => r.compliant === null).length,
    violation_count: results.filter((r) => r.compliant === false).length,
    generated_at: new Date().toISOString(),
  }

  const jsonReport = {
    summary,
    results,
  }

  // Placeholder text report - in production, use pdfkit for proper PDF generation
  const reportContent = `Health Inspection Report
Session: ${sessionId}
Generated: ${summary.generated_at}

Summary:
- Total Media Analyzed: ${summary.total_media}
- Compliant: ${summary.compliant_count}
- Pending Review: ${summary.pending_count}
- Violations Found: ${summary.violation_count}

Results:
${results.map((r, i) => {
  const status = r.compliant === true ? 'Compliant' : r.compliant === false ? 'Violation Found' : 'Pending Review'
  return `${i + 1}. Media ${r.media_id}: ${status}`
}).join('\n')}

Note: This is a preliminary report. Full PDF generation will be available in a future update.
`
  // Store as text for now - will be converted to proper PDF in production
  const pdfBuffer = Buffer.from(reportContent, 'utf-8')

  return { jsonReport, pdfBuffer }
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

    const body = await req.json()
    const sessionId = body.session_id
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    // Get all media for this session
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
    if (mediaError) throw mediaError

    const results = []
    const tempPaths = []

    for (const item of media || []) {
      try {
        const imagePath = await downloadToTemp('media', item.url)
        tempPaths.push(imagePath)
        const analysis = await analyzeImage(imagePath)
        results.push({ media_id: item.id, ...analysis })
      } catch (downloadErr) {
        console.error('Download error for media item:', item.id, downloadErr)
        // Mark as failed/uncertain when download fails - don't assume compliant
        results.push({
          media_id: item.id,
          compliant: null, // null indicates analysis could not be performed
          findings: [],
          notes: 'Unable to analyze - file download failed',
          analyzed_at: new Date().toISOString(),
          error: true,
        })
      }
    }

    // Save compliance results
    if (results.length) {
      const { error: insertError } = await supabase
        .from('compliance_results')
        .insert(results.map((r) => ({ id: uuidv4(), session_id: sessionId, user_id: user.id, ...r })))
      if (insertError) {
        console.error('Failed to insert compliance results:', insertError)
      }
    }

    // Generate report
    const { jsonReport, pdfBuffer } = await generateReport(sessionId, results)
    const pdfPath = `reports/${sessionId}.pdf`

    // Upload PDF to storage
    const { error: pdfUploadError } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })
    if (pdfUploadError) {
      console.error('PDF upload error:', pdfUploadError)
    }

    // Save report to database
    const { data: reportRow, error: reportError } = await supabase
      .from('reports')
      .upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          json_report: jsonReport,
          pdf_path: pdfPath,
        },
        { onConflict: 'session_id' }
      )
      .select()
      .single()
    if (reportError) {
      console.error('Report save error:', reportError)
    }

    // Get public URL for PDF
    const { data: urlData } = supabase.storage.from('reports').getPublicUrl(pdfPath)
    const publicPdfUrl = urlData?.publicUrl

    // Cleanup temp files
    tempPaths.forEach((p) => {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p)
        }
      } catch (cleanupErr) {
        console.error('Cleanup failed', cleanupErr)
      }
    })

    return NextResponse.json({
      status: 'processed',
      summary: jsonReport.summary,
      results,
      report: { ...reportRow, pdf_url: publicPdfUrl },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 })
  }
}
