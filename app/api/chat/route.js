// app/api/chat/route.js
// ProtocolLM - Michigan Food Safety Compliance Engine (STATEWIDE)
// Cohere v2/chat (REST) — Aya Vision for images, Command for text
//
// GOAL OUTPUT (always):
// - NO VIOLATIONS ✓   OR   VIOLATIONS:   OR   NEED INFO:
// - If violations:
//    • <span class="plm-v">VIOLATION (Type | Category): What we can see.</span> <span class="plm-f">FIX: What to do.</span>
// - If no violations: just header line
// - If need info: up to 2 short questions
//
// Styling notes:
// - We return tiny HTML spans only for styling control (not markdown).
// - Only the VIOLATION label line is red/bold; fix is green.
// - Everything else stays normal text.

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
    const searchDocsModule = await import('@/lib/searchDocs')
    searchDocuments = searchDocsModule.searchDocuments
  }
  return searchDocuments
}

// ============================================================================
// FLAGS + MODELS
// ============================================================================

const FEATURE_COHERE = (process.env.FEATURE_COHERE ?? 'true').toLowerCase() !== 'false'
const FEATURE_RERANK = (process.env.FEATURE_RERANK ?? 'false').toLowerCase() === 'true'
const FEATURE_CHEMICAL_SCAN = (process.env.FEATURE_CHEMICAL_SCAN ?? 'true').toLowerCase() === 'true'

const COHERE_TEXT_MODEL = process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024'
const COHERE_TEXT_FALLBACK_MODEL = process.env.COHERE_TEXT_FALLBACK_MODEL || 'command-r'

const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'
const COHERE_VISION_FALLBACK_MODEL = process.env.COHERE_VISION_FALLBACK_MODEL || COHERE_VISION_MODEL

const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro'
const MODEL_LABEL = 'Cohere'

// Time budgets
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000
const PINNED_RETRIEVAL_TIMEOUT_MS = 3200
const CHEM_SCAN_TIMEOUT_MS = 7500

// Retrieval config
const TOPK_PER_QUERY = 16
const RERANK_TOP_N = 5
const MIN_RERANK_DOCS = 3
const MAX_CONTEXT_DOCS = 6
const PINNED_POLICY_TARGET = 2

// Tool output constraints
const MAX_BULLETS_DEFAULT = 3
const MAX_BULLETS_FULL_AUDIT = 6

// Output headers (THE ONLY ALLOWED HEADERS)
const HDR_NO = 'NO VIOLATIONS ✓'
const HDR_VIOL = 'VIOLATIONS:'
const HDR_INFO = 'NEED INFO:'

// Tiny HTML spans for styling control (frontend should style these classes)
const SPAN_V_OPEN = '<span class="plm-v">'
const SPAN_V_CLOSE = '</span>'
const SPAN_F_OPEN = '<span class="plm-f">'
const SPAN_F_CLOSE = '</span>'

// Preamble caps (this is what usually triggers 422 if you go too big)
const PREAMBLE_MAX_FULL = 9000
const PREAMBLE_MAX_LITE = 5200
const PREAMBLE_MAX_MIN = 2600

// ============================================================================
// SMALL UTILS
// ============================================================================

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms))])
}

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}
function safeLine(x) {
  return safeText(x).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

function clampText(str, maxChars) {
  const s = safeText(str || '')
  if (!s) return ''
  if (s.length <= maxChars) return s
  return s.slice(0, maxChars).trimEnd() + '…'
}

function getSessionInfoFromRequest(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return { ip, userAgent }
}

function stripDocLikeRefs(text) {
  if (!text) return ''
  return String(text)
    .replace(/\bDOC[_\s-]*\d+\b[:\-]?\s*/gi, '')
    .replace(/\bDOCS?[_\s-]*\d+\b/gi, '')
    .replace(/\(p\.\s*\d+\)/gi, '')
    .replace(/\bp\.\s*\d+\b/gi, '')
}

// IMPORTANT: We do NOT remove HTML spans; we DO remove markdown-ish formatting.
function sanitizeOutput(text) {
  let out = safeText(text || '')

  out = out.replace(/```/g, '')
  out = out.replace(/^\s*#{1,6}\s+/gm, '')

  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  out = out.replace(/\b(high|medium|low)\s*confidence\b/gi, '')
  out = out.replace(/\bconfidence\s*[:\-]?\s*(high|medium|low)\b/gi, '')
  out = out.replace(/\bconfidence\b\s*[:\-]?\s*/gi, '')

  out = stripDocLikeRefs(out)
  out = out.replace(/\n{3,}/g, '\n\n')

  const HARD_LIMIT = 1800
  if (out.length > HARD_LIMIT) out = out.slice(0, HARD_LIMIT).trimEnd()

  return out.trim()
}

// ============================================================================
// IMAGE VALIDATION + NORMALIZATION (ALWAYS PRODUCE DATA URL)
// ============================================================================

function isBase64Like(s) {
  if (!s || typeof s !== 'string') return false
  const trimmed = s.trim()
  if (trimmed.length < 100) return false
  const normalized = trimmed.replace(/\s+/g, '')
  return /^[A-Za-z0-9+/=_-]+$/.test(normalized)
}

function extractMediaTypeFromHeader(header) {
  if (!header || typeof header !== 'string') return null
  return header.match(/data:(image\/[^;]+);/i)?.[1] || null
}

function normalizeToDataUrl(input) {
  if (typeof input === 'string' && input.trim().startsWith('data:image/')) {
    const trimmed = input.trim()
    const parts = trimmed.split(',')
    if (parts.length !== 2) return null

    const header = parts[0]
    const base64Raw = parts[1] || ''
    const mediaType = extractMediaTypeFromHeader(header)
    const base64Data = base64Raw.trim().replace(/\s+/g, '')

    if (!mediaType) return null
    if (!isBase64Like(base64Data)) return null
    return { mediaType, base64Data, dataUrl: `data:${mediaType};base64,${base64Data}` }
  }

  if (input && typeof input === 'object' && typeof input.dataUrl === 'string') {
    return normalizeToDataUrl(input.dataUrl)
  }

  if (input && typeof input === 'object') {
    const data = input.data
    const mediaType = input.media_type || input.mediaType
    if (typeof data === 'string' && typeof mediaType === 'string' && mediaType.startsWith('image/')) {
      const base64Data = data.trim().replace(/\s+/g, '')
      if (!isBase64Like(base64Data)) return null
      return { mediaType, base64Data, dataUrl: `data:${mediaType};base64,${base64Data}` }
    }
  }

  if (typeof input === 'string' && isBase64Like(input)) {
    const base64Data = input.trim().replace(/\s+/g, '')
    const mediaType = 'image/jpeg'
    return { mediaType, base64Data, dataUrl: `data:${mediaType};base64,${base64Data}` }
  }

  return null
}

function validateImageData(imageInput) {
  if (!imageInput) return { valid: false, error: 'No image data' }
  try {
    const normalized = normalizeToDataUrl(imageInput)
    if (!normalized) {
      return {
        valid: false,
        error: 'Invalid image payload. Expected a data URL, raw base64 string, or {data, media_type}.',
      }
    }

    const { mediaType, base64Data, dataUrl } = normalized
    if (!base64Data || base64Data.length < 100) return { valid: false, error: 'Image data too small' }
    if (!mediaType || !mediaType.startsWith('image/')) return { valid: false, error: 'Cannot determine image type' }

    return { valid: true, base64Data, mediaType, dataUrl }
  } catch (error) {
    logger.error('Image validation failed', { error: error?.message })
    return { valid: false, error: 'Image validation error' }
  }
}

// ============================================================================
// COHERE v2/chat (REST) — with better error parsing + retries
// ============================================================================

function cohereResponseToText(resp) {
  const msg = resp?.message
  const content = msg?.content

  if (typeof content === 'string' && content.trim()) return content

  if (Array.isArray(content)) {
    for (const c of content) {
      if (typeof c?.text === 'string' && c.text.trim()) return c.text
    }
  }

  if (typeof resp?.text === 'string' && resp.text.trim()) return resp.text
  if (typeof resp?.output_text === 'string' && resp.output_text.trim()) return resp.output_text
  return ''
}

function parseCohereError(raw) {
  const txt = String(raw || '').trim()
  if (!txt) return { summary: 'Empty error body', parsed: null }
  try {
    const j = JSON.parse(txt)
    const msg =
      j?.message ||
      j?.error?.message ||
      j?.error ||
      j?.details?.message ||
      (Array.isArray(j?.errors) ? j.errors.map((e) => e?.message || e).join(' | ') : '')
    const detail =
      j?.details ||
      j?.error?.details ||
      j?.validation_errors ||
      j?.errors ||
      j

    const summary = safeLine(String(msg || 'Cohere error')).slice(0, 500)
    return { summary, parsed: detail }
  } catch {
    return { summary: safeLine(txt).slice(0, 700), parsed: null }
  }
}

async function callCohereChatV2Rest({ model, preamble, messages }) {
  const apiKey = process.env.COHERE_API_KEY
  if (!apiKey) throw new Error('COHERE_API_KEY not configured')

  const baseMessages = Array.isArray(messages) ? messages : []
  const system = safeText(preamble)
  const payload = {
    model,
    messages: system
      ? [
          {
            role: 'system',
            content: [{ type: 'text', text: system }],
          },
          ...baseMessages,
        ]
      : baseMessages,
  }

  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const raw = await res.text().catch(() => '')
  if (!res.ok) {
    const parsed = parseCohereError(raw)
    const err = new Error(`COHERE_V2_CHAT_${res.status}: ${parsed.summary}`)
    err.status = res.status
    err.body = raw
    err.parsed = parsed.parsed
    throw err
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('COHERE_V2_CHAT_BAD_JSON')
  }
}

function buildV2Messages({ chatHistory, userMessage, imageDataUrls }) {
  const messages = []

  const hist = Array.isArray(chatHistory) ? chatHistory : []
  for (const h of hist) {
    const roleRaw = String(h?.role || '').toUpperCase()
    const text = safeText(h?.message || '')
    if (!text) continue

    if (roleRaw === 'USER') {
      messages.push({ role: 'user', content: [{ type: 'text', text }] })
    } else if (roleRaw === 'CHATBOT' || roleRaw === 'ASSISTANT') {
      messages.push({ role: 'assistant', content: [{ type: 'text', text }] })
    }
  }

  const parts = []
  const msgText = safeText(userMessage)
  if (msgText) parts.push({ type: 'text', text: msgText })

  const imgs = Array.isArray(imageDataUrls) ? imageDataUrls : []
  for (const url of imgs) parts.push({ type: 'image_url', image_url: { url } })

  messages.push({
    role: 'user',
    content: parts.length ? parts : [{ type: 'text', text: 'Analyze the image.' }],
  })

  return messages
}

async function callCohereChatOnce({ model, preamble, userMessage, chatHistory, imageDataUrls }) {
  const messages = buildV2Messages({ chatHistory, userMessage, imageDataUrls })
  const resp = await callCohereChatV2Rest({ model, preamble, messages })
  return { raw: resp, text: cohereResponseToText(resp) }
}

// Retry on 400/422 with smaller preamble; optional model fallback on repeated failure.
async function callCohereChatWithRetries({
  primaryModel,
  fallbackModel,
  preambles,
  userMessage,
  chatHistory,
  imageDataUrls,
}) {
  let lastErr = null

  const tryModels = [primaryModel]
  if (fallbackModel && fallbackModel !== primaryModel) tryModels.push(fallbackModel)

  for (const model of tryModels) {
    for (const pre of preambles) {
      try {
        return await callCohereChatOnce({
          model,
          preamble: pre.text,
          userMessage,
          chatHistory,
          imageDataUrls,
        })
      } catch (e) {
        lastErr = e
        const status = Number(e?.status || 0)
        const retryable = status === 400 || status === 422
        logger.warn('Cohere v2/chat attempt failed', {
          status,
          model,
          preambleTier: pre.name,
          error: e?.message,
          parsed: e?.parsed ? String(JSON.stringify(e.parsed)).slice(0, 500) : undefined,
        })
        if (!retryable) throw e
        // otherwise continue to next smaller preamble (or next model)
      }
    }
  }

  throw lastErr || new Error('COHERE_V2_CHAT_FAILED')
}

// ============================================================================
// DOCUMENT RETRIEVAL
// ============================================================================

const PINNED_POLICY_QUERIES = [
  'Michigan food code priority item priority foundation core definitions correction time frames',
  'Michigan food code chemical storage poisonous toxic materials stored to prevent contamination equipment utensils',
]

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 1200)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function docTextForExcerpt(doc, maxChars = 520) {
  const t = safeText(doc?.text || '')
  if (!t) return ''
  if (t.length <= maxChars) return t
  return t.slice(0, maxChars).trimEnd() + '…'
}

function buildExcerptBlock(contextDocs, maxChars = 520) {
  if (!contextDocs?.length) return ''

  return contextDocs
    .map(
      (doc, idx) =>
        `POLICY EXCERPT [${idx + 1}] — ${safeLine(doc?.source || 'Policy')} (p.${safeLine(
          doc?.page || 'N/A'
        )}):\n${docTextForExcerpt(doc, maxChars)}`
    )
    .join('\n\n')
}

async function fetchPinnedPolicyDocs(searchDocumentsFn, county) {
  try {
    const tasks = PINNED_POLICY_QUERIES.map((q) =>
      withTimeout(searchDocumentsFn(q, county, 6), PINNED_RETRIEVAL_TIMEOUT_MS, 'PINNED_TIMEOUT').catch(() => [])
    )
    const results = await Promise.all(tasks)
    const flat = dedupeByText(results.flat().filter(Boolean))
    return flat.slice(0, PINNED_POLICY_TARGET)
  } catch (e) {
    logger.warn('Pinned policy retrieval failed', { error: e?.message })
    return []
  }
}

function extractSearchKeywords(text) {
  const topics = ['chemical', 'cleaner', 'spray bottle', 'windex', 'bleach', 'degreaser', 'sanitizer', 'sink', 'dish']
  const lower = (text || '').toLowerCase()
  return topics.filter((t) => lower.includes(t))
}

// ============================================================================
// OUTPUT NORMALIZER (FORCES "TOOL" FORMAT)
// ============================================================================

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function normalizeHeader(line0) {
  const up = safeLine(line0 || '').toUpperCase()
  if (up.startsWith('NO VIOLATIONS')) return HDR_NO
  if (up.startsWith('VIOLATIONS')) return HDR_VIOL
  if (up.startsWith('NEED')) return HDR_INFO
  return null
}

function forceToolBullets(rawText, { maxBullets }) {
  let out = sanitizeOutput(rawText || '')
  if (!out) return HDR_INFO + '\n• Can you re-send a clearer photo (closer + better lighting)?'

  out = out.replace(/^Based on the (image|photo) provided[,:\s]*/i, '')
  out = out.replace(/^Here are (some|several) (violations|issues)[,:\s]*/i, '')

  const lines0 = out.split('\n').map((l) => l.trim()).filter(Boolean)
  const header = normalizeHeader(lines0[0])
  let bodyLines = header ? lines0.slice(1) : lines0

  if (!header) {
    const u = out.toUpperCase()
    const inferred =
      u.includes('VIOLATION') || u.includes('IMPROPER') || u.includes('UNSANITARY') || u.includes('CHEMICAL')
        ? HDR_VIOL
        : out.includes('?')
          ? HDR_INFO
          : HDR_NO
    return buildFinalToolOutput(inferred, bodyLines.join('\n'), maxBullets)
  }

  return buildFinalToolOutput(header, bodyLines.join('\n'), maxBullets)
}

function buildFinalToolOutput(header, bodyText, maxBullets) {
  const h = header || HDR_INFO
  const maxB = clamp(Number(maxBullets || 3), 1, 8)

  if (h === HDR_NO) return HDR_NO

  let chunks = String(bodyText || '')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)

  if (chunks.length <= 1) {
    chunks = String(bodyText || '')
      .split(/\s(?=\d+\.)/g)
      .map((x) => x.trim())
      .filter(Boolean)
  }

  const bullets = []
  for (const c of chunks) {
    let t = c.replace(/^\d+\.\s*/g, '').replace(/^[-•]\s*/g, '').trim()
    if (!t) continue
    bullets.push(t)
  }

  if (h === HDR_INFO) {
    const qs = bullets
      .map((b) => b.replace(/^(Question|Need info|Clarification)[:\-]\s*/i, '').trim())
      .filter((b) => b.includes('?') || b.length <= 120)
      .slice(0, 2)

    if (!qs.length) return HDR_INFO + '\n• Can you re-send a clearer photo of the area?'
    return [HDR_INFO, ...qs.map((q) => `• ${safeLine(q)}`)].join('\n')
  }

  const cleaned = bullets.slice(0, maxB).map((b) => coerceViolationBullet(b))
  if (!cleaned.length) return HDR_INFO + '\n• Can you re-send the photo a bit closer?'

  return [HDR_VIOL, ...cleaned.map((b) => `• ${b}`)].join('\n')
}

function coerceViolationBullet(text) {
  const t = safeLine(text || '')
  if (!t) return null

  let issuePart = t
  let fixPart = ''

  const fixIdx = t.toUpperCase().indexOf('FIX:')
  if (fixIdx !== -1) {
    issuePart = safeLine(t.slice(0, fixIdx))
    fixPart = safeLine(t.slice(fixIdx + 4))
  }

  issuePart = issuePart.split(/(?<=[.!?])\s+/)[0] || issuePart
  issuePart = issuePart.replace(/^Violation[:\-]\s*/i, '').trim()

  if (!fixPart) {
    const lower = t.toLowerCase()
    if (lower.includes('windex') || lower.includes('bleach') || lower.includes('degreaser') || lower.includes('cleaner') || lower.includes('spray bottle')) {
      fixPart = 'Remove chemicals from dish/food-contact areas and store in a labeled chemical area away from food and clean utensils.'
    } else {
      fixPart = 'Correct the issue immediately and keep the area clean, organized, and protected from contamination.'
    }
  } else {
    fixPart = fixPart.split(/(?<=[.!?])\s+/)[0] || fixPart
  }

  const { type, category } = inferTypeAndCategory(t)

  const label = `${SPAN_V_OPEN}VIOLATION (${type} | ${category}): ${issuePart}.${SPAN_V_CLOSE}`
  const fix = `${SPAN_F_OPEN}FIX: ${fixPart}.${SPAN_F_CLOSE}`

  return `${label} ${fix}`.replace(/\.\./g, '.')
}

function inferTypeAndCategory(text) {
  const lower = String(text || '').toLowerCase()
  let type = 'Sanitation'
  if (lower.includes('chemical') || lower.includes('windex') || lower.includes('bleach') || lower.includes('cleaner') || lower.includes('spray bottle')) type = 'Chemical Handling'
  else if (lower.includes('handwash') || lower.includes('hand wash')) type = 'Handwashing'
  else if (lower.includes('temperature') || lower.includes('cool') || lower.includes('reheat') || lower.includes('hot hold') || lower.includes('cold hold')) type = 'Time/Temperature'
  else if (lower.includes('cross') || lower.includes('contamination') || lower.includes('raw') || lower.includes('ready-to-eat')) type = 'Cross-Contamination'
  else if (lower.includes('pest')) type = 'Pest Control'

  let category = 'Core'
  if (type === 'Chemical Handling' || type === 'Time/Temperature' || type === 'Cross-Contamination') category = 'Priority'
  return { type, category }
}

function hasChemicalBullet(toolText) {
  const t = (toolText || '').toLowerCase()
  return t.includes('chemical handling') || t.includes('windex') || t.includes('cleaner') || t.includes('spray bottle')
}

// ============================================================================
// CHEMICAL SCAN (VISION) — deterministic JSON
// ============================================================================

function extractFirstJsonObject(text) {
  const s = String(text || '').trim()
  if (!s) return null
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth === 0) {
      const candidate = s.slice(start, i + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        return null
      }
    }
  }
  return null
}

function chemicalLikely(name = '') {
  const n = String(name || '').toLowerCase()
  const keys = ['windex', 'bleach', 'degreaser', 'cleaner', 'glass cleaner', 'sanitizer', 'disinfectant', 'ammonia']
  if (keys.some((k) => n.includes(k))) return true
  if (n.includes('spray') && n.includes('bottle')) return true
  return false
}

function locationRisky(loc = '') {
  const l = String(loc || '').toLowerCase()
  const risky = ['sink', 'dish', 'dishes', 'drainboard', 'utensil', 'plate', 'food', 'prep', 'cutting board']
  return risky.some((k) => l.includes(k))
}

function buildChemicalViolationBullet(foundItem) {
  const name = safeLine(foundItem?.name || 'Cleaner bottle')
  const loc = safeLine(foundItem?.location || 'in the sink/dish area')
  const label = `${SPAN_V_OPEN}VIOLATION (Chemical Handling | Priority): ${name} stored ${loc}.${SPAN_V_CLOSE}`
  const fix = `${SPAN_F_OPEN}FIX: Move chemicals to a labeled chemical storage area away from food, clean dishes, and utensils.${SPAN_F_CLOSE}`
  return `${label} ${fix}`
}

async function runChemicalScan({ imageDataUrls }) {
  if (!FEATURE_CHEMICAL_SCAN) return { found: false }

  const preamble = clampText(
    `You are a visual checker. Return ONLY valid JSON. No extra text.

Schema:
{
  "found": boolean,
  "items": [
    { "name": string, "location": string }
  ]
}

Rules:
- "found" true if you can SEE any cleaner/chemical container (Windex/bleach/degreaser/sanitizer spray bottle/etc.)
- "location" must describe where it is (sink basin with dishes / drainboard near plates / counter by prep / etc.)
- If you cannot tell, set found=false.`,
    PREAMBLE_MAX_MIN
  )

  const userMessage = 'Scan the photo for any visible cleaning chemicals / spray bottles and where they are placed.'

  try {
    const resp = await withTimeout(
      callCohereChatWithRetries({
        primaryModel: COHERE_VISION_MODEL,
        fallbackModel: COHERE_VISION_FALLBACK_MODEL,
        preambles: [{ name: 'MIN', text: preamble }],
        userMessage,
        chatHistory: [],
        imageDataUrls,
      }),
      CHEM_SCAN_TIMEOUT_MS,
      'CHEM_SCAN_TIMEOUT'
    )

    const text = sanitizeOutput(resp?.text || '')
    const json = extractFirstJsonObject(text)
    if (!json || typeof json.found !== 'boolean') return { found: false }

    const items = Array.isArray(json.items) ? json.items : []
    const normalized = items
      .map((it) => ({ name: safeLine(it?.name || ''), location: safeLine(it?.location || '') }))
      .filter((it) => it.name || it.location)

    for (const it of normalized) {
      const likely = chemicalLikely(it.name)
      const risky = locationRisky(it.location)
      if (likely && risky) return { found: true, actionable: true, item: it }
    }

    if (json.found && normalized.length) return { found: true, actionable: false, item: normalized[0] }
    return { found: false }
  } catch (e) {
    logger.warn('Chemical scan failed (non-blocking)', { error: e?.message })
    return { found: false }
  }
}

// ============================================================================
// PROMPTS
// ============================================================================

function buildSystemPrompt({ fullAudit }) {
  const maxBullets = fullAudit ? MAX_BULLETS_FULL_AUDIT : MAX_BULLETS_DEFAULT

  return `You are ProtocolLM — a Michigan food service compliance tool. Be concise and actionable.

CRITICAL OUTPUT RULES:
- Output MUST be plain text (no markdown).
- Output MUST start with EXACTLY one header:
  "${HDR_NO}" OR "${HDR_VIOL}" OR "${HDR_INFO}"
- If "${HDR_VIOL}", output up to ${maxBullets} bullets, each EXACTLY like:
  "• VIOLATION (Type | Category): <what is visible>. FIX: <one clear instruction>."
- If "${HDR_INFO}", output up to 2 bullets, each a short question.
- For photos: ONLY report what you can directly see. Do NOT assume temps/times/missing items.
- Add citations by appending bracketed IDs that match the provided POLICY EXCERPT list (e.g., [1] or [1][3]).
- Only cite when an excerpt supports the bullet. If no excerpts are available, omit citations.

IMPORTANT STYLE:
- Do NOT write long explanations.
- Do NOT list 10+ items.
- Each bullet should be 1–2 short sentences max.

SPECIAL (visual):
- If you can SEE a cleaner/spray bottle (Windex/bleach/degreaser/etc.) in/near a sink with dishes or on food-contact surfaces, that IS a violation.

Keep it short and useful for an entry-level employee and a GM.`
}

function wantsFullAudit(text) {
  const t = safeLine(text).toLowerCase()
  return t.includes('full audit') || t.includes('everything you see') || t.includes('check everything') || t.includes('complete audit') || t.includes('detailed scan')
}

function wantsFineInfo(text) {
  const t = safeLine(text).toLowerCase()
  return t.includes('fine') || t.includes('fines') || t.includes('penalt') || t.includes('cost') || t.includes('fee')
}

// ============================================================================
// ERRORS / LOGGING HELPERS
// ============================================================================

function getUserFriendlyErrorMessage(errorMessage) {
  if (errorMessage === 'CHEM_SCAN_TIMEOUT') return 'Photo check timed out. Try a smaller image.'
  if (errorMessage === 'RETRIEVAL_TIMEOUT') return 'Document search timed out. Please try again.'
  if (errorMessage === 'ANSWER_TIMEOUT') return 'Response timed out. Try again in 10 seconds.'
  return 'Unable to process request. Please try again.'
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    logger.warn('Usage logging failed', { error: e?.message })
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request) {
  const startedAt = Date.now()

  try {
    logger.info('Chat request received')

    if (!FEATURE_COHERE) return NextResponse.json({ error: 'AI service disabled.' }, { status: 503 })
    if (!process.env.COHERE_API_KEY) return NextResponse.json({ error: 'AI service not configured.' }, { status: 500 })
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

    const imageInput =
      body?.image || body?.imageBase64 || body?.image_url || body?.imageDataUrl || body?.image_data || body?.images
    const hasImage = Boolean(imageInput)

    let normalizedImageUrls = []
    if (hasImage) {
      const arr = Array.isArray(imageInput) ? imageInput : [imageInput]
      for (const img of arr) {
        const validation = validateImageData(img)
        if (validation.valid) normalizedImageUrls.push(validation.dataUrl)
      }
      if (!normalizedImageUrls.length) {
        logger.warn('Invalid image data', { error: 'All images failed validation' })
        return NextResponse.json({ error: 'Image validation failed: invalid image payload.' }, { status: 400 })
      }
    }

    let userMessage =
      (typeof body.message === 'string' && body.message.trim()) ||
      (Array.isArray(body.messages)
        ? (body.messages
            .slice()
            .reverse()
            .find((m) => m?.role === 'user' && typeof m?.content === 'string')?.content || ''
          ).trim()
        : '')

    if (!userMessage && Array.isArray(messages)) {
      const fallback = messages
        .slice()
        .reverse()
        .find((m) => m?.role === 'user' && typeof m?.content !== 'undefined')
      const c = fallback?.content
      userMessage = safeLine(typeof c === 'string' ? c : '')
    }

    if (!userMessage && hasImage) {
      userMessage = 'Review this photo for any visible food safety or sanitation violations.'
    }

    if (!userMessage) return NextResponse.json({ error: 'Missing user message' }, { status: 400 })

    const county = safeLine(body?.county || 'washtenaw') || 'washtenaw'
    const effectivePrompt = userMessage

    const fullAudit = wantsFullAudit(effectivePrompt) || Boolean(body?.fullAudit)
    const includeFines = wantsFineInfo(effectivePrompt) || Boolean(body?.includeFines)

    // ========================================================================
    // AUTH + LICENSE VALIDATION (auth required)
    // ========================================================================

    let userId = null
    let userMemory = null
    const sessionInfo = getSessionInfoFromRequest(request)

    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
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
        }
      )

      const { data } = await supabase.auth.getUser()
      userId = data?.user?.id || null

      if (!userId || !data?.user) {
        logger.info('Unauthenticated chat attempt')
        return NextResponse.json(
          { error: 'Sign up for your 14-day free trial to start scanning.', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }

      if (!data.user.email_confirmed_at) {
        return NextResponse.json(
          { error: 'Please verify your email before using protocolLM.', code: 'EMAIL_NOT_VERIFIED' },
          { status: 403 }
        )
      }

      const rateLimitKey = `chat_${userId}_${Math.floor(Date.now() / 60000)}`
      const MAX_REQUESTS_PER_MINUTE = 20
      try {
        const rateLimitMap = global.chatRateLimits || (global.chatRateLimits = new Map())
        const count = rateLimitMap.get(rateLimitKey) || 0
        if (count >= MAX_REQUESTS_PER_MINUTE) {
          return NextResponse.json(
            { error: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMIT_EXCEEDED' },
            { status: 429 }
          )
        }
        rateLimitMap.set(rateLimitKey, count + 1)
      } catch (rateLimitError) {
        logger.warn('Rate limit check failed', { error: rateLimitError?.message })
      }

      try {
        const accessCheck = await checkAccess(userId)
        if (!accessCheck?.valid) {
          return NextResponse.json(
            { error: 'Your trial has ended. Please subscribe to continue using protocolLM.', code: 'TRIAL_EXPIRED' },
            { status: 402 }
          )
        }
      } catch (error) {
        logger.error('Access check failed (fail-closed)', { error: error?.message, userId })
        return NextResponse.json(
          { error: 'Unable to verify subscription. Please sign in again.', code: 'ACCESS_CHECK_FAILED' },
          { status: 402 }
        )
      }

      const deviceCheck = await validateDeviceLicense(userId, sessionInfo)
      if (!deviceCheck.valid) {
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

      try {
        userMemory = await getUserMemory(userId)
      } catch (e) {
        logger.warn('Memory load failed', { error: e?.message })
      }
    } catch (e) {
      logger.error('Auth/license check failed', { error: e?.message })
      return NextResponse.json({ error: 'Authentication error. Please sign in again.', code: 'AUTH_ERROR' }, { status: 401 })
    }

    // ========================================================================
    // RETRIEVE DOCS (grounding excerpts in preamble)
    // ========================================================================

    const searchDocumentsFn = await getSearchDocuments()
    const userKeywords = extractSearchKeywords(effectivePrompt)

    const searchQuery = [effectivePrompt, userKeywords.slice(0, 6).join(' '), 'Michigan food code']
      .filter(Boolean)
      .join(' ')
      .slice(0, 900)

    const pinnedPolicyDocsPromise = fetchPinnedPolicyDocs(searchDocumentsFn, county)

    let userDocs = []
    let rerankUsed = false
    let rerankCandidates = 0

    try {
      const initialDocs = await withTimeout(
        searchDocumentsFn(searchQuery, county, TOPK_PER_QUERY),
        RETRIEVAL_TIMEOUT_MS,
        'RETRIEVAL_TIMEOUT'
      )
      userDocs = dedupeByText(initialDocs || []).slice(0, TOPK_PER_QUERY)
      rerankCandidates = userDocs.length

      if (FEATURE_RERANK && userDocs.length) {
        const rerankResponse = await cohereClient.rerank({
          model: COHERE_RERANK_MODEL,
          query: searchQuery,
          documents: userDocs.map((doc) => doc.text || ''),
          topN: Math.min(RERANK_TOP_N, userDocs.length),
        })
        rerankUsed = true
        userDocs = (rerankResponse?.results || [])
          .map((r) => ({ ...userDocs[r.index], rerankScore: r.relevanceScore }))
          .filter(Boolean)

        if (userDocs.length < MIN_RERANK_DOCS) {
          const pad = dedupeByText(initialDocs || []).slice(0, MIN_RERANK_DOCS - userDocs.length)
          userDocs = [...userDocs, ...pad]
        }
      } else {
        userDocs = userDocs.slice(0, RERANK_TOP_N)
      }
    } catch (e) {
      logger.warn('Retrieval/rerank failed', { error: e?.message })
      if (e?.message === 'RETRIEVAL_TIMEOUT') {
        return NextResponse.json({ error: getUserFriendlyErrorMessage('RETRIEVAL_TIMEOUT') }, { status: 408 })
      }
    }

    const pinnedPolicyDocs = await pinnedPolicyDocsPromise.catch(() => [])
    const userSlots = Math.max(1, MAX_CONTEXT_DOCS - (pinnedPolicyDocs?.length || 0))
    const contextDocs = dedupeByText([...(pinnedPolicyDocs || []), ...(userDocs || []).slice(0, userSlots)]).slice(
      0,
      MAX_CONTEXT_DOCS
    )

    const excerptBlockFull = buildExcerptBlock(contextDocs, 520)

    const excerptBlockLite = buildExcerptBlock(contextDocs.slice(0, 3), 320)

    let memoryContext = ''
    try {
      memoryContext = buildMemoryContext(userMemory) || ''
    } catch {}

    // ========================================================================
    // BUILD CHAT HISTORY
    // ========================================================================

    const cohereChatHistory = []
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        const role = msg?.role
        const content = typeof msg?.content === 'string' ? msg.content : ''
        const text = safeLine(content)
        if (!text) continue
        if (role === 'assistant') cohereChatHistory.push({ role: 'CHATBOT', message: text })
        if (role === 'user') cohereChatHistory.push({ role: 'USER', message: text })
      }
      if (cohereChatHistory.length > 10) cohereChatHistory.splice(0, cohereChatHistory.length - 10)
    }

    // ========================================================================
    // 1) CHEMICAL SCAN
    // ========================================================================

    let chemScan = { found: false }
    if (hasImage && normalizedImageUrls.length) {
      chemScan = await runChemicalScan({ imageDataUrls: normalizedImageUrls })
    }

    // ========================================================================
    // 2) MAIN COMPLIANCE CALL (with preamble-tier retries)
    // ========================================================================

    const maxBullets = fullAudit ? MAX_BULLETS_FULL_AUDIT : MAX_BULLETS_DEFAULT
    const base = buildSystemPrompt({ fullAudit })
    const reminder = 'Reminder: Use only the provided policy excerpts for citations. Do not invent sources.'

    const preambles = [
      {
        name: 'FULL',
        text: clampText([base, memoryContext ? `MEMORY CONTEXT:\n${memoryContext}` : '', excerptBlockFull, reminder].filter(Boolean).join('\n\n'), PREAMBLE_MAX_FULL),
      },
      {
        name: 'LITE',
        text: clampText([base, excerptBlockLite, reminder].filter(Boolean).join('\n\n'), PREAMBLE_MAX_LITE),
      },
      {
        name: 'MIN',
        text: clampText([base, reminder].filter(Boolean).join('\n\n'), PREAMBLE_MAX_MIN),
      },
    ]

    const primaryModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    const fallbackModel = hasImage ? COHERE_VISION_FALLBACK_MODEL : COHERE_TEXT_FALLBACK_MODEL
    const usedMode = hasImage ? 'vision' : 'text'

    let modelText = ''
    let assistantMessage = HDR_INFO + '\n• Can you try again?'
    let billedUnits = {}
    let tokenUsage = {}
    let usedModel = primaryModel

    try {
      const resp = await withTimeout(
        callCohereChatWithRetries({
          primaryModel,
          fallbackModel,
          preambles,
          userMessage,
          chatHistory: cohereChatHistory,
          imageDataUrls: hasImage ? normalizedImageUrls : [],
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      usedModel = resp?.raw?.model || usedModel
      billedUnits = resp?.raw?.meta?.billed_units || resp?.raw?.billed_units || {}
      tokenUsage = resp?.raw?.meta?.tokens || resp?.raw?.tokens || {}

      modelText = resp?.text || ''
      assistantMessage = forceToolBullets(modelText, { maxBullets })
    } catch (e) {
      logger.error('Generation failed', { error: e?.message, status: e?.status, hasImage, model: primaryModel })
      const status = e?.message?.includes('TIMEOUT') ? 408 : 500
      return NextResponse.json(
        { error: getUserFriendlyErrorMessage(e?.message?.includes('TIMEOUT') ? 'ANSWER_TIMEOUT' : 'GENERATION_FAILED') },
        { status }
      )
    }

    // ========================================================================
    // 3) MERGE: Force chemical violation if scan found actionable chemical risk
    // ========================================================================

    try {
      if (hasImage && chemScan?.found && chemScan?.actionable) {
        const chemBullet = buildChemicalViolationBullet(chemScan.item)

        if ((assistantMessage || '').toUpperCase().startsWith(HDR_NO)) {
          assistantMessage = [HDR_VIOL, `• ${chemBullet}`].join('\n')
        } else if ((assistantMessage || '').toUpperCase().startsWith(HDR_VIOL)) {
          if (!hasChemicalBullet(assistantMessage)) {
            const lines = assistantMessage.split('\n').filter(Boolean)
            const bullets = lines.slice(1).filter((l) => l.trim().startsWith('•'))
            const merged = [`• ${chemBullet}`, ...bullets].slice(0, maxBullets)
            assistantMessage = [HDR_VIOL, ...merged].join('\n')
          }
        } else if ((assistantMessage || '').toUpperCase().startsWith(HDR_INFO)) {
          assistantMessage = [HDR_VIOL, `• ${chemBullet}`].join('\n')
        }
      }

      assistantMessage = forceToolBullets(assistantMessage, { maxBullets })
    } catch (mergeErr) {
      logger.warn('Chemical merge failed (non-blocking)', { error: mergeErr?.message })
      assistantMessage = forceToolBullets(assistantMessage, { maxBullets })
    }

    // ========================================================================
    // UPDATE MEMORY
    // ========================================================================

    if (userId) {
      try {
        await updateMemory(userId, {
          userMessage: effectivePrompt,
          assistantResponse: assistantMessage,
          mode: usedMode,
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
      durationMs: Date.now() - startedAt,
      docsRetrieved: contextDocs.length,
      fullAudit,
      includeFines,
      model: usedModel,
      rerankUsed,
      chemScanFound: Boolean(chemScan?.found),
      chemScanActionable: Boolean(chemScan?.actionable),
    })

    if (userId) {
      await logModelUsageDetail({
        userId,
        provider: 'cohere',
        model: usedModel,
        mode: usedMode,
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
    }

    return NextResponse.json(
      {
        message: assistantMessage,
        citations: contextDocs.map((doc, idx) => ({
          id: idx + 1,
          source: safeLine(doc?.source || 'Policy'),
          page: safeLine(doc?.page || 'N/A'),
          county: safeLine(doc?.county || county),
          snippet: docTextForExcerpt(doc, 320),
        })),
        _meta: {
          model: usedModel,
          modelLabel: MODEL_LABEL,
          hasImage,
          fullAudit,
          includeFines,
          docsRetrieved: contextDocs.length,
          durationMs: Date.now() - startedAt,
          rerankUsed,
          chemicalScan: FEATURE_CHEMICAL_SCAN
            ? { found: Boolean(chemScan?.found), actionable: Boolean(chemScan?.actionable) }
            : undefined,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
