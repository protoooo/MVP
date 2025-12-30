import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isExpired } from '@/backend/utils/secretLinks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

/**
 * Get tenant report by secret link
 * GET /api/tenant/report/[secretLink]
 */
export async function GET(req, { params }) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const { secretLink } = params

    if (!secretLink) {
      return NextResponse.json({ error: 'Secret link is required' }, { status: 400 })
    }

    // Fetch report by secret link
    const { data: report, error: reportError } = await supabase
      .from('tenant_reports')
      .select('*')
      .eq('secret_link', secretLink)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ 
        error: 'Report not found. This link may be invalid or expired.' 
      }, { status: 404 })
    }

    // Check if report has expired (48 hours after generation)
    if (report.expires_at && isExpired(report.expires_at)) {
      return NextResponse.json({ 
        error: 'This report has expired. For your privacy, all reports are permanently deleted 48 hours after generation.',
        expired: true
      }, { status: 410 }) // 410 Gone
    }

    // Update last accessed timestamp
    await supabase
      .from('tenant_reports')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', report.id)

    // Return report data (excluding sensitive fields)
    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
        property_address: report.property_address,
        total_photos: report.total_photos,
        pdf_url: report.pdf_url,
        json_report: report.json_report,
        created_at: report.created_at,
        report_generated_at: report.report_generated_at,
        expires_at: report.expires_at,
        access_code: report.access_code
      }
    })

  } catch (error) {
    console.error('[tenant-report-link] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch report' 
    }, { status: 500 })
  }
}
