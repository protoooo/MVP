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

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

// Time budgets
const VISION_TIMEOUT_MS = 20000
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000

// Retrieval config
const TOPK_PER_QUERY = 18
const MAX_DOCS_FOR_CONTEXT = 28
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
  out = out.replace(/[`#*]/g, '')
  out = out.replace(/\u2022/g, '')
  out = out.replace(/\n{3,}/g, '\n\n')

  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  out = out.replace(/^\s*\d+[\)\.\:\-]\s+/gm, '')

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
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 1600)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function stableSortByScore(a, b) {
  const sa = Number(a?.score || 0)
  const sb = Number(b?.score || 0)
  if (sb !== sa) return sb - sa

  const srcA = safeLine(a?.source || '')
  const srcB = safeLine(b?.source || '')
  if (srcA !== srcB) return srcA.localeCompare(srcB)

  const pa = Number(a?.page || 0)
  const pb = Number(b?.page || 0)
  return pa - pb
}

function diversifyBySource(docs, { maxTotal = 28, perSourceCap = 4 } = {}) {
  const bySource = new Map()

  for (const d of docs || []) {
    const src = safeLine(d?.source || 'Unknown') || 'Unknown'
    if (!bySource.has(src)) bySource.set(src, [])
    bySource.get(src).push(d)
  }

  for (const [src, arr] of bySource.entries()) {
    arr.sort(stableSortByScore)
    bySource.set(src, arr)
  }

  const sources = Array.from(bySource.keys()).sort((a, b) => a.localeCompare(b))
  const picked = []
  const pickedCount = new Map(sources.map((s) => [s, 0]))

  let progressed = true
  while (picked.length < maxTotal && progressed) {
    progressed = false
    for (const src of sources) {
      if (picked.length >= maxTotal) break
      const used = pickedCount.get(src) || 0
      if (used >= perSourceCap) continue

      const arr = bySource.get(src) || []
      if (arr.length === 0) continue

      const next = arr.shift()
      if (!next) continue

      picked.push(next)
      pickedCount.set(src, used + 1)
      progressed = true
    }
  }

  return picked
}

function buildExcerptContext(docs, opts = {}) {
  const prefix = opts.prefix || 'DOC'
  const MAX_CHARS = opts.maxChars || 34000
  const startAt = opts.startAt || 1

  const excerpts = []
  let buf = ''
  let n = startAt

  for (const d of docs || []) {
    const source = safeLine(d?.source || 'Unknown')
    const page = d?.page ? ` (p.${d.page})` : ''
    const text = safeText(d?.text || '')
    if (!text) continue

    const id = `${prefix}_${n}`
    const header = `[${id}] ${source}${page}\n`
    const chunk = `${header}${text}\n\n`

    if (buf.length + chunk.length > MAX_CHARS) break

    excerpts.push({ id, source, page: d?.page || null })
    buf += chunk
    n++
  }

  return { excerptIndex: excerpts, contextText: buf.trim() }
}

// ============================================================================
// JSON EXTRACTION
// ============================================================================

function extractJsonObject(text) {
  const raw = safeText(text || '')
  if (!raw) return null
  const unfenced = raw.replace(/```json/gi, '```').replace(/```/g, '')
  const first = unfenced.indexOf('{')
  const last = unfenced.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  const candidate = unfenced.slice(first, last + 1)
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

// ============================================================================
// VIOLATION CLASSIFICATION
// ============================================================================

function normalizeLikelihood(x) {
  const v = safeLine(x)
  if (ALLOWED_LIKELIHOOD.has(v)) return v
  return 'Unclear'
}

function normalizeClass(x) {
  const v = safeLine(x)
  if (ALLOWED_CLASS.has(v)) return v
  return 'Unclear'
}

function classLabel(cls) {
  if (cls === 'P') return 'Priority'
  if (cls === 'Pf') return 'Priority Foundation'
  if (cls === 'C') return 'Core'
  return 'Unclear'
}

function deadlineByClass(cls) {
  if (cls === 'P') return 'Immediately'
  if (cls === 'Pf') return 'Within 10 days'
  if (cls === 'C') return 'Within 90 days'
  return 'Check with inspector'
}

function pickSourcesFromIds(sourceIds, excerptIndex) {
  const map = new Map((excerptIndex || []).map((e) => [e.id, e]))
  const used = []
  for (const sid of sourceIds || []) {
    const id = safeLine(sid)
    if (!id) continue
    const ex = map.get(id)
    if (ex) used.push(ex)
  }
  return used
}

// ============================================================================
// OUTPUT RENDERING
// ============================================================================

function renderFineContext() {
  return `If not corrected by deadline:
- County may escalate: follow-up inspection → Office Conference → Informal Hearing → license action
- Administrative fines under MCL 289.5101: up to $500 first offense, up to $1,000 subsequent, plus investigation costs
- Minor issues often get a warning first`
}

function renderAuditOutput(payload, opts = {}) {
  const { maxItems = 4, includeFines = false, fullAudit = false } = opts
  const status = safeLine(payload?.status || 'unknown')
  const findings = Array.isArray(payload?.findings) ? payload.findings : []
  const questions = Array.isArray(payload?.questions) ? payload.questions : []

  if (status === 'clear' || findings.length === 0) {
    const base = 'No violations detected.'
    if (questions.length > 0 && fullAudit) {
      const qs = questions.slice(0, 2).map((q) => `- ${clampShort(q, 120)}`).join('\n')
      return sanitizeOutput(`${base}\n\nTo verify:\n${qs}`)
    }
    return sanitizeOutput(base)
  }

  const lines = ['Potential issues found:\n']

  for (const f of findings.slice(0, maxItems)) {
    const cls = normalizeClass(f?.class)
    const title = clampShort(f?.title || 'Issue', 100)
    const likelihood = normalizeLikelihood(f?.likelihood)
    const why = clampShort(f?.why || '', 140)
    const fix = clampShort(f?.fix || '', 140)
    const deadline = safeLine(f?.deadline) || deadlineByClass(cls)

    lines.push(`${classLabel(cls)}: ${title}`)
    lines.push(`Fix by: ${deadline}`)
    if (likelihood !== 'Unclear') lines.push(`Confidence: ${likelihood}`)
    if (why) lines.push(`Why it matters: ${why}`)
    if (fix) lines.push(`Action: ${fix}`)
    lines.push('')
  }

  if (includeFines) {
    lines.push(renderFineContext())
    lines.push('')
  }

  if (questions.length > 0 && fullAudit) {
    lines.push('To confirm:')
    for (const q of questions.slice(0, 2)) {
      lines.push(`- ${clampShort(q, 120)}`)
    }
  }

  return sanitizeOutput(lines.join('\n'))
}

function renderGuidanceOutput(payload) {
  const answer = safeLine(payload?.answer || '')
  const steps = Array.isArray(payload?.steps) ? payload.steps : []
  const questions = Array.isArray(payload?.questions) ? payload.questions : []

  const lines = []

  if (answer) {
    lines.push(answer)
    lines.push('')
  }

  if (steps.length > 0) {
    for (const s of steps.slice(0, 6)) {
      const step = clampShort(s, 160)
      if (step) lines.push(`- ${step}`)
    }
    lines.push('')
  }

  if (questions.length > 0) {
    lines.push('To clarify:')
    for (const q of questions.slice(0, 2)) {
      lines.push(`- ${clampShort(q, 120)}`)
    }
  }

  return sanitizeOutput(lines.join('\n'))
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

// ============================================================================
// HELPER: Extract session info from request
// ============================================================================

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

    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
              } catch {}
            },
          },
        }
      )

      const { data } = await supabase.auth.getUser()
      userId = data?.user?.id || null

      if (!userId || !data?.user) {
        return NextResponse.json({
          error: 'Authentication required.',
          code: 'UNAUTHORIZED',
        }, { status: 401 })
      }

      // Email verification check
      if (!data.user.email_confirmed_at) {
        return NextResponse.json({
          error: 'Please verify your email before using protocolLM.',
          code: 'EMAIL_NOT_VERIFIED',
        }, { status: 403 })
      }

      // ✅ LICENSE VALIDATION: Multi-user, single-location enforcement
      const sessionInfo = getSessionInfo(request)
      
      logger.info('Validating license', {
        userId,
        ip: sessionInfo.ip.substring(0, 12) + '***',
        userAgent: sessionInfo.userAgent.substring(0, 50)
      })

      const locationCheck = await validateSingleLocation(userId, sessionInfo)

      if (!locationCheck.valid) {
        logger.security('License validation failed', {
          userId,
          code: locationCheck.code,
          error: locationCheck.error,
          ip: sessionInfo.ip.substring(0, 12) + '***'
        })

        // Return specific error codes for different violation types
        if (locationCheck.code === 'MULTI_LOCATION_ABUSE') {
          return NextResponse.json({
            error: locationCheck.error,
            code: 'MULTI_LOCATION_ABUSE',
            message: 'This license appears to be shared across multiple physical locations. Each location requires its own license ($100/month per location). Contact support@protocollm.org for multi-location pricing.'
          }, { status: 403 })
        }

        if (locationCheck.code === 'LOCATION_LIMIT_EXCEEDED') {
          return NextResponse.json({
            error: locationCheck.error,
            code: 'LOCATION_LIMIT_EXCEEDED',
            message: 'This license is being used from too many different locations. Each restaurant location requires its own license. Contact support@protocollm.org if you need help.'
          }, { status: 403 })
        }

        // Generic location validation failure
        return NextResponse.json({
          error: locationCheck.error || 'Location validation failed',
          code: 'LOCATION_VALIDATION_FAILED'
        }, { status: 403 })
      }

      // ✅ Location validation passed
      logger.info('License validated', {
        userId,
        uniqueLocationsUsed: locationCheck.uniqueLocationsUsed,
        locationFingerprint: locationCheck.locationFingerprint?.substring(0, 8) + '***'
      })

      // Load user memory
      try {
        userMemory = await getUserMemory(userId)
      } catch (e) {
        logger.warn('Memory load failed', { error: e?.message })
      }
    } catch (e) {
      logger.error('Auth/license check failed', { error: e?.message })
      return NextResponse.json({
        error: 'Authentication error. Please sign in again.',
        code: 'AUTH_ERROR'
      }, { status: 401 })
    }

    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    // ========================================================================
    // VISION SCAN (if image)
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
            max_tokens: 600,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
                  {
                    type: 'text',
                    text: `Scan this food service photo for compliance issues.

Focus on:
- Chemicals/cleaners near food prep areas, sinks, or clean equipment (Windex, bleach, unlabeled bottles, etc.)
- Improper food storage (on floor, uncovered, raw above ready-to-eat)
- Temperature abuse indicators (food sitting out, condensation on cold items)
- Cross-contamination risks
- Handwashing sink issues (blocked, no soap/towels, used for other purposes)
- Pest evidence, visible dirt/debris, mold
- Missing date labels on prepped food

Do NOT flag:
- Single sink as "inadequate warewashing" unless there's clear misuse
- Generic observations without compliance relevance

Return JSON only:
{
  "summary": "one sentence describing what you see",
  "search_terms": "keywords for document lookup",
  "issues": [{"issue": "short description", "why": "why it matters"}],
  "facts": ["observable facts relevant to compliance"]
}`
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
              .slice(0, 6)
          }

          if (Array.isArray(parsedVision.facts)) {
            vision.facts = parsedVision.facts.map(safeLine).filter(Boolean).slice(0, 8)
          }
        }
      } catch (e) {
        logger.warn('Vision scan failed', { error: e?.message })
      }
    }

    // ========================================================================
    // DOCUMENT RETRIEVAL
    // ========================================================================

    const visionContext = [
      vision.searchTerms,
      ...vision.facts.slice(0, 4),
      ...vision.issues.map((i) => i.issue),
    ].filter(Boolean).join(' ').slice(0, 500)

    const queryMain = [effectivePrompt, visionContext, 'Washtenaw County Michigan food code']
      .filter(Boolean).join(' ').slice(0, 800)

    const queryIssues = vision.issues.map((i) => i.issue).join(' ').slice(0, 300)

    const queries = [queryMain]
    if (queryIssues) queries.push(queryIssues)

    let allDocs = []
    try {
      const results = await Promise.all(
        queries.map((q) =>
          withTimeout(searchDocumentsFn(q, county, TOPK_PER_QUERY), RETRIEVAL_TIMEOUT_MS, 'RETRIEVAL_TIMEOUT')
            .catch(() => [])
        )
      )

      allDocs = dedupeByText(results.flat().filter(Boolean))
      allDocs.sort(stableSortByScore)
      allDocs = diversifyBySource(allDocs, { maxTotal: MAX_DOCS_FOR_CONTEXT, perSourceCap: PER_SOURCE_CAP })
    } catch (e) {
      logger.warn('Retrieval failed', { error: e?.message })
    }

    const ctx = buildExcerptContext(allDocs, { prefix: 'DOC', maxChars: 34000, startAt: 1 })
    const excerptIndex = [...ctx.excerptIndex]

    const excerptBlock = `Reference documents (cite by ID):
${ctx.contextText || 'No documents retrieved.'}`

    // Memory context
    let memoryContext = ''
    try {
      memoryContext = buildMemoryContext(userMemory) || ''
    } catch {}

    // ========================================================================
    // SYSTEM PROMPT
    // ========================================================================

    const systemPrompt = `You are protocolLM, a compliance assistant for Washtenaw County, Michigan food service establishments.

${memoryContext ? `${memoryContext}\n\n` : ''}Your knowledge base: 24 indexed documents including MI Modified Food Code, MCL Act 92 of 2000, Washtenaw County procedures, violation types, enforcement actions, temperature guides, date marking, cross contamination, cooling procedures, and more.

RULES:
1. Be concise. Short sentences. No fluff.
2. No markdown formatting (no **, no #, no bullets with *)
3. No emojis
4. Ground every finding in a document excerpt. Include source_ids.
5. If you can't cite it from the excerpts, don't claim it as a violation.
6. Use probability language: "likely", "possible", "appears to be"
7. If the photo looks compliant, just say "No violations detected." and stop.
8. Don't narrate what's in the photo. Get to the point.
9. Don't ask if this is residential/commercial. Assume food service.

VIOLATION CLASSES:
- P (Priority): Direct food safety hazard. Fix immediately.
- Pf (Priority Foundation): Supports priority items. Fix within 10 days.
- C (Core): General sanitation. Fix within 90 days.

COMMON ISSUES TO CATCH:
- Chemicals stored near food/clean surfaces
- Food at wrong temperature
- Missing date labels
- Cross contamination setup
- Handwashing sink problems
- Pest evidence
- Dirty food contact surfaces

OUTPUT FORMAT (JSON only):

For image analysis:
{
  "mode": "audit",
  "status": "clear" | "findings",
  "findings": [
    {
      "class": "P|Pf|C|Unclear",
      "title": "short title",
      "likelihood": "Very likely|Likely|Possible|Unclear",
      "why": "one sentence",
      "fix": "one sentence action",
      "deadline": "Immediately|Within 10 days|Within 90 days",
      "source_ids": ["DOC_1"]
    }
  ],
  "questions": ["only if genuinely needed for clarification"]
}

For questions without images:
{
  "mode": "guidance",
  "answer": "direct answer",
  "steps": ["actionable steps if applicable"],
  "questions": ["clarifying questions if needed"]
}

Max findings: ${maxFindings}`

    // ========================================================================
    // QUESTION CONTEXT
    // ========================================================================

    const issueHints = vision.issues.length > 0
      ? `Scan detected:\n${vision.issues.map((i) => `- ${i.issue}`).join('\n')}`
      : ''

    const questionBlock = `User: ${effectivePrompt || (hasImage ? 'Check this photo.' : '')}
${hasImage && issueHints ? `\n${issueHints}` : ''}`

    // ========================================================================
    // GENERATE RESPONSE
    // ========================================================================

    let modelText = ''
    let parsed = null
    let cacheStats = null

    try {
      const finalMessages = []

      if (hasImage && imageBase64) {
        finalMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: excerptBlock, cache_control: { type: 'ephemeral' } },
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
            { type: 'text', text: questionBlock },
          ],
        })
      } else {
        finalMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: excerptBlock, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: questionBlock },
          ],
        })
      }

      const answerResp = await withTimeout(
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          temperature: 0.15,
          max_tokens: fullAudit ? 1200 : 900,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
          messages: finalMessages,
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      modelText = answerResp.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      parsed = extractJsonObject(modelText)
      cacheStats = buildCacheStats(answerResp.usage)
      if (cacheStats) logger.info('Cache stats', cacheStats)
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })
    }

    // ========================================================================
    // RENDER OUTPUT
    // ========================================================================

    let message = ''
    let status = 'unknown'

    if (parsed && parsed.mode === 'audit') {
      const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : []
      const questionsRaw = Array.isArray(parsed.questions) ? parsed.questions : []

      // Filter to only findings with valid source citations
      const validFindings = []
      for (const f of findingsRaw.slice(0, maxFindings)) {
        const srcIds = Array.isArray(f?.source_ids) ? f.source_ids : []
        const usable = pickSourcesFromIds(srcIds, excerptIndex)
        if (usable.length === 0) continue

        validFindings.push({
          class: normalizeClass(f?.class),
          title: safeLine(f?.title || 'Possible issue'),
          likelihood: normalizeLikelihood(f?.likelihood),
          why: safeLine(f?.why || ''),
          fix: safeLine(f?.fix || ''),
          deadline: safeLine(f?.deadline || ''),
          source_ids: srcIds,
        })
      }

      status = validFindings.length > 0 ? 'findings' : 'clear'

      message = renderAuditOutput(
        {
          status,
          findings: validFindings,
          questions: questionsRaw,
        },
        { maxItems: maxFindings, includeFines, fullAudit }
      )

    } else if (parsed && parsed.mode === 'guidance') {
      status = 'guidance'
      message = renderGuidanceOutput({
        answer: parsed.answer || '',
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      })

    } else {
      // Fallback
      status = hasImage ? 'unclear' : 'guidance'
      message = sanitizeOutput(modelText || 'Unable to process request. Please try again.')
    }

    // ========================================================================
    // UPDATE MEMORY
    // ========================================================================

    if (userId && effectivePrompt) {
      try {
        await updateMemory(userId, {
          userMessage: effectivePrompt,
          assistantResponse: message,
          mode: hasImage ? 'vision' : 'text',
          meta: { firstUseComplete: true },
          firstUseComplete: true,
        })
      } catch (err) {
        logger.warn('Memory update failed', { error: err?.message })
      }
    }

    // ========================================================================
    // LOG + RETURN
    // ========================================================================

    logger.info('Response complete', {
      hasImage,
      status,
      durationMs: Date.now() - startedAt,
      docsRetrieved: allDocs.length,
      fullAudit,
      includeFines,
      cacheHit: cacheStats?.cache_hit || false,
    })

    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        message,
        _meta: {
          model: CLAUDE_MODEL,
          hasImage,
          status,
          fullAudit,
          docsRetrieved: allDocs.length,
          durationMs: Date.now() - startedAt,
          cache: cacheStats || null,
        },
      },
      { status: 200 }
    )

  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
