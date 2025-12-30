import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

/**
 * Get tenant report by access code
 * GET /api/tenant/get-report?code=XXXXXXXX
 */
export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const accessCode = searchParams.get('code')

    if (!accessCode) {
      return NextResponse.json({ 
        error: 'Access code is required' 
      }, { status: 400 })
    }

    // Get report by access code
    const { data: report, error: reportError } = await supabase
      .from('tenant_reports')
      .select('*')
      .eq('access_code', accessCode)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ 
        error: 'Report not found' 
      }, { status: 404 })
    }

    // Check if report has expired
    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Report has expired' 
      }, { status: 410 })
    }

    // Update last accessed timestamp
    await supabase
      .from('tenant_reports')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', report.id)

    // Return report data
    return NextResponse.json({
      reportId: report.id,
      accessCode: report.access_code,
      status: report.status,
      pdfUrl: report.pdf_url,
      summary: report.json_report?.summary || {
        total_photos: report.total_photos,
        violations_found: 0,
        clear_violations: 0,
        likely_issues: 0,
        high_severity: 0,
        medium_severity: 0,
        low_severity: 0
      },
      createdAt: report.created_at,
      generatedAt: report.report_generated_at,
      expiresAt: report.expires_at
    })

  } catch (error) {
    console.error('[tenant-get-report] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch report' 
    }, { status: 500 })
  }
}
