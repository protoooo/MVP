import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { error: 'Multi-location purchasing has been discontinued. Please purchase individual device licenses instead.' },
    { status: 410 }
  )
}
