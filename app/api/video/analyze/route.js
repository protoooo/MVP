import { NextResponse } from 'next/server'
import { uploadFile } from '../../../../lib/storage.js'
import { analyzeMultipleImages } from '../../../../lib/cohereVision.js'
import { extractFrames, cleanupFrames, getVideoMetadata } from '../../../../lib/videoProcessor.js'
import { createViolationSummary, deduplicateViolations } from '../../../../lib/violationAnalyzer.js'
import { generateInspectionReport } from '../../../../lib/pdfGenerator.js'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rateLimit'
import fs from 'fs/promises'
import { nanoid } from 'nanoid'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  let tempVideoPath = null
  let framesDir = null

  try {
    // Rate limiting
    const rateLimit = checkRateLimit(request, '/api/video/analyze')
    if (!rateLimit.success) {
      console.warn('Rate limit exceeded for video analysis')
      return createRateLimitResponse()
    }

    // Parse multipart form data
    const formData = await request.formData()
    
    // Get session/passcode for tracking
    const passcode = formData.get('passcode')
    const restaurantName = formData.get('restaurantName') || 'Restaurant'
    const framesPerSecond = parseFloat(formData.get('framesPerSecond') || '1')
    
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
    if (session.type !== 'video') {
      return NextResponse.json(
        { error: 'This passcode is for image analysis, not video analysis' },
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
    
    // Get uploaded video
    const videoFile = formData.get('video')
    
    if (!videoFile || !(videoFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      )
    }

    console.log('Processing video for analysis')

    // Save video to temporary file
    tempVideoPath = `/tmp/video-${nanoid()}.mp4`
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    await fs.writeFile(tempVideoPath, videoBuffer)

    // Upload video to Supabase Storage
    const videoUploadResult = await uploadFile(
      videoBuffer,
      `video-${Date.now()}.mp4`,
      'analysis-uploads',
      videoFile.type || 'video/mp4'
    )

    console.log(`Video uploaded to: ${videoUploadResult.url}`)

    // Get video metadata
    const metadata = await getVideoMetadata(tempVideoPath)
    console.log(`Video metadata:`, metadata)

    // Extract frames from video
    console.log(`Extracting frames at ${framesPerSecond} fps`)
    const { frames, frameCount, tempDir } = await extractFrames(tempVideoPath, framesPerSecond)
    framesDir = tempDir

    console.log(`Extracted ${frameCount} frames`)

    // Upload frames to storage and prepare for analysis
    const frameUploadPromises = frames.map(async (frame) => {
      const frameBuffer = await fs.readFile(frame.path)
      const uploadResult = await uploadFile(
        frameBuffer,
        `frame-${Date.now()}-${frame.frameNumber}.jpg`,
        'analysis-uploads',
        'image/jpeg'
      )
      return {
        ...frame,
        url: uploadResult.url
      }
    })

    const uploadedFrames = await Promise.all(frameUploadPromises)
    const frameUrls = uploadedFrames.map(f => f.url)

    console.log(`Analyzing ${frameUrls.length} frames`)

    // Analyze frames with Cohere Vision (in batches)
    const frameAnalysisResults = await analyzeMultipleImages(
      frameUrls,
      'Analyze this video frame for Michigan food safety and health code violations.'
    )

    // Build timeline with violations
    const timeline = []
    uploadedFrames.forEach((frame, index) => {
      const analysisResult = frameAnalysisResults[index]
      
      if (analysisResult && analysisResult.violations && analysisResult.violations.length > 0) {
        timeline.push({
          timestamp: frame.timestamp,
          frameNumber: frame.frameNumber,
          violations: analysisResult.violations
        })
      }
    })

    // Aggregate all violations across all frames
    let allViolations = []
    frameAnalysisResults.forEach(result => {
      if (result.violations && result.violations.length > 0) {
        allViolations.push(...result.violations)
      }
    })

    // Deduplicate violations
    allViolations = deduplicateViolations(allViolations)

    // Create summary
    const summary = createViolationSummary(allViolations)

    // Generate PDF report with timeline
    const pdfResult = await generateInspectionReport({
      restaurantName,
      analysisType: 'video',
      violations: allViolations,
      timeline,
      metadata: {
        videoDuration: metadata.duration,
        framesAnalyzed: frameCount,
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
        upload_completed: true,
        input_metadata: {
          video_url: videoUploadResult.url,
          duration: metadata.duration,
          frames_analyzed: frameCount
        }
      })
      .eq('passcode', passcode)

    console.log(`Analysis completed for passcode ${passcode}`)

    // Cleanup temporary files
    if (tempVideoPath) {
      await fs.unlink(tempVideoPath).catch(() => {})
    }
    if (framesDir) {
      await cleanupFrames(framesDir)
    }

    // Return results
    return NextResponse.json({
      success: true,
      video_url: videoUploadResult.url,
      frames_analyzed: frameCount,
      violations_found: allViolations.length,
      timeline,
      summary,
      pdf_url: pdfResult.pdfUrl
    })

  } catch (error) {
    console.error('Video analysis error:', error)

    // Cleanup on error
    if (tempVideoPath) {
      await fs.unlink(tempVideoPath).catch(() => {})
    }
    if (framesDir) {
      await cleanupFrames(framesDir).catch(() => {})
    }

    return NextResponse.json(
      { 
        error: 'Failed to process video',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
