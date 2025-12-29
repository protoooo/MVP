/**
 * Visual Reasoning API - Main Endpoint
 * POST /api/audit-media
 * 
 * Production API that acts as a "second pair of eyes" for businesses
 * Evaluates images/videos and returns structured, actionable feedback
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { CohereClient } from 'cohere-ai'
import { getProfileById, getZeroConfigProfile } from '@/lib/standardsProfiles'
import { assembleAnalysisPrompt, buildZeroConfigPrompt } from '@/lib/promptAssembly'
import { getWebhookForApiKey, deliverWebhook } from '@/lib/webhooks'
import { searchRegulations } from '@/lib/searchDocs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

const cohere = process.env.COHERE_API_KEY 
  ? new CohereClient({ token: process.env.COHERE_API_KEY })
  : null

/**
 * Authorize API key and check credits
 */
async function authorizeApiKey(apiKey) {
  if (!apiKey || !supabase) return null
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, active, remaining_credits, customer_email, tier')
    .eq('key', apiKey)
    .eq('active', true)
    .maybeSingle()
  
  if (error || !data) return null
  
  if (data.remaining_credits <= 0) {
    return { ...data, insufficient_credits: true }
  }
  
  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
  
  return data
}

/**
 * Convert image file to base64 data URL
 */
function imageToDataUrl(imagePath) {
  const ext = path.extname(imagePath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  const mimeType = mimeTypes[ext] || 'image/jpeg'
  const buffer = fs.readFileSync(imagePath)
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

/**
 * Analyze a single image using visual reasoning
 */
async function analyzeImageWithProfile(imagePath, profile, documentChunks = [], metadata = {}) {
  if (!cohere) {
    throw new Error('AI service not configured')
  }
  
  try {
    // Build the prompt using profile
    const prompt = profile 
      ? assembleAnalysisPrompt(profile, documentChunks, metadata)
      : buildZeroConfigPrompt(metadata)
    
    // Convert image to data URL
    const imageDataUrl = imageToDataUrl(imagePath)
    
    // Call Cohere vision model
    const response = await cohere.chat({
      model: process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } }
          ]
        }
      ],
      temperature: 0.3,
      responseFormat: { type: 'json_object' }
    })
    
    // Parse JSON response
    const analysisText = response.message?.content?.[0]?.text || '{}'
    const analysis = JSON.parse(analysisText)
    
    return {
      findings: analysis.findings || [],
      overall_assessment: analysis.overall_assessment || {
        compliant: true,
        score: 100,
        summary: 'No analysis data returned'
      },
      analyzed: true
    }
  } catch (err) {
    console.error('[audit-media] Analysis error:', err)
    return {
      findings: [],
      overall_assessment: {
        compliant: false,
        score: 0,
        summary: 'Analysis failed'
      },
      analyzed: false,
      error: err.message
    }
  }
}

/**
 * Main POST handler
 */
export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  const tempPaths = []

  try {
    // 1. Authenticate via API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    const authData = await authorizeApiKey(apiKey)
    if (!authData) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }
    
    if (authData.insufficient_credits) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'
      return NextResponse.json({ 
        error: 'Insufficient credits',
        remaining_credits: 0,
        buy_more: `${baseUrl}/#pricing`
      }, { status: 402 })
    }

    // 2. Parse request body
    const contentType = req.headers.get('content-type') || ''
    let files = []
    let imageUrls = []
    let profileId = null
    let metadata = {}

    if (contentType.includes('application/json')) {
      const body = await req.json()
      imageUrls = body.images || body.image_urls || []
      profileId = body.standards_profile_id || body.profile_id
      metadata = body.metadata || {}
      
      // Support legacy location field
      if (body.location) {
        metadata.location = body.location
      }
    } else {
      // Multipart form-data
      const formData = await req.formData()
      files = formData.getAll('files') || formData.getAll('media')
      profileId = formData.get('standards_profile_id') || formData.get('profile_id')
      
      // Parse metadata if provided as JSON string
      const metadataStr = formData.get('metadata')
      if (metadataStr) {
        try {
          metadata = JSON.parse(metadataStr)
        } catch (e) {
          metadata = {}
        }
      }
      
      // Legacy fields
      if (formData.get('location')) {
        metadata.location = formData.get('location')
      }
      if (formData.get('task')) {
        metadata.task = formData.get('task')
      }
      if (formData.get('timestamp')) {
        metadata.timestamp = formData.get('timestamp')
      }
    }

    const totalImages = imageUrls.length + files.length
    if (totalImages === 0) {
      return NextResponse.json({ error: 'No images or videos provided' }, { status: 400 })
    }

    if (totalImages > 200) {
      return NextResponse.json({ error: 'Maximum 200 media items per request' }, { status: 400 })
    }
    
    // Check sufficient credits
    if (authData.remaining_credits < totalImages) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'
      return NextResponse.json({ 
        error: 'Insufficient credits for this request',
        remaining_credits: authData.remaining_credits,
        required_credits: totalImages,
        buy_more: `${baseUrl}/#pricing`
      }, { status: 402 })
    }

    // 3. Get standards profile (or use zero-config)
    let profile = null
    let documentChunks = []
    
    if (profileId) {
      profile = await getProfileById(profileId)
      
      // If profile has document_ids, fetch relevant chunks
      if (profile?.document_ids && profile.document_ids.length > 0) {
        // Build search query from metadata and profile
        const searchQuery = `${profile.industry} ${profile.task_type} ${metadata.location || ''}`
        documentChunks = await searchRegulations(searchQuery, 5) || []
      }
    } else {
      // Zero-config mode - use default profile
      profile = await getZeroConfigProfile()
    }

    // 4. Create audit session
    const sessionId = uuidv4()
    await supabase.from('audit_sessions').insert([{
      id: sessionId,
      user_id: authData.user_id,
      type: 'api',
      area_tags: metadata.location ? [metadata.location] : []
    }])

    // 5. Process each image
    const results = []
    
    // Process uploaded files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const mediaId = uuidv4()
      
      try {
        const ext = path.extname(file.name) || '.jpg'
        const tempPath = path.join(os.tmpdir(), `${uuidv4()}${ext}`)
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)

        // Analyze with profile
        const analysis = await analyzeImageWithProfile(tempPath, profile, documentChunks, metadata)
        
        results.push({
          media_id: mediaId,
          ...analysis
        })
      } catch (err) {
        console.error(`[audit-media] Failed to process file ${i}:`, err)
        results.push({
          media_id: mediaId,
          findings: [],
          overall_assessment: { compliant: false, score: 0, summary: 'Processing failed' },
          analyzed: false,
          error: err.message
        })
      }
    }

    // Process image URLs
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      const mediaId = uuidv4()
      
      try {
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        const urlPath = new URL(imageUrl).pathname
        let ext = path.extname(urlPath) || '.jpg'
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('png')) ext = '.png'
        
        const tempPath = path.join(os.tmpdir(), `${uuidv4()}${ext}`)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)

        // Analyze with profile
        const analysis = await analyzeImageWithProfile(tempPath, profile, documentChunks, metadata)
        
        results.push({
          media_id: mediaId,
          image_url: imageUrl,
          ...analysis
        })
      } catch (err) {
        console.error(`[audit-media] Failed to process URL ${i}:`, err)
        results.push({
          media_id: mediaId,
          image_url: imageUrl,
          findings: [],
          overall_assessment: { compliant: false, score: 0, summary: 'Processing failed' },
          analyzed: false,
          error: err.message
        })
      }
    }

    // 6. Aggregate results
    const allFindings = results.flatMap(r => r.findings || [])
    const issues = allFindings.filter(f => f.type === 'issue')
    const criticalIssues = issues.filter(f => f.severity === 'critical')
    const majorIssues = issues.filter(f => f.severity === 'major')
    
    const avgScore = results.reduce((sum, r) => sum + (r.overall_assessment?.score || 0), 0) / results.length
    const overallCompliant = criticalIssues.length === 0 && majorIssues.length <= 2
    
    // 7. Deduct credits
    const creditsUsed = totalImages
    await supabase
      .from('api_keys')
      .update({ 
        remaining_credits: authData.remaining_credits - creditsUsed,
        total_used: (authData.total_used || 0) + creditsUsed
      })
      .eq('id', authData.id)

    // 8. Build response
    const responsePayload = {
      session_id: sessionId,
      findings: allFindings,
      severity_summary: {
        critical: criticalIssues.length,
        major: majorIssues.length,
        minor: issues.filter(f => f.severity === 'minor').length,
        info: allFindings.filter(f => f.type === 'confirmation' || f.severity === 'info').length
      },
      overall_score: Math.round(avgScore),
      compliant: overallCompliant,
      summary: `Analyzed ${totalImages} image(s). Found ${issues.length} issue(s).`,
      media_analyzed: totalImages,
      credits_used: creditsUsed,
      remaining_credits: authData.remaining_credits - creditsUsed,
      profile_used: profile ? {
        id: profile.id,
        name: profile.profile_name,
        industry: profile.industry,
        task_type: profile.task_type
      } : null
    }

    // 9. Deliver to webhook if configured
    const webhookConfig = await getWebhookForApiKey(authData.id)
    if (webhookConfig) {
      deliverWebhook(webhookConfig, responsePayload, sessionId).catch(err => {
        console.error('[audit-media] Webhook delivery failed:', err)
      })
    }

    // 10. Cleanup
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })

    return NextResponse.json(responsePayload)

  } catch (error) {
    // Cleanup on error
    tempPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })
    console.error('[audit-media] Processing failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
