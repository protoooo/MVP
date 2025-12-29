/**
 * AI Analysis module for food safety compliance using Cohere AYA Vision
 * Analyzes images/frames and returns violations with citations from Michigan food regulations
 */

import fs from 'fs'
import path from 'path'
import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'

// Violation detection quality thresholds
const MIN_VIOLATIONS_QUALITY = 2  // Minimum number of high-quality violations to report
const MAX_VIOLATIONS_QUESTIONABLE = 10  // Maximum number of low-quality violations to avoid

// Configuration constants
const COHERE_API_KEY = process.env.COHERE_API_KEY
const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro'
const COHERE_API_URL = process.env.COHERE_API_URL || 'https://api.cohere.com/v2/chat'

// Supabase for document search
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Violation type keywords for classification
const VIOLATION_KEYWORDS = {
  chemicalHandling: ['chemical', 'cleaner', 'toxic', 'sanitizer', 'bleach', 'spray bottle'],
  timeTemperature: ['temperature', 'cold hold', 'hot hold', 'cooling', 'reheating', 'thermometer'],
  crossContamination: ['cross', 'contamination', 'raw', 'ready-to-eat', 'separate'],
  handwashing: ['handwash', 'hand wash', 'hand sink'],
  pestControl: ['pest', 'rodent', 'insect', 'fly', 'droppings'],
  labeling: ['label', 'date', 'expir'],
  facilities: ['floor', 'wall', 'ceiling', 'equipment', 'surface']
}

// Severity indicators
const SEVERITY_KEYWORDS = {
  critical: ['critical', 'immediate', 'danger', 'illness', 'outbreak'],
  major: ['major', 'significant', 'repeat']
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

// Search Michigan regulation documents for relevant citations
async function searchRegulations(query, topK = 5) {
  if (!cohere || !supabase) {
    console.warn('[aiAnalysis] Cohere or Supabase not configured, skipping regulation search')
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

    // Validate embedding response structure
    if (!embeddingResponse || !embeddingResponse.embeddings) {
      console.warn('[aiAnalysis] Invalid embedding response structure')
      return []
    }

    const floatEmbeddings = embeddingResponse.embeddings.float
    if (!Array.isArray(floatEmbeddings) || floatEmbeddings.length === 0) {
      console.warn('[aiAnalysis] No float embeddings returned')
      return []
    }

    const queryEmbedding = floatEmbeddings[0]
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.warn('[aiAnalysis] Invalid query embedding format')
      return []
    }

    // Search documents using vector similarity
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.25,
      match_count: topK * 2,
      filter_county: 'general',
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
      source: documents[r.index]?.metadata?.source || 'Michigan Food Code',
      page: documents[r.index]?.metadata?.page_estimate || 'N/A',
      text: documents[r.index]?.content || '',
      score: r.relevanceScore,
    }))
  } catch (err) {
    console.error('[aiAnalysis] Regulation search failed:', err.message)
    return []
  }
}

// Extract JSON from AI response with robust error handling
function extractJsonFromResponse(text) {
  const s = String(text || '').trim()
  if (!s) return null
  
  // Try to find JSON block with multiple strategies
  
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
          console.log('[aiAnalysis] Successfully parsed JSON using strategy 1 (balanced braces)')
          return parsed
        } catch (parseErr) {
          console.warn('[aiAnalysis] JSON parse error (strategy 1):', parseErr.message)
          // Continue to next strategy
        }
        break // Found balanced braces but failed to parse, try other strategies
      }
    }
  }
  
  // Strategy 2: Try to extract JSON from markdown code blocks
  const codeBlockMatch = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1])
      console.log('[aiAnalysis] Successfully parsed JSON using strategy 2 (markdown code block)')
      return parsed
    } catch (parseErr) {
      console.warn('[aiAnalysis] JSON parse error (strategy 2):', parseErr.message)
    }
  }
  
  // Strategy 3: Try the entire string as JSON
  if (s.startsWith('{') && s.endsWith('}')) {
    try {
      const parsed = JSON.parse(s)
      console.log('[aiAnalysis] Successfully parsed JSON using strategy 3 (whole string)')
      return parsed
    } catch (parseErr) {
      console.warn('[aiAnalysis] JSON parse error (strategy 3):', parseErr.message)
    }
  }
  
  // Strategy 4: Try to clean and fix common JSON issues
  try {
    // Remove trailing commas, fix common issues
    let cleaned = s.slice(start !== -1 ? start : 0)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
    cleaned = cleaned.replace(/[\r\n\t]/g, ' ') // Remove newlines and tabs
    cleaned = cleaned.replace(/\s+/g, ' ') // Normalize whitespace
    
    // Find the last complete JSON object
    let lastCloseBrace = cleaned.lastIndexOf('}')
    if (lastCloseBrace !== -1) {
      const firstOpenBrace = cleaned.indexOf('{')
      if (firstOpenBrace !== -1 && firstOpenBrace < lastCloseBrace) {
        const jsonStr = cleaned.slice(firstOpenBrace, lastCloseBrace + 1)
        const parsed = JSON.parse(jsonStr)
        console.log('[aiAnalysis] Successfully parsed JSON using strategy 4 (cleaned)')
        return parsed
      }
    }
  } catch (parseErr) {
    console.warn('[aiAnalysis] JSON parse error (strategy 4):', parseErr.message)
  }
  
  // Strategy 5: Try to extract the first complete object even if there's trailing text
  if (start !== -1) {
    try {
      let depth = 0
      let end = start
      for (let i = start; i < s.length; i++) {
        if (s[i] === '{') depth++
        if (s[i] === '}') {
          depth--
          if (depth === 0) {
            end = i + 1
            break
          }
        }
      }
      if (end > start) {
        const jsonStr = s.slice(start, end)
        // Try to fix unescaped quotes and other common issues
        let fixed = jsonStr
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        
        const parsed = JSON.parse(fixed)
        console.log('[aiAnalysis] Successfully parsed JSON using strategy 5 (fixed format)')
        return parsed
      }
    } catch (parseErr) {
      console.warn('[aiAnalysis] JSON parse error (strategy 5):', parseErr.message)
    }
  }
  
  console.error('[aiAnalysis] All JSON extraction strategies failed')
  return null
}

// Infer violation type and severity based on content using configured keywords
function inferViolationDetails(description) {
  const lower = (description || '').toLowerCase()
  
  // Helper to check if text contains any keyword from array
  const containsAny = (keywords) => keywords.some(k => lower.includes(k))
  
  let type = 'Sanitation'
  let category = 'Core'
  let severity = 'minor'
  
  // Type inference using configured keywords
  if (containsAny(VIOLATION_KEYWORDS.chemicalHandling)) {
    type = 'Chemical Handling'
    category = 'Priority'
    severity = 'major'
  } else if (containsAny(VIOLATION_KEYWORDS.timeTemperature)) {
    type = 'Time/Temperature'
    category = 'Priority'
    severity = 'critical'
  } else if (containsAny(VIOLATION_KEYWORDS.crossContamination)) {
    type = 'Cross-Contamination'
    category = 'Priority'
    severity = 'critical'
  } else if (containsAny(VIOLATION_KEYWORDS.handwashing)) {
    type = 'Handwashing'
    category = 'Priority Foundation'
    severity = 'major'
  } else if (containsAny(VIOLATION_KEYWORDS.pestControl)) {
    type = 'Pest Control'
    category = 'Core'
    severity = 'major'
  } else if (containsAny(VIOLATION_KEYWORDS.labeling)) {
    type = 'Labeling/Dating'
    category = 'Core'
    severity = 'minor'
  } else if (containsAny(VIOLATION_KEYWORDS.facilities)) {
    type = 'Physical Facilities'
    category = 'Core'
    severity = 'minor'
  }
  
  // Severity inference using configured keywords
  if (containsAny(SEVERITY_KEYWORDS.critical)) {
    severity = 'critical'
  } else if (containsAny(SEVERITY_KEYWORDS.major)) {
    severity = 'major'
  }
  
  return { type, category, severity }
}

/**
 * Main image analysis function using Cohere AYA Vision
 * @param {string} imageInput - Path to image file or base64 data URL
 * @returns {Object} Analysis results with violations and citations
 */
export async function analyzeImage(imageInput) {
  // Handle case when Cohere is not configured
  if (!cohere) {
    console.warn('[aiAnalysis] Cohere API key not configured, returning placeholder result')
    return {
      violation: null,
      violation_type: 'None',
      category: 'Core',
      findings: [],
      citations: [],
      severity: 'info',
      confidence: 0,
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

    // Build the analysis prompt
    const systemPrompt = `You are a Michigan food safety compliance expert analyzing images of food service establishments.
Your task is to identify any food safety violations based on Michigan Food Code regulations.

CRITICAL INSTRUCTIONS - ACCURACY AND CERTAINTY:
1. Analyze the image carefully for visible food safety concerns
2. ONLY report what you can DIRECTLY SEE and VERIFY in the image
3. DO NOT make assumptions about food state (raw vs cooked) unless extremely clear
4. DO NOT report potential violations based on assumptions
5. DO NOT repeat the same finding in multiple places - be concise
6. Be specific about locations and items
7. If you cannot clearly determine something, DO NOT report it as a violation
8. Use qualified language ONLY when you have strong visual evidence: "appears to be"
9. When uncertain, skip reporting rather than making false violations

AVOID FALSE POSITIVES:
- NEVER assume food is raw unless you can see clear indicators (pink/red meat, blood, raw texture)
- Many cooked foods look similar to raw (breaded items, processed foods) - DO NOT assume
- Focus on OBVIOUS violations you can verify visually
- When in doubt, DO NOT report it

AVOID REDUNDANCY:
- Do NOT repeat the finding in the first bullet point if it's already stated in the description
- Each bullet point should add NEW information, not restate what was already said
- Be concise and avoid circular statements

FOOD STATE IDENTIFICATION (ONLY report if CERTAIN):
- CLEARLY COOKED food shows: browning, char marks, crispy edges, golden color, grill marks
- CLEARLY RAW food shows: bright pink/red color (meat), translucent appearance, raw texture, blood visible
- PROCESSED/BREADED foods (nuggets, patties, breaded items): ASSUME COOKED unless obvious signs of rawness
- If uncertain whether food is raw or cooked, DO NOT report it as a violation

Return your analysis as valid JSON in this exact format:
{
  "has_violations": boolean,
  "findings": [
    {
      "description": "Clear, specific description of what is observed (avoid repeating this in location/concern)",
      "location": "Where in the image this is visible",
      "concern": "Why this is a food safety concern (new information, not restating description)",
      "regulation_keywords": ["keywords", "for", "searching", "regulations"]
    }
  ],
  "overall_assessment": "Brief summary of compliance status",
  "confidence": 0.0-1.0
}

If the image shows NO violations, return:
{
  "has_violations": false,
  "findings": [],
  "overall_assessment": "No visible food safety violations detected",
  "confidence": 0.9
}

Focus on these key areas:
- Chemical storage and handling (chemicals near food/dishes/prep surfaces - must be IN CONTACT or DIRECTLY ON)
- Temperature control (visible thermometers, steam, frost, food storage conditions)
- Cross-contamination risks (raw/cooked food separation, surfaces)
- Cleanliness and sanitation (visible dirt, grease, debris on surfaces/equipment)
- Handwashing facilities
- Pest control indicators (visible droppings, insects)
- Food labeling and dating
- Physical facility conditions

REMEMBER: Quality over quantity. Better to report ${MIN_VIOLATIONS_QUALITY}-${MIN_VIOLATIONS_QUALITY + 1} certain violations than ${MAX_VIOLATIONS_QUESTIONABLE}+ questionable ones.`

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
                { type: 'text', text: 'Analyze this image for food safety violations.' },
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
      console.error('[aiAnalysis] Could not parse JSON from response')
      console.error('[aiAnalysis] Response text (first 500 chars):', responseText.slice(0, 500))
      console.error('[aiAnalysis] Response text (last 500 chars):', responseText.slice(-500))
      
      // Return a safe default result instead of failing
      return {
        violation: null,
        violation_type: 'Unknown',
        category: 'Core',
        findings: [],
        citations: [],
        severity: 'info',
        confidence: 0.3,
        analyzed: true,
        error: 'Failed to parse AI response - response format was invalid',
        raw_response_preview: responseText.slice(0, 200)
      }
    }

    // If no violations found, return clean result
    if (!analysis.has_violations || !analysis.findings?.length) {
      return {
        violation: null,
        violation_type: 'None',
        category: 'Core',
        findings: [],
        citations: [],
        severity: 'info',
        confidence: analysis.confidence || 0.9,
        overall_assessment: analysis.overall_assessment || 'No visible violations detected',
        analyzed: true
      }
    }

    // Process each finding and search for relevant regulations
    const processedFindings = []
    const allCitations = []

    for (const finding of analysis.findings || []) {
      // Build search query from finding
      const searchQuery = [
        finding.description,
        finding.concern,
        ...(finding.regulation_keywords || [])
      ].filter(Boolean).join(' ')

      // Search for relevant regulations
      const citations = await searchRegulations(searchQuery, 3)
      
      // Infer violation details
      const { type, category, severity } = inferViolationDetails(finding.description + ' ' + finding.concern)

      processedFindings.push({
        description: finding.description,
        location: finding.location,
        concern: finding.concern,
        type,
        category,
        severity,
        citations: citations.map(c => ({
          source: c.source,
          page: c.page,
          excerpt: c.text?.slice(0, 300) || ''
        }))
      })

      allCitations.push(...citations)
    }

    // Determine overall severity
    const severityOrder = { critical: 3, major: 2, minor: 1, info: 0 }
    const maxSeverity = processedFindings.reduce((max, f) => 
      severityOrder[f.severity] > severityOrder[max] ? f.severity : max, 'info')

    // Build primary violation summary
    const primaryFinding = processedFindings[0]
    const primaryCitation = primaryFinding?.citations?.[0]

    return {
      violation: primaryFinding?.description || null,
      violation_type: primaryFinding?.type || 'General',
      category: primaryFinding?.category || 'Core',
      severity: maxSeverity,
      citation: primaryCitation?.source 
        ? `${primaryCitation.source}${primaryCitation.page !== 'N/A' ? ` (p. ${primaryCitation.page})` : ''}`
        : null,
      confidence: analysis.confidence || 0.8,
      findings: processedFindings,
      citations: allCitations.slice(0, 5).map(c => ({
        source: c.source,
        page: c.page,
        excerpt: c.text?.slice(0, 300) || ''
      })),
      overall_assessment: analysis.overall_assessment,
      analyzed: true
    }

  } catch (err) {
    console.error('[aiAnalysis] Analysis failed:', err.message)
    return {
      violation: null,
      violation_type: 'Unknown',
      category: 'Core',
      findings: [],
      citations: [],
      severity: 'info',
      confidence: 0,
      analyzed: false,
      error: err.message
    }
  }
}

/**
 * Batch analyze multiple images for efficiency
 * @param {string[]} imagePaths - Array of image paths
 * @returns {Object[]} Array of analysis results
 */
export async function analyzeImageBatch(imagePaths) {
  if (!imagePaths?.length) return []
  
  // Process images in parallel with concurrency limit
  const BATCH_SIZE = 3
  const results = []
  
  for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
    const batch = imagePaths.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(imgPath => analyzeImage(imgPath).catch(err => ({
        violation: null,
        violation_type: 'Unknown',
        category: 'Core',
        findings: [],
        citations: [],
        severity: 'info',
        confidence: 0,
        analyzed: false,
        error: err.message
      })))
    )
    results.push(...batchResults)
  }
  
  return results
}
