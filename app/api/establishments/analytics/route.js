// app/api/establishments/analytics/route.js - Analytics API for dashboard

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county') || 'washtenaw'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get all establishments for analytics
    const { data: establishments, error } = await supabase
      .from('establishments')
      .select('*')
      .eq('county', county)

    if (error) {
      logger.error('Failed to fetch establishments for analytics', { error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
    }

    // Calculate analytics
    const analytics = {
      totalEstablishments: establishments.length,
      mostCommonViolations: {},
      mostCitedEstablishments: {},
      severityBreakdown: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      recentInspections: 0
    }

    // Process establishments for analytics
    establishments.forEach(est => {
      // Count violations
      if (est.violations && Array.isArray(est.violations)) {
        est.violations.forEach(violation => {
          analytics.mostCommonViolations[violation] = 
            (analytics.mostCommonViolations[violation] || 0) + 1
        })
      }

      // Count citations per establishment
      if (est.name) {
        analytics.mostCitedEstablishments[est.name] = 
          (analytics.mostCitedEstablishments[est.name] || 0) + 1
      }

      // Count by severity
      if (est.severity) {
        const sev = est.severity.toLowerCase()
        if (sev in analytics.severityBreakdown) {
          analytics.severityBreakdown[sev]++
        }
      }

      // Count recent inspections (last 30 days)
      if (est.inspection_date) {
        const inspectionDate = new Date(est.inspection_date)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        if (inspectionDate >= thirtyDaysAgo) {
          analytics.recentInspections++
        }
      }
    })

    // Convert to sorted arrays for top violations and establishments
    analytics.topViolations = Object.entries(analytics.mostCommonViolations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([violation, count]) => ({ violation, count }))

    analytics.topEstablishments = Object.entries(analytics.mostCitedEstablishments)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Clean up intermediate objects
    delete analytics.mostCommonViolations
    delete analytics.mostCitedEstablishments

    return NextResponse.json(analytics)

  } catch (error) {
    logger.error('Unexpected error in analytics endpoint', { 
      error: error.message 
    })
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
