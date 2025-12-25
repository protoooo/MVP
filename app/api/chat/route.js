// app/api/chat/route.js
// ProtocolLM - Michigan Food Safety Compliance Engine (STATEWIDE)
// Cohere v2/chat (REST) — Aya Vision for images, Command for text
//
// KEY FIXES vs your current file:
// 1) Output headers are now CONSISTENT end-to-end:
//    - "NO VIOLATIONS ✓"  OR  "VIOLATIONS:"  OR  "NEED INFO:"
//    No more "No violations observed." vs "VIOLATIONS:" mismatch.
// 2) Always-run "CHEMICAL SCAN" (vision) in image mode.
//    If it detects a cleaner/spray bottle in sink/dish area, we FORCE a violation line,
//    even if the main compliance call says "NO VIOLATIONS ✓".
// 3) Hard validator enforces: plain text, short, tool-like bullets, no citations/source refs.
//
// NOTE: This file preserves your existing auth/subscription/device-license + anonymous free-usage logic.

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
import {
  checkDeviceFreeUsage,
  incrementDeviceUsage,
  getSessionInfoFromRequest,
  FREE_USAGE_LIMIT,
} from '@/lib/deviceUsage'

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
// FLAGS + MODELS
// ============================================================================

const FEATURE_COHERE = (process.env.FEATURE_COHERE ?? 'true').toLowerCase() !== 'false'
const FEATURE_RERANK = (process.env.FEATURE_RERANK ?? 'false').toLowerCase() === 'true'
const FEATURE_CHEMICAL_SCAN = (process.env.FEATURE_CHEMICAL_SCAN ?? 'true').toLowerCase() === 'true'

const COHERE_TEXT_MODEL = process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024'
const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'
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
const MAX_CONTEXT_DOCS = 7
const PINNED_POLICY_TARGET = 3

// Tool output constraints
const MAX_BULLETS_DEFAULT = 2
const MAX_BULLETS_FULL_AUDIT = 6

// Output headers (THE ONLY ALLOWED HEADERS)
const HDR_NO = 'NO VIOLATIONS ✓'
const HDR_VIOL = 'VIOLATIONS:'
const HDR_INFO = 'NEED INFO:'

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

function stripStarsAndHashes(text) {
  if (!text) return ''
  return String(text).replace(/[*#]/g, '')
}

function stripDocLikeRefs(text) {
  if (!text) return ''
  return String(text)
    .replace(/\bDOC[_\s-]*\d+\b[:\-]?\s*/gi, '')
    .replace(/\bDOCS?[_\s-]*\d+\b/gi, '')
    .replace(/\(p\.\s*\d+\)/gi, '')
    .replace(/\bp\.\s*\d+\b/gi, '')
    .replace(/\bMichigan Modified Food Code\b/gi, '')
    .replace(/\bAct\s*92\s*of\s*2000\b/gi, '')
    .replace(/\bMCL\b/gi, '')
    .replace(/\bViolation Types\s*\|\s*Washtenaw County.*?\b/gi, '')
    .replace(/\bEnforcement Action\s*\|\s*Washtenaw County.*?\b/gi, '')
}

function sanitizeOutput(text) {
  let out = safeText(text || '')

  // Remove code fences / headings
  out = out.replace(/```/g, '')
  out = out.replace(/^\s*#{1,6}\s+/gm, '')

  // Remove emojis (best effort)
  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  // Remove confidence language
  out = out.replace(/\b(high|medium|low)\s*confidence\b/gi, '')
  out = out.replace(/\bconfidence\s*[:\-]?\s*(high|medium|low)\b/gi, '')
  out = out.replace(/\bconfidence\b\s*[:\-]?\s*/gi, '')

  // Strip doc/source-like refs (you don’t want citations in UX)
  out = stripDocLikeRefs(out)

  // No stars/hashes
  out = stripStarsAndHashes(out)

  // Collapse excessive newlines
  out = out.replace(/\n{3,}/g, '\n\n')

  // Hard cap
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
  // 1) Already a data URL
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

  // 2) Object with dataUrl
  if (input && typeof input === 'object' && typeof input.dataUrl === 'string') {
    return normalizeToDataUrl(input.dataUrl)
  }

  // 3) Object format: { data, media_type } or { data, mediaType }
  if (input && typeof input === 'object') {
    const data = input.data
    const mediaType = input.media_type || input.mediaType
    if (typeof data === 'string' && typeof mediaType === 'string' && mediaType.startsWith('image/')) {
      const base64Data = data.trim().replace(/\s+/g, '')
      if (!isBase64Like(base64Data)) return null
      return { mediaType, base64Data, dataUrl: `data:${mediaType};base64,${base64Data}` }
    }
  }

  // 4) Raw base64 (assume jpeg)
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
// COHERE v2/chat (REST)
// ============================================================================

function cohereResponseToText(resp) {
  const msg = resp?.message
  const content = Array.isArray(msg?.content) ? msg.content : []
  for (const c of content) {
    if (typeof c?.text === 'string' && c.text.trim()) return c.text
  }
  if (typeof resp?.text === 'string' && resp.text.trim()) return resp.text
  if (typeof resp?.output_text === 'string' && resp.output_text.trim()) return resp.output_text
  return ''
}

async function callCohereChatV2Rest({ model, messages, documents }) {
  const apiKey = process.env.COHERE_API_KEY
  if (!apiKey) throw new Error('COHERE_API_KEY not configured')

  const payload = { model, messages }
  if (documents && Array.isArray(documents) && documents.length) payload.documents = documents

  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const raw = await res.text().catch(() => '')
  if (!res.ok) {
    const snippet = safeLine(raw).slice(0, 900)
    const err = new Error(`COHERE_V2_CHAT_${res.status}: ${snippet || 'Request failed'}`)
    err.status = res.status
    err.body = raw
    throw err
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('COHERE_V2_CHAT_BAD_JSON')
  }
}

function buildV2Messages({ system, chatHistory, userMessage, imageDataUrls }) {
  const messages = []
  if (safeText(system)) messages.push({ role: 'system', content: safeText(system) })

  const hist = Array.isArray(chatHistory) ? chatHistory : []
  for (const h of hist) {
    const roleRaw = String(h?.role || '').toUpperCase()
    const text = safeText(h?.message || '')
    if (!text) continue
    if (roleRaw === 'USER') messages.push({ role: 'user', content: text })
    else if (roleRaw === 'CHATBOT' || roleRaw === 'ASSISTANT') messages.push({ role: 'assistant', content: text })
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

async function callCohereChat({ model, system, userMessage, chatHistory, documents, imageDataUrls }) {
  const messages = buildV2Messages({ system, chatHistory, userMessage, imageDataUrls })

  // Best-effort docs (some models accept)
  const docs = (documents || []).map((doc) => ({
    id: doc?.id || 'internal',
    title: doc?.title || doc?.source || 'Policy',
    snippet: doc?.snippet || doc?.text || '',
    text: doc?.text || '',
  }))

  const resp = await callCohereChatV2Rest({ model, messages, documents: docs.length ? docs : undefined })
  return { raw: resp, text: cohereResponseToText(resp) }
}

// ============================================================================
// DOCUMENT RETRIEVAL (your vector store via lib/searchDocs)
// ============================================================================

const PINNED_POLICY_QUERIES = [
  'Michigan food code priority item priority foundation core definitions correction time frames',
  'Michigan food safety imminent health hazard closure reopen approval',
  'Michigan food code chemical storage poisonous toxic materials stored to prevent contamination equipment utensils',
]

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 1500)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function docTextForExcerpt(doc, maxChars = 1100) {
  const t = safeText(doc?.text || '')
  if (!t) return ''
  if (t.length <= maxChars) return t
  return t.slice(0, maxChars).trimEnd() + '…'
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
  const topics = [
    'chemical',
    'chemicals',
    'cleaner',
    'spray bottle',
    'windex',
    'bleach',
    'degreaser',
    'sanitizer',
    'sink',
    'dish',
    'utensil',
    'cross contamination',
    'hand washing',
    'temperature',
    'cooling',
    'reheating',
    'date marking',
    'pest',
  ]
  const lower = (text || '').toLowerCase()
  return topics.filter((t) => lower.includes(t))
}

// ============================================================================
// TOOL OUTPUT NORMALIZER (THE FIX)
// ============================================================================

function normalizeToToolFormat(rawText, { maxBullets }) {
  let out = sanitizeOutput(rawText || '')

  // If model produced nothing useful
  if (!out) return HDR_INFO + '\n• Re-send your question or upload a clearer photo.'

  // Accept if it already starts with allowed headers
  const firstLine = out.split('\n').find((l) => l.trim())?.trim() || ''
  const startsOK =
    firstLine.toUpperCase().startsWith(HDR_NO) ||
    firstLine.toUpperCase().startsWith(HDR_VIOL) ||
    firstLine.toUpperCase().startsWith(HDR_INFO)

  // Heuristic: detect intent if header is wrong
  if (!startsOK) {
    const upper = out.toUpperCase()
    if (upper.includes('VIOLATION') || upper.includes('ISSUE') || upper.includes('FIX:')) {
      out = `${HDR_VIOL}\n${out}`
    } else if (out.includes('?')) {
      out = `${HDR_INFO}\n${out}`
    } else {
      out = `${HDR_NO}`
    }
  }

  // Convert "-" bullets to "•" bullets (and clean)
  const lines = out.split('\n').map((l) => l.trimEnd())
  const rebuilt = []
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i].trim()
    if (!l) continue

    // Keep header as-is
    if (i === 0) {
      // Normalize header variants
      const up = l.toUpperCase()
      if (up.startsWith('NO VIOLATIONS')) l = HDR_NO
      else if (up.startsWith('VIOLATIONS')) l = HDR_VIOL
      else if (up.startsWith('NEED')) l = HDR_INFO
      rebuilt.push(l)
      continue
    }

    // Normalize bullets
    l = l.replace(/^[-•]\s*/g, '• ')
    if (!l.startsWith('• ')) {
      // If this is a continuation line, fold it into previous bullet when possible
      const prevIdx = rebuilt.length - 1
      if (prevIdx >= 1 && rebuilt[prevIdx].startsWith('• ')) {
        rebuilt[prevIdx] = safeLine(`${rebuilt[prevIdx]} ${l}`)
        continue
      }
      l = `• ${l}`
    }
    rebuilt.push(l)
  }

  // Enforce max bullets (after header)
  const header = rebuilt[0] || HDR_INFO
  const bullets = rebuilt.slice(1).filter((l) => l.startsWith('• '))
  const limited = bullets.slice(0, Math.max(1, maxBullets))

  // If header is NO but we have bullets, switch to violations
  const finalHeader =
    header === HDR_NO && limited.length ? HDR_VIOL : header === HDR_VIOL && !limited.length ? HDR_NO : header

  // If header is VIOLATIONS but no bullets, provide a safe fallback
  if (finalHeader === HDR_VIOL && !limited.length) return HDR_INFO + '\n• Can you re-send the photo a bit closer?'

  // If header is NEED INFO but no bullets, add one
  if (finalHeader === HDR_INFO && !limited.length) return HDR_INFO + '\n• Can you share a clearer photo of the area?'

  if (finalHeader === HDR_NO) return HDR_NO

  return [finalHeader, ...limited].join('\n').trim()
}

function hasChemicalBullet(toolText) {
  const t = (toolText || '').toLowerCase()
  return t.includes('chemical') || t.includes('windex') || t.includes('cleaner') || t.includes('spray bottle')
}

// ============================================================================
// CHEMICAL SCAN (VISION) — deterministic JSON -> rule -> violation bullet
// ============================================================================

function extractFirstJsonObject(text) {
  const s = String(text || '').trim()
  if (!s) return null
  const start = s.indexOf('{')
  if (start === -1) return null
  // naive brace match (good enough for model JSON)
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
  // “spray bottle” alone counts as chemical when context says sink/dishes/food-contact area
  if (n.includes('spray') && n.includes('bottle')) return true
  return false
}

function locationRisky(loc = '') {
  const l = String(loc || '').toLowerCase()
  const risky = ['sink', 'dish', 'dishes', 'drainboard', 'utensil', 'plate', 'food', 'prep', 'cutting board']
  return risky.some((k) => l.includes(k))
}

function buildChemicalViolationBullet(foundItem) {
  // Keep it short + tool-like
  const name = safeLine(foundItem?.name || 'Cleaner bottle')
  const loc = safeLine(foundItem?.location || 'in the sink/dish area')
  return `• Chemical Handling: ${name} stored ${loc}. FIX: Remove it now and store chemicals in a designated, labeled chemical area away from dishes and food-contact surfaces.`
}

async function runChemicalScan({ imageDataUrls }) {
  if (!FEATURE_CHEMICAL_SCAN) return { found: false }

  const system = `You are a visual checker. Return ONLY valid JSON. No extra text.

Schema:
{
  "found": boolean,
  "items": [
    {
      "name": string,
      "location": string
    }
  ]
}

Rules:
- "found" is true if you can SEE any cleaner/chemical container (e.g., Windex, bleach, degreaser, sanitizer spray bottle).
- "location" must describe where it is (e.g., "in the sink basin with dishes", "on the drainboard near plates", "on counter by prep area").
- If you cannot tell, set found=false.`

  const userMessage = 'Scan the photo for any visible cleaning chemicals / spray bottles and where they are placed.'

  try {
    const resp = await withTimeout(
      callCohereChat({
        model: COHERE_VISION_MODEL,
        system,
        userMessage,
        chatHistory: [],
        documents: [],
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
      .map((it) => ({
        name: safeLine(it?.name || ''),
        location: safeLine(it?.location || ''),
      }))
      .filter((it) => it.name || it.location)

    // Apply a strict “actionable” rule:
    // chemicalLikely(name) AND locationRisky(location) => actionable violation
    for (const it of normalized) {
      const likely = chemicalLikely(it.name)
      const risky = locationRisky(it.location)
      if (likely && risky) return { found: true, actionable: true, item: it }
    }

    // If it found chemicals but location not risky/unclear -> return found but not actionable
    if (json.found && normalized.length) return { found: true, actionable: false, item: normalized[0] }

    return { found: false }
  } catch (e) {
    logger.warn('Chemical scan failed (non-blocking)', { error: e?.message })
    return { found: false }
  }
}

// ============================================================================
// PROMPTS (CONSISTENT WITH TOOL OUTPUT)
// ============================================================================

function buildSystemPrompt({ fullAudit }) {
  const maxBullets = fullAudit ? MAX_BULLETS_FULL_AUDIT : MAX_BULLETS_DEFAULT

  return `You are ProtocolLM — a Michigan food service compliance tool. Be extremely concise and tool-like.

CRITICAL OUTPUT RULES:
- Output MUST be plain text. No markdown. No citations. No source mentions.
- Output MUST start with EXACTLY one header:
  "${HDR_NO}" OR "${HDR_VIOL}" OR "${HDR_INFO}"
- If "${HDR_VIOL}", output up to ${maxBullets} bullets, each like:
  "• [Type]: [What is visible]. FIX: [One sentence remediation]"
- If "${HDR_INFO}", output up to 2 bullets, each a short question.
- For photos: ONLY report what you can directly see. Do NOT assume temps/times/missing items.

SPECIAL: Chemical handling
- If you can see a cleaner/spray bottle (Windex/bleach/degreaser/etc.) in a sink basin, on drainboards, with/above dishes/utensils, or on food-contact surfaces, that IS a violation.

Keep it short.`
}

function wantsFullAudit(text) {
  const t = safeLine(text).toLowerCase()
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

function safeErrorDetails(err) {
  try {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return safeLine(err).slice(0, 400) || 'Unknown error'
    const msg = safeLine(err?.message || '')
    const body = err?.body ? safeLine(String(err.body)).slice(0, 400) : ''
    return safeLine([msg, body].filter(Boolean).join(' | ')).slice(0, 700) || 'Unknown error'
  } catch {
    return 'Unknown error'
  }
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

    // Collect image input (single or array)
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

    // Resolve user message
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
    // AUTH + LICENSE VALIDATION (supports anonymous free usage)
    // ========================================================================

    let userId = null
    let userMemory = null
    let isAnonymous = false
    let deviceUsageRemaining = FREE_USAGE_LIMIT
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

      // Anonymous path
      if (!userId || !data?.user) {
        isAnonymous = true
        logger.info('Anonymous chat request - checking device free usage')

        const deviceCheck = await checkDeviceFreeUsage(sessionInfo)
        if (!deviceCheck.allowed) {
          return NextResponse.json(
            {
              error: 'Free usage limit reached. Sign up to continue using protocolLM.',
              code: 'FREE_USAGE_EXHAUSTED',
              remaining: 0,
              limit: FREE_USAGE_LIMIT,
            },
            { status: 402 }
          )
        }

        // Decrement before processing
        const inc = await incrementDeviceUsage(sessionInfo)
        if (!inc.success) {
          return NextResponse.json(
            {
              error: 'Free usage limit reached. Sign up to continue using protocolLM.',
              code: 'FREE_USAGE_EXHAUSTED',
              remaining: 0,
              limit: FREE_USAGE_LIMIT,
            },
            { status: 402 }
          )
        }
        deviceUsageRemaining = inc.remaining

        // Simple per-minute anon rate limiting
        const anonRateLimitKey = `anon_${deviceCheck.fingerprint}_${Math.floor(Date.now() / 60000)}`
        const MAX_ANON_REQUESTS_PER_MINUTE = 5
        try {
          const rateLimitMap = global.chatRateLimits || (global.chatRateLimits = new Map())
          const count = rateLimitMap.get(anonRateLimitKey) || 0
          if (count >= MAX_ANON_REQUESTS_PER_MINUTE) {
            return NextResponse.json(
              { error: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMIT_EXCEEDED' },
              { status: 429 }
            )
          }
          rateLimitMap.set(anonRateLimitKey, count + 1)
        } catch (rateLimitError) {
          logger.warn('Anonymous rate limit check failed', { error: rateLimitError?.message })
        }
      } else {
        // Authenticated path
        if (!data.user.email_confirmed_at) {
          return NextResponse.json(
            { error: 'Please verify your email before using protocolLM.', code: 'EMAIL_NOT_VERIFIED' },
            { status: 403 }
          )
        }

        // Per-minute user rate limiting
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

        // Subscription/trial check
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

        // Device license validation
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
      }
    } catch (e) {
      logger.error('Auth/license check failed', { error: e?.message })
      return NextResponse.json({ error: 'Authentication error. Please sign in again.', code: 'AUTH_ERROR' }, { status: 401 })
    }

    // ========================================================================
    // RETRIEVE DOCS (for policy grounding) — still no citations shown to user
    // ========================================================================

    const searchDocumentsFn = await getSearchDocuments()

    const userKeywords = extractSearchKeywords(effectivePrompt)
    const searchQuery = [effectivePrompt, userKeywords.slice(0, 8).join(' '), 'Michigan food code']
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

    const excerptBlock =
      contextDocs.length === 0
        ? ''
        : contextDocs
            .map((doc) => `POLICY EXCERPT:\n${docTextForExcerpt(doc, 1100)}`)
            .join('\n\n')

    let memoryContext = ''
    try {
      memoryContext = buildMemoryContext(userMemory) || ''
    } catch {}

    // ========================================================================
    // BUILD CHAT HISTORY (for continuity)
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
      // Keep it short
      if (cohereChatHistory.length > 10) cohereChatHistory.splice(0, cohereChatHistory.length - 10)
    }

    // ========================================================================
    // 1) CHEMICAL SCAN (vision) — catches Windex-in-sink misses
    // ========================================================================

    let chemScan = { found: false }
    if (hasImage && normalizedImageUrls.length) {
      chemScan = await runChemicalScan({ imageDataUrls: normalizedImageUrls })
    }

    // ========================================================================
    // 2) MAIN COMPLIANCE CALL
    // ========================================================================

    const maxBullets = fullAudit ? MAX_BULLETS_FULL_AUDIT : MAX_BULLETS_DEFAULT

    const systemPrompt = [
      buildSystemPrompt({ fullAudit }),
      memoryContext ? `\n\nMEMORY CONTEXT:\n${memoryContext}` : '',
      excerptBlock ? `\n\n${excerptBlock}` : '',
      '\n\nReminder: Do not mention any internal documents or sources.',
    ]
      .filter(Boolean)
      .join('')

    const usedModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    const mode = hasImage ? 'vision' : 'text'

    let modelText = ''
    let assistantMessage = HDR_INFO + '\n• Unable to process request. Please try again.'
    let billedUnits = {}
    let tokenUsage = {}

    try {
      const resp = await withTimeout(
        callCohereChat({
          model: usedModel,
          system: systemPrompt,
          userMessage,
          chatHistory: cohereChatHistory,
          documents: contextDocs.map((doc) => ({
            id: 'internal',
            title: doc?.source || doc?.title || 'Policy',
            snippet: docTextForExcerpt(doc, 900),
            text: docTextForExcerpt(doc, 1100),
          })),
          imageDataUrls: hasImage ? normalizedImageUrls : [],
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      // SDK meta tokens may not exist for REST response; keep safe
      billedUnits = resp?.raw?.meta?.billed_units || resp?.raw?.billed_units || {}
      tokenUsage = resp?.raw?.meta?.tokens || resp?.raw?.tokens || {}

      modelText = resp?.text || ''
      assistantMessage = normalizeToToolFormat(modelText, { maxBullets })
    } catch (e) {
      logger.error('Generation failed', { error: e?.message, detail: safeErrorDetails(e), hasImage, model: usedModel })
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

        // If model said NO VIOLATIONS, override to VIOLATIONS
        if ((assistantMessage || '').toUpperCase().startsWith(HDR_NO)) {
          assistantMessage = [HDR_VIOL, chemBullet].join('\n')
        } else if ((assistantMessage || '').toUpperCase().startsWith(HDR_VIOL)) {
          // If already violations but no chemical bullet, prepend chemical bullet
          if (!hasChemicalBullet(assistantMessage)) {
            const lines = assistantMessage.split('\n').filter(Boolean)
            const header = HDR_VIOL
            const bullets = lines.slice(1).filter((l) => l.trim().startsWith('•'))
            const merged = [chemBullet, ...bullets].slice(0, maxBullets)
            assistantMessage = [header, ...merged].join('\n')
          }
        } else if ((assistantMessage || '').toUpperCase().startsWith(HDR_INFO)) {
          // If model asked for info but we have an actionable chemical, prefer the violation
          assistantMessage = [HDR_VIOL, chemBullet].join('\n')
        }
      } else if (hasImage && chemScan?.found && !chemScan?.actionable) {
        // If scan sees a chemical but can't confirm risky placement, ask ONE targeted question
        if ((assistantMessage || '').toUpperCase().startsWith(HDR_NO)) {
          const q = '• Is that a cleaner/spray bottle placed in or next to the sink/dish area? If yes, store it away from dishes and food-contact surfaces.'
          assistantMessage = [HDR_INFO, q].join('\n')
        }
      }

      assistantMessage = normalizeToToolFormat(assistantMessage, { maxBullets })
    } catch (mergeErr) {
      logger.warn('Chemical merge failed (non-blocking)', { error: mergeErr?.message })
      assistantMessage = normalizeToToolFormat(assistantMessage, { maxBullets })
    }

    // ========================================================================
    // UPDATE MEMORY (auth users only)
    // ========================================================================

    if (userId && !isAnonymous) {
      try {
        await updateMemory(userId, {
          userMessage: effectivePrompt,
          assistantResponse: assistantMessage,
          mode,
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
      pinnedPolicyDocs: pinnedPolicyDocs.length,
      fullAudit,
      includeFines,
      model: usedModel,
      rerankUsed,
      chemScanFound: Boolean(chemScan?.found),
      chemScanActionable: Boolean(chemScan?.actionable),
    })

    // Only log model usage for authenticated users
    if (userId && !isAnonymous) {
      await logModelUsageDetail({
        userId,
        provider: 'cohere',
        model: usedModel,
        mode,
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
        _meta: {
          model: usedModel,
          modelLabel: MODEL_LABEL,
          hasImage,
          fullAudit,
          includeFines,
          docsRetrieved: contextDocs.length,
          pinnedPolicyDocs: pinnedPolicyDocs.length,
          durationMs: Date.now() - startedAt,
          rerankUsed,
          chemicalScan: FEATURE_CHEMICAL_SCAN
            ? { found: Boolean(chemScan?.found), actionable: Boolean(chemScan?.actionable) }
            : undefined,
          isAnonymous,
          deviceUsageRemaining: isAnonymous ? deviceUsageRemaining : undefined,
          freeUsageLimit: isAnonymous ? FREE_USAGE_LIMIT : undefined,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
