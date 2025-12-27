import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { ensureBucketExists, getPublicUrlSafe } from '../storageHelpers'
import { analyzeImage, analyzeImageBatch } from '../../../../backend/utils/aiAnalysis.js'
import { generateReport } from '../../../../backend/utils/reportGenerator.js'
import { extractFrames, deduplicateFrames } from '../../../../backend/utils/frameExtractor.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
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

// Clean up temporary files and directories
function cleanupTemp(paths) {
  paths.forEach((p) => {
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
      console.error('Cleanup failed:', cleanupErr.message)
    }
  })
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 })
  }

  const tempPaths = []

  try {
    await Promise.all([
      ensureBucketExists('media', { public: true }, supabase),
      ensureBucketExists('reports', { public: true }, supabase),
    ])

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
    // For anonymous users, only filter by session_id (no user_id to match)
    let mediaQuery = supabase
      .from('media')
      .select('*')
      .eq('session_id', sessionId)
    
    if (!user.isAnonymous) {
      mediaQuery = mediaQuery.eq('user_id', user.id)
    }
    
    const { data: media, error: mediaError } = await mediaQuery
    if (mediaError) throw mediaError

    if (!media || media.length === 0) {
      return NextResponse.json({ 
        error: 'No media found for this session',
        session_id: sessionId 
      }, { status: 404 })
    }

    const results = []

    for (const item of media || []) {
      try {
        // Determine bucket based on media type
        const bucket = item.type === 'video' ? 'audit-videos' : 'media'
        
        if (item.type === 'video') {
          // Video processing: extract frames, deduplicate, and analyze
          console.log(`[processSession] Processing video: ${item.id}`)
          
          const videoPath = await downloadToTemp(bucket, item.url)
          tempPaths.push(videoPath)
          
          // Create frame output directory
          const frameDir = path.join(os.tmpdir(), `${item.id}-frames`)
          tempPaths.push(frameDir)
          
          // Extract frames from video (1 frame per second)
          try {
            await extractFrames(videoPath, frameDir)
          } catch (extractErr) {
            console.error(`[processSession] Frame extraction failed for video ${item.id}:`, extractErr.message)
            results.push({
              media_id: item.id,
              media_type: 'video',
              area: item.area || 'general',
              violation: null,
              findings: [],
              citations: [],
              severity: 'info',
              confidence: 0,
              analyzed: false,
              error: `Frame extraction failed: ${extractErr.message}`
            })
            continue
          }
          
          // Get all extracted frame files
          const frameFiles = fs
            .readdirSync(frameDir)
            .map((f) => path.join(frameDir, f))
            .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'))
            .sort() // Ensure chronological order
          
          if (frameFiles.length === 0) {
            console.warn(`[processSession] No frames extracted from video ${item.id}`)
            results.push({
              media_id: item.id,
              media_type: 'video',
              area: item.area || 'general',
              violation: null,
              findings: [],
              citations: [],
              severity: 'info',
              confidence: 0,
              analyzed: false,
              error: 'No frames could be extracted from video'
            })
            continue
          }
          
          console.log(`[processSession] Extracted ${frameFiles.length} frames from video ${item.id}`)
          
          // Deduplicate frames using perceptual hashing
          let uniqueFrames
          try {
            uniqueFrames = await deduplicateFrames(frameFiles)
          } catch (dedupErr) {
            console.error(`[processSession] Frame deduplication failed for video ${item.id}:`, dedupErr.message)
            // Fall back to using all frames if deduplication fails
            uniqueFrames = frameFiles
          }
          console.log(`[processSession] ${uniqueFrames.length} unique frames after deduplication`)
          
          // Analyze unique frames in batch for efficiency
          const frameAnalyses = await analyzeImageBatch(uniqueFrames)
          
          // Add results with frame reference
          frameAnalyses.forEach((analysis, idx) => {
            results.push({
              media_id: item.id,
              media_type: 'video',
              frame_number: idx + 1,
              total_frames: uniqueFrames.length,
              area: item.area || 'general',
              ...analysis
            })
          })
          
        } else {
          // Image processing: analyze directly
          console.log(`[processSession] Processing image: ${item.id}`)
          
          const imagePath = await downloadToTemp(bucket, item.url)
          tempPaths.push(imagePath)
          
          const analysis = await analyzeImage(imagePath)
          results.push({
            media_id: item.id,
            media_type: 'image',
            area: item.area || 'general',
            ...analysis
          })
        }
      } catch (downloadErr) {
        console.error('Processing error for media item:', item.id, downloadErr.message)
        // Mark as failed/uncertain when processing fails
        results.push({
          media_id: item.id,
          media_type: item.type,
          area: item.area || 'general',
          violation: null,
          findings: [],
          citations: [],
          severity: 'info',
          confidence: 0,
          analyzed: false,
          error: downloadErr.message || 'Processing failed'
        })
      }
    }

    // Save compliance results
    if (results.length) {
      // For anonymous users, omit user_id from the insert
      const insertRows = results.map((r) => {
        const row = { 
          id: uuidv4(), 
          session_id: sessionId,
          media_id: r.media_id,
          violation: r.violation,
          violation_type: r.violation_type || r.type,
          category: r.category,
          severity: r.severity,
          confidence: r.confidence,
          citation: r.citation,
          findings: r.findings,
          citations: r.citations,
          analyzed: r.analyzed,
          error: r.error || null
        }
        if (!user.isAnonymous) {
          row.user_id = user.id
        }
        return row
      })
      
      const { error: insertError } = await supabase
        .from('compliance_results')
        .insert(insertRows)
      if (insertError) {
        console.error('Failed to insert compliance results:', insertError.message)
      }
    }

    // Generate professional report with citations
    const { jsonReport, pdfBuffer } = await generateReport(sessionId, results)
    const pdfPath = `reports/${sessionId}.pdf`

    // Upload PDF to storage
    const { error: pdfUploadError } = await supabase.storage
      .from('reports')
      .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' })
    if (pdfUploadError) {
      console.error('PDF upload error:', pdfUploadError.message)
    }

    // Save report to database
    // For anonymous users, omit user_id from the upsert
    const reportData = {
      session_id: sessionId,
      json_report: jsonReport,
      pdf_path: pdfPath,
    }
    if (!user.isAnonymous) {
      reportData.user_id = user.id
    }
    
    const { data: reportRow, error: reportError } = await supabase
      .from('reports')
      .upsert(reportData, { onConflict: 'session_id' })
      .select()
      .single()
    if (reportError) {
      console.error('Report save error:', reportError.message)
    }

    // Get public URL for PDF
    const publicPdfUrl = await getPublicUrlSafe('reports', pdfPath, supabase)

    // Cleanup temp files
    cleanupTemp(tempPaths)

    return NextResponse.json({
      status: 'processed',
      summary: jsonReport.summary,
      results,
      report: { ...reportRow, pdf_url: publicPdfUrl },
    })
  } catch (err) {
    // Cleanup on error
    cleanupTemp(tempPaths)
    console.error('[processSession] Error:', err.message)
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 })
  }
}
