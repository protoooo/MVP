import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { error: 'Multi-location invites have been retired. Device-based licensing requires one subscription per device.' },
    { status: 410 }
  )
}
