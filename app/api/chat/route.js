// app/api/chat/route.js - OPTIMIZED V2: Maximum effectiveness for Washtenaw County operators
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics } from '@/lib/usage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Lazy load heavy dependencies
let Anthropic = null
let searchDocuments = null

async function getAnthropicClient() {
  if (!Anthropic) {
    const module = await import('@anthropic-ai/sdk')
    Anthropic = module.default
  }
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

async function getSearchDocuments() {
  if (!searchDocuments) {
    const module = await import('@/lib/searchDocs')
    searchDocuments = module.searchDocuments
  }
  return searchDocuments
}

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const VISION_TIMEOUT_MS = 25000
const ANSWER_TIMEOUT_MS = 40000
const TOPK = 28
const PRIORITY_TOPK = 10

// Priority source patterns - these contain violation classification rules
const PRIORITY_SOURCES = {
  critical: [/violation\s*types/i, /enforcement\s*action/i],
  high: [/mi.*modified.*food.*code/i, /fda.*food.*code/i, /mcl.*act.*92/i],
  medium: [/cooking.*temp/i, /cooling.*foods/i, /cross.*contam/i, /date.*mark/i],
}

// Topic detection for smarter retrieval
const TOPIC_KEYWORDS = {
  temperature: ['temp', 'cold', 'hot', 'holding', 'cooling', 'cooking', 'thaw', 'refrigerat', '41', '135', '165', 'thermometer'],
  sanitation: ['clean', 'sanitiz', 'wash', 'dirty', 'soil', 'debris', 'pest', 'rodent', 'insect', 'roach'],
  storage: ['storage', 'shelf', 'container', 'label', 'date mark', 'fifo', 'cover', 'raw', 'ready-to-eat'],
  equipment: ['equipment', 'sink', 'refrigerator', 'freezer', 'hood', 'vent', 'broken', 'repair'],
  personnel: ['handwash', 'glove', 'hair', 'sick', 'ill', 'vomit', 'diarrhea', 'bare hand'],
  crosscontam: ['cross', 'contam', 'raw meat', 'above', 'below', 'separate'],
}

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms)),
  ])
}

function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const s = dataUrl.trim()
  if (!s) return null
  if (s.startsWith('data:image/')) {
    const parts = s.split(',')
    return parts[1] || null
  }
  return s
}

function getMediaTypeFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'image/jpeg'
  if (dataUrl.includes('data:image/png')) return 'image/png'
  if (dataUrl.includes('data:image/gif')) return 'image/gif'
  if (dataUrl.includes('data:image/webp')) return 'image/webp'
  return 'image/jpeg'
}

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

function getLastUserText(messages) {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user') {
      if (typeof m.content === 'string') return safeText(m.content)
      if (Array.isArray(m.content)) {
        const t = m.content
          .map((c) => (typeof c === 'string' ? c : c?.text))
          .filter(Boolean)
          .join(' ')
        return safeText(t)
      }
    }
  }
  return ''
}

// Detect topics in user query for smarter retrieval
function detectTopics(text) {
  const lower = text.toLowerCase()
  const detected = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(topic)
    }
  }
  return detected
}

// Build enriched query for better retrieval
function enrichQuery(originalQuery, visionContext = '', detectedTopics = []) {
  const parts = [originalQuery]
  
  // Always include violation classification context
  parts.push('Priority Priority-Foundation Core violation classification correction timeframe')
  
  // Add topic-specific terms
  if (detectedTopics.includes('temperature')) {
    parts.push('temperature control TCS time temperature 41F 135F danger zone')
  }
  if (detectedTopics.includes('crosscontam')) {
    parts.push('cross contamination raw ready-to-eat storage separation')
  }
  if (detectedTopics.includes('sanitation')) {
    parts.push('sanitization cleaning frequency food contact surfaces')
  }
  if (detectedTopics.includes('storage')) {
    parts.push('food storage labeling date marking 7 day rule FIFO')
  }
  
  // Add vision context
  if (visionContext) {
    parts.push(visionContext)
  }
  
  return parts.filter(Boolean).join(' ')
}

function getSourcePriority(source) {
  if (!source) return 0
  for (const pattern of PRIORITY_SOURCES.critical) {
    if (pattern.test(source)) return 3
  }
  for (const pattern of PRIORITY_SOURCES.high) {
    if (pattern.test(source)) return 2
  }
  for (const pattern of PRIORITY_SOURCES.medium) {
    if (pattern.test(source)) return 1
  }
  return 0
}

function isPrioritySource(source) {
  return getSourcePriority(source) >= 2
}

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 2500)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

// Build context with clear section markers
function buildContextString(docs) {
  const MAX_CHARS = 65000
  
  // Group by priority
  const critical = docs.filter(d => getSourcePriority(d.source) === 3)
  const high = docs.filter(d => getSourcePriority(d.source) === 2)
  const medium = docs.filter(d => getSourcePriority(d.source) === 1)
  const other = docs.filter(d => getSourcePriority(d.source) === 0)
  
  let buf = ''
  
  // Critical docs first (Violation Types, Enforcement Action)
  if (critical.length > 0) {
    buf += '══════════════════════════════════════════════════════════════\n'
    buf += '🚨 VIOLATION CLASSIFICATION & ENFORCEMENT RULES\n'
    buf += '══════════════════════════════════════════════════════════════\n\n'
    for (const d of critical) {
      const chunk = `📄 ${d.source || 'Unknown'} (pg ${d.page ?? 'N/A'})\n${d.text}\n\n---\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS * 0.4) break
      buf += chunk
    }
  }
  
  // High priority (Food codes)
  if (high.length > 0) {
    buf += '\n══════════════════════════════════════════════════════════════\n'
    buf += '📋 FOOD CODE REGULATIONS\n'
    buf += '══════════════════════════════════════════════════════════════\n\n'
    for (const d of high) {
      const chunk = `📄 ${d.source || 'Unknown'} (pg ${d.page ?? 'N/A'})\n${d.text}\n\n---\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS * 0.75) break
      buf += chunk
    }
  }
  
  // Medium and other
  const remaining = [...medium, ...other]
  if (remaining.length > 0) {
    buf += '\n══════════════════════════════════════════════════════════════\n'
    buf += '📚 ADDITIONAL GUIDANCE\n'
    buf += '══════════════════════════════════════════════════════════════\n\n'
    for (const d of remaining) {
      const chunk = `📄 ${d.source || 'Unknown'} (pg ${d.page ?? 'N/A'})\n${d.text}\n\n---\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS) break
      buf += chunk
    }
  }
  
  return buf.trim()
}

// Calculate response confidence based on context quality
function calculateConfidence(docs, visionIssues, hasImage) {
  let score = 0
  
  // Critical docs present?
  const criticalCount = docs.filter(d => getSourcePriority(d.source) === 3).length
  if (criticalCount >= 2) score += 40
  else if (criticalCount === 1) score += 25
  
  // High priority docs?
  const highCount = docs.filter(d => getSourcePriority(d.source) === 2).length
  if (highCount >= 3) score += 30
  else if (highCount >= 1) score += 20
  
  // Total docs retrieved
  if (docs.length >= 15) score += 15
  else if (docs.length >= 8) score += 10
  
  // Vision analysis quality
  if (hasImage && visionIssues.length > 0) score += 15
  else if (hasImage && visionIssues.length === 0) score -= 10
  
  if (score >= 70) return 'HIGH'
  if (score >= 45) return 'MEDIUM'
  return 'LOW'
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
  }
}

export async function POST(request) {
  const startedAt = Date.now()

  try {
    // 1. Verify Anthropic API key
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 500 }
      )
    }

    // 2. Check if service is enabled
    if (!isServiceEnabled()) {
      return NextResponse.json(
        { error: getMaintenanceMessage() || 'Service temporarily unavailable.' },
        { status: 503 }
      )
    }

    // 3. CSRF protection
    try {
      await validateCSRF(request)
    } catch (e) {
      logger.warn('CSRF validation failed', { error: e?.message })
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 })
    }

    // 4. Parse request
    const body = await request.json().catch(() => ({}))
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const county = safeText(body?.county || 'washtenaw') || 'washtenaw'

    const imageDataUrl = body?.image || body?.imageBase64 || body?.image_url
    const hasImage = Boolean(imageDataUrl)
    const imageBase64 = hasImage ? extractBase64FromDataUrl(imageDataUrl) : null
    const imageMediaType = hasImage ? getMediaTypeFromDataUrl(imageDataUrl) : null

    // 5. Get user for usage tracking
    let userId = null
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
            set(name, value, options) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name, options) {
              cookieStore.set({ name, value: '', ...options })
            },
          },
        }
      )
      const { data } = await supabase.auth.getUser()
      userId = data?.user?.id || null
    } catch (e) {
      logger.warn('Auth check failed (continuing)', { error: e?.message })
    }

    const lastUserText = getLastUserText(messages)
    const effectiveUserPrompt = lastUserText || (hasImage ? 'Analyze this photo for health code violations.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // Detect topics for smarter retrieval
    const detectedTopics = detectTopics(effectiveUserPrompt)

    // 6. Initialize AI clients
    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    // ========================================================================
    // PHASE 1: VISION PRE-PASS (if image provided)
    // ========================================================================
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionIssues = []
    
    if (hasImage && imageBase64) {
      try {
        logger.info('Vision analysis started')

        const visionMessages = [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `You are an expert Washtenaw County health inspector doing a walk-through. Analyze this photo.

Return ONLY this JSON (no other text):
{
  "area": "kitchen/walk-in/prep/storage/dining/restroom/unknown",
  "summary": "2-3 sentences: what you see, overall cleanliness, any immediate concerns",
  "search_terms": "regulatory keywords to look up (e.g., 'cold holding temperature 41F TCS food date marking labels')",
  "issues": [
    {
      "description": "Specific issue observed",
      "severity": "critical/serious/minor",
      "category": "temperature/sanitation/storage/equipment/personnel/crosscontam"
    }
  ],
  "positives": ["Things done correctly (if any)"],
  "unclear": ["Things you can't determine from this angle/quality"]
}

Focus on:
- Temperature: anything that should be cold/hot - estimate if visible
- Storage: raw/cooked separation, containers, labels, dates
- Cleanliness: surfaces, floors, equipment condition
- Cross-contamination risks: what's stored above/below what
- Equipment: working condition, cleanliness
- Personnel practices: if people visible

Be specific. If you see a thermometer, read it. If you see dates, note them.`,
              },
            ],
          },
        ]

        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 1200,
            messages: visionMessages,
          }),
          VISION_TIMEOUT_MS,
          'VISION_TIMEOUT'
        )

        const visionText = visionResp.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('')

        try {
          const jsonMatch = visionText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            visionSummary = safeText(parsed?.summary || '')
            visionSearchTerms = safeText(parsed?.search_terms || '')
            
            // Extract issues with severity
            if (Array.isArray(parsed?.issues)) {
              visionIssues = parsed.issues.map(i => ({
                description: safeText(i.description || ''),
                severity: safeText(i.severity || 'minor'),
                category: safeText(i.category || 'other'),
              })).filter(i => i.description)
            }
            
            // Add positives and unclear to summary for context
            if (parsed?.positives?.length > 0) {
              visionSummary += ` Positives: ${parsed.positives.join(', ')}.`
            }
            if (parsed?.unclear?.length > 0) {
              visionSummary += ` Unclear from photo: ${parsed.unclear.join(', ')}.`
            }
            
            // Add detected categories to topics
            visionIssues.forEach(i => {
              if (i.category && !detectedTopics.includes(i.category)) {
                detectedTopics.push(i.category)
              }
            })
          } else {
            visionSummary = safeText(visionText).slice(0, 600)
          }
        } catch {
          visionSummary = safeText(visionText).slice(0, 600)
        }

        logger.info('Vision analysis complete', {
          summaryLen: visionSummary.length,
          issuesCount: visionIssues.length,
          detectedTopics,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { error: e?.message || String(e) })
        visionSummary = 'Vision analysis unavailable - proceeding with text analysis only.'
      }
    }

    // ========================================================================
    // PHASE 2: DOCUMENT RETRIEVAL
    // ========================================================================
    const retrievalQuery = enrichQuery(effectiveUserPrompt, visionSearchTerms, detectedTopics)

    logger.info('Document search started', {
      county,
      queryLength: retrievalQuery.length,
      detectedTopics,
      topK: TOPK,
    })

    let docs = await searchDocumentsFn(retrievalQuery, county, TOPK)
    docs = dedupeByText(docs || [])

    // Ensure critical documents are present
    const criticalHits = (docs || []).filter((d) => getSourcePriority(d.source) === 3).length
    if (criticalHits < 2) {
      logger.warn('Insufficient critical docs, fetching manually', { criticalHits })
      
      const priorityQuery = 'Violation Types Priority Foundation Core correction timeframe Enforcement Action progressive enforcement Washtenaw County'
      const extra = await searchDocumentsFn(priorityQuery, county, PRIORITY_TOPK)
      
      if (extra && extra.length > 0) {
        docs = dedupeByText([...extra, ...(docs || [])])
        logger.info('Added critical docs via fallback', { added: extra.length })
      }
    }

    // Sort by priority, then relevance score
    docs.sort((a, b) => {
      const ap = getSourcePriority(a.source)
      const bp = getSourcePriority(b.source)
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const context = buildContextString(docs)
    const confidence = calculateConfidence(docs, visionIssues, hasImage)

    if (!context) {
      return NextResponse.json(
        {
          message: "I couldn't find relevant regulations for your question. Try:\n• Being more specific about the issue\n• Uploading a clearer photo\n• Asking about a specific violation type",
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // ========================================================================
    // PHASE 3: GENERATE ANSWER
    // ========================================================================
    const systemPrompt = `You are ProtocolLM, an AI compliance assistant for Washtenaw County, Michigan food service establishments.

## YOUR ROLE
Help operators catch violations BEFORE the health inspector. Be direct, specific, and actionable.

## VIOLATION CLASSIFICATION (MEMORIZE THIS)
**Priority (P)** - Immediate health risk, correct NOW or within 10 days
Examples: food temp violations, bare hand contact with RTE food, sick employee working, no handwashing

**Priority Foundation (Pf)** - Supports Priority compliance, correct within 10 days  
Examples: no thermometer, missing sanitizer test strips, broken handwash sink

**Core (C)** - General sanitation, correct within 90 days
Examples: dirty floors, chipped tiles, minor equipment issues

## ENFORCEMENT LADDER
1. Violation cited → correction deadline given
2. Not fixed → Office Conference
3. Still not fixed → Informal Hearing  
4. Still not fixed → License suspension/revocation

**Immediate closure triggers:** no water/power, sewage backup, severe pest infestation, foodborne illness outbreak

## OUTPUT FORMAT (OPERATORS ARE BUSY - BE BRIEF)

### 📸 What I See
[1-2 sentences max describing the photo/situation]

### 🚨 Violations Found

**[P] Issue Name** (XX% confidence)
↳ Risk: [Why this matters - 1 sentence]
↳ Fix: [Specific action] | Deadline: [Immediate/10 days]
↳ Ref: [Source document, page]

**[Pf] Issue Name** (XX% confidence)  
↳ Risk: [Why this matters]
↳ Fix: [Specific action] | Deadline: 10 days
↳ Ref: [Source]

**[C] Issue Name** (XX% confidence)
↳ Risk: [Why this matters]
↳ Fix: [Specific action] | Deadline: 90 days
↳ Ref: [Source]

### ✅ What's Good
[Quick note on anything done correctly - builds trust, shows balanced assessment]

### ⚡ Action Items
1. [Most urgent action - do today]
2. [Next priority]
3. [Can wait]

---

## RULES
✓ Classify EVERY violation as P, Pf, or C
✓ State correction deadlines for each violation
✓ Cite your source documents
✓ Give confidence % (be honest: 90%+ only for obvious issues)
✓ Limit to 3-4 most significant violations unless asked for complete list
✓ List Priority violations first, then Pf, then Core
✓ If photo is unclear, say specifically what you need to see
✓ Use bullet points, not paragraphs
✓ If something is clearly wrong, say so confidently

✗ Don't guess at classifications - say "Need more info" if uncertain
✗ Don't cite regulations not in the provided documents
✗ Don't be wishy-washy about clear violations
✗ Don't write long explanations - operators need fast answers
✗ Don't say "potential" or "possible" for obvious issues

## TEMPERATURE QUICK REFERENCE
- Cold TCS foods: ≤41°F (danger zone: 41-135°F)
- Hot holding: ≥135°F
- Cooking: Poultry 165°F, Ground beef 155°F, Whole cuts 145°F
- Cooling: 135→70°F in 2hrs, 70→41°F in next 4hrs (6hr total max)

## REMEMBER
You're helping prevent foodborne illness outbreaks. One avoided Priority violation saves them $200-500+. Missing a real violation is worse than flagging a false positive.`

    // Build issues context for the prompt
    let issuesContext = ''
    if (visionIssues.length > 0) {
      issuesContext = '\n\n### ISSUES SPOTTED IN PRELIMINARY SCAN:\n'
      visionIssues.forEach((issue, i) => {
        const severityEmoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'serious' ? '🟠' : '🟡'
        issuesContext += `${i + 1}. ${severityEmoji} [${issue.severity.toUpperCase()}] ${issue.description} (${issue.category})\n`
      })
    }

    const userPrompt = `## USER QUESTION
${effectiveUserPrompt || '[Photo analysis requested]'}

## PHOTO ANALYSIS
${visionSummary || '[No photo provided]'}${issuesContext}

## WASHTENAW COUNTY REGULATIONS
${context}`

    let finalText = ''
    try {
      logger.info('Generating final answer')

      const finalMessages = []
      
      if (hasImage && imageBase64) {
        finalMessages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        })
      } else {
        finalMessages.push({
          role: 'user',
          content: userPrompt,
        })
      }

      const answerResp = await withTimeout(
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 1800,
          system: systemPrompt,
          messages: finalMessages,
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      finalText = answerResp.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
    } catch (e) {
      logger.error('Answer generation failed', { error: e?.message || String(e) })
      
      // Provide graceful fallback with vision summary if available
      if (visionSummary && visionIssues.length > 0) {
        const fallbackIssues = visionIssues.map(i => `- ${i.description} (${i.severity})`).join('\n')
        return NextResponse.json(
          {
            message: `⚠️ Full analysis timed out, but here's what I spotted:\n\n${visionSummary}\n\n**Potential issues:**\n${fallbackIssues}\n\nPlease try again for complete violation classification and code references.`,
            confidence: 'LOW',
          },
          { status: 200 }
        )
      }
      
      return NextResponse.json(
        {
          message: 'Analysis timed out. Try uploading a clearer photo or asking a more specific question.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    const criticalDocsUsed = docs.filter(d => getSourcePriority(d.source) === 3).length
    const highDocsUsed = docs.filter(d => getSourcePriority(d.source) === 2).length

    logger.info('Response generated', {
      criticalDocs: criticalDocsUsed,
      highPriorityDocs: highDocsUsed,
      totalDocs: docs.length,
      hasImage,
      visionIssues: visionIssues.length,
      confidence,
      durationMs: Date.now() - startedAt,
    })

    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        message: finalText || 'No response generated.',
        confidence,
        _meta: {
          criticalDocsUsed,
          highPriorityDocsUsed: highDocsUsed,
          totalDocsRetrieved: docs.length,
          visionIssuesSpotted: visionIssues.length,
          detectedTopics,
          model: CLAUDE_MODEL,
          durationMs: Date.now() - startedAt,
        }
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
