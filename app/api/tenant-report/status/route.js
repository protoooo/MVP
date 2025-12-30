// app/api/tenant-report/status/route.js
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const stripeSessionId = searchParams.get('session_id')

    if (!stripeSessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    // Check status file
    const statusFile = join(process.cwd(), 'reports', `${stripeSessionId}_status.json`)
    
    if (!existsSync(statusFile)) {
      return NextResponse.json({
        status: 'processing',
        progress: 10,
      })
    }

    const statusData = JSON.parse(await readFile(statusFile, 'utf-8'))
    return NextResponse.json(statusData)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { status: 'processing', progress: 10 },
      { status: 200 }
    )
  }
}
