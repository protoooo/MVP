import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { error: 'Multi-location upgrades are no longer available. Each device requires its own license.' },
    { status: 410 }
  )
}
