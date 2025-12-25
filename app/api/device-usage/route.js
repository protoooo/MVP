// app/api/device-usage/route.js - Get device free usage status
import { NextResponse } from 'next/server'
import { getDeviceUsageStatus, getSessionInfoFromRequest, FREE_USAGE_LIMIT } from '@/lib/deviceUsage'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const sessionInfo = getSessionInfoFromRequest(request)
    const status = await getDeviceUsageStatus(sessionInfo)

    return NextResponse.json({
      remaining: status.remaining,
      limit: FREE_USAGE_LIMIT,
      allowed: status.allowed,
      blocked: status.blocked || false
    })
  } catch (error) {
    logger.error('Device usage status check failed', { error: error?.message })
    // Return optimistic response on error (allow usage)
    return NextResponse.json({
      remaining: FREE_USAGE_LIMIT,
      limit: FREE_USAGE_LIMIT,
      allowed: true,
      blocked: false,
      error: true
    })
  }
}
