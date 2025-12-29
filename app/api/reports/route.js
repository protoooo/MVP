// Public API for report retrieval
// GET /api/reports - Get user's report history
// GET /api/reports?session_id=... - Get specific report

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicUrlSafe } from '@/app/api/upload/storageHelpers'

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

export async function GET(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20', 10), 100)

    if (sessionId) {
      // Get specific report
      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', authData.user_id)
        .single()

      if (error || !report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }

      // Get public PDF URL
      const pdfUrl = report.pdf_path 
        ? await getPublicUrlSafe('reports', report.pdf_path, supabase) 
        : null

      return NextResponse.json({
        report: {
          ...report,
          pdf_url: pdfUrl
        }
      })
    } else {
      // List all reports for user
      const offset = (page - 1) * perPage

      const { data: reports, error, count } = await supabase
        .from('reports')
        .select('session_id, created_at, json_report', { count: 'exact' })
        .eq('user_id', authData.user_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1)

      if (error) throw error

      // Get PDF URLs for each report
      const reportsWithUrls = await Promise.all(
        (reports || []).map(async (r) => {
          const pdfPath = `reports/${r.session_id}.pdf`
          const pdfUrl = await getPublicUrlSafe('reports', pdfPath, supabase)
          
          return {
            session_id: r.session_id,
            created_at: r.created_at,
            summary: r.json_report?.summary || {},
            pdf_url: pdfUrl
          }
        })
      )

      return NextResponse.json({
        reports: reportsWithUrls,
        pagination: {
          page,
          per_page: perPage,
          total: count,
          total_pages: Math.ceil((count || 0) / perPage)
        }
      })
    }
  } catch (error) {
    console.error('[reports] GET failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
