import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidPasscode } from '@/lib/passcode'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const passcode = searchParams.get('passcode')

    if (!passcode || !isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: 'Invalid passcode format' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Find session by passcode
    const { data: session, error } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('passcode', passcode)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Passcode not found' },
        { status: 404 }
      )
    }

    // Check if payment was completed
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('session_id', session.id)
      .single()

    if (!payment || payment.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed for this passcode' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
        upload_completed: session.upload_completed,
        pdf_url: session.pdf_url,
        created_at: session.created_at,
        completed_at: session.completed_at,
      }
    })

  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify passcode' },
      { status: 500 }
    )
  }
}
