// POST /api/v1/inspect - ProtocolLM Primary Webhook Endpoint
// Sector-agnostic compliance and standard-procedures enforcement engine

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { analyzeImage } from '@/backend/utils/aiAnalysis'
import { analyzeTextForCompliance, analyzeChecklist, analyzeProcedureDocument, extractTextFromDocument } from '@/backend/utils/textAnalysis'
import { ensureBucketExists } from '@/app/api/upload/storageHelpers'
import { getProtocolPackById, isValidProtocolPack, INSPECTION_STATUS, SEVERITY_TO_RISK_LEVEL } from '@/lib/protocolPacks'
import fs from 'fs'
import path from 'path'
import os from 'os'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null

/**
 * Authorize API key and check credits
 */
async function authorizeApiKey(apiKey) {
  if (!apiKey || !supabase) return null
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, active, remaining_credits, customer_email')
    .eq('key', apiKey)
    .eq('active', true)
    .maybeSingle()
  
  if (error || !data) return null
  
  // Check if credits are available
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
 * Process image input and perform compliance analysis
 */
async function processImageInput(payload, protocolPack, context) {
  const results = []
  const tempPaths = []
  
  try {
    const images = payload.images || []
    
    for (const imageUrl of images) {
      try {
        // Download image
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`)
        }
        
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Detect extension
        const urlPath = new URL(imageUrl).pathname
        let ext = path.extname(urlPath) || '.jpg'
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('png')) ext = '.png'
        else if (contentType?.includes('jpeg') || contentType?.includes('jpg')) ext = '.jpg'
        
        // Save to temp file
        const tempPath = path.join(os.tmpdir(), `${uuidv4()}${ext}`)
        fs.writeFileSync(tempPath, buffer)
        tempPaths.push(tempPath)
        
        // Analyze image using existing AI analysis
        const analysis = await analyzeImage(tempPath)
        
        // Map to ProtocolLM finding format
        const finding = {
          evidence_type: 'image',
          evidence_url: imageUrl,
          analysis: analysis,
        }
        
        results.push(finding)
      } catch (err) {
        console.error('[v1/inspect] Failed to process image:', err)
        results.push({
          evidence_type: 'image',
          error: err.message,
          analyzed: false,
        })
      }
    }
  } finally {
    // Cleanup temp files
    tempPaths.forEach(p => {
      try {
        fs.unlinkSync(p)
      } catch (e) {
        // Ignore cleanup errors
      }
    })
  }
  
  return results
}

/**
 * Process text input (logs, checklists, procedures, documents)
 */
async function processTextInput(payload, protocolPack, context) {
  const results = []
  
  try {
    // Handle different text input formats
    if (payload.text) {
      // Direct text content
      const analysis = await analyzeTextForCompliance(payload.text, protocolPack, context)
      results.push({
        evidence_type: 'text',
        analysis: analysis,
      })
    } else if (payload.document) {
      // Document content (could be large)
      const textContent = extractTextFromDocument(payload.document, payload.document_type)
      const analysis = await analyzeProcedureDocument(textContent, protocolPack, context)
      results.push({
        evidence_type: 'text',
        document_type: payload.document_type || 'unknown',
        analysis: analysis,
      })
    } else if (payload.checklist) {
      // Checklist data
      const analysis = await analyzeChecklist(payload.checklist, protocolPack, context)
      results.push({
        evidence_type: 'form',
        form_type: 'checklist',
        analysis: analysis,
      })
    } else if (payload.documents && Array.isArray(payload.documents)) {
      // Multiple documents
      for (const doc of payload.documents) {
        const textContent = extractTextFromDocument(doc.content, doc.type)
        const analysis = await analyzeProcedureDocument(textContent, protocolPack, context)
        results.push({
          evidence_type: 'text',
          document_type: doc.type || 'unknown',
          document_name: doc.name || 'unnamed',
          analysis: analysis,
        })
      }
    } else {
      // No valid text input
      return [{
        evidence_type: 'text',
        analysis: {
          violation: null,
          findings: [],
          severity: 'info',
          confidence: 0,
          analyzed: false,
          error: 'No text content provided. Expected "text", "document", "checklist", or "documents" in payload.',
        },
      }]
    }
    
  } catch (error) {
    console.error('[v1/inspect] Failed to process text input:', error)
    results.push({
      evidence_type: 'text',
      analysis: {
        violation: null,
        findings: [],
        severity: 'info',
        confidence: 0,
        analyzed: false,
        error: error.message,
      },
    })
  }
  
  return results
}

/**
 * Process sensor data input
 */
async function processSensorInput(payload, protocolPack, context) {
  // Placeholder for sensor data processing
  // Future: implement temperature, humidity, etc. checking
  return [{
    evidence_type: 'sensor',
    analysis: {
      violation: null,
      findings: [],
      severity: 'info',
      confidence: 0,
      analyzed: false,
      note: 'Sensor input processing not yet implemented',
    },
  }]
}

/**
 * Evaluate compliance based on analysis results
 */
function evaluateCompliance(results, protocolPack) {
  const findings = []
  let overallStatus = INSPECTION_STATUS.PASS
  let highestRiskLevel = 'low'
  let totalConfidence = 0
  let analyzedCount = 0
  
  for (const result of results) {
    if (!result.analysis || !result.analysis.analyzed) {
      overallStatus = INSPECTION_STATUS.INSUFFICIENT_DATA
      continue
    }
    
    const analysis = result.analysis
    analyzedCount++
    totalConfidence += analysis.confidence || 0
    
    if (analysis.violation) {
      // Map violation to protocol reference
      const protocolRef = analysis.michigan_code_ref || 'general'
      
      findings.push({
        protocol_reference: protocolRef,
        description: analysis.violation,
        evidence_type: result.evidence_type,
        confidence: analysis.confidence || 0,
        severity: analysis.severity || 'medium',
      })
      
      // Update overall status
      if (analysis.severity === 'critical') {
        overallStatus = INSPECTION_STATUS.FAIL
        highestRiskLevel = 'critical'
      } else if (analysis.severity === 'high' && highestRiskLevel !== 'critical') {
        overallStatus = INSPECTION_STATUS.FAIL
        highestRiskLevel = 'high'
      } else if (analysis.severity === 'medium' && !['critical', 'high'].includes(highestRiskLevel)) {
        overallStatus = INSPECTION_STATUS.WARNING
        highestRiskLevel = 'medium'
      }
    }
  }
  
  // If no violations found and we analyzed something
  if (findings.length === 0 && analyzedCount > 0) {
    overallStatus = INSPECTION_STATUS.PASS
  }
  
  return {
    status: overallStatus,
    risk_level: highestRiskLevel,
    findings: findings,
    confidence: analyzedCount > 0 ? totalConfidence / analyzedCount : 0,
  }
}

/**
 * Generate required actions based on findings
 */
function generateRequiredActions(findings, status) {
  const actions = []
  
  for (const finding of findings) {
    let urgency = 'scheduled'
    
    if (finding.severity === 'critical') {
      urgency = 'immediate'
    } else if (finding.severity === 'high') {
      urgency = 'same_day'
    }
    
    actions.push({
      action: `Address violation: ${finding.description}`,
      urgency: urgency,
      verification_required: finding.severity === 'critical' || finding.severity === 'high',
      protocol_reference: finding.protocol_reference,
    })
  }
  
  return actions
}

export async function POST(req) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 500 })
  }

  try {
    // Get API key from Authorization header (Bearer token)
    const authHeader = req.headers.get('authorization')
    const apiKey = authHeader?.replace(/^Bearer\s+/i, '')
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API key required',
        message: 'Include API key in Authorization header: Bearer YOUR_API_KEY'
      }, { status: 401 })
    }
    
    // Authorize API key
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

    // Parse request body
    const body = await req.json()
    const {
      protocol_pack,
      input_type,
      context = {},
      payload = {}
    } = body

    // Validate protocol pack
    if (!protocol_pack) {
      return NextResponse.json({ 
        error: 'protocol_pack required',
        message: 'Specify which protocol pack to use for compliance evaluation'
      }, { status: 400 })
    }

    if (!isValidProtocolPack(protocol_pack)) {
      return NextResponse.json({ 
        error: 'Invalid protocol_pack',
        message: `Protocol pack "${protocol_pack}" not found or inactive`,
        available_packs: Object.keys(require('@/lib/protocolPacks').PROTOCOL_PACKS)
      }, { status: 400 })
    }

    const protocolPackData = getProtocolPackById(protocol_pack)

    // Validate input type
    const validInputTypes = ['image', 'video', 'text', 'sensor', 'form']
    if (!input_type || !validInputTypes.includes(input_type)) {
      return NextResponse.json({ 
        error: 'Invalid input_type',
        message: `input_type must be one of: ${validInputTypes.join(', ')}`
      }, { status: 400 })
    }

    // Process input based on type
    let analysisResults = []
    
    switch (input_type) {
      case 'image':
        if (!payload.images || !Array.isArray(payload.images) || payload.images.length === 0) {
          return NextResponse.json({ 
            error: 'Invalid payload',
            message: 'For input_type "image", payload must contain "images" array with image URLs'
          }, { status: 400 })
        }
        analysisResults = await processImageInput(payload, protocolPackData, context)
        break
      case 'video':
        // Future: implement video processing
        return NextResponse.json({ 
          error: 'Input type not yet supported',
          message: 'Video input processing coming soon'
        }, { status: 501 })
      case 'text':
        analysisResults = await processTextInput(payload, protocolPackData, context)
        break
      case 'sensor':
        analysisResults = await processSensorInput(payload, protocolPackData, context)
        break
      case 'form':
        // Form data uses text processing with checklist format
        if (!payload.checklist && !payload.form_data) {
          return NextResponse.json({ 
            error: 'Invalid payload',
            message: 'For input_type "form", payload must contain "checklist" or "form_data"'
          }, { status: 400 })
        }
        const formPayload = { checklist: payload.checklist || payload.form_data }
        analysisResults = await processTextInput(formPayload, protocolPackData, context)
        break
      default:
        return NextResponse.json({ 
          error: 'Unsupported input_type'
        }, { status: 400 })
    }

    // Evaluate compliance
    const evaluation = evaluateCompliance(analysisResults, protocolPackData)
    
    // Generate required actions
    const requiredActions = generateRequiredActions(evaluation.findings, evaluation.status)

    // Calculate credits used
    let creditsUsed = 1 // Default for most input types
    
    if (input_type === 'image') {
      creditsUsed = payload.images?.length || 1
    } else if (input_type === 'text' && payload.documents?.length) {
      creditsUsed = payload.documents.length
    }
    
    if (authData.remaining_credits < creditsUsed) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protocollm.com'
      return NextResponse.json({ 
        error: 'Insufficient credits for this request',
        remaining_credits: authData.remaining_credits,
        required_credits: creditsUsed,
        buy_more: `${baseUrl}/#pricing`
      }, { status: 402 })
    }

    await supabase
      .from('api_keys')
      .update({ 
        remaining_credits: authData.remaining_credits - creditsUsed,
        total_used: (authData.total_used || 0) + creditsUsed,
      })
      .eq('id', authData.id)

    // Generate inspection ID
    const inspectionId = uuidv4()

    // Build ProtocolLM-compliant response
    const response = {
      inspection_id: inspectionId,
      status: evaluation.status,
      risk_level: evaluation.risk_level,
      findings: evaluation.findings,
      required_actions: requiredActions,
      audit_ready: true,
      metadata: {
        protocol_pack: protocol_pack,
        input_type: input_type,
        timestamp: new Date().toISOString(),
        location: context.location || null,
        operator: context.operator || null,
        credits_used: creditsUsed,
        remaining_credits: authData.remaining_credits - creditsUsed,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[v1/inspect] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}
