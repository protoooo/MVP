import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeTenantImage } from '@/backend/utils/tenantAnalysis'
import { generateTenantReport } from '@/backend/utils/tenantReportGenerator'
import fs from 'fs'
import path from 'path'
import os from 'os'

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

// Get public URL safely
async function getPublicUrlSafe(bucket, filePath) {
  if (!supabase) return null
  
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data?.publicUrl || null
}

/**
 * Generate tenant condition report from uploaded photos
 * POST /api/tenant/generate-report
 */
export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const tempPaths = []

  try {
    const body = await req.json()
    const { reportId, accessCode, nonVisibleIssues } = body

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
        error: 'Payment not completed' 
      }, { status: 402 })
    }

    // Update status to processing
    await supabase
      .from('tenant_reports')
      .update({ status: 'processing' })
      .eq('id', reportId)

    // Get all photos for this report
    const { data: photos, error: photosError } = await supabase
      .from('tenant_photos')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true })

    if (photosError || !photos || photos.length === 0) {
      await supabase
        .from('tenant_reports')
        .update({ status: 'failed' })
        .eq('id', reportId)
      
      return NextResponse.json({ 
        error: 'No photos found for this report' 
      }, { status: 400 })
    }

    // Ensure buckets exist
    await ensureBucketExists('tenant-photos')
    await ensureBucketExists('tenant-reports')

    const analysisResults = []

    // Analyze each photo
    for (const photo of photos) {
      try {
        // Download photo from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('tenant-photos')
          .download(photo.file_path)

        if (downloadError || !fileData) {
          console.error(`[tenant-generate] Failed to download photo ${photo.id}:`, downloadError)
          continue
        }

        // Save to temp file
        const ext = path.extname(photo.file_path) || '.jpg'
        const tempPath = path.join(os.tmpdir(), `${photo.id}${ext}`)
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)

        // Analyze image
        const analysis = await analyzeTenantImage(tempPath, photo.room_area)
        
        // Update photo with analysis results
        await supabase
          .from('tenant_photos')
          .update({
            analyzed: true,
            violation: !!analysis.violation,
            violation_type: analysis.violation_type,
            severity: analysis.severity,
            confidence: analysis.confidence,
            confidence_level: analysis.confidence_level,
            analysis_data: analysis
          })
          .eq('id', photo.id)

        analysisResults.push({
          media_id: photo.id,
          photo_path: photo.file_path,
          room_area: photo.room_area,
          ...analysis
        })

      } catch (err) {
        console.error(`[tenant-generate] Failed to analyze photo ${photo.id}:`, err)
        analysisResults.push({
          media_id: photo.id,
          photo_path: photo.file_path,
          room_area: photo.room_area,
          violation: null,
          violation_type: 'Unknown',
          severity: 'info',
          confidence: 0,
          confidence_level: 'requires_assessment',
          analyzed: false,
          error: err.message
        })
      }
    }

    // Save non-visible issues if provided
    if (nonVisibleIssues) {
      await supabase
        .from('tenant_non_visible_issues')
        .insert({
          report_id: reportId,
          ...nonVisibleIssues
        })
    }

    // Generate PDF report
    const reportMetadata = {
      reportDate: new Date().toLocaleDateString(),
      tenantIdentifier: report.access_code,
      propertyAddress: report.property_address || 'Not provided',
      totalPhotos: photos.length
    }

    const { jsonReport, pdfBuffer } = await generateTenantReport(
      reportId,
      analysisResults,
      reportMetadata
    )

    // Upload PDF to storage
    const pdfPath = `tenant-reports/${reportId}.pdf`
    await supabase.storage
      .from('tenant-reports')
      .upload(pdfPath, pdfBuffer, { 
        upsert: true, 
        contentType: 'application/pdf' 
      })

    const publicPdfUrl = await getPublicUrlSafe('tenant-reports', pdfPath)

    // Update report with completion status
    await supabase
      .from('tenant_reports')
      .update({
        status: 'completed',
        json_report: jsonReport,
        pdf_path: pdfPath,
        pdf_url: publicPdfUrl,
        report_generated_at: new Date().toISOString()
      })
      .eq('id', reportId)

    // Cleanup temp files
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })

    return NextResponse.json({
      success: true,
      reportId,
      accessCode,
      pdfUrl: publicPdfUrl,
      summary: jsonReport.summary,
      violations_found: jsonReport.summary.violations_found,
      clear_violations: jsonReport.summary.clear_violations,
      likely_issues: jsonReport.summary.likely_issues
    })

  } catch (error) {
    // Cleanup temp files on error
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })

    // Update report status to failed
    if (body?.reportId) {
      await supabase
        .from('tenant_reports')
        .update({ status: 'failed' })
        .eq('id', body.reportId)
        .catch(() => {}) // Ignore errors here
    }
    
    console.error('[tenant-generate] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to generate report' 
    }, { status: 500 })
  }
}
