// app/api/chat/route.js
// ProtocolLM - Washtenaw County Food Safety Compliance Engine
// COMPLETE: Multi-user, single-location license enforcement

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics } from '@/lib/usage'
import { validateSingleLocation } from '@/lib/licenseValidation'
import { getUserMemory, updateMemory, buildMemoryContext } from '@/lib/conversationMemory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

let anthropicClient = null
let searchDocuments = null

async function getAnthropicClient() {
  if (!anthropicClient) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

async function getSearchDocuments() {
  if (!searchDocuments) {
    const module = await import('@/lib/searchDocs')
    searchDocuments = module.searchDocuments
  }
  return searchDocuments
}

// Model selection based on subscription tier
async function getModelForUser(userId, supabase) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('plan, price_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !subscription) {
      logger.warn('No subscription found for model selection', { userId })
      throw new Error('No active subscription')
    }

    // Map price IDs to Claude models
    const modelMap = {
      // Starter tier - Haiku ($99/mo, 98% margin at heavy usage)
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY]: 'claude-haiku-4-20250514',
      
      // Professional tier - Sonnet ($149/mo, 85% margin at heavy usage)
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY]: 'claude-sonnet-4-20250514',
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY]: 'claude-sonnet-4-20250514', // Legacy
      
      // Enterprise tier - Opus ($249/mo, designed for multi-location)
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'claude-opus-4-20250514',
    }

    const selectedModel = modelMap[subscription.price_id] || 'claude-sonnet-4-20250514'
    
    logger.info('Model selected for user', { 
      userId, 
      plan: subscription.plan,
      priceId: subscription.price_id?.substring(0, 15) + '***',
      model: selectedModel.split('-')[1]
    })

    return selectedModel

  } catch (error) {
    logger.error('Model selection failed', { error: error.message, userId })
    return 'claude-sonnet-4-20250514'
  }
}

// Time budgets
const VISION_TIMEOUT_MS = 20000
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000

// Retrieval config - UPDATED per Claude's recommendations
const TOPK_PER_QUERY = 25  // up from 18
const MAX_DOCS_FOR_CONTEXT = 40  // up from 28
const PER_SOURCE_CAP = 4

const ALLOWED_LIKELIHOOD = new Set(['Very likely', 'Likely', 'Possible', 'Unclear'])
const ALLOWED_CLASS = new Set(['P', 'Pf', 'C', 'Unclear'])

// ============================================================================
// TEXT UTILITIES
// ============================================================================

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

function safeLine(x) {
  return safeText(x).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function sanitizeOutput(text) {
  let out = safeText(text || '')

  // Strip markdown-ish characters; keep terminal-friendly formatting.
  out = out.replace(/[`#*]/g, '')
  out = out.replace(/\n{3,}/g, '\n\n')

  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  const HARD_LIMIT = 2400
  if (out.length > HARD_LIMIT) {
    out = out.slice(0, HARD_LIMIT).trimEnd()
    out += '\n\n[Response trimmed. Ask a follow-up for more detail.]'
  }
  return out.trim()
}

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms)),
  ])
}

function clampShort(s, max = 140) {
  const x = safeLine(s || '')
  if (!x) return ''
  return x.length > max ? x.slice(0, max - 1).trimEnd() + '…' : x
}

// ============================================================================
// KEYWORD EXTRACTION - NEW per Claude's recommendations
// ============================================================================

function extractSearchKeywords(text) {
  const keywords = []
  
  // Common compliance topics
  const topics = [
    'temperature', 'cooling', 'reheating', 'storage', 'cross contamination',
    'hand washing', 'gloves', 'sanitizer', 'date marking', 'labels',
    'pest', 'cleaning', 'surfaces', 'equipment', 'utensils',
    'thermometer', 'food safety', 'violation', 'inspection', 'permit',
    'refrigeration', 'hot holding', 'cold holding', 'thawing', 'cooking',
    'raw meat', 'ready to eat', 'contamination', 'employee health',
    'chemicals', 'toxic', 'allergen', 'sink', 'drainage', 'ventilation'
  ]
  
  const lower = text.toLowerCase()
  topics.forEach(topic => {
    if (lower.includes(topic)) keywords.push(topic)
  })
  
  return keywords
}

// ============================================================================
// IMAGE HELPERS
// ============================================================================

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

// ============================================================================
// MESSAGE PARSING
// ============================================================================

function getLastUserText(messages) {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user') {
      if (typeof m.content === 'string') return safeLine(m.content)
      if (Array.isArray(m.content)) {
        const t = m.content
          .map((c) => (typeof c === 'string' ? c : c?.text))
          .filter(Boolean)
          .join(' ')
        return safeLine(t)
      }
    }
  }
  return ''
}

function wantsFullAudit(text) {
  const t = safeLine(text).toLowerCase()
  if (!t) return false
  return (
    t.includes('full audit') ||
    t.includes('full-audit') ||
    t.includes('everything you see') ||
    t.includes('check everything') ||
    t.includes('complete audit') ||
    t.includes('detailed scan')
  )
}

function wantsFineInfo(text) {
  const t = safeLine(text).toLowerCase()
  if (!t) return false
  return (
    t.includes('fine') ||
    t.includes('fines') ||
    t.includes('penalt') ||
    t.includes('cost') ||
    t.includes('fee') ||
    t.includes('what happens if')
  )
}

// ============================================================================
// DOCUMENT RETRIEVAL
// ============================================================================

function dedupeByText(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.text) return false
    const key = item.text.slice(0, 200).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sanitizeDocText(str) {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeTitle(title) {
  if (!title || typeof title !== 'string') return ''
  const t = title.trim()
  if (!t) return ''
  return t[0].toUpperCase() + t.slice(1)
}

function normalizeSource(source) {
  if (!source || typeof source !== 'string') return ''
  const s = source.trim()
  const parts = s.split('/').filter(Boolean)
  return normalizeTitle(parts[parts.length - 1] || '')
}

function pickTopDocs(documents, k = MAX_DOCS_FOR_CONTEXT, perSourceCap = PER_SOURCE_CAP) {
  if (!Array.isArray(documents)) return []
  const bySource = {}
  const result = []

  for (const doc of documents) {
    const source = normalizeSource(doc?.metadata?.source || 'Unknown')
    const text = sanitizeDocText(doc?.text || '')
    if (!text) continue

    bySource[source] = bySource[source] || []
    if (bySource[source].length < perSourceCap) {
      bySource[source].push({ ...doc, metadata: { ...doc.metadata, source }, text })
    }
  }

  const flattened = Object.values(bySource).flat()
  flattened.sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))

  for (const doc of flattened) {
    if (result.length >= k) break
    result.push(doc)
  }

  return result
}

// ============================================================================
// FILETYPE HELPERS
// ============================================================================

function isProbablyImage(item) {
  if (!item) return false
  const text = typeof item === 'string' ? item : item?.text || item?.content
  if (typeof text !== 'string') return false
  const lower = text.toLowerCase()
  return lower.includes('data:image') || lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png')
}

function hasStructuredVisionContent(content) {
  if (!Array.isArray(content)) return false
  return content.some((c) => c?.type === 'image' || (typeof c === 'object' && c?.data_url))
}

// ============================================================================
// JSON EXTRACTION
// ============================================================================

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = text.slice(start, end + 1)

  try {
    return JSON.parse(candidate)
  } catch {}
  return null
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function getUserFriendlyErrorMessage(errorMessage) {
  if (errorMessage === 'VISION_TIMEOUT') {
    return 'Vision processing timed out. Please try again with a clearer image or smaller file.'
  } else if (errorMessage === 'RETRIEVAL_TIMEOUT') {
    return 'Search timed out. Try again with a shorter question.'
  } else if (errorMessage === 'ANSWER_TIMEOUT') {
    return 'Response generation timed out. System may be busy - try again in 10 seconds.'
  } else if (errorMessage === 'EMBEDDING_TIMEOUT') {
    return 'Search processing timed out. Please try again.'
  }
  return 'Unable to process request. Please try again.'
}

// ============================================================================
// LOGGING
// ============================================================================

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    logger.warn('Usage logging failed', { error: e?.message })
  }
}

function buildCacheStats(usage) {
  if (!usage) return null
  const inputTokens = usage.input_tokens || 0
  const cacheCreate = usage.cache_creation_input_tokens || 0
  const cacheRead = usage.cache_read_input_tokens || 0
  const outputTokens = usage.output_tokens || 0
  const cacheHit = cacheRead > 0
  const denom = inputTokens + cacheRead
  const savingsPct = denom > 0 ? Math.round((cacheRead / denom) * 100) : 0

  return {
    input_tokens: inputTokens,
    cache_creation_input_tokens: cacheCreate,
    cache_read_input_tokens: cacheRead,
    output_tokens: outputTokens,
    cache_hit: cacheHit,
    cache_savings_pct: savingsPct,
  }
}

function getSessionInfo(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return { ip, userAgent }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request) {
  const startedAt = Date.now()

  try {
    logger.info('Chat request received')

    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY not configured')
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 })
    }

    if (!isServiceEnabled()) {
      return NextResponse.json({ error: getMaintenanceMessage() || 'Service temporarily unavailable.' }, { status: 503 })
    }

    try {
      await validateCSRF(request)
    } catch (e) {
      logger.warn('CSRF validation failed', { error: e?.message })
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const county = safeLine(body?.county || 'washtenaw') || 'washtenaw'

    const imageDataUrl = body?.image || body?.imageBase64 || body?.image_url
    const hasImage = Boolean(imageDataUrl)
    const imageBase64 = hasImage ? extractBase64FromDataUrl(imageDataUrl) : null
    const imageMediaType = hasImage ? getMediaTypeFromDataUrl(imageDataUrl) : null

    const lastUserText = getLastUserText(messages)
    const effectivePrompt = lastUserText || (hasImage ? 'Check this photo for compliance issues.' : '')

    if (!effectivePrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    const fullAudit = wantsFullAudit(effectivePrompt) || Boolean(body?.fullAudit)
    const includeFines = wantsFineInfo(effectivePrompt) || Boolean(body?.includeFines)
    const maxFindings = fullAudit ? 8 : 4

    // ========================================================================
    // AUTH + LICENSE VALIDATION (Multi-user, Single-location)
    // ========================================================================

    let userId = null
    let userMemory = null
    let CLAUDE_MODEL = 'claude-sonnet-4-20250514'

    try {
      const cookieStore = await cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)
            },
            set(name, value, options) {
              cookieStore.set(name, value, options)
            },
            remove(name, options) {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            },
          },
        }
      )

      let supabaseAuth

      const bearerToken = request.headers.get('authorization')
      if (bearerToken && bearerToken.startsWith('Bearer ')) {
        const token = bearerToken.slice(7)
        supabaseAuth = await supabase.auth.getUser(token)
      } else {
        supabaseAuth = await supabase.auth.getUser()
      }

      if (supabaseAuth.error || !supabaseAuth.data?.user) {
        logger.warn('Supabase auth failed', { error: supabaseAuth.error?.message })
        return NextResponse.json({ error: 'Auth failed' }, { status: 401 })
      }

      const user = supabaseAuth.data.user
      userId = user.id

      // ✅ Trial check (must not override subscription check)
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status, cancel_at_period_end, current_period_end, price_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError) {
        logger.warn('Subscription lookup failed', { error: subError.message })
      }

      const hasActiveSubscription = subscription && ['active', 'trialing'].includes(subscription.status)

      if (!hasActiveSubscription) {
        const { data: license, error: licenseError } = await supabase
          .from('licenses')
          .select('trial_ends_at, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (licenseError) {
          logger.error('License lookup failed', { error: licenseError.message })
          return NextResponse.json({ error: 'License lookup failed' }, { status: 500 })
        }

        if (!license || license.status !== 'active') {
          return NextResponse.json(
            { error: 'No active trial or subscription found.', code: 'NO_SUBSCRIPTION' },
            { status: 403 }
          )
        }

        if (license.trial_ends_at && new Date(license.trial_ends_at) < new Date()) {
          return NextResponse.json(
            { error: 'Trial expired. Please subscribe to continue.', code: 'TRIAL_EXPIRED' },
            { status: 403 }
          )
        }
      }

      const sessionInfo = getSessionInfo(request)

      logger.info('Validating license', {
        userId,
        ip: sessionInfo.ip.substring(0, 12) + '***',
        userAgent: sessionInfo.userAgent.substring(0, 50),
      })

      const locationCheck = await validateSingleLocation(userId, sessionInfo)

      if (!locationCheck.valid) {
        logger.security('License validation failed', {
          userId,
          code: locationCheck.code,
          error: locationCheck.error,
          ip: sessionInfo.ip.substring(0, 12) + '***',
        })

        if (locationCheck.code === 'MULTI_LOCATION_ABUSE') {
          return NextResponse.json(
            {
              error: locationCheck.error,
              code: 'MULTI_LOCATION_ABUSE',
              message:
                'This license appears to be shared across multiple physical locations. Each location requires its own license ($100/month per location). Contact support@protocollm.org for multi-location pricing.',
            },
            { status: 403 }
          )
        }

        if (locationCheck.code === 'LOCATION_LIMIT_EXCEEDED') {
          return NextResponse.json(
            {
              error: locationCheck.error,
              code: 'LOCATION_LIMIT_EXCEEDED',
              message:
                'This license is being used from too many different locations. Each restaurant location requires its own license. Contact support@protocollm.org if you need help.',
            },
            { status: 403 }
          )
        }

        return NextResponse.json(
          { error: locationCheck.error || 'Location validation failed', code: 'LOCATION_VALIDATION_FAILED' },
          { status: 403 }
        )
      }

      logger.info('License validated', {
        userId,
        uniqueLocationsUsed: locationCheck.uniqueLocationsUsed,
        locationFingerprint: locationCheck.locationFingerprint?.substring(0, 8) + '***',
      })

      // Select Claude model based on subscription tier
      CLAUDE_MODEL = await getModelForUser(userId, supabase)

      try {
        userMemory = await getUserMemory(userId)
      } catch (e) {
        logger.warn('Memory load failed', { error: e?.message })
      }
    } catch (e) {
      logger.error('Auth/license check failed', { error: e?.message })
      return NextResponse.json(
        { error: 'Authentication error. Please sign in again.', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }

    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    // ========================================================================
    // VISION SCAN (if image) — UPDATED per Claude's recommendations
    // ========================================================================

    let vision = {
      summary: '',
      searchTerms: '',
      issues: [],
      facts: [],
    }

    if (hasImage && imageBase64) {
      try {
        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            temperature: 0,
            max_tokens: 750,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
                  {
                    type: 'text',
                    text: `Scan this food service photo for potential compliance issues.

You are analyzing this for a Washtenaw County, Michigan restaurant that wants to catch violations BEFORE the health inspector does.

Rules:
- List EVERYTHING that might be a problem, even if you're not 100% certain
- Focus on the Top 10 violation categories:
  1. Temperature control (coolers, hot holding)
  2. Cross contamination (raw/ready-to-eat separation)
  3. Hand hygiene (sinks, soap, towels)
  4. Food storage (floor clearance, labeling, date marking)
  5. Cleaning/sanitizing (equipment, utensils, surfaces)
  6. Pest evidence (droppings, nests, access points)
  7. Employee health (bare hand contact, gloves misuse)
  8. Chemical storage (toxics near food)
  9. Equipment maintenance (broken seals, rust, damage)
  10. Facility sanitation (floors, walls, ceilings, drains)

- If something MIGHT be a violation, flag it. The user wants to know.
- Don't narrate the scene. Only list actionable compliance observations.
- Provide search_terms that will pull the most relevant regulation excerpts.

Return JSON only:
{
  "summary": "one sentence overview",
  "search_terms": "keywords for document lookup (e.g., 'temperature control cooler storage 41F')",
  "issues": [
    {
      "issue": "specific observation (e.g., 'uncovered food containers in walk-in cooler')",
      "why": "potential violation (e.g., 'could allow contamination, might violate covered storage rules')"
    }
  ],
  "facts": ["observable compliance-relevant details (no fluff)"]
}`,
                  },
                ],
              },
            ],
          }),
          VISION_TIMEOUT_MS,
          'VISION_TIMEOUT'
        )

        const visionText = visionResp.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('')

        const parsedVision = extractJsonObject(visionText)
        if (parsedVision) {
          vision.summary = safeLine(parsedVision.summary || '')
          vision.searchTerms = safeLine(parsedVision.search_terms || '')

          if (Array.isArray(parsedVision.issues)) {
            vision.issues = parsedVision.issues
              .map((i) => ({ issue: safeLine(i?.issue || ''), why: safeLine(i?.why || '') }))
              .filter((i) => i.issue)
              .slice(0, 8)  // Increased from 6 to catch more issues
          }

          if (Array.isArray(parsedVision.facts)) {
            vision.facts = parsedVision.facts.map(safeLine).filter(Boolean).slice(0, 10)
          }
        }
      } catch (e) {
        logger.warn('Vision scan failed', { error: e?.message })
        // Return user-friendly error for vision timeout
        if (e?.message === 'VISION_TIMEOUT') {
          return NextResponse.json(
            { error: getUserFriendlyErrorMessage('VISION_TIMEOUT') },
            { status: 408 }
          )
        }
      }
    }

    // ========================================================================
    // DOCUMENT RETRIEVAL — UPDATED per Claude's recommendations
    // ========================================================================

    let retrieval = {
      documents: [],
      queryTerms: [],
      keywordHits: [],
    }

    const shouldSearchDocs = hasImage || effectivePrompt.length >= 4

    if (shouldSearchDocs) {
      try {
        const searchKeywords = extractSearchKeywords(effectivePrompt)
        const limitPerSource = hasImage ? 4 : 5  // more conservative per-source limit when vision is present

        const retrievalPromise = searchDocumentsFn({
          query: effectivePrompt || vision.summary || 'food safety',
          topK: hasImage ? 18 : TOPK_PER_QUERY,  // reduced topK when vision present to focus results
          county,
          maxDocsForContext: hasImage ? 22 : MAX_DOCS_FOR_CONTEXT,  // limit context when vision already adds signal
          perSourceCap: limitPerSource,
          preferredTerms: searchKeywords,
          includeFullText: true,
        })

        const retrievalResult = await withTimeout(retrievalPromise, RETRIEVAL_TIMEOUT_MS, 'RETRIEVAL_TIMEOUT')

        if (retrievalResult?.documents?.length) {
          retrieval.documents = pickTopDocs(retrievalResult.documents, hasImage ? 28 : MAX_DOCS_FOR_CONTEXT, limitPerSource)
          retrieval.queryTerms = retrievalResult.keywords || []
          retrieval.keywordHits = retrievalResult.hits || []
        }
      } catch (e) {
        logger.warn('Document retrieval failed', { error: e?.message })
        if (e?.message === 'RETRIEVAL_TIMEOUT') {
          return NextResponse.json(
            { error: getUserFriendlyErrorMessage('RETRIEVAL_TIMEOUT') },
            { status: 408 }
          )
        }
      }
    }

    // ========================================================================
    // MEMORY
    // ========================================================================

    let memoryContext = ''
    if (userMemory) {
      memoryContext = buildMemoryContext(userMemory)
    }

    // ========================================================================
    // PROMPT BUILDING
    // ========================================================================

    const today = new Date()
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const finesClause = includeFines
      ? 'Return fines: "Yes" and provide fines range (e.g., "$125-$500"). If fines vary, explain.'
      : 'Return fines: "No" (user did not request fines).'

    const findingCount = Math.max(Math.min(maxFindings, 10), 3)

    const docSummaries = retrieval.documents
      .map((doc, idx) => {
        const title = doc.metadata?.title || doc.metadata?.source || `Document ${idx + 1}`
        const text = sanitizeDocText(doc.text || '')
        const snippet = text.slice(0, 500)
        return `- ${title}: ${snippet}`
      })
      .join('\n')

    const keywordString = retrieval.keywordHits
      .slice(0, 20)
      .map((k) => `${k.keyword} (${k.count})`)
      .join(', ')

    const hasDocContext = Boolean(docSummaries)

    const instruction = `
You are ProtocolLM, a compliance assistant focused on Washtenaw County, Michigan food safety rules.
Today's date: ${dateStr}.

User request: ${effectivePrompt || '[image only]'}

${hasImage ? `VISION SUMMARY: ${vision.summary}\nVISION SEARCH TERMS: ${vision.searchTerms}\nVISION FACTS: ${vision.facts.join(', ')}` : ''}

DOCUMENTS (ranked, concise):
${docSummaries || '- No documents found'}

KEYWORD HITS: ${keywordString || 'None'}

MEMORY (user context):
${memoryContext || 'No prior context.'}

You MUST:
- Cite source titles in parentheses at the end of sentences (e.g., "Use handwashing sink only for hands (Handwashing Sink Requirements)"). Use "Vision Scan" for image-only findings.
- Base answers strictly on documents and vision facts; if unknown, say "Not in docs".
- Keep answers concise, clear, and bullet-structured. Avoid markdown code fences.
- Only include the top ${findingCount} issues.
- Avoid duplicates; merge similar points.
- If the user asks for a checklist or action plan, provide the steps clearly.
- ${finesClause}
- Tone: concise, confident, enforcement-focused.
- County is ${county || 'Washtenaw County'}.
`

    // ========================================================================
    // SAFETY + ANSWER GENERATION (with vision + retrieval)
    // ========================================================================

    const promptParts = [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: instruction,
          },
        ],
      },
    ]

    if (hasImage && imageBase64) {
      promptParts.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
          { type: 'text', text: 'Analyze this image for food safety compliance.' },
        ],
      })
    }

    promptParts.push({
      role: 'user',
      content: [{ type: 'text', text: effectivePrompt || 'Identify compliance issues.' }],
    })

    const inputTokensEstimate = JSON.stringify(promptParts).length * 1.2

    // Log prompt preview
    logger.debug('Prompt preview', {
      userId,
      hasImage,
      promptSnippet: clampShort(effectivePrompt, 200),
      docCount: retrieval.documents.length,
      keywords: retrieval.queryTerms,
      inputTokensEstimate,
    })

    let modelResponseText = ''
    let usageStats = null
    let cacheStats = null

    try {
      const resp = await withTimeout(
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 650,
          temperature: 0.2,
          top_p: 0.999,
          messages: promptParts,
          stop_sequences: ['<STOP>'],
          metadata: {
            county,
            hasImage,
            userId,
            retrievalDocs: retrieval.documents.length,
            keywordMatches: retrieval.keywordHits.length,
          },
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      const textBlocks = resp?.content?.filter((b) => b.type === 'text') || []
      modelResponseText = textBlocks.map((b) => b.text).join('\n').trim()

      usageStats = resp?.usage
      cacheStats = buildCacheStats(resp?.usage)
    } catch (e) {
      logger.error('Anthropic call failed', { error: e?.message, userId, hasImage })
      if (e?.message === 'ANSWER_TIMEOUT') {
        return NextResponse.json(
          { error: getUserFriendlyErrorMessage('ANSWER_TIMEOUT') },
          { status: 408 }
        )
      }
      return NextResponse.json(
        { error: 'Model error. Please try again in a moment.' },
        { status: 500 }
      )
    }

    // ========================================================================
    // RESPONSE + LOGGING
    // ========================================================================

    const cleaned = sanitizeOutput(modelResponseText)
    const latency = Date.now() - startedAt

    const responsePayload = {
      reply: cleaned,
      docs_used: retrieval.documents.length,
      keywords: retrieval.queryTerms,
      usage: usageStats,
      cache: cacheStats,
      latency_ms: latency,
      vision_summary: vision.summary,
      vision_issues: vision.issues,
      vision_facts: vision.facts,
    }

    // Log usage (non-blocking)
    safeLogUsage({
      userId,
      hasImage,
      prompt: clampShort(effectivePrompt, 200),
      docCount: retrieval.documents.length,
      model: CLAUDE_MODEL,
      latency_ms: latency,
      cache: cacheStats,
      usage: usageStats,
    })

    // Persist memory update (non-blocking)
    if (userId && effectivePrompt && cleaned) {
      try {
        const newMemory = updateMemory(userMemory, {
          prompt: effectivePrompt,
          response: cleaned,
          timestamp: new Date().toISOString(),
        })

        await updateMemory(userId, newMemory)
      } catch (e) {
        logger.warn('Memory update failed', { error: e?.message })
      }
    }

    return NextResponse.json(responsePayload)
  } catch (e) {
    logger.error('Chat handler failed', { error: e?.message })
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 })
  }
}
