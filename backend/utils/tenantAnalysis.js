/**
 * AI Analysis module for Michigan tenant habitability compliance using Cohere AYA Vision
 * Analyzes images of rental units and returns habitability violations with citations from Michigan tenant laws
 */

import fs from 'fs'
import path from 'path'
import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'

// Configuration constants
const COHERE_API_KEY = process.env.COHERE_API_KEY
const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro'
const COHERE_API_URL = process.env.COHERE_API_URL || 'https://api.cohere.com/v2/chat'

// Supabase for document search
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Habitability issue keywords for classification (PHOTOGRAPHABLE ONLY)
const HABITABILITY_KEYWORDS = {
  moldWaterDamage: ['mold', 'mildew', 'water damage', 'water stain', 'leak', 'moisture', 'damp', 'fungus'],
  structuralDamage: ['hole', 'crack', 'sagging', 'broken', 'damaged', 'structural', 'collapse', 'falling'],
  windowsDoors: ['window', 'door', 'lock', 'broken glass', 'shattered', 'missing'],
  pestInfestation: ['roach', 'cockroach', 'bedbug', 'bed bug', 'mouse', 'rat', 'droppings', 'pest', 'insect'],
  electricalHazards: ['wiring', 'exposed wire', 'electrical', 'outlet', 'switch', 'sparking'],
  plumbingIssues: ['plumbing', 'pipe', 'leaking', 'faucet', 'toilet', 'sink', 'drain'],
  smokeDetectors: ['smoke detector', 'smoke alarm', 'fire alarm', 'detector', 'missing detector'],
  handrails: ['handrail', 'railing', 'bannister', 'missing rail', 'stairs'],
  leadPaint: ['peeling paint', 'chipping paint', 'paint chips', 'flaking paint'],
  brokenAppliances: ['appliance', 'stove', 'refrigerator', 'oven', 'broken'],
  unsanitaryConditions: ['trash', 'garbage', 'filth', 'dirty', 'unsanitary', 'accumulation']
}

// Confidence level classifications
const CONFIDENCE_LEVELS = {
  CLEAR: 'clear_violation',      // 0.8-1.0 - Definitive, visible violation
  LIKELY: 'likely_issue',        // 0.5-0.79 - Probable issue requiring attention
  ASSESSMENT: 'requires_assessment' // 0.3-0.49 - Needs professional evaluation
}

// Severity indicators for habitability
const SEVERITY_KEYWORDS = {
  high: ['no heat', 'mold', 'exposed wiring', 'broken window', 'structural', 'infestation', 'no water'],
  medium: ['leak', 'crack', 'peeling paint', 'broken lock', 'missing handrail'],
  low: ['minor crack', 'cosmetic', 'wear']
}

const cohere = COHERE_API_KEY ? new CohereClient({ token: COHERE_API_KEY }) : null
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null

// Timeout helper with descriptive error messages
function withTimeout(promise, ms, label = 'Operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ])
}

// Convert image file to base64 data URL
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

// Search Michigan tenant law documents for relevant citations
async function searchTenantRegulations(query, topK = 5) {
  if (!cohere || !supabase) {
    console.warn('[tenantAnalysis] Cohere or Supabase not configured, skipping regulation search')
    return []
  }

  try {
    // Generate embedding for the query
    const embeddingResponse = await withTimeout(
      cohere.embed({
        texts: [query],
        model: COHERE_EMBED_MODEL,
        inputType: 'search_query',
        embeddingTypes: ['float'],
        truncate: 'END',
      }),
      10000,
      'Embedding generation'
    )

    if (!embeddingResponse || !embeddingResponse.embeddings) {
      console.warn('[tenantAnalysis] Invalid embedding response structure')
      return []
    }

    const floatEmbeddings = embeddingResponse.embeddings.float
    if (!Array.isArray(floatEmbeddings) || floatEmbeddings.length === 0) {
      console.warn('[tenantAnalysis] No float embeddings returned')
      return []
    }

    const queryEmbedding = floatEmbeddings[0]
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.warn('[tenantAnalysis] Invalid query embedding format')
      return []
    }

    // Search documents using vector similarity for Michigan tenant laws
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.25,
      match_count: topK * 2,
      filter_county: 'michigan_tenant',  // Filter for tenant law documents
    })

    if (error || !documents?.length) return []

    // Rerank results for better relevance
    const rerankResponse = await cohere.rerank({
      model: COHERE_RERANK_MODEL,
      query,
      documents: documents.map(doc => doc.content || ''),
      topN: Math.min(topK, documents.length),
    })

    return (rerankResponse?.results || []).map(r => ({
      source: documents[r.index]?.metadata?.source || 'Michigan Tenant Rights Act',
      page: documents[r.index]?.metadata?.page_estimate || 'N/A',
      text: documents[r.index]?.content || '',
      score: r.relevanceScore,
    }))
  } catch (err) {
    console.error('[tenantAnalysis] Regulation search failed:', err.message)
    return []
  }
}

// Extract JSON from AI response with robust error handling
function extractJsonFromResponse(text) {
  const s = String(text || '').trim()
  if (!s) return null
  
  // Strategy 1: Look for complete JSON object with balanced braces
  const start = s.indexOf('{')
  if (start !== -1) {
    let depth = 0
    for (let i = start; i < s.length; i++) {
      if (s[i] === '{') depth++
      if (s[i] === '}') depth--
      if (depth === 0) {
        try {
          const jsonStr = s.slice(start, i + 1)
          const parsed = JSON.parse(jsonStr)
          return parsed
        } catch (parseErr) {
          // Continue to next strategy
        }
        break
      }
    }
  }
  
  // Strategy 2: Try to extract JSON from markdown code blocks
  const codeBlockMatch = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch (parseErr) {
      // Continue
    }
  }
  
  // Strategy 3: Try the entire string as JSON
  if (s.startsWith('{') && s.endsWith('}')) {
    try {
      return JSON.parse(s)
    } catch (parseErr) {
      // Continue
    }
  }
  
  return null
}

// Infer issue type and severity based on content
function inferHabitabilityDetails(description) {
  const lower = (description || '').toLowerCase()
  
  const containsAny = (keywords) => keywords.some(k => lower.includes(k))
  
  let type = 'General Habitability'
  let severity = 'medium'
  let confidenceLevel = CONFIDENCE_LEVELS.LIKELY
  
  // Type inference
  if (containsAny(HABITABILITY_KEYWORDS.moldWaterDamage)) {
    type = 'Mold/Water Damage'
    severity = 'high'
    confidenceLevel = CONFIDENCE_LEVELS.CLEAR
  } else if (containsAny(HABITABILITY_KEYWORDS.structuralDamage)) {
    type = 'Structural Damage'
    severity = 'high'
    confidenceLevel = CONFIDENCE_LEVELS.ASSESSMENT
  } else if (containsAny(HABITABILITY_KEYWORDS.windowsDoors)) {
    type = 'Windows/Doors/Security'
    severity = 'medium'
  } else if (containsAny(HABITABILITY_KEYWORDS.pestInfestation)) {
    type = 'Pest Infestation'
    severity = 'high'
    confidenceLevel = CONFIDENCE_LEVELS.CLEAR
  } else if (containsAny(HABITABILITY_KEYWORDS.electricalHazards)) {
    type = 'Electrical Hazard'
    severity = 'high'
    confidenceLevel = CONFIDENCE_LEVELS.ASSESSMENT
  } else if (containsAny(HABITABILITY_KEYWORDS.plumbingIssues)) {
    type = 'Plumbing Issues'
    severity = 'medium'
  } else if (containsAny(HABITABILITY_KEYWORDS.smokeDetectors)) {
    type = 'Safety Equipment'
    severity = 'high'
  } else if (containsAny(HABITABILITY_KEYWORDS.handrails)) {
    type = 'Safety Hazard'
    severity = 'medium'
  } else if (containsAny(HABITABILITY_KEYWORDS.leadPaint)) {
    type = 'Lead Paint Hazard'
    severity = 'high'
    confidenceLevel = CONFIDENCE_LEVELS.ASSESSMENT
  } else if (containsAny(HABITABILITY_KEYWORDS.brokenAppliances)) {
    type = 'Appliances'
    severity = 'medium'
  } else if (containsAny(HABITABILITY_KEYWORDS.unsanitaryConditions)) {
    type = 'Unsanitary Conditions'
    severity = 'medium'
  }
  
  // Override severity based on keywords
  if (containsAny(SEVERITY_KEYWORDS.high)) {
    severity = 'high'
  } else if (containsAny(SEVERITY_KEYWORDS.low)) {
    severity = 'low'
  }
  
  return { type, severity, confidenceLevel }
}

// Determine confidence level from score
function getConfidenceLevel(confidence) {
  if (confidence >= 0.8) return CONFIDENCE_LEVELS.CLEAR
  if (confidence >= 0.5) return CONFIDENCE_LEVELS.LIKELY
  return CONFIDENCE_LEVELS.ASSESSMENT
}

/**
 * Main image analysis function for tenant habitability using Cohere AYA Vision
 * @param {string} imageInput - Path to image file or base64 data URL
 * @param {string} roomArea - Optional room/area identifier
 * @returns {Object} Analysis results with habitability violations and citations
 */
export async function analyzeTenantImage(imageInput, roomArea = 'general') {
  if (!cohere) {
    console.warn('[tenantAnalysis] Cohere API key not configured')
    return {
      violation: null,
      violation_type: 'None',
      findings: [],
      citations: [],
      severity: 'info',
      confidence: 0,
      confidence_level: CONFIDENCE_LEVELS.ASSESSMENT,
      analyzed: false,
      error: 'AI analysis not configured'
    }
  }

  try {
    // Convert image path to data URL if needed
    let imageDataUrl = imageInput
    if (typeof imageInput === 'string' && !imageInput.startsWith('data:')) {
      if (fs.existsSync(imageInput)) {
        imageDataUrl = imageToDataUrl(imageInput)
      } else {
        throw new Error('Image file not found')
      }
    }

    // Build the analysis prompt for tenant habitability
    const systemPrompt = `You are a Michigan tenant rights expert analyzing photos of rental units for habitability violations.
Your task is to identify VISIBLE habitability issues that can be photographed and documented.

CRITICAL RULES - PHOTOGRAPHABLE ISSUES ONLY:
1. ONLY analyze what is DIRECTLY VISIBLE in the photo
2. Focus on issues that can be proven through photographs
3. DO NOT mention non-visible issues (heat, hot water, working outlets, HVAC, etc.)
4. Be specific about locations and conditions
5. Use neutral, factual language - NO legal advice
6. Assign confidence levels honestly based on what you can see

PHOTOGRAPHABLE HABITABILITY ISSUES (what to look for):
✓ Mold, mildew, water damage, stains
✓ Broken windows, doors, locks
✓ Holes in walls, ceilings, floors
✓ Visible pest infestations (roaches, droppings, bedbugs)
✓ Exposed or damaged electrical wiring
✓ Broken or missing smoke detectors (if visible)
✓ Damaged or leaking plumbing fixtures
✓ Structural damage (cracks, sagging)
✓ Missing handrails on stairs
✓ Peeling paint (especially in pre-1978 buildings - lead paint concern)
✓ Broken appliances (visual damage)
✓ Trash accumulation, unsanitary conditions

DO NOT ANALYZE (non-photographable):
❌ Heat/HVAC functionality
❌ Hot water availability
❌ Electrical outlets working/not working
❌ Gas leaks
❌ Noise issues
❌ Poor ventilation (unless visible mold/damage)
❌ Pest infestations not visible in photo

CONFIDENCE LEVELS:
- Clear violation (0.8-1.0): Definitive evidence visible (e.g., visible mold, broken window)
- Likely issue (0.5-0.79): Probable violation requiring attention (e.g., water stains suggesting leak)
- Requires professional assessment (0.3-0.49): Needs expert evaluation (e.g., structural concerns)

Return analysis as valid JSON:
{
  "has_violations": boolean,
  "findings": [
    {
      "description": "Clear, specific description of what is observed",
      "location": "Where in the image (e.g., 'bathroom ceiling', 'bedroom wall')",
      "issue_type": "Category of issue",
      "severity": "high|medium|low",
      "confidence": 0.0-1.0,
      "landlord_action_required": "What landlord must do to fix",
      "regulation_keywords": ["keywords", "for", "searching", "Michigan", "tenant", "laws"]
    }
  ],
  "overall_assessment": "Brief summary",
  "room_area": "${roomArea}"
}

If NO violations visible:
{
  "has_violations": false,
  "findings": [],
  "overall_assessment": "No visible habitability violations detected",
  "confidence": 0.9,
  "room_area": "${roomArea}"
}

Be professional, neutral, and factual. This is for documentation, not legal advice.`

    // Call Cohere AYA Vision API
    const response = await withTimeout(
      fetch(COHERE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: COHERE_VISION_MODEL,
          messages: [
            {
              role: 'system',
              content: [{ type: 'text', text: systemPrompt }]
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this rental unit photo for habitability violations.' },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ]
            }
          ]
        })
      }),
      30000,
      'Vision API analysis'
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Cohere API error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    
    // Extract text from response
    let responseText = ''
    const content = result?.message?.content
    if (typeof content === 'string') {
      responseText = content
    } else if (Array.isArray(content)) {
      responseText = content.map(c => c?.text || '').join('')
    }

    // Parse JSON from response
    const analysis = extractJsonFromResponse(responseText)
    
    if (!analysis) {
      console.error('[tenantAnalysis] Could not parse JSON from response')
      return {
        violation: null,
        violation_type: 'Unknown',
        findings: [],
        citations: [],
        severity: 'info',
        confidence: 0.3,
        confidence_level: CONFIDENCE_LEVELS.ASSESSMENT,
        analyzed: true,
        error: 'Failed to parse AI response',
        room_area: roomArea
      }
    }

    // If no violations found, return clean result
    if (!analysis.has_violations || !analysis.findings?.length) {
      return {
        violation: null,
        violation_type: 'None',
        findings: [],
        citations: [],
        severity: 'info',
        confidence: analysis.confidence || 0.9,
        confidence_level: CONFIDENCE_LEVELS.CLEAR,
        overall_assessment: analysis.overall_assessment || 'No visible violations detected',
        analyzed: true,
        room_area: roomArea
      }
    }

    // Process each finding and search for relevant regulations
    const processedFindings = []
    const allCitations = []

    for (const finding of analysis.findings || []) {
      // Build search query from finding
      const searchQuery = [
        'Michigan tenant habitability',
        finding.description,
        finding.issue_type,
        finding.landlord_action_required,
        ...(finding.regulation_keywords || [])
      ].filter(Boolean).join(' ')

      // Search for relevant Michigan tenant law regulations
      const citations = await searchTenantRegulations(searchQuery, 3)
      
      // Infer details if not provided
      const inferred = inferHabitabilityDetails(finding.description)
      const issueType = finding.issue_type || inferred.type
      const severity = finding.severity || inferred.severity
      const confidence = finding.confidence || 0.7
      const confidenceLevel = getConfidenceLevel(confidence)

      processedFindings.push({
        description: finding.description,
        location: finding.location || roomArea,
        issue_type: issueType,
        severity,
        confidence,
        confidence_level: confidenceLevel,
        landlord_action_required: finding.landlord_action_required || 'Repair or remediate this condition',
        citations: citations.map(c => ({
          source: c.source,
          page: c.page,
          excerpt: c.text?.slice(0, 300) || '',
          relevance_score: c.score
        }))
      })

      allCitations.push(...citations)
    }

    // Determine overall severity
    const severityOrder = { high: 3, medium: 2, low: 1, info: 0 }
    const maxSeverity = processedFindings.reduce((max, f) => 
      severityOrder[f.severity] > severityOrder[max] ? f.severity : max, 'low')

    // Build primary violation summary
    const primaryFinding = processedFindings[0]
    const primaryCitation = primaryFinding?.citations?.[0]

    return {
      violation: primaryFinding?.description || null,
      violation_type: primaryFinding?.issue_type || 'General Habitability',
      severity: maxSeverity,
      citation: primaryCitation?.source 
        ? `${primaryCitation.source}${primaryCitation.page !== 'N/A' ? ` (p. ${primaryCitation.page})` : ''}`
        : null,
      confidence: Math.max(...processedFindings.map(f => f.confidence)),
      confidence_level: getConfidenceLevel(Math.max(...processedFindings.map(f => f.confidence))),
      findings: processedFindings,
      citations: allCitations.slice(0, 5).map(c => ({
        source: c.source,
        page: c.page,
        excerpt: c.text?.slice(0, 300) || ''
      })),
      overall_assessment: analysis.overall_assessment,
      room_area: roomArea,
      analyzed: true
    }

  } catch (err) {
    console.error('[tenantAnalysis] Analysis failed:', err.message)
    return {
      violation: null,
      violation_type: 'Unknown',
      findings: [],
      citations: [],
      severity: 'info',
      confidence: 0,
      confidence_level: CONFIDENCE_LEVELS.ASSESSMENT,
      analyzed: false,
      error: err.message,
      room_area: roomArea
    }
  }
}

/**
 * Batch analyze multiple tenant images
 * @param {Array} images - Array of {path, roomArea} objects
 * @returns {Object[]} Array of analysis results
 */
export async function analyzeTenantImageBatch(images) {
  if (!images?.length) return []
  
  // Process images in parallel with concurrency limit
  const BATCH_SIZE = 3
  const results = []
  
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(img => analyzeTenantImage(img.path, img.roomArea).catch(err => ({
        violation: null,
        violation_type: 'Unknown',
        findings: [],
        citations: [],
        severity: 'info',
        confidence: 0,
        confidence_level: CONFIDENCE_LEVELS.ASSESSMENT,
        analyzed: false,
        error: err.message,
        room_area: img.roomArea
      })))
    )
    results.push(...batchResults)
  }
  
  return results
}
