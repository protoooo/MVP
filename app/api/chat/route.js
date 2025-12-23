// app/api/chat/route.js - Cohere-first pipeline with vision fallback
// ProtocolLM - Washtenaw County Food Safety Compliance Engine

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CohereClient } from 'cohere-ai'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics, checkAccess, logModelUsageDetail } from '@/lib/usage'
import { validateDeviceLicense } from '@/lib/licenseValidation'
import { getUserMemory, updateMemory, buildMemoryContext } from '@/lib/conversationMemory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

let searchDocuments = null

const cohereClient = new CohereClient({ token: process.env.COHERE_API_KEY })

async function getSearchDocuments() {
  if (!searchDocuments) {
    const module = await import('@/lib/searchDocs')
    searchDocuments = module.searchDocuments
  }
  return searchDocuments
}

// ============================================================================
// MODEL CONFIGURATION - COHERE (Text + Vision + Embed + Rerank)
// ============================================================================
const FEATURE_COHERE = (process.env.FEATURE_COHERE ?? 'true').toLowerCase() !== 'false'
const FEATURE_RERANK = (process.env.FEATURE_RERANK ?? 'false').toLowerCase() === 'true'

const COHERE_TEXT_MODEL = process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024'
const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'command-a-vision-07-2025'
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1536
const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v3.5'
const MODEL_LABEL = 'Cohere'

// Time budgets
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000

// Retrieval + rerank config
const TOPK_PER_QUERY = 20 // initial vector similarity candidates
const MAX_DOCS_FOR_CONTEXT = 5 // after rerank, clamp to top 3-5
const RERANK_TOP_N = 5
const MIN_RERANK_DOCS = 3
const PER_SOURCE_CAP = 4

const ALLOWED_LIKELIHOOD = new Set(['Highly likely', 'Likely', 'Probable', 'Unlikely', 'Unclear'])
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

function isModelAccessError(err) {
  const msg = err?.message?.toLowerCase?.() || ''
  return err?.status === 403 || msg.includes('not enabled') || msg.includes('access') || msg.includes('permission')
}

function buildCohereMessages(systemPrompt, userMessage, imageUrl) {
  const messages = [
    {
      role: 'system',
      content: [{ type: 'text', text: systemPrompt }],
    },
    {
      role: 'user',
      content: [{ type: 'text', text: userMessage }],
    },
  ]

  if (imageUrl) {
    messages[1].content.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    })
  }

  return messages
}

async function callCohereChat(model, systemPrompt, userMessage, imageUrl, documents) {
  const messages = buildCohereMessages(systemPrompt, userMessage, imageUrl)
  return cohereClient.chat({
    model,
    messages,
    documents: documents.map((doc) => ({
      id: doc.id,
      title: doc.source || 'Source',
      snippet: doc.text || '',
      text: doc.text || '',
    })),
  })
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

    if (!process.env.COHERE_API_KEY) {
      logger.error('COHERE_API_KEY not configured')
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

    const searchDocumentsFn = await getSearchDocuments()

    // Placeholder for future image-derived search cues (Command-A-Vision output can be plumbed here)
    const vision = {
      summary: '',
      searchTerms: '',
      issues: [],
      facts: [],
    }

    // ========================================================================
    // DOCUMENT RETRIEVAL
    // ========================================================================

    const visionContext = [vision.searchTerms, ...vision.facts.slice(0, 6), ...vision.issues.map((i) => i.issue)]
      .filter(Boolean)
      .join(' ')
      .slice(0, 700)

    const userKeywords = extractSearchKeywords(effectivePrompt)
    const searchQuery = [effectivePrompt, visionContext, userKeywords.slice(0, 5).join(' '), 'Washtenaw County Michigan food code']
      .filter(Boolean)
      .join(' ')
      .slice(0, 900)

    let rerankedDocs = []
    let rerankUsed = false
    let rerankCandidates = 0
    try {
      const initialDocs = await withTimeout(
        searchDocumentsFn(searchQuery, county, TOPK_PER_QUERY),
        RETRIEVAL_TIMEOUT_MS,
        'RETRIEVAL_TIMEOUT'
      )

      const candidates = dedupeByText(initialDocs || [])
      const limitedCandidates = candidates.slice(0, TOPK_PER_QUERY)
      rerankCandidates = limitedCandidates.length

      if (limitedCandidates.length === 0) {
        logger.warn('No documents retrieved from vector search', { county, queryLength: searchQuery.length })
      } else if (FEATURE_RERANK) {
        const rerankResponse = await cohereClient.rerank({
          model: COHERE_RERANK_MODEL,
          query: searchQuery,
          documents: limitedCandidates.map((doc) => doc.text || ''),
          topN: Math.min(RERANK_TOP_N, limitedCandidates.length),
        })

        rerankUsed = true

        rerankedDocs = (rerankResponse?.results || [])
          .map((result, idx) => {
            const sourceDoc = limitedCandidates[result.index]
            return {
              ...sourceDoc,
              rerankScore: result.relevanceScore,
              id: `DOC_${idx + 1}`,
            }
          })
          .filter(Boolean)
          .slice(0, RERANK_TOP_N)

        if (rerankedDocs.length < MIN_RERANK_DOCS && limitedCandidates.length > 0) {
          // Fallback: ensure a minimum number of context docs
          const padding = limitedCandidates.slice(0, MIN_RERANK_DOCS - rerankedDocs.length).map((doc, idx) => ({
            ...doc,
            rerankScore: 0,
            id: `DOC_${rerankedDocs.length + idx + 1}`,
          }))
          rerankedDocs = [...rerankedDocs, ...padding]
        }
      } else {
        rerankedDocs = limitedCandidates.map((doc, idx) => ({ ...doc, id: `DOC_${idx + 1}` })).slice(0, RERANK_TOP_N)
      }
    } catch (e) {
      logger.warn('Retrieval or rerank failed', { error: e?.message })
      if (e?.message === 'RETRIEVAL_TIMEOUT') {
        return NextResponse.json({ error: getUserFriendlyErrorMessage('RETRIEVAL_TIMEOUT') }, { status: 408 })
      }
    }

    const contextDocs = rerankedDocs.slice(0, MAX_DOCS_FOR_CONTEXT)
    const excerptIndex = contextDocs.map((doc, idx) => doc.id || `DOC_${idx + 1}`)

    const excerptBlock =
      contextDocs.length === 0
        ? 'No documents retrieved.'
        : contextDocs
            .map((doc, idx) => {
              const id = doc.id || `DOC_${idx + 1}`
              return `[${id}] Source: ${doc.source || 'Unknown'} (p.${doc.page || 'N/A'})\n${doc.text || ''}`
            })
            .join('\n\n')

    let memoryContext = ''
    try {
      memoryContext = buildMemoryContext(userMemory) || ''
    } catch {}

    // ========================================================================
    // SYSTEM PROMPT
    // ========================================================================

    const systemPrompt = `You are ProtocolLM, a compliance assistant for Washtenaw County, Michigan food service establishments.

${memoryContext ? `${memoryContext}\n\n` : ''}
Use ONLY the provided documents to answer. If the documents do not support an answer, say you cannot answer from the provided materials.

Strict rules:
- Base every statement on the provided documents; do not speculate or use outside knowledge.
- Cite the relevant document IDs (e.g., DOC_1) and, if present, regulation sections from the text.
- Explain why a cited regulation applies or does not apply to the user's situation.
- Avoid general food safety advice; stay anchored to the documents.
- Be concise and factual; no fluff, no emojis, no markdown, no bullets unless needed for clarity.
- If information is insufficient, explicitly say so and ask for precise missing details.`

    const questionBlock = `User request: ${effectivePrompt || (hasImage ? 'Image provided, no text.' : '')}`

    // ========================================================================
    // GENERATE RESPONSE
    // ========================================================================

    let modelText = ''
    let message = ''
    let status = 'guidance'
    let usedModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    let billedUnits = {}
    let tokenUsage = {}

    const userMessage = `${excerptBlock}\n\n${questionBlock}\n\nCite document IDs (e.g., DOC_1) and regulation sections from the text when applicable.`

    try {
      const invokePrimary = () =>
        withTimeout(callCohereChat(usedModel, systemPrompt, userMessage, hasImage ? imageDataUrl : null, contextDocs), ANSWER_TIMEOUT_MS, 'ANSWER_TIMEOUT')

      let answerResp
      try {
        answerResp = await invokePrimary()
      } catch (err) {
        if (hasImage && isModelAccessError(err)) {
          logger.warn('Cohere vision access failed, attempting Aya Vision fallback', { error: err?.message })
          usedModel = 'c4ai-aya-vision-8b'
          answerResp = await withTimeout(
            callCohereChat(usedModel, systemPrompt, userMessage, hasImage ? imageDataUrl : null, contextDocs),
            ANSWER_TIMEOUT_MS,
            'ANSWER_TIMEOUT'
          )
        } else {
          throw err
        }
      }

      billedUnits = answerResp?.billed_units || {}
      tokenUsage = answerResp?.tokens || {}

      modelText = answerResp?.text || responseOutputToString(answerResp) || ''
      message = sanitizeOutput(modelText || 'Unable to process request. Please try again.')
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })
      return NextResponse.json(
        { error: getUserFriendlyErrorMessage(e?.message) },
        { status: e?.message?.includes('TIMEOUT') ? 408 : 500 }
      )
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
      docsRetrieved: contextDocs.length,
      fullAudit,
      includeFines,
      model: usedModel,
    })

    await logModelUsageDetail({
      userId,
      provider: 'cohere',
      model: usedModel,
      mode: hasImage ? 'vision' : 'text',
      inputTokens: tokenUsage.input_tokens ?? tokenUsage.prompt_tokens,
      outputTokens: tokenUsage.output_tokens ?? tokenUsage.completion_tokens,
      billedInputTokens: billedUnits.input_tokens,
      billedOutputTokens: billedUnits.output_tokens,
      rerankUsed,
      rerankCandidates,
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
          model: usedModel,
          modelLabel: MODEL_LABEL,
          hasImage,
          status,
          fullAudit,
          docsRetrieved: contextDocs.length,
          durationMs: Date.now() - startedAt,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
