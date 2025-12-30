import { NextResponse } from 'next/server'
import { generateInspectionReport } from '../../../../lib/pdfGenerator.js'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json()
    
    const {
      restaurantName = 'Restaurant',
      analysisType = 'image',
      violations = [],
      timeline = [],
      metadata = {},
      passcode = null
    } = body

    // Validate input
    if (!violations || (!Array.isArray(violations) && !Array.isArray(timeline))) {
      return NextResponse.json(
        { error: 'Invalid violations or timeline data' },
        { status: 400 }
      )
    }

    console.log(`Generating PDF report for ${restaurantName}`)

    // Generate PDF report
    const pdfResult = await generateInspectionReport({
      restaurantName,
      analysisType,
      violations,
      timeline,
      metadata
    })

    console.log(`PDF generated: ${pdfResult.pdfUrl}`)

    // Update session in database if passcode provided
    if (passcode) {
      const supabase = getSupabaseClient()
      await supabase
        .from('analysis_sessions')
        .update({
          pdf_url: pdfResult.pdfUrl,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('passcode', passcode)
    }

    // Return PDF URL
    return NextResponse.json({
      success: true,
      pdf_url: pdfResult.pdfUrl,
      pdf_path: pdfResult.pdfPath
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
