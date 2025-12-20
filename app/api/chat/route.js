// app/api/chat/route.js
// FINAL-FORM: Structured, non-scare output. No sources shown. No C/P/Pf letters shown.
// - Findings must be excerpt-backed.
// - Enforcement/fines only if user asks or includeLegal flag.
// - Criminal penalties only if user explicitly asks.

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics } from '@/lib/usage'
import { validateSingleLocation, logSessionActivity } from '@/lib/licenseValidation'
import { getUserMemory, updateMemory, generateGreeting, buildMemoryContext } from '@/lib/conversationMemory'

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

// Retrieval
const TOPK = 18
const PINNED_TOPK = 8

// If your corpus has a concept of global/statewide docs, these may work.
// If not, they’ll just fail harmlessly (caught).
const GLOBAL_FALLBACK_KEYS = ['global', 'michigan', 'state', 'all']

// Pinned queries:
// - Washtenaw Violation Types (category definitions + correction windows)
// - Washtenaw Enforcement Action (3 opportunities)
// - Act 92 (admin fines + penalties) for optional “legal context”
const PINNED_QUERIES = [
  'Washtenaw County Violation Types Priority Priority Foundation Core When the Violation Needs to Be Corrected corrected immediately within 10 days within 90 days enforcement actions repeated',
  'Washtenaw County Enforcement Action Progressive Enforcement Action Opportunity Number 1 Opportunity Number 2 Opportunity Number 3 Office Conference Informal Hearing Formal Hearing license limited suspended revoked',
  '289.5105 Administrative fines or costs department may impose administrative fine $500 first offense $1,000 second subsequent offense costs of investigation written notice warning minor violations',
  '289.5107 Violations penalties misdemeanor fine $250 $2,500 90 days felony 4 years $10,000 costs of investigation',
  '289.5109 written report of the violation before subjecting persons to the penalties',
]

// Ranking sources for internal excerpt ordering (NOT shown to users)
const SOURCE_PRIORITY = {
  washtenaw: [/washtenaw/i, /violation\s*types/i, /enforcement\s*action/i],
  michigan: [/act\s*92/i, /mcl/i, /michigan/i, /289\.\d+/i, /modified.*food.*code/i],
  fda: [/fda.*food.*code/i],
  guides: [/cooking.*temp/i, /cooling.*foods/i, /cross.*contam/i, /date.*mark/i],
}

const ALLOWED_LIKELIHOOD = new Set(['Very likely', 'Likely', 'Possible', 'Unclear'])
const ALLOWED_CLASS = new Set(['P', 'Pf', 'C', 'Unclear'])

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}
function safeLine(x) {
  return safeText(x).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

// Output sanitizer: no emojis/markdown-y noise, safe length cap
function sanitizePlainText(text) {
  let out = safeText(text || '')
  out = out.replace(/[`#*]/g, '')
  out = out.replace(/\u2022/g, '')
  out = out.replace(/\n{3,}/g, '\n\n')

  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  out = out.replace(/^\s*\d+[\)\.\:\-]\s+/gm, '')

  const HARD_LIMIT = 2600
  if (out.length > HARD_LIMIT) {
    out = out.slice(0, HARD_LIMIT).trimEnd()
    out += '\n\nTip: say "full audit" to list more.'
  }
  return out.trim()
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
    t.includes('scan everything') ||
    t.includes('complete audit')
  )
}

// “Legal context” should be opt-in (no scare tactics).
function wantsLegalContext(text) {
  const t = safeLine(text).toLowerCase()
  if (!t) return false
  return (
    t.includes('fine') ||
    t.includes('fines') ||
    t.includes('penalt') ||
    t.includes('consequence') ||
    t.includes('what happens') ||
    t.includes('enforcement') ||
    t.includes('if i dont') ||
    t.includes("if i don't") ||
    t.includes('if it is not corrected') ||
    t.includes('if it isnt corrected')
  )
}

// Criminal penalty language should be EXTRA opt-in.
function wantsCriminalContext(text) {
  const t = safeLine(text).toLowerCase()
  if (!t) return false
  return (
    t.includes('criminal') ||
    t.includes('misdemeanor') ||
    t.includes('felony') ||
    t.includes('jail') ||
    t.includes('imprison') ||
    t.includes('90 days') ||
    t.includes('4 years')
  )
}

function getSourceTier(source) {
  const s = safeLine(source || '')
  if (!s) return 5
  for (const p of SOURCE_PRIORITY.washtenaw) if (p.test(s)) return 1
  for (const p of SOURCE_PRIORITY.michigan) if (p.test(s)) return 2
  for (const p of SOURCE_PRIORITY.fda) if (p.test(s)) return 3
  for (const p of SOURCE_PRIORITY.guides) if (p.test(s)) return 4
  return 5
}

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

function stableDocSort(a, b) {
  const tierA = getSourceTier(a?.source)
  const tierB = getSourceTier(b?.source)
  if (tierA !== tierB) return tierA - tierB

  const sa = safeLine(a?.source || '')
  const sb = safeLine(b?.source || '')
  if (sa !== sb) return sa.localeCompare(sb)

  const pa = Number(a?.page || 0)
  const pb = Number(b?.page || 0)
  if (pa !== pb) return pa - pb

  const ta = safeText(a?.text || '').slice(0, 120)
  const tb = safeText(b?.text || '').slice(0, 120)
  return ta.localeCompare(tb)
}

function buildExcerptContext(docs, opts = {}) {
  const prefix = typeof opts.prefix === 'string' ? opts.prefix : 'EXCERPT'
  const MAX_CHARS = typeof opts.maxChars === 'number' ? opts.maxChars : 36000
  const startAt = typeof opts.startAt === 'number' ? opts.startAt : 1

  const excerpts = []
  let buf = ''
  let n = startAt

  for (const d of docs || []) {
    const source = safeLine(d?.source || 'Unknown Source')
    const page = d?.page ? ` (p. ${d.page})` : ''
    const text = safeText(d?.text || '')
    if (!text) continue

    const id = `${prefix}_${n}`
    const header = `[${id}] SOURCE: ${source}${page}\n`
    const chunk = `${header}${text}\n\n`

    if (buf.length + chunk.length > MAX_CHARS) break

    excerpts.push({ id, source, page: d?.page || null, tier: getSourceTier(source) })
    buf += chunk
    n++
  }

  return { excerptIndex: excerpts, contextText: buf.trim() }
}

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

function classMeaning(cls) {
  // From Washtenaw Violation Types: P reduces illness hazard; Pf supports P; C general sanitation.
  if (cls === 'P') return 'Directly reduces a foodborne illness hazard.'
  if (cls === 'Pf') return 'Supports Priority compliance (supplies, equipment, facilities, programs).'
  if (cls === 'C') return 'General sanitation and facility maintenance.'
  return 'Category could not be confirmed.'
}

function computeDeadlineByClass(cls) {
  if (cls === 'P' || cls === 'Pf') return 'Immediately or within 10 days'
  if (cls === 'C') return 'Within 90 days'
  return 'Unclear'
}

function pickSourcesFromIds(sourceIds, excerptIndex) {
  const map = new Map((excerptIndex || []).map((e) => [e.id, e]))
  const used = []
  for (const sid of sourceIds || []) {
    const id = safeLine(sid)
    if (!id) continue
    const ex = map.get(id)
    if (!ex) continue
    used.push(ex)
  }
  return used
}

function renderDoNowBlock(doNow, photoRequests) {
  const dn = Array.isArray(doNow) ? doNow.map(safeLine).filter(Boolean) : []
  const pr = Array.isArray(photoRequests) ? photoRequests.map(safeLine).filter(Boolean) : []

  const out = []
  if (dn.length) {
    out.push('What to do now:')
    for (const x of dn.slice(0, 6)) out.push(`- ${x}`)
  }
  if (pr.length) {
    if (out.length) out.push('')
    out.push('Best follow-up photo:')
    for (const x of pr.slice(0, 4)) out.push(`- ${x}`)
  }
  return out.length ? out.join('\n') : ''
}

// Enforcement/fines: factual, optional, non-scare.
// (Derived from Washtenaw Enforcement Action + Act 92 admin fine section.)
function renderLegalContextBlock({ includeLegal = false, includeCriminal = false } = {}) {
  if (!includeLegal) return ''

  const lines = [
    'If it is not corrected by the deadline (optional context):',
    '- The county can escalate if issues repeat: routine/follow-up → Office Conference → Informal Hearing → license action; you can request a Formal Hearing to appeal.',
    '- State law allows administrative fines (not automatic): up to $500 first offense, up to $1,000 second/subsequent, plus investigation costs. For minor issues, a warning/notice may be used instead of a fine.',
  ]

  if (includeCriminal) {
    lines.push('- Act 92 also contains criminal penalties for certain violations (misdemeanor/felony language). If you want that breakdown, say: "show criminal penalties".')
  }

  return sanitizePlainText(lines.join('\n'))
}

function clampShort(s, max = 160) {
  const x = safeLine(s || '')
  if (!x) return ''
  return x.length > max ? x.slice(0, max - 1).trimEnd() + '…' : x
}

// User-facing rendering: no sources, no excerpt IDs, no letter classes.
function renderAuditPlainText(payload, maxItems, includeLegal = false, includeCriminal = false) {
  const opening = sanitizePlainText(payload?.opening_line || '')
  const auditStatus = safeLine(payload?.audit_status || 'unknown')

  // Clear: only a positive line. Nothing else.
  if (auditStatus === 'clear') {
    return sanitizePlainText(opening || 'Everything looks great here. Great job.')
  }

  const observations = Array.isArray(payload?.observations) ? payload.observations : []
  const doNow = Array.isArray(payload?.do_now) ? payload.do_now : []
  const photoRequests = Array.isArray(payload?.photo_requests) ? payload.photo_requests : []
  const findings = Array.isArray(payload?.findings) ? payload.findings : []
  const questions = Array.isArray(payload?.clarifying_questions) ? payload.clarifying_questions : []

  const out = []
  out.push(opening || 'Here is what I can tell from what was provided.')

  if (observations.length) {
    out.push('')
    out.push('From the photo:')
    for (const o of observations.slice(0, 4)) {
      const line = clampShort(o, 180)
      if (!line) continue
      out.push(`- ${line}`)
    }
  }

  const doNowBlock = renderDoNowBlock(doNow, photoRequests)
  if (doNowBlock) {
    out.push('')
    out.push(doNowBlock)
  }

  if (findings.length > 0) {
    out.push('')
    out.push('Potential inspection issues:')

    for (const f of findings.slice(0, maxItems)) {
      const cls = normalizeClass(f?.class)
      const label = classLabel(cls)
      const meaning = classMeaning(cls)
      const title = clampShort(f?.title || 'Possible issue', 140)
      const why = clampShort(f?.why || '', 170)
      const fix = clampShort(f?.fix || '', 170)
      const likelihood = normalizeLikelihood(f?.likelihood)
      const deadlineRaw = safeLine(f?.deadline || '')
      const deadline = deadlineRaw || computeDeadlineByClass(cls)

      out.push('')
      out.push(`${label} — ${title}`)
      out.push(`- What it means: ${meaning}`)
      out.push(`- Correction window: ${deadline}`)
      if (likelihood !== 'Unclear') out.push(`- Confidence: ${likelihood}`)
      if (why) out.push(`- Why it matters: ${why}`)
      if (fix) out.push(`- What to do: ${fix}`)
    }

    const legal = renderLegalContextBlock({ includeLegal, includeCriminal })
    if (legal) {
      out.push('')
      out.push(legal)
    }
  }

  if (questions.length > 0) {
    out.push('')
    out.push('To confirm:')
    for (const q of questions.slice(0, 3)) {
      const qq = clampShort(q, 180)
      if (!qq) continue
      out.push(`- ${qq}`)
    }
  }

  return sanitizePlainText(out.join('\n'))
}

function renderGuidancePlainText(payload) {
  const opening = sanitizePlainText(payload?.opening_line || '')
  const steps = Array.isArray(payload?.guidance_steps) ? payload.guidance_steps : []
  const questions = Array.isArray(payload?.clarifying_questions) ? payload.clarifying_questions : []

  const out = []
  out.push(opening || 'Here is the safest way to handle that:')

  for (const s of steps.slice(0, 7)) {
    const line = clampShort(s, 180)
    if (!line) continue
    out.push(`- ${line}`)
  }

  if (questions.length > 0) {
    out.push('')
    out.push('To confirm:')
    for (const q of questions.slice(0, 3)) {
      const qq = clampShort(q, 180)
      if (!qq) continue
      out.push(`- ${qq}`)
    }
  }

  return sanitizePlainText(out.join('\n'))
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
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

async function runPinnedRetrieval(searchDocumentsFn, county, q, k) {
  // Try county first
  const primary = await withTimeout(
    searchDocumentsFn(q, county, k),
    RETRIEVAL_TIMEOUT_MS,
    'RETRIEVAL_TIMEOUT_PINNED'
  ).catch(() => [])
  if (Array.isArray(primary) && primary.length) return primary

  // Fallback keys
  for (const key of GLOBAL_FALLBACK_KEYS) {
    const alt = await withTimeout(
      searchDocumentsFn(q, key, k),
      RETRIEVAL_TIMEOUT_MS,
      'RETRIEVAL_TIMEOUT_PINNED_GLOBAL'
    ).catch(() => [])
    if (Array.isArray(alt) && alt.length) return alt
  }
  return []
}

export async function POST(request) {
  const startedAt = Date.now()

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY not configured')
      return NextResponse.json({ error: 'AI service not configured. Please contact support.' }, { status: 500 })
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
    const effectiveUserPrompt = lastUserText || (hasImage ? 'Analyze this photo for food safety issues.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    const fullAudit = wantsFullAudit(effectiveUserPrompt) || Boolean(body?.fullAudit)
    const maxFindings = fullAudit ? 10 : 4

    // ✅ Non-scare defaults:
    const includeLegal = Boolean(body?.includeLegal) || wantsLegalContext(effectiveUserPrompt)
    const includeCriminal = Boolean(body?.includeCriminal) || wantsCriminalContext(effectiveUserPrompt)

    // ✅ ENHANCED: Auth with location validation
    let userId = null
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

      // ✅ NEW: Email verification check
      if (userId && data?.user && !data.user.email_confirmed_at) {
        return NextResponse.json({ 
          error: 'Please verify your email address before using protocolLM. Check your inbox for the verification link.',
          code: 'EMAIL_NOT_VERIFIED'
        }, { status: 403 })
      }

      // ✅ NEW: Validate single location license
      if (userId) {
        const sessionInfo = {
          ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }

        const locationCheck = await validateSingleLocation(userId, sessionInfo)

        if (!locationCheck.valid) {
          if (locationCheck.code === 'LOCATION_MISMATCH') {
            return NextResponse.json({ 
              error: locationCheck.error,
              code: 'LOCATION_MISMATCH'
            }, { status: 403 })
          }

          if (locationCheck.code === 'MULTI_LOCATION_ACCESS') {
            return NextResponse.json({ 
              error: locationCheck.error,
              code: 'MULTI_LOCATION_ACCESS'
            }, { status: 403 })
          }

          if (locationCheck.needsRegistration) {
            return NextResponse.json({ 
              error: 'Location registration required',
              code: 'LOCATION_NOT_REGISTERED'
            }, { status: 403 })
          }
        }

        await logSessionActivity(userId, sessionInfo)
      }

    } catch (e) {
      logger.warn('Auth check failed (continuing)', { error: e?.message })
    }

    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    // 1) Conservative vision scan (NO legal claims)
    let vision = {
      summary: '',
      search_terms: '',
      visible_facts: [],
      possible_issues: [],
      unclear: [],
      do_now: [],
      photo_requests: [],
    }

    if (hasImage && imageBase64) {
      try {
        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            temperature: 0,
            max_tokens: 650,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
                  {
                    type: 'text',
                    text: `You are doing a conservative kitchen photo scan.

Rules:
- Only describe what is clearly visible.
- Do NOT claim a code violation.
- Provide helpful "do_now" actions that are safe and do not assume a violation.
- Keep it short. No emojis.

Return ONLY valid JSON:
{
  "summary": "one short sentence about what the photo shows",
  "search_terms": "short keywords for regulation lookup",
  "visible_facts": ["short factual observations (no guesses)"],
  "possible_issues": [
    {"issue":"short issue","needs_check":"what to verify (thermometer/label/test strip/etc)"}
  ],
  "do_now": ["safe immediate actions (no violation claims)"],
  "photo_requests": ["what close-up photo would confirm this best"],
  "unclear": ["things you cannot confirm from the photo"]
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

        const parsed = extractJsonObject(visionText)
        if (parsed) {
          vision.summary = safeLine(parsed.summary || '')
          vision.search_terms = safeLine(parsed.search_terms || '')

          if (Array.isArray(parsed.visible_facts)) {
            vision.visible_facts = parsed.visible_facts.map((x) => safeLine(x)).filter(Boolean).slice(0, 10)
          }

          if (Array.isArray(parsed.possible_issues)) {
            vision.possible_issues = parsed.possible_issues
              .map((i) => ({ issue: safeLine(i?.issue || ''), needs_check: safeLine(i?.needs_check || '') }))
              .filter((i) => i.issue)
              .slice(0, 8)
          }

          if (Array.isArray(parsed.do_now)) {
            vision.do_now = parsed.do_now.map((x) => safeLine(x)).filter(Boolean).slice(0, 8)
          }

          if (Array.isArray(parsed.photo_requests)) {
            vision.photo_requests = parsed.photo_requests.map((x) => safeLine(x)).filter(Boolean).slice(0, 6)
          }

          if (Array.isArray(parsed.unclear)) {
            vision.unclear = parsed.unclear.map((x) => safeLine(x)).filter(Boolean).slice(0, 8)
          }
        } else {
          vision.summary = safeLine(visionText).slice(0, 220)
        }
      } catch (e) {
        logger.warn('Vision failed (continuing)', { error: e?.message })
      }
    }

    // 2) Retrieval
    const visionHints = [
      vision.search_terms,
      ...(vision.visible_facts || []),
      ...(vision.possible_issues || []).map((x) => x.issue),
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 600)

    const retrievalQuery = [effectiveUserPrompt, visionHints, 'Washtenaw County Michigan food service']
      .filter(Boolean)
      .join(' ')
      .slice(0, 900)

    let mainDocs = []
    let pinnedDocs = []
    try {
      const mainPromise = withTimeout(
        searchDocumentsFn(retrievalQuery, county, TOPK),
        RETRIEVAL_TIMEOUT_MS,
        'RETRIEVAL_TIMEOUT_MAIN'
      )

      const pinnedPromise = Promise.all(
        PINNED_QUERIES.map((q) => runPinnedRetrieval(searchDocumentsFn, county, q, PINNED_TOPK))
      )

      const [m, pList] = await Promise.all([mainPromise.catch(() => []), pinnedPromise])
      mainDocs = Array.isArray(m) ? m : []
      pinnedDocs = Array.isArray(pList) ? pList.flat() : []
      mainDocs = dedupeByText(mainDocs)
      pinnedDocs = dedupeByText(pinnedDocs)
    } catch (e) {
      logger.warn('Retrieval failed (continuing)', { error: e?.message })
    }

    pinnedDocs.sort(stableDocSort)
    const pinnedKeys = new Set(pinnedDocs.map((d) => (d?.text || '').slice(0, 1600)).filter(Boolean))
    mainDocs = (mainDocs || []).filter((d) => {
      const k = (d?.text || '').slice(0, 1600)
      if (!k) return false
      return !pinnedKeys.has(k)
    })
    mainDocs.sort((a, b) => {
      const tierA = getSourceTier(a?.source)
      const tierB = getSourceTier(b?.source)
      if (tierA !== tierB) return tierA - tierB
      return (b?.score || 0) - (a?.score || 0)
    })

    const pinnedCtx = buildExcerptContext(pinnedDocs, { prefix: 'EXCERPT_P', maxChars: 24000, startAt: 1 })
    const mainCtx = buildExcerptContext(mainDocs, { prefix: 'EXCERPT_D', maxChars: 16000, startAt: 1 })
    const excerptIndex = [...pinnedCtx.excerptIndex, ...mainCtx.excerptIndex]

    const pinnedBlock = `Pinned reference excerpts (cite by excerpt id only):
${pinnedCtx.contextText || 'No pinned excerpts retrieved.'}`

    const dynamicBlock = `Relevant excerpts (dynamic; cite by excerpt id only):
${mainCtx.contextText || 'No dynamic excerpts retrieved.'}`

    // 3) Model prompt
    const systemPrompt = `You are ProtocolLM, a compliance assistant for Washtenaw County, Michigan food service establishments.

Tone:
- Professional, plain language, concise.
- No emojis. No markdown. No hashtags. No numbered lists.
- Do not mention sources, document names, page numbers, or "excerpt" in user-facing fields.

Grounding rules (strict):
- You may ONLY use rules from the provided excerpts.
- Any item in audit.findings MUST include at least one valid excerpt id in source_ids.
- If you cannot cite it, do NOT put it in findings. Put it in clarifying_questions instead.

Output rules:
- Use class only as P / Pf / C / Unclear (server will render full labels).
- Keep each field short (single sentence where requested).

Return ONLY valid JSON:

AUDIT MODE:
{
  "mode": "audit",
  "opening_line": "one short sentence",
  "audit": {
    "status": "clear" | "findings" | "needs_info",
    "findings": [
      {
        "class": "P" | "Pf" | "C" | "Unclear",
        "title": "short issue",
        "likelihood": "Very likely" | "Likely" | "Possible" | "Unclear",
        "why": "one short sentence",
        "fix": "one short sentence",
        "deadline": "Immediately or within 10 days" | "Within 90 days" | "Unclear",
        "source_ids": ["EXCERPT_P_1"]
      }
    ]
  },
  "clarifying_questions": ["up to 3 short questions only if needed"]
}

GUIDANCE MODE:
{
  "mode": "guidance",
  "opening_line": "one short sentence",
  "guidance_steps": ["up to 7 short steps"],
  "clarifying_questions": ["up to 3 short questions only if needed"]
}

Hard caps:
- max findings = ${maxFindings}
`

    const factsBlock =
      vision.visible_facts?.length > 0
        ? `Visible facts:\n${vision.visible_facts.map((x) => `- ${x}`).join('\n')}`
        : 'Visible facts: None provided.'

    const possibleIssuesBlock =
      vision.possible_issues?.length > 0
        ? `Possible things to verify:\n${vision.possible_issues
            .map((x) => `- ${x.issue}${x.needs_check ? ` (Verify: ${x.needs_check})` : ''}`)
            .join('\n')}`
        : 'Possible things to verify: None listed.'

    const questionBlock = `User request:
${effectiveUserPrompt || (hasImage ? 'Analyze photo.' : '')}

${hasImage ? `Photo summary:
${vision.summary || 'No summary available.'}

${factsBlock}

${possibleIssuesBlock}` : ''}`.trim()

    // 4) Final answer
    let modelText = ''
    let parsed = null
    let cacheStats = null

    try {
      const finalMessages = []

      if (hasImage && imageBase64) {
        finalMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: pinnedBlock, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: dynamicBlock },
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
            { type: 'text', text: questionBlock },
          ],
        })
      } else {
        finalMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: pinnedBlock, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: dynamicBlock },
            { type: 'text', text: questionBlock },
          ],
        })
      }

      const answerResp = await withTimeout(
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          temperature: 0.2,
          max_tokens: fullAudit ? 1400 : 1000,
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
      if (cacheStats) logger.info('Prompt cache stats', cacheStats)
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })
    }

    // 5) Render
    let message = ''
    let status = 'unknown'

    if (parsed && parsed.mode === 'audit') {
      const auditPayload = parsed.audit || {}
      const findingsRaw = Array.isArray(auditPayload.findings) ? auditPayload.findings : []
      const questions = Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : []
      const modelOpening = safeLine(parsed.opening_line || '')

      // Only allow excerpt-backed findings through
      const supportedFindings = []
      for (const f of findingsRaw.slice(0, maxFindings)) {
        const srcIds = Array.isArray(f?.source_ids) ? f.source_ids : []
        const usable = pickSourcesFromIds(srcIds, excerptIndex)
        if (!usable.length) continue

        supportedFindings.push({
          class: normalizeClass(f?.class),
          title: safeLine(f?.title || 'Possible issue'),
          likelihood: normalizeLikelihood(f?.likelihood),
          why: safeLine(f?.why || ''),
          fix: safeLine(f?.fix || ''),
          deadline: safeLine(f?.deadline || ''),
          source_ids: srcIds,
        })
      }

      const hasAnyChecks =
        (vision.possible_issues || []).length > 0 || (vision.unclear || []).length > 0 || questions.length > 0

      if (supportedFindings.length > 0) {
        status = 'findings'
        message = renderAuditPlainText(
          {
            audit_status: 'findings',
            opening_line: modelOpening || 'I noticed a few things worth tightening up before an inspection.',
            findings: supportedFindings,
            clarifying_questions: questions,
            do_now: vision.do_now || [],
            photo_requests: vision.photo_requests || [],
            observations: (vision.visible_facts || []).slice(0, 4),
          },
          maxFindings,
          includeLegal,
          includeCriminal
        )
      } else {
        if (!hasAnyChecks) {
          status = 'clear'
          message = renderAuditPlainText(
            { audit_status: 'clear', opening_line: modelOpening || 'Everything looks great here. Great job.' },
            maxFindings,
            false,
            false
          )
        } else {
          status = 'needs_info'
          message = renderAuditPlainText(
            {
              audit_status: 'needs_info',
              opening_line:
                modelOpening ||
                'I cannot confirm a specific inspection issue from this photo alone. Here is what I would check next.',
              findings: [],
              clarifying_questions: questions,
              do_now: vision.do_now || [],
              photo_requests: vision.photo_requests || [],
              observations: (vision.visible_facts || []).slice(0, 4),
            },
            maxFindings,
            false,
            false
          )
        }
      }
    } else if (parsed && parsed.mode === 'guidance') {
      status = 'guidance'
      message = renderGuidancePlainText({
        opening_line: parsed.opening_line || '',
        guidance_steps: Array.isArray(parsed.guidance_steps) ? parsed.guidance_steps : [],
        clarifying_questions: Array.isArray(parsed.clarifying_questions) ? parsed.clarifying_questions : [],
      })
    } else {
      status = hasImage ? 'needs_info' : 'guidance'
      const fallback = modelText || (hasImage ? 'Analysis timed out. Please try again.' : 'Please try again.')
      const doNowBlock = renderDoNowBlock(vision.do_now, vision.photo_requests)
      message = sanitizePlainText(doNowBlock ? `${fallback}\n\n${doNowBlock}` : fallback)
    }

    logger.info('Response complete', {
      hasImage,
      status,
      durationMs: Date.now() - startedAt,
      model: CLAUDE_MODEL,
      fullAudit,
      mainDocsRetrieved: mainDocs.length,
      pinnedDocsRetrieved: pinnedDocs.length,
      includeLegal,
      includeCriminal,
      cache_hit: cacheStats?.cache_hit || false,
      cache_read_input_tokens: cacheStats?.cache_read_input_tokens || 0,
      cache_savings_pct: cacheStats?.cache_savings_pct || 0,
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
          mainDocsRetrieved: mainDocs.length,
          pinnedDocsRetrieved: pinnedDocs.length,
          durationMs: Date.now() - startedAt,
          includeLegal,
          includeCriminal,
          cache: cacheStats || null,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
