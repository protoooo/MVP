import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { uploadFile } from '../../../../lib/storage.js'
import { analyzeMultipleImages } from '../../../../lib/cohereVision.js'
import { createViolationSummary, deduplicateViolations } from '../../../../lib/violationAnalyzer.js'
import { generateInspectionReport } from '../../../../lib/pdfGenerator.js'
import { sendReportToMultiple } from '../../../../lib/emailService.js'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    // Parse multipart form data
    const formData = await request.formData()
    
    // Get Supabase client and retrieve user from session
    // Note: In production, implement proper session cookie parsing
    // For now, we'll attempt to get user ID from a custom header or form data
    const userId = formData.get('userId') || request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. User ID not provided.' },
        { status: 401 }
      )
    }
    
    const supabase = getSupabaseClient()

    // Get user profile with subscription data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Verify active subscription
    if (!profile.subscription_status || profile.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'No active subscription. Please subscribe to a plan.' },
        { status: 403 }
      )
    }

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

    // Check quota
    const remaining = profile.monthly_image_limit - (profile.images_used_this_period || 0)
    if (imageFiles.length > remaining) {
      return NextResponse.json(
        { error: `Insufficient quota. You have ${remaining} image${remaining !== 1 ? 's' : ''} remaining in your monthly allowance.` },
        { status: 403 }
      )
    }

    const restaurantName = formData.get('restaurantName') || 'Restaurant'
    const gmEmail = formData.get('gmEmail')
    const ownerEmail = formData.get('ownerEmail')

    console.log(`Processing ${imageFiles.length} images for user ${userId}`)

    // Upload images to Supabase Storage
    const uploadPromises = imageFiles.map(async (file, index) => {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileName = `user-${userId}-${Date.now()}-${index + 1}.jpg`
      const contentType = file.type || 'image/jpeg'
      
      return uploadFile(buffer, fileName, 'analysis-uploads', contentType)
    })

    const uploadResults = await Promise.all(uploadPromises)
    const imageUrls = uploadResults.map(result => result.url)

    console.log(`Uploaded ${imageUrls.length} images to storage`)

    // Analyze images with Cohere Vision
    const analysisResults = await analyzeMultipleImages(
      imageUrls,
      'Analyze this image for food safety and health code violations.'
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
        analysisDate: new Date().toISOString(),
        userEmail: profile.email
      }
    })

    // Update user's image usage
    const newUsage = (profile.images_used_this_period || 0) + imageFiles.length
    await supabase
      .from('user_profiles')
      .update({
        images_used_this_period: newUsage
      })
      .eq('id', userId)

    console.log(`Updated usage for user ${userId}: ${newUsage} / ${profile.monthly_image_limit}`)

    // Send email if recipients provided
    let emailResult = null
    if (gmEmail || ownerEmail) {
      const recipients = []
      if (gmEmail) recipients.push(gmEmail)
      if (ownerEmail) recipients.push(ownerEmail)
      
      emailResult = await sendReportToMultiple({
        recipients,
        pdfUrl: pdfResult.pdfUrl,
        restaurantName,
        analysisDate: new Date().toISOString()
      })
      
      console.log(`Email sent to ${emailResult.sent} recipient(s)`)
    }

    // Return results
    return NextResponse.json({
      success: true,
      images_analyzed: imageFiles.length,
      violations: allViolations,
      summary,
      pdf_url: pdfResult.pdfUrl,
      email_sent: emailResult?.sent || 0,
      usage: {
        used: newUsage,
        limit: profile.monthly_image_limit,
        remaining: profile.monthly_image_limit - newUsage
      }
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
