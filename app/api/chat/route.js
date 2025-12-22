// app/api/chat/route.js - SINGLE PLAN VERSION (OpenAI GPT-5.2 for all users)
// ProtocolLM - Washtenaw County Food Safety Compliance Engine

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics, checkAccess } from '@/lib/usage'
import { validateDeviceLicense } from '@/lib/licenseValidation'
import { getUserMemory, updateMemory, buildMemoryContext } from '@/lib/conversationMemory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

let openaiClient = null
let searchDocuments = null

async function getOpenAIClient() {
  if (!openaiClient) {
    const { OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

async function getSearchDocuments() {
  if (!searchDocuments) {
    const module = await import('@/lib/searchDocs')
    searchDocuments = module.searchDocuments
  }
  return searchDocuments
}

// ============================================================================
// MODEL CONFIGURATION - SINGLE MODEL FOR ALL USERS
// ============================================================================
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'
const MODEL_LABEL = 'GPT-5-mini'

// Time budgets
const VISION_TIMEOUT_MS = 20000
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000

// Retrieval config
const TOPK_PER_QUERY = 25
const MAX_DOCS_FOR_CONTEXT = 40
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

function messageContentToString(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return ''
        if (typeof part === 'string') return part
        if (typeof part.text === 'string') return part.text
        if (typeof part.content === 'string') return part.content
        return ''
      })
      .filter(Boolean)
      .join('')
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') {
    return content.text
  }
  return ''
}

function mapMessageContentToResponseParts(content) {
  if (!content) return []

  const parts = []

  if (!Array.isArray(content)) {
    const text = messageContentToString(content)
    if (text) parts.push({ type: 'input_text', text: safeText(text) })
    return parts
  }

  for (const part of content) {
    if (!part) continue

    if (typeof part === 'string') {
      const text = safeText(part)
      if (text) parts.push({ type: 'input_text', text })
      continue
    }

    if (part.type === 'text' && part.text) {
      const text = safeText(part.text)
      if (text) parts.push({ type: 'input_text', text })
      continue
    }

    if (part.type === 'image_url' && part.image_url) {
      const imageUrl = typeof part.image_url === 'string' ? part.image_url : part.image_url.url
      if (imageUrl) {
        parts.push({
          type: 'input_image',
          image_url: imageUrl,
          detail: 'auto',
        })
      }
    }
  }

  return parts
}

function toResponseInput(messages) {
  if (!Array.isArray(messages)) return []

  const out = []
  for (const msg of messages) {
    const contentParts = mapMessageContentToResponseParts(msg?.content)
    if (contentParts.length === 0) continue

    out.push({
      type: 'message',
      role: msg?.role === 'assistant' || msg?.role === 'system' || msg?.role === 'developer' ? msg.role : 'user',
      content: contentParts,
    })
  }
  return out
}

function responseOutputToString(resp) {
  if (!resp) return ''
  if (typeof resp.output_text === 'string') return resp.output_text

  const outputs = Array.isArray(resp.output) ? resp.output : []
  for (const item of outputs) {
    const content = Array.isArray(item?.content) ? item.content : []
    for (const c of content) {
      if (typeof c?.text === 'string') return c.text
      if (typeof c?.output_text === 'string') return c.output_text
    }
  }
  return ''
}

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms))])
}

function clampShort(s, max = 140) {
  const x = safeLine(s || '')
  if (!x) return ''
  return x.length > max ? x.slice(0, max - 1).trimEnd() + '…' : x
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

function extractSearchKeywords(text) {
  const keywords = []

  const topics = [
    'temperature',
    'cooling',
    'reheating',
    'storage',
    'cross contamination',
    'hand washing',
    'gloves',
    'sanitizer',
    'date marking',
    'labels',
    'pest',
    'cleaning',
    'surfaces',
    'equipment',
    'utensils',
    'thermometer',
    'food safety',
    'violation',
    'inspection',
    'permit',
    'refrigeration',
    'hot holding',
    'cold holding',
    'thawing',
    'cooking',
    'raw meat',
    'ready to eat',
    'contamination',
    'employee health',
    'chemicals',
    'toxic',
    'allergen',
    'sink',
    'drainage',
    'ventilation',
  ]

  const lower = (text || '').toLowerCase()
  topics.forEach((topic) => {
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
  return t.includes('fine') || t.includes('fines') || t.includes('penalt') || t.includes('cost') || t.includes('fee') || t.includes('what happens if')
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

function diversifyBySource(docs, { maxTotal = 40, perSourceCap = 4 } = {}) {
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

function normalizeSourceIds(x) {
  if (!Array.isArray(x)) return []
  return x.map(safeLine).filter(Boolean).slice(0, 6)
}

// ============================================================================
// OUTPUT RENDERING
// ============================================================================

function renderAuditOutput(payload, opts = {}) {
  const { maxItems = 4, includeFines = false, fullAudit = false } = opts
  const status = safeLine(payload?.status || 'unknown')
  const findings = Array.isArray(payload?.findings) ? payload.findings : []
  const questions = Array.isArray(payload?.questions) ? payload.questions : []
  const enforcement = safeLine(payload?.enforcement || '')

  if (status === 'clear' || findings.length === 0) {
    const base = 'No violations detected.'
    if (questions.length > 0 && fullAudit) {
      const qs = questions
        .slice(0, 2)
        .map((q, i) => `To confirm (${i + 1}): ${clampShort(q, 160)}`)
        .join('\n')
      return sanitizeOutput(`${base}\n\n${qs}`)
    }
    return sanitizeOutput(base)
  }

  const lines = ['Potential issues found:', '']

  findings.slice(0, maxItems).forEach((f, idx) => {
    const cls = normalizeClass(f?.class)
    const likelihood = normalizeLikelihood(f?.likelihood)

    const observed = clampShort(f?.observed || f?.seeing || f?.evidence || '', 240)
    const violation = clampShort(f?.violation || f?.rule || f?.title || 'Possible violation', 240)
    const vtype = clampShort(f?.violation_type || f?.type || '', 160)

    const why = clampShort(f?.why || '', 240)
    const fix = clampShort(f?.fix || '', 240)
    const deadline = safeLine(f?.deadline) || deadlineByClass(cls)
    const ifNotFixed = clampShort(f?.if_not_fixed || f?.consequence || '', 240)

    const title = vtype || clampShort(violation, 70) || 'Compliance issue'

    const metaBits = [`${classLabel(cls)}`, `Fix by: ${deadline}`]
    if (likelihood !== 'Unclear') metaBits.push(`Confidence: ${likelihood}`)

    lines.push(`Issue ${idx + 1} — ${title}`)
    lines.push(metaBits.join(' • '))

    if (observed) lines.push(`Observed: ${observed}`)
    if (violation) lines.push(`Violation: ${violation}`)

    if (why) lines.push(`Why it matters: ${why}`)
    if (fix) lines.push(`Remediation: ${fix}`)
    if (ifNotFixed) lines.push(`If not fixed: ${ifNotFixed}`)

    lines.push('')
  })

  if (includeFines && enforcement) {
    lines.push('If not corrected:')
    lines.push(enforcement)
    lines.push('')
  }

  if (questions.length > 0 && fullAudit) {
    for (const q of questions.slice(0, 2)) {
      const qq = clampShort(q, 180)
      if (qq) lines.push(`To clarify: ${qq}`)
    }
  }

  return sanitizeOutput(lines.join('\n'))
}

function renderGuidanceOutput(payload) {
  const answer = safeLine(payload?.answer || '')
  const steps = Array.isArray(payload?.steps) ? payload.steps : []
  const questions = Array.isArray(payload?.questions) ? payload.questions : []

  const lines = []

  if (answer) lines.push(answer)

  if (steps.length > 0) {
    lines.push('')
    lines.push('Recommended steps:')
    steps.slice(0, 6).forEach((s, i) => {
      const step = clampShort(s, 200)
      if (step) lines.push(`${i + 1}) ${step}`)
    })
  }

  if (questions.length > 0) {
    lines.push('')
    lines.push('Clarifying questions:')
    questions.slice(0, 2).forEach((q, i) => {
      const qq = clampShort(q, 200)
      if (qq) lines.push(`${i + 1}) ${qq}`)
    })
  }

  return sanitizeOutput(lines.join('\n'))
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

function getUserFriendlyErrorMessage(errorMessage) {
  if (errorMessage === 'VISION_TIMEOUT') {
    return 'Photo analysis took too long. Try a smaller image or wait 10 seconds and try again.'
  } else if (errorMessage === 'RETRIEVAL_TIMEOUT') {
    return 'Document search timed out. Please try again.'
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
  const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0
  const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0
  const totalTokens =
    usage.total_tokens ??
    (typeof promptTokens === 'number' && typeof completionTokens === 'number' ? promptTokens + completionTokens : null)

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens ?? 0,
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

    if (!process.env.OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY not configured')
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
    // AUTH + LICENSE VALIDATION
    // ========================================================================

    let userId = null
    let userMemory = null

    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      })

      const { data } = await supabase.auth.getUser()
      userId = data?.user?.id || null

      if (!userId || !data?.user) {
        return NextResponse.json({ error: 'Authentication required.', code: 'UNAUTHORIZED' }, { status: 401 })
      }

      if (!data.user.email_confirmed_at) {
        return NextResponse.json(
          { error: 'Please verify your email before using protocolLM.', code: 'EMAIL_NOT_VERIFIED' },
          { status: 403 }
        )
      }

      // Rate limiting
      const rateLimitKey = `chat_${userId}_${Math.floor(Date.now() / 60000)}`
      const MAX_REQUESTS_PER_MINUTE = 20

      try {
        const rateLimitMap = global.chatRateLimits || (global.chatRateLimits = new Map())
        const count = rateLimitMap.get(rateLimitKey) || 0

        if (count >= MAX_REQUESTS_PER_MINUTE) {
          logger.security('Chat rate limit exceeded', {
            userId,
            count,
            limit: MAX_REQUESTS_PER_MINUTE,
          })

          return NextResponse.json(
            {
              error: 'Too many requests. Please wait a moment and try again.',
              code: 'RATE_LIMIT_EXCEEDED',
            },
            { status: 429 }
          )
        }

        rateLimitMap.set(rateLimitKey, count + 1)

        if (rateLimitMap.size > 1000) {
          const currentMinute = Math.floor(Date.now() / 60000)
          for (const [key] of rateLimitMap.entries()) {
            const keyMinute = parseInt(key.split('_').pop())
            if (currentMinute - keyMinute > 5) {
              rateLimitMap.delete(key)
            }
          }
        }
      } catch (rateLimitError) {
        logger.warn('Rate limit check failed', { error: rateLimitError?.message })
      }

      // Access check (trial + subscription)
      try {
        const accessCheck = await checkAccess(userId)

        if (!accessCheck?.valid) {
          logger.warn('Access denied - trial expired or no subscription', { userId })
          return NextResponse.json(
            {
              error: 'Your trial has ended. Please subscribe to continue using protocolLM.',
              code: 'TRIAL_EXPIRED',
            },
            { status: 402 }
          )
        }

        if (accessCheck.gracePeriod) {
          logger.info('User in trial conversion grace period', { userId })
        }

        logger.info('Access granted', {
          userId,
          status: accessCheck?.subscription?.status,
          plan: accessCheck?.subscription?.plan,
          gracePeriod: accessCheck?.gracePeriod || false,
        })
      } catch (error) {
        if (error?.code === 'TRIAL_EXPIRED') {
          return NextResponse.json({ error: error.message, code: 'TRIAL_EXPIRED' }, { status: 402 })
        }
        if (error?.code === 'NO_SUBSCRIPTION') {
          return NextResponse.json({ error: 'An active subscription is required.', code: 'NO_SUBSCRIPTION' }, { status: 402 })
        }
        if (error?.code === 'SUBSCRIPTION_EXPIRED') {
          return NextResponse.json({ error: error.message, code: 'SUBSCRIPTION_EXPIRED' }, { status: 402 })
        }

        logger.error('Access check failed (fail-closed)', { error: error?.message, userId })
        return NextResponse.json(
          { error: 'Unable to verify subscription. Please sign in again or contact support.', code: 'ACCESS_CHECK_FAILED' },
          { status: 402 }
        )
      }

      const sessionInfo = getSessionInfo(request)

      logger.info('Validating license', {
        userId,
        ip: sessionInfo.ip.substring(0, 12) + '***',
        userAgent: sessionInfo.userAgent.substring(0, 50),
      })

      const deviceCheck = await validateDeviceLicense(userId, sessionInfo)

      if (!deviceCheck.valid) {
        logger.security('License validation failed', {
          userId,
          code: deviceCheck.code,
          error: deviceCheck.error,
          ip: sessionInfo.ip.substring(0, 12) + '***',
        })

        return NextResponse.json(
          {
            error: deviceCheck.error || 'Device validation failed',
            code: deviceCheck.code || 'DEVICE_VALIDATION_FAILED',
            message:
              deviceCheck.error ||
              'This license is already active on another device. Please purchase an additional device license.',
            suggestedPrice: deviceCheck.suggestedPrice || 79,
          },
          { status: 403 }
        )
      }

      logger.info('License validated', {
        userId,
        uniqueDevicesUsed: deviceCheck.uniqueDevicesUsed,
        deviceFingerprint: deviceCheck.deviceFingerprint?.substring(0, 8) + '***',
      })

      try {
        userMemory = await getUserMemory(userId)
      } catch (e) {
        logger.warn('Memory load failed', { error: e?.message })
      }
    } catch (e) {
      logger.error('Auth/license check failed', { error: e?.message })
      return NextResponse.json({ error: 'Authentication error. Please sign in again.', code: 'AUTH_ERROR' }, { status: 401 })
    }

    const openai = await getOpenAIClient()
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
          openai.responses.create({
            model: OPENAI_MODEL,
            max_output_tokens: 750,
            input: toResponseInput([
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Scan this food service photo for potential compliance issues.

CRITICAL: ONLY flag what you can CLEARLY see in the photo.
- If you're not 100% certain about something, don't flag it
- DO NOT assume items are missing just because you can't see them (soap, thermometers, towels, etc.)
- Focus ONLY on what IS visible that MIGHT be wrong
- Never say something is missing - only flag problems with what you CAN see

Top violation categories to check (only if you see them):
1. Temperature control equipment condition
2. Cross contamination (raw/cooked separation)
3. Visible hand hygiene issues (only if sink area is clearly visible)
4. Food storage problems (floor clearance, uncovered food)
5. Cleaning/sanitizing issues (visible dirt, grime)
6. Pest evidence (droppings, insects)
7. Equipment condition (rust, damage, broken seals)

Return JSON only:
{
  "summary": "one sentence of what you see",
  "search_terms": "keywords for regulation lookup",
  "issues": [
    {
      "issue": "specific thing you SEE in the photo (not assumptions)",
      "why": "why this visible thing MIGHT be a violation",
      "confidence": "high|medium|low"
    }
  ],
  "facts": ["observable details only - no assumptions"]
}` },
                  { type: 'image_url', image_url: { url: `data:${imageMediaType || 'image/jpeg'};base64,${imageBase64}` } },
                ],
              },
            ]),
          }),
          VISION_TIMEOUT_MS,
          'VISION_TIMEOUT'
        )

        const visionText = responseOutputToString(visionResp)

        const parsedVision = extractJsonObject(visionText)
        if (parsedVision) {
          vision.summary = safeLine(parsedVision.summary || '')
          vision.searchTerms = safeLine(parsedVision.search_terms || '')

          if (Array.isArray(parsedVision.issues)) {
            vision.issues = parsedVision.issues
              .map((i) => ({ issue: safeLine(i?.issue || ''), why: safeLine(i?.why || '') }))
              .filter((i) => i.issue)
              .slice(0, 8)
          }

          if (Array.isArray(parsedVision.facts)) {
            vision.facts = parsedVision.facts.map(safeLine).filter(Boolean).slice(0, 10)
          }
        }
      } catch (e) {
        logger.warn('Vision scan failed', { error: e?.message })
        if (e?.message === 'VISION_TIMEOUT') {
          return NextResponse.json({ error: getUserFriendlyErrorMessage('VISION_TIMEOUT') }, { status: 408 })
        }
      }
    }

    // ========================================================================
    // DOCUMENT RETRIEVAL
    // ========================================================================

    const visionContext = [vision.searchTerms, ...vision.facts.slice(0, 6), ...vision.issues.map((i) => i.issue)]
      .filter(Boolean)
      .join(' ')
      .slice(0, 700)

    const userKeywords = extractSearchKeywords(effectivePrompt)
    const visionKeywords = vision.issues.map((i) => i.issue).join(' ').slice(0, 200)

    const queryMain = [effectivePrompt, visionContext, 'Washtenaw County Michigan food code'].filter(Boolean).join(' ').slice(0, 900)
    const queryIssues = vision.issues.slice(0, 2).map((i) => i.issue).join(' ').slice(0, 400)

    const queries = [
      queryMain,
      queryIssues,
      `${effectivePrompt.slice(0, 300)} Washtenaw County Michigan regulations`,
      `${visionContext.slice(0, 300)} food safety violations`,
      userKeywords.slice(0, 5).join(' ') + ' Washtenaw County food code',
      visionKeywords,
      'Priority violations Michigan food code',
    ]
      .filter(Boolean)
      .filter((q) => q.length > 10)
      .slice(0, 5)

    let allDocs = []
    try {
      const results = await Promise.all(
        queries.map((q) =>
          withTimeout(searchDocumentsFn(q, county, TOPK_PER_QUERY), RETRIEVAL_TIMEOUT_MS, 'RETRIEVAL_TIMEOUT').catch(() => [])
        )
      )

      allDocs = dedupeByText(results.flat().filter(Boolean))
      allDocs.sort(stableSortByScore)
      allDocs = diversifyBySource(allDocs, { maxTotal: MAX_DOCS_FOR_CONTEXT, perSourceCap: PER_SOURCE_CAP })
    } catch (e) {
      logger.warn('Retrieval failed', { error: e?.message })
      if (e?.message === 'RETRIEVAL_TIMEOUT') {
        return NextResponse.json({ error: getUserFriendlyErrorMessage('RETRIEVAL_TIMEOUT') }, { status: 408 })
      }
    }

    const ctx = buildExcerptContext(allDocs, { prefix: 'DOC', maxChars: 34000, startAt: 1 })
    const excerptIndex = [...ctx.excerptIndex]

    const excerptBlock = `Reference documents (cite by ID):
${ctx.contextText || 'No documents retrieved.'}`

    let memoryContext = ''
    try {
      memoryContext = buildMemoryContext(userMemory) || ''
    } catch {}

    // ========================================================================
    // SYSTEM PROMPT
    // ========================================================================

    const systemPrompt = `You are protocolLM, a compliance assistant for Washtenaw County, Michigan food service establishments.

${memoryContext ? `${memoryContext}\n\n` : ''}

JURISDICTION CONTEXT:
- You enforce the Michigan Modified Food Code as adopted by Washtenaw County
- Washtenaw County Environmental Health Division performs inspections
- Violations follow Michigan Administrative Procedures Act (3-strike process before license action)

VIOLATION CLASSIFICATION (Washtenaw County):
- P (Priority): Direct food safety hazard. Must fix IMMEDIATELY at inspection or within 10 days.
  Examples: Improper food temps, no handwashing, cross contamination, pest presence
- Pf (Priority Foundation): Supports priority items. Fix within 10 days.
  Examples: No thermometer, missing sanitizer test strips, no soap at hand sink
- C (Core): General sanitation/maintenance. Fix within 90 days.
  Examples: Dirty floors, broken ceiling tiles, improper lighting

ENFORCEMENT ESCALATION (per Washtenaw County):
1. Routine inspection identifies violation → Opportunity #1 to fix
2. Follow-up fails → Office Conference with health department
3. Still not fixed → Informal Hearing
4. Still not fixed → License limited/suspended/revoked + possible Formal Hearing appeal

Your knowledge base is the provided reference excerpts. Do not assume anything outside those excerpts.

RULES:
1. Be concise. Short sentences. No fluff.
2. No markdown formatting (no **, no #, no bullet lists).
3. No emojis.
4. Ground every finding in the reference excerpts. Every finding must include source_ids.
5. If you can't support it from the excerpts, do not call it a violation.
6. Use probability language: "very likely", "likely", "possible".
7. If the photo looks compliant, say: "No violations detected." and stop.
8. Don't narrate the scene. Get to the point.
9. Don't ask if this is residential/commercial. Assume food service.
10. Prioritize Washtenaw County documents over general guidance.

OUTPUT FORMAT (JSON only):

For image analysis:
{
  "mode": "audit",
  "status": "clear" | "findings",
  "findings": [
    {
      "class": "P|Pf|C|Unclear",
      "likelihood": "Very likely|Likely|Possible|Unclear",

      "observed": "What you see in the photo (one sentence, evidence only).",

      "violation": "What violation this would be, phrased as a requirement being violated (one sentence).",
      "violation_type": "Short category label (example: Chemical storage, Hand sink use, Date marking, Temperature control).",

      "why": "One sentence on risk/impact (must be supported by excerpts).",
      "fix": "One sentence corrective action.",
      "deadline": "Immediately|Within 10 days|Within 90 days",
      "if_not_fixed": "One sentence on likely inspection/enforcement outcome per excerpts (only if supported).",

      "source_ids": ["DOC_1"]
    }
  ],
  "enforcement": "Only if user asked about fines/penalties/what happens if. Must be supported by excerpts.",
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

    const issueHints =
      vision.issues.length > 0 ? `Scan detected:\n${vision.issues.map((i) => `- ${i.issue}`).join('\n')}` : ''

    const questionBlock = `User: ${effectivePrompt || (hasImage ? 'Check this photo.' : '')}${
      hasImage && issueHints ? `\n\n${issueHints}` : ''
    }`

    // ========================================================================
    // GENERATE RESPONSE
    // ========================================================================

    let modelText = ''
    let parsed = null
    let usageStats = null

    try {
      const finalMessages = []

      if (hasImage && imageBase64) {
        finalMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: excerptBlock },
            { type: 'image_url', image_url: { url: `data:${imageMediaType || 'image/jpeg'};base64,${imageBase64}` } },
            { type: 'text', text: questionBlock },
          ],
        })
      } else {
        finalMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: excerptBlock },
            { type: 'text', text: questionBlock },
          ],
        })
      }

      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_MODEL,
          max_output_tokens: fullAudit ? 1300 : 950,
          input: toResponseInput([{ role: 'system', content: systemPrompt }, ...finalMessages]),
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      modelText = responseOutputToString(answerResp)

      parsed = extractJsonObject(modelText)
      usageStats = buildCacheStats(answerResp.usage)
      if (usageStats) logger.info('Token stats', usageStats)
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })
      return NextResponse.json(
        { error: getUserFriendlyErrorMessage(e?.message) },
        { status: e?.message?.includes('TIMEOUT') ? 408 : 500 }
      )
    }

    // ========================================================================
    // RENDER OUTPUT
    // ========================================================================

    let message = ''
    let status = 'unknown'

    if (parsed && parsed.mode === 'audit') {
      const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : []
      const questionsRaw = Array.isArray(parsed.questions) ? parsed.questions : []
      const enforcementRaw = safeLine(parsed.enforcement || '')

      const validFindings = []
      for (const f of findingsRaw.slice(0, maxFindings)) {
        const srcIds = Array.isArray(f?.source_ids) ? f.source_ids : []
        const usable = pickSourcesFromIds(srcIds, excerptIndex)
        if (usable.length === 0) continue

        validFindings.push({
          class: normalizeClass(f?.class),
          likelihood: normalizeLikelihood(f?.likelihood),

          observed: safeLine(f?.observed || f?.seeing || f?.evidence || ''),
          violation: safeLine(f?.violation || f?.rule || f?.title || 'Possible violation'),
          violation_type: safeLine(f?.violation_type || f?.type || ''),

          why: safeLine(f?.why || ''),
          fix: safeLine(f?.fix || ''),
          deadline: safeLine(f?.deadline || ''),
          if_not_fixed: safeLine(f?.if_not_fixed || f?.consequence || ''),

          source_ids: normalizeSourceIds(srcIds),
        })
      }

      status = validFindings.length > 0 ? 'findings' : 'clear'

      message = renderAuditOutput(
        { status, findings: validFindings, questions: questionsRaw, enforcement: enforcementRaw },
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
      queriesUsed: queries.length,
      fullAudit,
      includeFines,
      tokenStats: usageStats,
      model: MODEL_LABEL,
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
          model: OPENAI_MODEL,
          modelLabel: MODEL_LABEL,
          hasImage,
          status,
          fullAudit,
          docsRetrieved: allDocs.length,
          queriesUsed: queries.length,
          durationMs: Date.now() - startedAt,
          usage: usageStats || null,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
