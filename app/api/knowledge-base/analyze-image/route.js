// app/api/knowledge-base/analyze-image/route.js
// Free image analysis teaser for knowledge base users
import { NextResponse } from 'next/server'
import { checkMultipleRateLimits, getIpAddress, RATE_LIMITS } from '@/lib/rateLimiting'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

let analyzeImage = null

async function getAnalyzeImage() {
  if (!analyzeImage) {
    const aiAnalysisModule = await import('@/backend/utils/aiAnalysis')
    analyzeImage = aiAnalysisModule.analyzeImage
  }
  return analyzeImage
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function validateImageData(imageInput) {
  if (!imageInput) return { valid: false, error: 'No image data' }
  
  try {
    let dataUrl = imageInput
    
    // Handle different image formats
    if (typeof imageInput === 'string' && imageInput.startsWith('data:image/')) {
      dataUrl = imageInput
    } else if (typeof imageInput === 'object' && imageInput.dataUrl) {
      dataUrl = imageInput.dataUrl
    } else if (typeof imageInput === 'object' && imageInput.data && imageInput.media_type) {
      const base64Data = imageInput.data.trim().replace(/\s+/g, '')
      dataUrl = `data:${imageInput.media_type};base64,${base64Data}`
    } else {
      return { valid: false, error: 'Invalid image format' }
    }
    
    const parts = dataUrl.split(',')
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid data URL format' }
    }
    
    const header = parts[0]
    const base64Data = parts[1]
    
    if (!header.includes('image/')) {
      return { valid: false, error: 'Not an image file' }
    }
    
    if (base64Data.length < 100) {
      return { valid: false, error: 'Image data too small' }
    }
    
    return { valid: true, dataUrl }
  } catch (error) {
    logger.error('Image validation error', { error: error.message })
    return { valid: false, error: 'Image validation failed' }
  }
}

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json().catch(() => ({}))
    const email = body?.email?.trim()
    const imageInput = body?.image || body?.imageBase64 || body?.imageDataUrl
    
    // Validate email (still required for tracking, but rate limiting is by IP)
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email address required' },
        { status: 400 }
      )
    }
    
    // Rate limiting by IP - check both daily and weekly limits
    const ip = getIpAddress(request)
    const rateLimit = await checkMultipleRateLimits(ip, [
      RATE_LIMITS.FREE_IMAGE_ANALYSIS_DAILY,
      RATE_LIMITS.FREE_IMAGE_ANALYSIS_WEEKLY
    ])
    
    if (!rateLimit.allowed) {
      logger.info('Free image analysis rate limit exceeded', { ip, email, retryAfter: rateLimit.retryAfter })
      return NextResponse.json(
        {
          error: `You've used your free analyses. Get unlimited checks with our $149 video analysis package.`,
          code: 'RATE_LIMIT_EXCEEDED',
          remaining: 0,
          upgradeUrl: '/signup?plan=video_analysis'
        },
        { status: 429 }
      )
    }
    
    // Show modal after 2nd daily image (when remaining is 1)
    const showUpgradeModal = rateLimit.remaining === 1
    
    // Validate image
    const imageValidation = validateImageData(imageInput)
    if (!imageValidation.valid) {
      return NextResponse.json(
        { error: imageValidation.error },
        { status: 400 }
      )
    }
    
    logger.info('Free image analysis', { 
      ip,
      email, 
      remaining: rateLimit.remaining 
    })
    
    // Analyze image
    const analyzeFn = await getAnalyzeImage()
    const analysis = await analyzeFn(imageValidation.dataUrl)
    
    if (!analysis || !analysis.analyzed) {
      return NextResponse.json(
        { error: analysis?.error || 'Analysis failed' },
        { status: 500 }
      )
    }
    
    // Generate limited high-level results
    const limitedResults = generateLimitedResults(analysis)
    
    const duration = Date.now() - startTime
    
    // Track analysis
    await trackImageAnalysis(ip, email, limitedResults.issuesDetected, duration)
    
    logger.info('Free image analysis completed', {
      ip,
      email,
      issuesDetected: limitedResults.issuesDetected,
      durationMs: duration
    })
    
    return NextResponse.json({
      ...limitedResults,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
      showUpgradeModal,
      upgradeMessage: showUpgradeModal 
        ? 'You have 1 free analysis left. Want comprehensive coverage? Our video analysis checks your entire establishment.'
        : null,
      conversionCta: 'Analyze your entire establishment - $149'
    })
    
  } catch (error) {
    logger.error('Free image analysis error', { error: error.message, stack: error.stack })
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Generate limited high-level results (intentionally vague to drive conversions)
 */
function generateLimitedResults(analysis) {
  const findings = analysis.findings || []
  const issuesDetected = findings.length
  
  // Categorize issues
  const categories = new Set()
  findings.forEach(finding => {
    const category = finding.type || finding.category || 'General'
    categories.add(category)
  })
  
  const categoryList = Array.from(categories)
  
  // Generate vague descriptions
  const issueDescriptions = categoryList.map(category => {
    return `Possible violation detected: ${category}`
  })
  
  return {
    compliantItems: Math.max(0, 5 - issuesDetected), // Rough estimate
    issuesDetected,
    categories: categoryList,
    issues: issueDescriptions,
    detailMessage: issuesDetected > 0
      ? 'Get specific code references and remediation steps with full video analysis.'
      : 'Great! But a comprehensive video analysis can catch issues not visible in a single photo.',
    confidence: analysis.confidence || 0.7,
    analyzed: true
  }
}

/**
 * Track image analysis for conversion optimization
 */
async function trackImageAnalysis(ip, email, issuesDetected, duration) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    await supabase.from('free_image_analyses').insert({
      ip_address: ip,
      email,
      issues_detected: issuesDetected,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.warn('Failed to track image analysis', { error: error.message })
  }
}
