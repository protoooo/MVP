// app/api/establishments/route.js - API for fetching establishments data

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const severity = searchParams.get('severity') || ''
    const type = searchParams.get('type') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const county = searchParams.get('county') || 'washtenaw'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Build query
    let query = supabase
      .from('establishments')
      .select('*', { count: 'exact' })
      .eq('county', county)
      .order('inspection_date', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (dateFrom) {
      query = query.gte('inspection_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('inspection_date', dateTo)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      logger.error('Failed to fetch establishments', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch establishments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      establishments: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    logger.error('Unexpected error in establishments endpoint', { 
      error: error.message 
    })
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
