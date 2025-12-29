// API route to check the status of a one-off report
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const reportId = searchParams.get('report_id')

    if (!reportId) {
      return NextResponse.json({ error: 'Missing report_id' }, { status: 400 })
    }

    // Check report status
    const { data: report, error } = await supabase
      .from('one_off_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get report URL if completed
    let reportUrl = null
    if (report.status === 'completed' && report.session_id) {
      const pdfPath = `reports/${report.session_id}.pdf`
      const { data: urlData } = await supabase.storage
        .from('reports')
        .createSignedUrl(pdfPath, 3600) // 1 hour expiry

      reportUrl = urlData?.signedUrl || null
    }

    return NextResponse.json({
      status: report.status,
      reportUrl,
      sessionId: report.session_id,
    })
  } catch (error) {
    console.error('[check-report] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check report status' },
      { status: 500 }
    )
  }
}
