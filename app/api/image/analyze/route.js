import { NextResponse } from 'next/server'
import { uploadFile } from '../../../../lib/storage.js'
import { analyzeMultipleImages } from '../../../../lib/cohereVision.js'
import { createViolationSummary, deduplicateViolations } from '../../../../lib/violationAnalyzer.js'
import { generateInspectionReport } from '../../../../lib/pdfGenerator.js'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    // Rate limiting
    const rateLimit = checkRateLimit(request, '/api/image/analyze')
    if (!rateLimit.success) {
      console.warn('Rate limit exceeded for image analysis')
      return createRateLimitResponse()
    }

    // Parse multipart form data
    const formData = await request.formData()
    
    // Get session/passcode for tracking
    const passcode = formData.get('passcode')
    const restaurantName = formData.get('restaurantName') || 'Restaurant'
    
    if (!passcode) {
      return NextResponse.json(
        { error: 'Passcode is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // CRITICAL: Verify session exists
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('id, type, status, upload_completed')
      .eq('passcode', passcode)
      .single()

    if (sessionError || !session) {
      console.error('Session verification failed:', sessionError)
      return NextResponse.json(
        { error: 'Invalid passcode' },
        { status: 404 }
      )
    }

    // CRITICAL: Verify session type matches
    if (session.type !== 'image') {
      return NextResponse.json(
        { error: 'This passcode is for video analysis, not image analysis' },
        { status: 400 }
      )
    }

    // CRITICAL: Check if already used
    if (session.upload_completed) {
      return NextResponse.json(
        { error: 'This passcode has already been used' },
        { status: 400 }
      )
    }

    // CRITICAL: Verify payment completed for this session
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('status, amount')
      .eq('session_id', session.id)
      .eq('status', 'succeeded')
      .single()

    if (paymentError || !payment) {
      console.error('Payment verification failed:', paymentError)
      return NextResponse.json(
        { error: 'Payment not completed for this session. Please complete payment first.' },
        { status: 403 }
      )
    }

    console.log(`Payment verified for session ${session.id} - Amount: $${payment.amount / 100}`)
    
    // Get uploaded images
    const imageFiles = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof Blob) {
        imageFiles.push(value)
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      )
    }

    console.log(`Processing ${imageFiles.length} images for analysis`)

    // Upload images to Supabase Storage
    const uploadPromises = imageFiles.map(async (file, index) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileName = `image-${Date.now()}-${index + 1}.jpg`
      const contentType = file.type || 'image/jpeg'
      
      return uploadFile(buffer, fileName, 'analysis-uploads', contentType)
    })

    const uploadResults = await Promise.all(uploadPromises)
    const imageUrls = uploadResults.map(result => result.url)

    console.log(`Uploaded ${imageUrls.length} images to storage`)

    // Analyze images with Cohere Vision
    const analysisResults = await analyzeMultipleImages(
      imageUrls,
      'Analyze this image for Michigan food safety and health code violations.'
    )

    // Aggregate all violations
    let allViolations = []
    analysisResults.forEach(result => {
      if (result.violations && result.violations.length > 0) {
        allViolations.push(...result.violations)
      }
    })

    // Deduplicate similar violations
    allViolations = deduplicateViolations(allViolations)

    // Create violation summary
    const summary = createViolationSummary(allViolations)

    // Generate PDF report
    const pdfResult = await generateInspectionReport({
      restaurantName,
      analysisType: 'image',
      violations: allViolations,
      metadata: {
        imageCount: imageFiles.length,
        analysisDate: new Date().toISOString()
      }
    })

    // Update session in database
    await supabase
      .from('analysis_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_summary: {
          total: summary.total,
          by_severity: summary.by_severity
        },
        pdf_url: pdfResult.pdfUrl,
        upload_completed: true
      })
      .eq('passcode', passcode)

    console.log(`Analysis completed for passcode ${passcode}`)

    // Return results
    return NextResponse.json({
      success: true,
      images_analyzed: imageFiles.length,
      violations: allViolations,
      summary,
      pdf_url: pdfResult.pdfUrl,
      image_results: analysisResults.map(r => ({
        image_url: r.image_url,
        violations: r.violations
      }))
    })

  } catch (error) {
    console.error('Image analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process images',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
