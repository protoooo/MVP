// app/api/chat/route.js - OPTIMIZED: Maximum effectiveness for Washtenaw County operators
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
const VISION_TIMEOUT_MS = 30000
const ANSWER_TIMEOUT_MS = 45000
const TOPK = 30 // Increased from 24 to get more context
const PRIORITY_TOPK = 12 // Increased from 10

// ✅ CRITICAL: These documents contain violation classification rules
const PRIORITY_SOURCE_MATCHERS = [
  /violation\s*types/i,
  /enforcement\s*action/i,
]

// ✅ NEW: Enhanced query enrichment for better retrieval
function enrichQuery(originalQuery, visionContext = '') {
  const enrichments = []
  
  // Add classification keywords
  enrichments.push('Priority Priority-Foundation Core violation classification correction window')
  
  // Add enforcement keywords
  enrichments.push('Enforcement Action Washtenaw County imminent hazard progressive enforcement')
  
  // Vision-specific enrichment
  if (visionContext) {
    enrichments.push(visionContext)
  }
  
  // Build final query
  return [originalQuery, ...enrichments].filter(Boolean).join('\n')
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

function isPrioritySource(source) {
  if (!source) return false
  return PRIORITY_SOURCE_MATCHERS.some((re) => re.test(source))
}

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 3000)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

// ✅ IMPROVED: Better context building with section markers
function buildContextString(docs) {
  const MAX_CHARS = 70000 // Increased from 60000
  
  // Separate priority docs from others
  const priorityDocs = docs.filter(d => isPrioritySource(d.source))
  const regularDocs = docs.filter(d => !isPrioritySource(d.source))
  
  let buf = ''
  
  // Add priority docs first with special markers
  if (priorityDocs.length > 0) {
    buf += '=== CRITICAL CLASSIFICATION & ENFORCEMENT DOCUMENTS ===\n\n'
    for (const d of priorityDocs) {
      const src = d.source || 'Unknown'
      const pg = d.page ?? 'N/A'
      const chunk = `[SOURCE: ${src} | PAGE: ${pg}]\n${d.text}\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS) break
      buf += chunk
    }
    buf += '\n=== ADDITIONAL REGULATORY CONTEXT ===\n\n'
  }
  
  // Add regular docs
  for (const d of regularDocs) {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const chunk = `[SOURCE: ${src} | PAGE: ${pg}]\n${d.text}\n\n`
    if ((buf.length + chunk.length) > MAX_CHARS) break
    buf += chunk
  }
  
  return buf.trim()
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
    const effectiveUserPrompt = lastUserText || (hasImage ? 'Analyze this photo for Washtenaw County food safety violations and classify them as Priority, Priority Foundation, or Core.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

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
                text: `You are a Washtenaw County food safety inspector. Analyze this photo for violations.

Return ONLY a JSON object:
{
  "summary": "What you see (2-3 sentences)",
  "search_terms": "Keywords for finding relevant regulations (e.g., 'temperature control Priority violation cold holding 41F labels date marking')",
  "issues_spotted": ["Specific issue 1", "Specific issue 2"]
}

Look for:
- Temperature violations (cold >41°F, hot <135°F)
- Cross-contamination (raw meat above ready-to-eat food)
- Missing labels or date marks
- Dirty surfaces, pest signs
- Broken equipment, improper storage

Be specific about what you see.`,
              },
            ],
          },
        ]

        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            messages: visionMessages,
          }),
          VISION_TIMEOUT_MS,
          'ANTHROPIC_TIMEOUT'
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
            visionIssues = Array.isArray(parsed?.issues_spotted) ? parsed.issues_spotted : []
          } else {
            visionSummary = safeText(visionText).slice(0, 500)
          }
        } catch {
          visionSummary = safeText(visionText).slice(0, 500)
          visionSearchTerms = ''
          visionIssues = []
        }

        logger.info('Vision analysis complete', {
          summaryLen: visionSummary.length,
          searchTermsLen: visionSearchTerms.length,
          issuesCount: visionIssues.length,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { error: e?.message || String(e) })
      }
    }

    // ========================================================================
    // PHASE 2: ENHANCED DOCUMENT RETRIEVAL
    // ========================================================================
    const retrievalQuery = enrichQuery(
      effectiveUserPrompt,
      visionSearchTerms
    )

    logger.info('Document search started', {
      county,
      queryLength: retrievalQuery.length,
      topK: TOPK,
    })

    let docs = await searchDocumentsFn(retrievalQuery, county, TOPK)
    docs = dedupeByText(docs || [])

    // ✅ CRITICAL: Ensure priority documents are present
    const priorityHits = (docs || []).filter((d) => isPrioritySource(d.source)).length
    if (priorityHits < 3) {
      logger.warn('Insufficient priority docs, fetching manually', { priorityHits })
      
      const priorityQuery = enrichQuery(
        'Violation Types Priority Foundation Core correction window Enforcement Action Washtenaw County',
        ''
      )
      const extra = await searchDocumentsFn(priorityQuery, county, PRIORITY_TOPK)
      
      if (extra && extra.length > 0) {
        docs = dedupeByText([...extra, ...(docs || [])])
        logger.info('Added priority docs via fallback', { count: extra.length })
      }
    }

    // Sort: priority sources first, then by score
    docs.sort((a, b) => {
      const ap = isPrioritySource(a.source) ? 1 : 0
      const bp = isPrioritySource(b.source) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const context = buildContextString(docs)

    if (!context) {
      return NextResponse.json(
        {
          message: 'I couldn\'t find relevant Washtenaw County regulations for this request. Please try rephrasing your question or uploading a clearer photo.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // ========================================================================
    // PHASE 3: OPTIMIZED SYSTEM PROMPT
    // ========================================================================
    const systemPrompt = `You are protocolLM, a Washtenaw County food safety compliance assistant.

# YOUR MISSION
Help restaurant operators catch violations BEFORE the health inspector arrives. Be direct, specific, and actionable.

# CRITICAL DOCUMENTS PROVIDED
You have access to:
1. "Violation Types" - Contains Priority (P), Priority Foundation (Pf), and Core (C) classifications
2. "Enforcement Action" - Contains correction windows and enforcement procedures
3. Additional Washtenaw County food code excerpts

# VIOLATION CLASSIFICATION RULES (from Violation Types document)
**Priority (P)**: Most serious - direct foodborne illness risk
- Examples: Temperature abuse, cross-contamination, sick workers, improper handwashing
- Correction: IMMEDIATELY or within 10 days
- Typical fines: $200-500 per violation

**Priority Foundation (Pf)**: Supports Priority compliance
- Examples: No thermometer, missing sanitizer test strips, inadequate handwashing facilities
- Correction: Within 10 days
- Typical fines: $100-300 per violation

**Core (C)**: General sanitation/facility maintenance
- Examples: Dirty floors, improper lighting, minor equipment issues
- Correction: Within 90 days
- Typical fines: $50-150 per violation

# ENFORCEMENT TIMELINE (from Enforcement Action document)
Progressive enforcement (non-imminent hazards):
1. Routine inspection → violations noted
2. If not fixed: Office Conference
3. If still not fixed: Informal Hearing
4. If still not fixed: License suspension/revocation

Imminent health hazards (immediate closure):
- No water/power
- Uncontained foodborne illness outbreak
- Severe pest infestation
- Sewage backup in kitchen
- Fire, flood, or public danger

# YOUR OUTPUT FORMAT

**What I see:**
[Brief description - 1-2 sentences]

**Violations identified:**

**(P) [CONFIDENCE: XX%]** [Violation name]
- **Risk:** Why this matters for food safety
- **Fix by:** [Immediate/10 days/90 days]
- **Action:** Specific steps to correct
- **Source:** [Document name, page]

**(Pf) [CONFIDENCE: XX%]** [Violation name]
- **Risk:** Why this matters
- **Fix by:** [Correction window]
- **Action:** What to do
- **Source:** [Document name, page]

**(C) [CONFIDENCE: XX%]** [Violation name]
- **Risk:** Why this matters
- **Fix by:** [Correction window]
- **Action:** What to do
- **Source:** [Document name, page]

**Key reminders:**
- [Most important takeaway - 1 sentence]
- [Second most important - 1 sentence]

**Need clarification:**
- [What additional info would help?]

**Overall confidence:** [HIGH/MEDIUM/LOW]

# STRICT RULES
1. ✅ ALWAYS classify as P, Pf, or C using the Violation Types document
2. ✅ ALWAYS state correction windows (immediate/10 days/90 days)
3. ✅ ALWAYS cite document sources for your claims
4. ✅ Give probability ranges (e.g., "70-85% confident")
5. ✅ If photo is unclear, say what's unclear and what you need
6. ✅ Focus on violations an inspector would actually cite
7. ✅ Use plain language - operators need fast, clear answers
8. ✅ When something is CLEARLY wrong, state it confidently
9. ❌ NEVER guess at classifications - if you're unsure, say "Need more info"
10. ❌ NEVER cite regulations not in the provided documents

# REMEMBER
- One avoided Priority violation ($200-500) pays for 2-5 months of this service
- False negatives (missing real violations) are worse than false positives
- Operators want fast, actionable answers they can implement RIGHT NOW
- Always explain WHY something is a violation, not just THAT it is`

    const issuesSection = visionIssues.length > 0 
      ? `\n\nPOTENTIAL ISSUES I SPOTTED:\n${visionIssues.map(i => `- ${i}`).join('\n')}` 
      : ''

    const userPrompt = `USER REQUEST:
${effectiveUserPrompt || '[No additional text provided]'}

WHAT I SEE IN THE IMAGE:
${visionSummary || '[No photo provided]'}${issuesSection}

WASHTENAW COUNTY REGULATIONS (use these as your authority):
${context}`

    let finalText = ''
    try {
      logger.info('Generating final answer with Claude')

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
          max_tokens: 2048,
          system: systemPrompt,
          messages: finalMessages,
        }),
        ANSWER_TIMEOUT_MS,
        'ANTHROPIC_TIMEOUT'
      )

      finalText = answerResp.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
    } catch (e) {
      logger.error('Answer generation failed', { error: e?.message || String(e) })
      return NextResponse.json(
        {
          message: 'The analysis timed out. Please try again with a clearer photo or simpler question.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    const priorityDocsUsed = docs.filter(d => isPrioritySource(d.source)).length

    logger.info('Final answer generated', {
      priorityDocsUsed,
      totalDocsUsed: docs.length,
      hasImage,
      visionIssuesCount: visionIssues.length,
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
        confidence: 'HIGH',
        _meta: {
          priorityDocsUsed: priorityDocsUsed,
          totalDocsRetrieved: docs.length,
          visionIssuesSpotted: visionIssues.length,
          model: 'claude-sonnet-4',
        }
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
