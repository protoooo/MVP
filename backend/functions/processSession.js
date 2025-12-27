import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { supabase, downloadFile, getPublicUrl, uploadFile } from '../utils/storage.js'
import { extractFrames, deduplicateFrames } from '../utils/frameExtractor.js'
import { analyzeImage } from '../utils/aiAnalysis.js'
import { generateReport } from '../utils/reportGenerator.js'

async function authorize(req) {
  const rawKey = req.headers.get('x-api-key') || req.headers.get('authorization') || ''
  const apiKey = rawKey.replace(/^Bearer\s+/i, '').trim()
  if (!apiKey) return null
  const { data, error } = await supabase.from('users').select('id').eq('api_key', apiKey).single()
  if (error || !data) return null
  return data
}

async function downloadToTemp(bucket, filePath) {
  const buffer = await downloadFile(bucket, filePath)
  const filename = path.basename(filePath)
  const destPath = path.join(os.tmpdir(), `${uuidv4()}-${filename}`)
  fs.writeFileSync(destPath, buffer)
  return destPath
}

export default async function processSession(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase is not configured' }), { status: 500 })
  }

  try {
    const user = await authorize(req)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { session_id: sessionId } = await req.json()
    if (!sessionId) return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 })

    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
    if (mediaError) throw mediaError

    const results = []

    const tempPaths = []

    for (const item of media || []) {
      if (item.type === 'video') {
        const videoPath = await downloadToTemp('audit-videos', item.url)
        tempPaths.push(videoPath)
        const frameDir = path.join(os.tmpdir(), `${item.id}-frames`)
        await extractFrames(videoPath, frameDir)
        const frameFiles = fs
          .readdirSync(frameDir)
          .map((f) => path.join(frameDir, f))
          .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'))
        const uniqueFrames = await deduplicateFrames(frameFiles)
        for (const framePath of uniqueFrames) {
          const analysis = await analyzeImage(framePath)
          results.push({ media_id: item.id, ...analysis })
        }
        tempPaths.push(frameDir)
      } else {
        // image
        const imagePath = await downloadToTemp('audit-videos', item.url)
        const analysis = await analyzeImage(imagePath)
        results.push({ media_id: item.id, ...analysis })
        tempPaths.push(imagePath)
      }
    }

    if (results.length) {
      const { error: insertError } = await supabase
        .from('compliance_results')
        .insert(results.map((r) => ({ id: uuidv4(), session_id: sessionId, user_id: user.id, ...r })))
      if (insertError) throw insertError
    }

    const { jsonReport, pdfBuffer } = await generateReport(sessionId, results)
    const pdfPath = `reports/${sessionId}.pdf`
    await uploadFile('audit-videos', pdfPath, pdfBuffer, 'application/pdf')

    // FIXED: Remove .single() from upsert and get first item from array
    const { data: reportRows, error: reportError } = await supabase
      .from('reports')
      .upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          json_report: jsonReport,
          pdf_path: pdfPath,
        },
        { onConflict: 'session_id' },
      )
      .select()
    
    if (reportError) throw reportError
    
    // Get the first (and should be only) row from the result
    const reportRow = reportRows && reportRows.length > 0 ? reportRows[0] : null
    if (!reportRow) throw new Error('Failed to save report')

    const publicPdfUrl = await getPublicUrl('audit-videos', pdfPath)

    const response = new Response(
      JSON.stringify({
        status: 'processed',
        summary: jsonReport.summary,
        results,
        report: { ...reportRow, pdf_url: publicPdfUrl },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )

    // best-effort cleanup
    tempPaths.forEach((p) => {
      try {
        if (fs.existsSync(p)) {
          const stat = fs.statSync(p)
          if (stat.isDirectory()) {
            fs.rmSync(p, { recursive: true, force: true })
          } else {
            fs.unlinkSync(p)
          }
        }
      } catch (cleanupErr) {
        console.error('Cleanup failed', cleanupErr)
      }
    })

    return response
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Processing failed' }), { status: 500 })
  }
}
