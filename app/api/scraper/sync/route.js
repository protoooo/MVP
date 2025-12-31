// app/api/scraper/sync/route.js - Sync scraper data to database

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for large imports

export async function POST(request) {
  try {
    const { records } = await request.json()

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected array of records.' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Transform records to match our schema
    const establishments = records.map(record => ({
      county: record.county || 'washtenaw',
      name: record.business_name,
      address: record.address,
      type: record.type || null,
      inspection_date: record.inspection_date || null,
      severity: record.severity || null,
      violations: record.violations ? 
        (Array.isArray(record.violations) ? record.violations : [record.violations]) : 
        [],
      notes: record.notes ? 
        (Array.isArray(record.notes) ? record.notes : [record.notes]) : 
        []
    }))

    // Batch insert records
    const { data, error } = await supabase
      .from('establishments')
      .insert(establishments)
      .select()

    if (error) {
      logger.error('Failed to sync establishments', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to sync data to database', details: error.message },
        { status: 500 }
      )
    }

    logger.info('Successfully synced establishments', { count: data.length })

    return NextResponse.json({
      success: true,
      count: data.length,
      message: `Successfully synced ${data.length} establishments`
    })

  } catch (error) {
    logger.error('Unexpected error in scraper sync endpoint', { 
      error: error.message 
    })
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
