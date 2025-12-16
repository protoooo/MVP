// app/api/chat/route.js - PRODUCTION: Washtenaw County Food Safety Assistant
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
const TOPK = 24
const PRIORITY_TOPK = 10

// Keywords that indicate priority documents
const PRIORITY_SOURCE_MATCHERS = [
  /violation\s*types/i,
  /enforcement\s*action/i,
  /correction\s*windows/i,
  /washtenaw.*violation/i,
  /washtenaw.*enforcement/i,
]

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

function buildContextString(docs) {
  const MAX_CHARS = 60000
  let buf = ''
  for (const d of docs) {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const chunk = `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${Number(d.score || 0).toFixed(3)}]\n${d.text}\n`
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
    const effectiveUserPrompt = lastUserText || (hasImage ? 'Analyze this photo for possible Washtenaw County health code violations.' : '')

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
                text: `You are a Washtenaw County food safety expert. Analyze this image for health code violations.

Return ONLY a JSON object with this structure:
{
  "summary": "Brief description of what you see (2-3 sentences)",
  "search_terms": "Keywords for searching Washtenaw County regulations (e.g., 'temperature control cold holding storage labels')",
  "issues_spotted": ["Specific violation 1", "Specific violation 2"]
}

Focus on:
- Temperature violations (hot holding below 135°F, cold holding above 41°F)
- Cross-contamination risks (raw meats above ready-to-eat foods)
- Labeling issues (missing dates, unlabeled containers)
- Cleanliness concerns (visible dirt, pests, improper storage)
- Equipment problems (broken seals, damaged surfaces)

Be specific and actionable.`,
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
    // PHASE 2: DOCUMENT RETRIEVAL
    // ========================================================================
    const retrievalQuery = safeText(
      [
        visionSearchTerms || '',
        effectiveUserPrompt || '',
        'Violation Types Washtenaw County Enforcement Action Priority Priority-Foundation Core correction window 10 days 90 days imminent hazard',
      ]
        .filter(Boolean)
        .join('\n')
    ) || 'Violation Types Enforcement Action Washtenaw County'

    logger.info('Document search started', {
      county,
      queryLength: retrievalQuery.length,
      topK: TOPK,
    })

    let docs = await searchDocumentsFn(retrievalQuery, county, TOPK)
    docs = dedupeByText(docs || [])

    // Ensure we have priority documents
    const priorityHits = (docs || []).filter((d) => isPrioritySource(d.source)).length
    if (priorityHits < 2) {
      logger.warn('Priority docs missing, fetching manually', { priorityHits })
      
      const priorityQuery = 'Violation Types Priority Foundation Core correction Enforcement Action Washtenaw County'
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
          message: 'I could not find relevant Washtenaw County regulations for this request. Please try rephrasing your question or uploading a clearer photo.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // ========================================================================
    // PHASE 3: FINAL ANSWER GENERATION
    // ========================================================================
    const systemPrompt = `You are protocolLM, a Washtenaw County food safety compliance assistant for restaurants and food service establishments.

# CRITICAL CONTEXT SOURCES (always reference these):
1. **"Violation Types" document** → Tells you Priority (P), Priority Foundation (Pf), Core (C) classifications + correction windows
2. **"Enforcement Action" document** → Tells you progressive enforcement (warnings → conferences → hearings → license actions)

# YOUR ROLE:
Help restaurant operators catch violations BEFORE the health inspector does. Be direct, actionable, and specific.

# VIOLATION CLASSIFICATIONS (from Washtenaw County):
- **Priority (P)**: Imminent health hazard - must fix IMMEDIATELY or within 10 days
  Examples: Temperature abuse, cross-contamination, sick workers, pest infestation
- **Priority Foundation (Pf)**: Supports food safety - fix within 10 days
  Examples: Improper cooling procedures, inadequate handwashing facilities, missing thermometers
- **Core (C)**: General sanitation - fix within 90 days
  Examples: Minor equipment wear, facility maintenance, signage

# OUTPUT FORMAT (use exactly this structure):

**What I see in the photo:**
[Describe what's visible - equipment, food, storage, conditions]

**Likely violations:**
- **(P/Pf/C)** [CONFIDENCE: XX-YY%] Brief description
  - **Why this matters:** Health risk explanation
  - **Correction window:** Immediate / 10 days / 90 days
  - **What to do:** Specific action steps

**Regulatory basis:**
- Cite specific requirements from the provided documents
- Reference Michigan Food Code sections when mentioned

**Questions to confirm:**
- What additional info would help verify these violations?
- What angles/photos would be helpful?

**Confidence assessment:**
- Overall confidence: HIGH/MEDIUM/LOW
- Based on: [Visibility, regulatory clarity, typical inspection findings]

# RULES:
1. ALWAYS classify violations as P, Pf, or C using the "Violation Types" document
2. ALWAYS state correction windows (immediate/10 days/90 days)
3. Use ONLY the provided regulatory excerpts for claims about rules
4. If photo is unclear, say what's unclear and what you need
5. Provide probability ranges (70-85%, 60-75%, etc.)
6. Be direct - don't hedge unnecessarily
7. Focus on violations an inspector would likely cite
8. If you see something that's CLEARLY wrong, say so confidently
9. Keep it concise - operators need fast answers

# REMEMBER:
- One avoided Priority violation ($200-500 fine) pays for months of this service
- Your job is to be the "second set of eyes" before inspection
- False negatives (missing violations) are worse than false positives
- When in doubt about severity, cite the higher classification`

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
