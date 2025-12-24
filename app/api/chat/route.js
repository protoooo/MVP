// app/api/chat/route.js
// Cohere text + Cohere v2 vision via REST (messages + image_url)
// ProtocolLM - Michigan Food Safety Compliance Engine (STATEWIDE)
//
// Output guarantees (post-processor backstop):
// - Response starts with: "No violations observed." OR "Violations observed:" OR "Need a quick clarification:"
// - Each violation includes: Type + Category (Priority/Pf/Core) + Issue + Remediation + Correction + If not corrected
// - No "confidence" anywhere
// - No citations, no doc/page/source mentions in the user-facing output
// - No asterisks (*) and no hashtags (#) in the user-facing output
// - No assumptions: do not claim missing facilities, temperatures, cooking status, or time-based storage unless clearly visible
//
// IMPORTANT FIX (Dec 2025):
// - If there is an image, we ONLY call the vision model.
// - No “fallback to text model” when images are present (prevents COHERE_V2_CHAT_400 on command-*).
// - For text-only models, user message content is a STRING (not the multimodal parts array).

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
// IMAGE VALIDATION + NORMALIZATION (ALWAYS PRODUCE A DATA URL)
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

    if (!base64Data || base64Data.length < 100) {
      return { valid: false, error: 'Image data too small' }
    }

    if (!mediaType || !mediaType.startsWith('image/')) {
      return { valid: false, error: 'Cannot determine image type' }
    }

    return { valid: true, base64Data, mediaType, dataUrl }
  } catch (error) {
    logger.error('Image validation failed', { error: error?.message })
    return { valid: false, error: 'Image validation error' }
  }
}

function normalizeImagesForCohere(images) {
  if (!images) return []

  const arr = Array.isArray(images) ? images : [images]
  const out = []

  for (const img of arr) {
    if (typeof img === 'string' && img.startsWith('data:image/')) {
      out.push(img)
      continue
    }

    if (img?.dataUrl && typeof img.dataUrl === 'string' && img.dataUrl.startsWith('data:image/')) {
      out.push(img.dataUrl)
      continue
    }

    const normalized = normalizeToDataUrl(img)
    if (normalized?.dataUrl) out.push(normalized.dataUrl)
  }

  return out
}

// ============================================================================
// MODEL CONFIGURATION - COHERE (Text + Vision + Embed + Rerank)
// ============================================================================

const FEATURE_COHERE = (process.env.FEATURE_COHERE ?? 'true').toLowerCase() !== 'false'
const FEATURE_RERANK = (process.env.FEATURE_RERANK ?? 'false').toLowerCase() === 'true'

const COHERE_TEXT_MODEL = process.env.COHERE_TEXT_MODEL || 'command-r7b-12-2024'
const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-32b'

const rawEmbedModel = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_EMBED_MODEL = rawEmbedModel === 'embed-english-v4.0' ? 'embed-v4.0' : rawEmbedModel
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1536

const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro'
const MODEL_LABEL = 'Cohere'

// Time budgets
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000
const PINNED_RETRIEVAL_TIMEOUT_MS = 3200

// Retrieval + rerank config
const TOPK_PER_QUERY = 20
const RERANK_TOP_N = 5
const MIN_RERANK_DOCS = 3

// Context sizing (reserve slots for pinned policy)
const MAX_CONTEXT_DOCS = 7
const PINNED_POLICY_TARGET = 3

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

function stripDocIds(text) {
  if (!text) return ''
  return String(text)
    .replace(/\bDOC[_\s-]*\d+\b[:\-]?\s*/gi, '')
    .replace(/\bDOCS?[_\s-]*\d+\b/gi, '')
}

function stripPageLikeRefs(text) {
  if (!text) return ''
  return String(text)
    .replace(/\(p\.\s*\d+\)/gi, '')
    .replace(/\bp\.\s*\d+\b/gi, '')
}

function stripSourceLikeRefs(text) {
  if (!text) return ''
  // Remove common “source-y” phrases if model leaks them
  return String(text)
    .replace(/\bMichigan Modified Food Code\b/gi, '')
    .replace(/\bMichigan Food Law\b/gi, '')
    .replace(/\bAct\s*92\s*of\s*2000\b/gi, '')
    .replace(/\bCourtesy of legislature\.mi\.gov\b/gi, '')
}

// Removes asterisks and hashtags from user-facing output, no matter what
function stripStarsAndHashes(text) {
  if (!text) return ''
  return String(text).replace(/[*#]/g, '')
}

function sanitizeOutput(text) {
  let out = safeText(text || '')

  // Remove code fences / headings
  out = out.replace(/```/g, '')
  out = out.replace(/^\s*#{1,6}\s+/gm, '')

  out = stripDocIds(out)
  out = stripPageLikeRefs(out)
  out = stripSourceLikeRefs(out)

  out = out.replace(/\n{3,}/g, '\n\n')

  // Remove emojis
  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  // Hard remove confidence language
  out = out.replace(/\b(high|medium|low)\s*confidence\b/gi, '')
  out = out.replace(/\bconfidence\s*[:\-]?\s*(high|medium|low)\b/gi, '')
  out = out.replace(/\bconfidence\b\s*[:\-]?\s*/gi, '')

  const HARD_LIMIT = 3000
  if (out.length > HARD_LIMIT) {
    out = out.slice(0, HARD_LIMIT).trimEnd()
    out += '\n\nResponse trimmed. Ask a follow-up for more detail.'
  }

  // Final: no stars, no hashes in user-facing output
  out = stripStarsAndHashes(out)

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
  if (content && typeof content === 'object' && typeof content.text === 'string') return content.text
  return ''
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

// ============================================================================
// COHERE RESPONSE EXTRACTION
// ============================================================================

function cohereResponseToText(resp) {
  const msg = resp?.message
  const content = Array.isArray(msg?.content) ? msg.content : []
  for (const c of content) {
    if (typeof c?.text === 'string' && c.text.trim()) return c.text
  }

  if (typeof resp?.text === 'string' && resp.text.trim()) return resp.text
  if (typeof resp?.output_text === 'string' && resp.output_text.trim()) return resp.output_text

  const alt = responseOutputToString(resp)
  if (alt && alt.trim()) return alt

  return ''
}

// ============================================================================
// PINNED POLICY RETRIEVAL (STATEWIDE MI) + FALLBACK BLOCK
// ============================================================================

const PINNED_POLICY_QUERIES = [
  'Michigan Modified Food Code Priority Priority Foundation Core imminent health hazard permit suspension employee restriction vomiting diarrhea jaundice',
  'Michigan Food Law Act 92 of 2000 enforcement penalties misbranding adulteration unsanitary conditions',
  'Michigan norovirus environmental cleaning disinfection bleach ppm 1000 5000 food service establishment',
  'Michigan minimum internal cooking temperatures 165 155 145 reheating 165 within two hours',
]

const MICHIGAN_POLICY_FALLBACK = `MICHIGAN FOOD SAFETY POLICY (FALLBACK IF CORPUS CHUNKS NOT RETRIEVED)
- Core definitions & authority: Michigan Modified Food Code (based on FDA Food Code) and Michigan Food Law (Act 92 of 2000).
- Categories: Priority (P), Priority Foundation (Pf), Core.
- Imminent health hazard examples: no water/no power/sewage backup/severe pests/fire/flood/outbreak -> may require immediate correction or cessation of operation.
- Temperature anchors commonly used in practice: Cold holding 41°F or below; Hot holding 135°F or above; Reheat previously cooked TCS foods to 165°F within 2 hours; Cook to minimum internal temps by product (poultry 165°F, ground meats 155°F, seafood/steaks 145°F).`

function normalizeSourceLabel(src) {
  const s = String(src || '').toLowerCase()
  if (s.includes('modified food code')) return 'MI Modified Food Code'
  if (s.includes('act 92')) return 'MI Food Law (Act 92)'
  if (s.includes('norovirus')) return 'MI Norovirus Cleaning'
  if (s.includes('cooking') || s.includes('temperatures')) return 'MI Cooking Temperatures'
  return safeLine(src || 'Policy')
}

function docTextForExcerpt(doc, maxChars = 1400) {
  const t = safeText(doc?.text || '')
  if (!t) return ''
  if (t.length <= maxChars) return t
  return t.slice(0, maxChars).trimEnd() + '…'
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

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms))])
}

async function fetchPinnedPolicyDocs(searchDocumentsFn, corpusKey) {
  try {
    const tasks = PINNED_POLICY_QUERIES.map((q) =>
      withTimeout(searchDocumentsFn(q, corpusKey, 6), PINNED_RETRIEVAL_TIMEOUT_MS, 'PINNED_TIMEOUT').catch(() => [])
    )

    const results = await Promise.all(tasks)

    const picked = []
    const addUnique = (doc) => {
      if (!doc?.text) return
      const key = doc.text.slice(0, 1600)
      if (picked.some((d) => (d?.text || '').slice(0, 1600) === key)) return
      picked.push(doc)
    }

    for (const arr of results) {
      if (Array.isArray(arr) && arr.length) addUnique(arr[0])
    }

    const flattened = dedupeByText(results.flat().filter(Boolean))
    for (const d of flattened) {
      if (picked.length >= PINNED_POLICY_TARGET) break
      addUnique(d)
    }

    return picked.slice(0, PINNED_POLICY_TARGET)
  } catch (e) {
    logger.warn('Pinned policy retrieval failed', { error: e?.message })
    return []
  }
}

// ============================================================================
// VIOLATION TYPE + CATEGORY (P/Pf/Core) HEURISTICS (BACKSTOP)
// ============================================================================

function determineViolationType(issue) {
  const typeMap = {
    temperature: 'Temperature Control',
    cooling: 'Temperature Control',
    reheating: 'Temperature Control',
    refrigeration: 'Temperature Control',
    'hot holding': 'Temperature Control',
    'cold holding': 'Temperature Control',
    'time/temperature': 'Temperature Control',
    tcs: 'Temperature Control',

    storage: 'Food Storage',
    'date marking': 'Labeling',
    labels: 'Labeling',
    labeling: 'Labeling',

    'cross contamination': 'Cross-Contamination',
    contamination: 'Cross-Contamination',
    'raw meat': 'Food Handling',
    'ready to eat': 'Food Handling',
    thawing: 'Food Preparation',
    cooking: 'Food Preparation',

    'hand washing': 'Sanitation',
    handwashing: 'Sanitation',
    gloves: 'Personal Hygiene',
    sanitizer: 'Sanitation',
    sanitizing: 'Sanitation',
    cleaning: 'Sanitation',
    surfaces: 'Sanitation',
    utensils: 'Sanitation',

    equipment: 'Equipment Maintenance',
    thermometer: 'Equipment Maintenance',

    pest: 'Pest Control',
    chemicals: 'Chemical Handling',
    toxic: 'Chemical Handling',
    allergen: 'Allergen Control',
    'employee health': 'Employee Health',

    sink: 'Plumbing',
    drainage: 'Plumbing',
    ventilation: 'Facility Maintenance',
    permit: 'Licensing',
    inspection: 'Compliance',
  }

  const lowerIssue = String(issue || '').toLowerCase()
  for (const keyword in typeMap) {
    if (lowerIssue.includes(keyword)) return typeMap[keyword]
  }
  return 'General Compliance'
}

function isImminentHazardText(text) {
  const t = String(text || '').toLowerCase()
  if (!t) return false
  const patterns = [
    /lack of water|no water|water service (?:outage|interruption)/i,
    /lack of (?:electrical )?power|no power|electrical power/i,
    /sewage\s*(?:back[- ]?up|backup)|back[- ]?up of sewage/i,
    /fire\b/i,
    /flood\b/i,
    /uncontained.*outbreak|foodborne.*outbreak/i,
    /severe\s+pest\s+infestation/i,
  ]
  return patterns.some((p) => p.test(t))
}

function normalizeCategoryLabel(raw) {
  const r = String(raw || '').toLowerCase().trim()
  if (!r) return ''
  if (r.includes('priority foundation') || r === 'pf' || r.includes('(pf)')) return 'Priority Foundation (Pf)'
  if (r === 'p' || r.includes('priority') || r.includes('(p)')) return 'Priority (P)'
  if (r.includes('core')) return 'Core'
  return raw.trim()
}

function determineViolationCategory(issue, remediation = '', type = '') {
  const hay = `${issue || ''} ${remediation || ''} ${type || ''}`.toLowerCase()

  if (isImminentHazardText(hay)) {
    return {
      category: 'Priority (P)',
      correction: 'Correct immediately; operations may be ordered stopped until corrected and approved.',
      ifNotCorrected:
        'Imminent health hazard: regulator may require immediate cessation of operation until corrected and approved.',
    }
  }

  const priorityPatterns = [
    /hand\s*wash|handwashing|wash(?:ing)? hands/i,
    /bare\s*hand/i,
    /time\/temperature|tcs\b|potentially hazardous/i,
    /hot\s*hold|cold\s*hold/i,
    /\b41\s*°?\s*f\b|\b41f\b|\b41°F\b/i,
    /\b135\s*°?\s*f\b|\b135f\b|\b135°F\b/i,
    /cool(?:ing)?|rapid(?:ly)? cool/i,
    /reheat(?:ing)?|rapid(?:ly)? reheat/i,
    /cook(?:ing)? .* (?:temp|temperature)|undercook/i,
    /cross\s*contaminat|raw .* ready[- ]?to[- ]?eat|rte/i,
    /ill\s*employee|vomit|diarrhea|jaundice|exclude|restrict/i,
    /sanitize|sanitiz(?:e|ing) (?:food|utensil|equipment)|food[- ]?contact.*sanit/i,
    /\bpest\b|rodent|roach|flies/i,
    /toxic|poison|chemical.*(label|store)|cleaner.*(label|store)/i,
  ]
  if (priorityPatterns.some((p) => p.test(hay))) {
    return {
      category: 'Priority (P)',
      correction: 'Correct immediately or ASAP; follow-up may occur if not corrected.',
      ifNotCorrected:
        'Likely follow-up; repeat/unresolved items can escalate through enforcement actions (up to permit action).',
    }
  }

  const pfPatterns = [
    /thermometer|probe\s*therm/i,
    /test\s*strip|sanitizer\s*test/i,
    /calibrat(?:e|ion)/i,
    /haccp|plan|critical\s*limit/i,
    /training|policy|procedure|documentation|record[- ]?keeping/i,
  ]
  if (pfPatterns.some((p) => p.test(hay))) {
    return {
      category: 'Priority Foundation (Pf)',
      correction: 'Correct promptly; follow-up may occur if not corrected.',
      ifNotCorrected:
        'Likely follow-up; repeat/unresolved items can escalate through enforcement actions (up to permit action).',
    }
  }

  return {
    category: 'Core',
    correction: 'Correct by the next inspection or agreed date.',
    ifNotCorrected:
      'Unresolved or repeat core issues can still lead to enforcement after opportunities to correct.',
  }
}

// ============================================================================
// OUTPUT ENFORCEMENT (PLAIN TEXT, NO MARKDOWN)
// ============================================================================

function enforceViolationFormat(text) {
  let out = safeText(text || '')

  out = out.replace(/^No clear violations observed\./i, 'No violations observed.')
  out = out.replace(/^No violations found\./i, 'No violations observed.')
  out = out.replace(/^Potential issues observed:/i, 'Violations observed:')
  out = out.replace(/^Issues observed:/i, 'Violations observed:')

  out = out.replace(/\b(high|medium|low)\s*confidence\b/gi, '')
  out = out.replace(/\bconfidence\s*[:\-]?\s*(high|medium|low)\b/gi, '')
  out = out.replace(/\bconfidence\b\s*[:\-]?\s*/gi, '')

  // Convert "- X. Fix: Y." style bullets into required schema (plain text labels)
  if (/^Violations observed:/i.test(out) && !/\bType\s*:\s*/i.test(out)) {
    out = out.replace(
      /-\s*(.*?)\s*\.?\s*(?:Fix|Remediation|Action)\s*:\s*(.*?)(?=\n-\s|\n{2,}|$)/gis,
      (match, issueRaw, remRaw) => {
        const issue = safeLine(issueRaw)
        const remediation = safeLine(remRaw)
        if (!issue || !remediation) return match
        const violationType = determineViolationType(issue)
        const catInfo = determineViolationCategory(issue, remediation, violationType)

        return `- Type: ${violationType}
  Category: ${catInfo.category}
  Issue: ${issue}
  Remediation: ${remediation}
  Correction: ${catInfo.correction}
  If not corrected: ${catInfo.ifNotCorrected}`
      }
    )
  }

  return out.trim()
}

function enrichViolationsIfMissingFields(text) {
  const out = safeText(text || '')
  if (!/^Violations observed:/i.test(out)) return out

  const hasCategory = /\bCategory\s*:\s*/i.test(out)
  const hasCorrection = /\bCorrection\s*:\s*/i.test(out)
  const hasIfNot = /\bIf not corrected\s*:\s*/i.test(out)
  if (hasCategory && hasCorrection && hasIfNot) return out

  const lines = out.split('\n')
  const rebuilt = []
  rebuilt.push(lines[0])

  let current = null

  function flush() {
    if (!current) return
    const type = safeLine(current.type || '')
    const issue = safeLine(current.issue || '')
    const remediation = safeLine(current.remediation || '')

    if (!type || !issue || !remediation) {
      rebuilt.push(...(current.raw || []))
      current = null
      return
    }

    const catInfo = determineViolationCategory(issue, remediation, type)

    rebuilt.push(`- Type: ${type}`)
    rebuilt.push(`  Category: ${catInfo.category}`)
    rebuilt.push(`  Issue: ${issue}`)
    rebuilt.push(`  Remediation: ${remediation}`)
    rebuilt.push(`  Correction: ${catInfo.correction}`)
    rebuilt.push(`  If not corrected: ${catInfo.ifNotCorrected}`)
    current = null
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    const typeMatch = line.match(/^\s*-\s*Type\s*:\s*(.+)\s*$/i)
    if (typeMatch) {
      flush()
      current = { type: typeMatch[1], issue: '', remediation: '', raw: [line] }
      continue
    }

    if (current) {
      current.raw.push(line)
      const issueMatch = line.match(/^\s*Issue\s*:\s*(.+)\s*$/i) || line.match(/^\s*\s*Issue\s*:\s*(.+)\s*$/i)
      if (issueMatch) current.issue = issueMatch[1]
      const remMatch =
        line.match(/^\s*Remediation\s*:\s*(.+)\s*$/i) || line.match(/^\s*\s*Remediation\s*:\s*(.+)\s*$/i)
      if (remMatch) current.remediation = remMatch[1]
      continue
    }

    rebuilt.push(line)
  }

  flush()

  return rebuilt.join('\n').trim()
}

function normalizeCategoryLines(text) {
  const out = safeText(text || '')
  if (!out) return out
  return out.replace(/(\bCategory\s*:\s*)(.+)\s*$/gim, (m, prefix, value) => {
    return `${prefix}${normalizeCategoryLabel(value)}`
  })
}

// ============================================================================
// ASSUMPTION GUARD (IMAGE MODE) - DROP NON-VISIBLE / OPERATIONAL CLAIMS
// + EVIDENCE GATE FOR TIME/TEMP CLAIMS
// ============================================================================

function parseViolationBlocks(text) {
  try {
    const out = safeText(text || '')
    const lines = out.split('\n').filter((l) => l.trim().length > 0)
    if (!lines.length) return { header: '', blocks: [], tail: [] }

    const header = lines[0].trim()
    const body = lines.slice(1)

    const starts = []
    for (let i = 0; i < body.length; i++) {
      if (/^\s*-\s*Type\s*:\s*/i.test(body[i])) starts.push(i)
    }

    if (!starts.length) return { header, blocks: [], tail: body }

    const blocks = []
    for (let si = 0; si < starts.length; si++) {
      const start = starts[si]
      const end = si + 1 < starts.length ? starts[si + 1] : body.length
      const chunk = body.slice(start, end)
      const joined = chunk.join('\n')

      const type = safeLine(joined.match(/-\s*Type\s*:\s*(.+)\s*$/im)?.[1] || '')
      const category = safeLine(joined.match(/^\s*Category\s*:\s*(.+)\s*$/im)?.[1] || '')
      const issue = safeLine(joined.match(/^\s*Issue\s*:\s*(.+)\s*$/im)?.[1] || '')
      const remediation = safeLine(joined.match(/^\s*Remediation\s*:\s*(.+)\s*$/im)?.[1] || '')
      const correction = safeLine(joined.match(/^\s*Correction\s*:\s*(.+)\s*$/im)?.[1] || '')
      const ifNotCorrected = safeLine(joined.match(/^\s*If not corrected\s*:\s*(.+)\s*$/im)?.[1] || '')

      blocks.push({
        type,
        category,
        issue,
        remediation,
        correction,
        ifNotCorrected,
        rawLines: chunk,
        rawText: joined,
      })
    }

    return { header, blocks, tail: [] }
  } catch (error) {
    logger.warn('Parse violation blocks error (non-breaking)', { error: error?.message })
    return { header: '', blocks: [], tail: [] }
  }
}

function hasExplicitEvidenceLanguage(text) {
  const t = String(text || '').toLowerCase()
  if (!t) return false

  const evidence = [
    /thermometer/i,
    /probe/i,
    /temp(?:erature)?\s*(?:reads|reading|shown|shows|display|displayed|on the display)/i,
    /display/i,
    /gauge/i,
    /label/i,
    /date\s*mark/i,
    /date[-\s]*marked/i,
    /timestamp/i,
    /time\s*stamp/i,
    /\b\d{1,2}:\d{2}\b/i,
    /\b\d{1,3}\s*°?\s*f\b/i,
    /\b\d{1,3}\s*°?\s*c\b/i,
    /logged/i,
    /record/i,
    /chart/i,
  ]

  return evidence.some((p) => p.test(t))
}

function looksLikeTimeTempOrOperationalInference(issue, remediation, type) {
  const t = `${issue || ''} ${remediation || ''} ${type || ''}`.toLowerCase()

  const timeTempInference = [
    /\bleftover\b/i,
    /\bstored\s+at\s+room\s+temperature\b/i,
    /\bat\s+room\s+temperature\b/i,
    /\bheld\s+at\s+room\s+temperature\b/i,
    /\bimproperly\s+cooled\b/i,
    /\bnot\s+(?:cooled|reheated|held)\b/i,
    /\btime\s+in\s+temperature\s+danger\s+zone\b/i,
    /\bout\s+of\s+temperature\s+control\b/i,
    /\btemp(?:erature)?\s+(?:too\s+high|too\s+low|unsafe|improper)\b/i,
    /\bhot\s+holding\b/i,
    /\bcold\s+holding\b/i,
    /\breheated?\b/i,
    /\bcooling\b/i,
  ]

  const operationalInference = [
    /\bstove(top)?\s+(?:is|was)\s+on\b/i,
    /\bburner(s)?\s+(?:is|are|was|were)\s+on\b/i,
    /\bknob(s)?\s+(?:is|are)\s+set\b/i,
    /\b(timer|cook\s*timer)\s+(?:is|was)\s+not\s+set\b/i,
    /\bset\s+the\s+timer\b/i,
    /\bleft\s+unattended\b/i,
    /\bunattended\s+(?:cooking|heat|stove|burner)\b/i,
    /\bactively\s+cook(?:ing)?\b/i,
    /\bcooking\s+(?:in\s+progress|right\s+now|currently)\b/i,
    /\bin\s+use\s+(?:right\s+now|currently)\b/i,
  ]

  return timeTempInference.some((p) => p.test(t)) || operationalInference.some((p) => p.test(t))
}

function looksLikeNonVisualAssumption(issue, remediation, type) {
  const t = `${issue || ''} ${remediation || ''} ${type || ''}`.toLowerCase()

  const absenceClaims = [
    /\bno\s+hand\s*wash(?:ing)?\s*(?:sink)?\s*(?:available|present|provided|exists)\b/i,
    /\bhand\s*wash(?:ing)?\s*sink\s*(?:not\s+available|not\s+present|not\s+provided|does\s+not\s+exist)\b/i,
    /\bmissing\s+hand\s*wash(?:ing)?\s*(?:sink)?\b/i,

    /\bno\s+soap\s*(?:available|present|provided)\b/i,
    /\bmissing\s+soap\b/i,
    /\bno\s+paper\s*towel(?:s)?\s*(?:available|present|provided)\b/i,
    /\bmissing\s+paper\s*towel(?:s)?\b/i,

    /\bno\s+thermometer\s*(?:available|present|provided)\b/i,
    /\bmissing\s+thermometer\b/i,
    /\bno\s+test\s*strip(?:s)?\s*(?:available|present|provided)\b/i,
    /\bmissing\s+test\s*strip(?:s)?\b/i,
  ]

  const allowedVisibleAccessibility = [
    /\bblocked\b/i,
    /\bobstructed\b/i,
    /\binaccessible\b/i,
    /\bnot\s+accessible\b/i,
    /\bused\s+for\s+storage\b/i,
    /\bfilled\s+with\b/i,
    /\bclutter(ed)?\b/i,
    /\bdirty\b/i,
    /\bsoiled\b/i,
    /\bgrime\b/i,
  ]
  const isAccessibilityFinding = allowedVisibleAccessibility.some((p) => p.test(t))
  if (isAccessibilityFinding) return false

  const operationalInference = [
    /\bstove(top)?\s+(?:is|was)\s+on\b/i,
    /\bburner(s)?\s+(?:is|are|was|were)\s+on\b/i,
    /\b(timer|cook\s*timer)\s+(?:is|was)\s+not\s+set\b/i,
    /\bleft\s+unattended\b/i,
    /\bunattended\s+(?:cooking|heat|stove|burner)\b/i,
    /\bactively\s+cook(?:ing)?\b/i,
  ]

  const timeTempOrOperational = looksLikeTimeTempOrOperationalInference(issue, remediation, type)
  const hasEvidence = hasExplicitEvidenceLanguage(`${issue} ${remediation}`)

  if (timeTempOrOperational && !hasEvidence) return true

  return absenceClaims.some((p) => p.test(t)) || operationalInference.some((p) => p.test(t))
}

function buildClarificationQuestionsFromDropped(droppedBlocks) {
  const qs = []
  const add = (q) => {
    if (!q) return
    if (qs.includes(q)) return
    if (qs.length >= 3) return
    qs.push(q)
  }

  for (const b of droppedBlocks || []) {
    const t = `${b?.issue || ''} ${b?.type || ''} ${b?.remediation || ''}`.toLowerCase()

    if (t.includes('hand') && (t.includes('wash') || t.includes('handwash'))) {
      add('Is the handwashing sink present in the area, and is it accessible and stocked (soap + paper towels)?')
      continue
    }

    if (t.includes('thermometer') || t.includes('test strip') || t.includes('sanitizer')) {
      add('Can you share a close-up photo of the thermometer/test-strip reading or label?')
      continue
    }

    if (
      t.includes('room temperature') ||
      t.includes('leftover') ||
      t.includes('stored') ||
      t.includes('cool') ||
      t.includes('reheat') ||
      t.includes('holding')
    ) {
      add('Is there a visible label/date mark or thermometer display for the item? If yes, can you share a close-up?')
      continue
    }

    if (t.includes('stove') || t.includes('stovetop') || t.includes('burner') || t.includes('timer') || t.includes('unattended')) {
      add('Were any burners actually on at the time of the photo, or was the pot just sitting there?')
      continue
    }

    add('Can you share one more photo angle that shows the referenced area clearly?')
  }

  if (!qs.length) add('Can you share a clearer photo or one more angle of the area you want reviewed?')
  return qs.slice(0, 3)
}

function rebuildResponseFromBlocks(header, blocks, clarificationQuestions) {
  const h = header && header.trim() ? header.trim() : 'Violations observed:'
  const parts = [h]

  for (const b of blocks || []) {
    const type = safeLine(b.type || '')
    const issue = safeLine(b.issue || '')
    const remediation = safeLine(b.remediation || '')
    const cat = normalizeCategoryLabel(b.category || '')
    const catInfo = determineViolationCategory(issue, remediation, type || determineViolationType(issue))

    parts.push(`- Type: ${type || determineViolationType(issue)}`)
    parts.push(`  Category: ${normalizeCategoryLabel(cat || catInfo.category)}`)
    parts.push(`  Issue: ${issue}`)
    parts.push(`  Remediation: ${remediation}`)
    parts.push(`  Correction: ${safeLine(b.correction || catInfo.correction)}`)
    parts.push(`  If not corrected: ${safeLine(b.ifNotCorrected || catInfo.ifNotCorrected)}`)
  }

  if (clarificationQuestions && clarificationQuestions.length) {
    parts.push('')
    parts.push('Need a quick clarification:')
    for (const q of clarificationQuestions.slice(0, 3)) parts.push(`- ${safeLine(q)}`)
  }

  return parts.join('\n').trim()
}

function applyNoAssumptionsGuard(text, hasImage) {
  if (!hasImage) return { text, dropped: 0 }

  try {
    const out = safeText(text || '')
    if (!/^Violations observed:/i.test(out)) return { text: out, dropped: 0 }

    const parsed = parseViolationBlocks(out)
    if (!parsed.blocks.length) return { text: out, dropped: 0 }

    const keep = []
    const drop = []

    for (const b of parsed.blocks) {
      const issue = safeLine(b.issue || '')
      const remediation = safeLine(b.remediation || '')
      const type = safeLine(b.type || '')

      if (looksLikeNonVisualAssumption(issue, remediation, type)) drop.push(b)
      else keep.push(b)
    }

    if (!drop.length) return { text: out, dropped: 0 }

    const questions = buildClarificationQuestionsFromDropped(drop)

    if (!keep.length) {
      const parts = ['Need a quick clarification:']
      for (const q of questions) parts.push(`- ${safeLine(q)}`)
      return { text: parts.join('\n').trim(), dropped: drop.length }
    }

    const rebuilt = rebuildResponseFromBlocks('Violations observed:', keep, questions)
    return { text: rebuilt, dropped: drop.length }
  } catch (error) {
    logger.warn('Violation parser error (non-breaking)', { error: error?.message })
    return { text: safeText(text || ''), dropped: 0 }
  }
}

function ensureAllowedHeader(text) {
  const out = safeText(text || '')
  if (!out) return 'Need a quick clarification:\n- Can you re-send your question or upload a photo?'

  const firstLine = out.split('\n').find((l) => l.trim().length > 0)?.trim() || ''

  const ok =
    /^No violations observed\./i.test(firstLine) ||
    /^Violations observed:/i.test(firstLine) ||
    /^Need a quick clarification:/i.test(firstLine)

  if (ok) return out

  if (/\bNeed a quick clarification\b/i.test(out) || /\?\s*$/.test(out)) {
    return `Need a quick clarification:\n- ${safeLine(out).slice(0, 220)}`
  }
  if (/\bType\s*:\s*/i.test(out) || /-\s*Type\s*:\s*/i.test(out)) return `Violations observed:\n${out}`
  return `No violations observed.\n${safeLine(out).slice(0, 180)}`
}

function enforceVisibilityLanguage(text, hasImage) {
  if (!hasImage) return text
  const out = safeText(text || '')
  if (!/^Violations observed:/i.test(out)) return out

  const lines = out.split('\n')
  const rebuilt = []
  for (const line of lines) {
    const m = line.match(/^\s*Issue\s*:\s*(.+)\s*$/i)
    if (!m) {
      rebuilt.push(line)
      continue
    }
    const issue = safeLine(m[1] || '')
    const already =
      /\b(in\s+the\s+photo|in\s+this\s+photo|visible|i\s+can\s+see|appears\s+to\s+be\s+visible)\b/i.test(issue)
    if (already || !issue) {
      rebuilt.push(`  Issue: ${issue}`)
      continue
    }
    rebuilt.push(`  Issue: In the photo, I can see ${issue}`)
  }
  return rebuilt.join('\n').trim()
}

// ============================================================================
// COHERE v2 (REST) CHAT CALL FOR VISION + TEXT
// ============================================================================

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

// FIX: for text-only models, last user message content must be a STRING.
// For vision models, last user message content is an ARRAY of parts (text + image_url).
function buildV2Messages({ preamble, chatHistory, userMessage, images, isVision }) {
  const messages = []

  if (safeText(preamble)) messages.push({ role: 'system', content: safeText(preamble) })

  const hist = Array.isArray(chatHistory) ? chatHistory : []
  for (const h of hist) {
    const roleRaw = String(h?.role || '').toUpperCase()
    const text = safeText(h?.message || '')
    if (!text) continue
    if (roleRaw === 'USER') messages.push({ role: 'user', content: text })
    else if (roleRaw === 'CHATBOT' || roleRaw === 'ASSISTANT') messages.push({ role: 'assistant', content: text })
  }

  const msgText = safeText(userMessage) || ''

  if (!isVision) {
    messages.push({
      role: 'user',
      content: msgText || 'Help with Michigan food safety compliance.',
    })
    return { messages, normalizedImagesCount: 0 }
  }

  // Vision: build parts
  const parts = []
  if (msgText) parts.push({ type: 'text', text: msgText })

  const normalizedImages = normalizeImagesForCohere(images)
  for (const url of normalizedImages) {
    parts.push({ type: 'image_url', image_url: { url } })
  }

  messages.push({
    role: 'user',
    content: parts.length ? parts : [{ type: 'text', text: 'Analyze the image.' }],
  })

  return { messages, normalizedImagesCount: normalizedImages.length }
}

async function callCohereChat({ model, message, chatHistory, preamble, documents, images, isVision }) {
  const docs = (documents || []).map((doc) => ({
    id: doc?.id || 'internal',
    title: doc?.title || doc?.source || 'Policy',
    snippet: doc?.snippet || doc?.text || '',
    text: doc?.text || '',
  }))

  const { messages, normalizedImagesCount } = buildV2Messages({
    preamble,
    chatHistory,
    userMessage: message,
    images,
    isVision,
  })

  // Only enforce image normalization when we are truly in vision mode
  if (isVision && images && Array.isArray(images) && images.length && normalizedImagesCount === 0) {
    throw new Error('Image payload missing after normalization (v2)')
  }

  const respV2 = await callCohereChatV2Rest({ model, messages, documents: docs.length ? docs : undefined })
  respV2.__text = cohereResponseToText(respV2)
  respV2.__format = 'v2_rest'
  return respV2
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
    'handwashing',
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
    'priority',
    'priority foundation',
    'core',
    'imminent health hazard',
    'closure',
    'permit suspension',
    'act 92',
    'michigan modified food code',
    'norovirus',
  ]

  const lower = (text || '').toLowerCase()
  topics.forEach((topic) => {
    if (lower.includes(topic)) keywords.push(topic)
  })
  return keywords
}

// ============================================================================
// MESSAGE PARSING HELPERS
// ============================================================================

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
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

function getUserFriendlyErrorMessage(errorMessage) {
  if (errorMessage === 'VISION_TIMEOUT') return 'Photo analysis took too long. Try a smaller image or try again.'
  if (errorMessage === 'RETRIEVAL_TIMEOUT') return 'Document search timed out. Please try again.'
  if (errorMessage === 'ANSWER_TIMEOUT') return 'Response timed out. Try again in a few seconds.'
  if (errorMessage === 'EMBEDDING_TIMEOUT') return 'Search processing timed out. Please try again.'
  return 'Unable to process request. Please try again.'
}

function safeErrorDetails(err) {
  try {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return safeLine(err).slice(0, 400) || 'Unknown error'

    const parts = []
    const msg = safeLine(err?.message || '')
    if (msg) parts.push(msg)

    const responseData = err?.response?.body ?? err?.response?.data ?? err?.body ?? err?.data
    if (typeof responseData === 'string') parts.push(responseData)
    else if (responseData && typeof responseData === 'object') {
      try {
        parts.push(JSON.stringify(responseData))
      } catch {}
    }

    return safeLine(parts.filter(Boolean).join(' | ')).slice(0, 600) || 'Unknown error'
  } catch {
    return 'Unknown error'
  }
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

function getSessionInfo(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return { ip, userAgent }
}

// ============================================================================
// TOOL-STYLE OUTPUT FORMATTER (HTML + TEXT)
// ============================================================================

function escapeHtml(input) {
  if (input === null || input === undefined) return ''
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripTags(html) {
  return String(html || '')
    .replace(/<\/(div|p|li|ul|ol|br|span|b|strong)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Compact: 1–2 lines per violation (tool feel)
function toolHtmlFromFinalText(finalText) {
  const t = safeText(finalText || '')
  if (!t) {
    const html = `<div style="font-family:ui-sans-serif,system-ui;line-height:1.25">
      <b style="color:#34d399">Looks great.</b> No violations spotted.
    </div>`
    return { html, text: stripTags(html) }
  }

  const first = t.split('\n').find((l) => l.trim())?.trim() || ''

  if (/^No violations observed\./i.test(first)) {
    const html = `<div style="font-family:ui-sans-serif,system-ui;line-height:1.25">
      <b style="color:#34d399">Looks great.</b> No violations spotted.
    </div>`
    return { html, text: stripTags(html) }
  }

  if (/^Need a quick clarification:/i.test(first)) {
    const lines = t.split('\n').slice(1).filter((l) => l.trim().startsWith('-'))
    const items = lines.slice(0, 3).map((l) => escapeHtml(safeLine(l.replace(/^-/, '').trim())))
    const html = `<div style="font-family:ui-sans-serif,system-ui;line-height:1.25">
      <b style="color:#fbbf24">Need a quick clarification.</b>
      <ul style="margin:8px 0 0 18px;padding:0">
        ${items.map((q) => `<li style="margin:4px 0">${q}</li>`).join('')}
      </ul>
    </div>`
    return { html, text: stripTags(html) }
  }

  // Violations
  const parsed = parseViolationBlocks(t)
  const blocks = parsed?.blocks || []

  // If model didn’t give structured blocks for some reason, show a minimal fallback
  if (!blocks.length) {
    const html = `<div style="font-family:ui-sans-serif,system-ui;line-height:1.25">
      <b style="color:#ef4444">Violation</b>; ${escapeHtml(safeLine(t).slice(0, 260))}
    </div>`
    return { html, text: stripTags(html) }
  }

  const rows = blocks.slice(0, 12).map((b) => {
    const type = escapeHtml(safeLine(b.type || determineViolationType(b.issue || '')))
    const cat = escapeHtml(normalizeCategoryLabel(b.category || ''))
    const issue = escapeHtml(safeLine(b.issue || ''))
    const fix = escapeHtml(safeLine(b.remediation || ''))
    const by = escapeHtml(safeLine(b.correction || ''))
    const risk = escapeHtml(safeLine(b.ifNotCorrected || '').slice(0, 160))

    return `
      <div style="padding:10px 12px;border:1px solid rgba(255,255,255,0.10);border-radius:14px;margin:10px 0;background:rgba(255,255,255,0.04)">
        <div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
          <b style="color:#ef4444">VIOLATION</b>
          <span style="color:rgba(255,255,255,0.78)">${type}${cat ? ` • ${cat}` : ''}</span>
        </div>
        <div style="margin-top:6px;color:rgba(255,255,255,0.92)">${issue}</div>
        ${fix ? `<div style="margin-top:6px;color:rgba(255,255,255,0.78)"><b style="color:#93c5fd">Fix</b>: ${fix}</div>` : ''}
        ${by ? `<div style="margin-top:4px;color:rgba(255,255,255,0.72)"><b style="color:#a7f3d0">By</b>: ${by}</div>` : ''}
        ${risk ? `<div style="margin-top:4px;color:rgba(255,255,255,0.62)"><b style="color:#fca5a5">If not fixed</b>: ${risk}</div>` : ''}
      </div>
    `
  })

  const html = `<div style="font-family:ui-sans-serif,system-ui;line-height:1.25">
    ${rows.join('')}
  </div>`

  return { html, text: stripTags(html) }
}

// ============================================================================
// FINALIZE USER-FACING OUTPUT (HARD VALIDATOR PIPELINE)
// ============================================================================

function finalizeUserFacingText(raw, hasImage) {
  let out = sanitizeOutput(raw || '')

  out = sanitizeOutput(enforceViolationFormat(out))
  out = sanitizeOutput(enrichViolationsIfMissingFields(out))
  out = sanitizeOutput(normalizeCategoryLines(out))

  out = sanitizeOutput(enforceVisibilityLanguage(out, hasImage))

  const guarded = applyNoAssumptionsGuard(out, hasImage)
  out = sanitizeOutput(guarded.text)

  out = sanitizeOutput(ensureAllowedHeader(out))
  out = sanitizeOutput(stripStarsAndHashes(out))

  return out.trim()
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

    const imageInput = body?.image || body?.imageBase64 || body?.image_url || body?.imageDataUrl || body?.image_data || body?.images
    const hasImage = Boolean(imageInput)

    let normalizedImageUrls = []
    if (hasImage) {
      const arr = Array.isArray(imageInput) ? imageInput : [imageInput]
      for (const img of arr) {
        const validation = validateImageData(img)
        if (!validation.valid) continue
        normalizedImageUrls.push(validation.dataUrl)
      }
      if (!normalizedImageUrls.length) {
        logger.warn('Invalid image data', { error: 'All images failed validation' })
        return NextResponse.json({ error: 'Image validation failed: invalid image payload.' }, { status: 400 })
      }
    }

    const lastUserIndex = Array.isArray(messages)
      ? messages
          .slice()
          .reverse()
          .findIndex((m) => m?.role === 'user' && (typeof m?.content === 'string' || messageContentToString(m?.content)))
      : -1
    const resolvedLastUserIndex = lastUserIndex === -1 ? -1 : messages.length - 1 - lastUserIndex

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
        .find((m) => m?.role === 'user' && messageContentToString(m?.content))
      userMessage = safeLine(messageContentToString(fallback?.content))
    }

    if (!userMessage && hasImage) {
      userMessage =
        'Review the photo for Michigan food safety and sanitation issues. Only report violations you can directly see in the photo. Do not assume missing sinks, soap, towels, temperatures, time out of temperature control, storage duration, or that cooking is actively occurring unless clearly visible (labels, date marks, displays, thermometer readings). Do not report cooking timers or generic "stove is on" operational warnings as violations. If you cannot confirm, ask up to three short clarification questions instead of guessing. For each confirmed violation: provide Type, Category (Priority (P), Priority Foundation (Pf), or Core), Issue, Remediation, Correction time frame, and what typically happens if it is not corrected.'
    }

    if (!userMessage) return NextResponse.json({ error: 'Missing user message' }, { status: 400 })

    // ---- STATEWIDE CORPUS KEY ----
    const rawCorpusKey = safeLine(body?.county || body?.corpus || body?.jurisdiction || 'michigan') || 'michigan'
    const corpusKey = rawCorpusKey.toLowerCase().includes('washtenaw') ? 'michigan' : rawCorpusKey.toLowerCase()

    const effectivePrompt = userMessage

    const fullAudit = wantsFullAudit(effectivePrompt) || Boolean(body?.fullAudit)
    const includeFines = wantsFineInfo(effectivePrompt) || Boolean(body?.includeFines)

    // ========================================================================
    // AUTH + LICENSE VALIDATION
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
        return NextResponse.json({ error: 'Authentication required.', code: 'UNAUTHORIZED' }, { status: 401 })
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
          logger.security('Chat rate limit exceeded', { userId, count, limit: MAX_REQUESTS_PER_MINUTE })
          return NextResponse.json(
            { error: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMIT_EXCEEDED' },
            { status: 429 }
          )
        }

        rateLimitMap.set(rateLimitKey, count + 1)

        if (rateLimitMap.size > 1000) {
          const currentMinute = Math.floor(Date.now() / 60000)
          for (const [key] of rateLimitMap.entries()) {
            const keyMinute = parseInt(key.split('_').pop(), 10)
            if (Number.isFinite(keyMinute) && currentMinute - keyMinute > 5) rateLimitMap.delete(key)
          }
        }
      } catch (rateLimitError) {
        logger.warn('Rate limit check failed', { error: rateLimitError?.message })
      }

      try {
        const accessCheck = await checkAccess(userId)
        if (!accessCheck?.valid) {
          logger.warn('Access denied - trial expired or no subscription', { userId })
          return NextResponse.json(
            { error: 'Your trial has ended. Please subscribe to continue using protocolLM.', code: 'TRIAL_EXPIRED' },
            { status: 402 }
          )
        }
      } catch (error) {
        logger.error('Access check failed (fail-closed)', { error: error?.message, userId })
        return NextResponse.json(
          { error: 'Unable to verify subscription. Please sign in again or contact support.', code: 'ACCESS_CHECK_FAILED' },
          { status: 402 }
        )
      }

      const sessionInfo = getSessionInfo(request)

      const deviceCheck = await validateDeviceLicense(userId, sessionInfo)
      if (!deviceCheck.valid) {
        logger.security('License validation failed', {
          userId,
          code: deviceCheck.code,
          error: deviceCheck.error,
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

    const searchDocumentsFn = await getSearchDocuments()

    // ========================================================================
    // DOCUMENT RETRIEVAL (USER QUERY + PINNED POLICY)
    // ========================================================================

    const userKeywords = extractSearchKeywords(effectivePrompt)
    const searchQuery = [effectivePrompt, userKeywords.slice(0, 7).join(' '), 'Michigan food code']
      .filter(Boolean)
      .join(' ')
      .slice(0, 900)

    const pinnedPolicyDocsPromise = fetchPinnedPolicyDocs(searchDocumentsFn, corpusKey)

    let userDocs = []
    let rerankUsed = false
    let rerankCandidates = 0

    try {
      const initialDocs = await withTimeout(
        searchDocumentsFn(searchQuery, corpusKey, TOPK_PER_QUERY),
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
      logger.warn('Retrieval or rerank failed', { error: e?.message })
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
            .map((doc) => {
              const label = normalizeSourceLabel(doc.source || doc.title || 'Policy')
              const text = docTextForExcerpt(doc, 1400)
              return `INTERNAL POLICY EXCERPT - ${label}\n${text}`
            })
            .join('\n\n')

    let memoryContext = ''
    try {
      memoryContext = buildMemoryContext(userMemory) || ''
    } catch {}

    // ========================================================================
    // SYSTEM PROMPT (STATEWIDE MI + TOOL-LIKE, SHORT OUTPUT)
    // ========================================================================

    const systemPrompt = `You are ProtocolLM — a Michigan food service compliance tool (statewide).

You may receive a user question and sometimes one or more photos. You also receive internal policy excerpts for grounding.
Do NOT mention, cite, or reference any documents, excerpts, page numbers, ids, filenames, or sources in your response.

Critical rule for photos:
- Only report violations you can directly see in the photo.
- Do not assume missing sinks, missing soap/towels, temperatures, time out of temperature control, storage duration, "leftovers," or whether cooking is actively occurring unless clearly visible evidence is present (labels, date marks, displays, gauges, thermometer readings, timestamps).
- Do NOT report cooking timers, “timer not set”, or generic “stove/burner is on” operational warnings as food-code violations.
- If you cannot confirm, ask up to three short clarification questions instead of guessing.

Tone and length:
- Respond like a utility tool, not a chat agent.
- Be concise and actionable. No filler.

Output format (plain text only; no markdown; no emojis):
If no issues are visible:
- Start with: No violations observed.
- Add 1 short sentence.

If issues are observed:
- Start with: Violations observed:
- For each violation, use this exact structure:
  - Type: ...
    Category: ...
    Issue: ...
    Remediation: ...
    Correction: ...
    If not corrected: ...

If you need clarification:
- Start with: Need a quick clarification:
- Ask up to 3 questions.`

    const historySystemMessages = []
    const cohereChatHistory = []

    if (Array.isArray(messages)) {
      messages.forEach((msg, idx) => {
        if (idx === resolvedLastUserIndex) return
        const text = safeLine(messageContentToString(msg?.content))
        if (!text) return

        if (msg?.role === 'system' || msg?.role === 'developer') {
          historySystemMessages.push(text)
          return
        }

        if (msg?.role === 'assistant') {
          cohereChatHistory.push({ role: 'CHATBOT', message: text })
          return
        }

        if (msg?.role === 'user') {
          cohereChatHistory.push({ role: 'USER', message: text })
        }
      })
    }

    const systemHistoryPreamble = historySystemMessages.filter(Boolean).join('\n\n')
    const fallbackBlock = pinnedPolicyDocs.length ? '' : MICHIGAN_POLICY_FALLBACK

    const preambleParts = [
      systemPrompt,
      memoryContext || '',
      systemHistoryPreamble,
      fallbackBlock,
      excerptBlock ? `\n\n${excerptBlock}` : '',
      'Reminder: Do not mention or cite any internal documents or excerpts.',
    ].filter(Boolean)

    const preamble = preambleParts.join('\n\n')

    // ========================================================================
    // GENERATE RESPONSE
    // ========================================================================

    let modelText = ''
    let assistantFinalText = ''
    const usedModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    let billedUnits = {}
    let tokenUsage = {}

    try {
      const isVision = hasImage

      const req = {
        model: usedModel,
        message: userMessage,
        chatHistory: cohereChatHistory,
        preamble,
        documents: contextDocs.map((doc) => ({
          id: 'internal',
          title: normalizeSourceLabel(doc.source || doc.title || 'Policy'),
          snippet: docTextForExcerpt(doc, 900),
          text: docTextForExcerpt(doc, 1400),
        })),
        images: isVision ? normalizedImageUrls : [],
        isVision,
      }

      // If there is an image, ONLY vision model is allowed. No fallback to text model.
      const answerResp = await withTimeout(callCohereChat(req), ANSWER_TIMEOUT_MS, 'ANSWER_TIMEOUT')
      billedUnits = answerResp?.meta?.billed_units || answerResp?.billed_units || {}
      tokenUsage = answerResp?.meta?.tokens || answerResp?.tokens || {}
      modelText = answerResp?.__text || answerResp?.text || responseOutputToString(answerResp) || ''

      assistantFinalText = finalizeUserFacingText(
        modelText || 'Need a quick clarification:\n- Can you re-upload that photo or share a clearer angle?',
        hasImage
      )
    } catch (e) {
      const detail = safeErrorDetails(e)
      logger.error('Generation failed', { error: e?.message, detail, hasImage, model: usedModel })

      // For image requests, return a safe clarification (NOT a server error) so UI never shows “Generation failed”.
      if (hasImage) {
        assistantFinalText = finalizeUserFacingText(
          `Need a quick clarification:
- I could not process that photo. Please re-upload it (or try a smaller image).
- What should I check in the photo (cleanliness, storage, handwashing, temperature control)?
- If possible, share one more angle/close-up of the area you want reviewed.`,
          true
        )
      } else {
        return NextResponse.json(
          { error: 'Generation failed', details: detail },
          { status: e?.message?.includes('TIMEOUT') ? 408 : 500 }
        )
      }
    }

    // ========================================================================
    // TOOL-LIKE TRANSFORM: FINAL TEXT -> HTML (and plain fallback)
    // ========================================================================

    const tool = toolHtmlFromFinalText(assistantFinalText)
    const assistantMessageHtml = tool.html
    const assistantMessagePlain = tool.text || assistantFinalText

    // ========================================================================
    // UPDATE MEMORY
    // ========================================================================

    const imageMode = hasImage ? 'vision' : 'text'
    if (userId && effectivePrompt) {
      try {
        await updateMemory(userId, {
          userMessage: effectivePrompt,
          assistantResponse: assistantMessagePlain,
          mode: imageMode,
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
      embedModel: COHERE_EMBED_MODEL,
      embedDims: COHERE_EMBED_DIMS,
      rerankUsed: FEATURE_RERANK,
    })

    await logModelUsageDetail({
      userId,
      provider: 'cohere',
      model: usedModel,
      mode: imageMode,
      inputTokens: tokenUsage.input_tokens ?? tokenUsage.prompt_tokens,
      outputTokens: tokenUsage.output_tokens ?? tokenUsage.completion_tokens,
      billedInputTokens: billedUnits.input_tokens,
      billedOutputTokens: billedUnits.output_tokens,
      rerankUsed: FEATURE_RERANK,
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
        message: assistantMessagePlain,
        message_html: assistantMessageHtml,
        _meta: {
          model: usedModel,
          modelLabel: MODEL_LABEL,
          hasImage,
          fullAudit,
          includeFines,
          docsRetrieved: contextDocs.length,
          pinnedPolicyDocs: pinnedPolicyDocs.length,
          durationMs: Date.now() - startedAt,
          corpusKey,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
