// app/api/tenant-report/download/route.js
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

    const reportFilename = `tenant_report_${stripeSessionId}.pdf`
    const reportPath = join(process.cwd(), 'reports', reportFilename)

    if (!existsSync(reportPath)) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const pdfBuffer = await readFile(reportPath)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Michigan_Tenant_Report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    )
  }
}
