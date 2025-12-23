// app/api/chat/route.js
// Cohere text + Cohere v2 vision via REST (messages + image_url)
// ProtocolLM - Washtenaw County Food Safety Compliance Engine
//
// Output guarantees (post-processor backstop):
// - Response starts with: "No violations observed." OR "Violations observed:" OR "Need a quick clarification:"
// - Each violation includes: Type + Category (Priority/Pf/Core) + Issue + Remediation + Correction + If not corrected
// - No "confidence" anywhere
// - No citations, no doc/page/source mentions in the user-facing output
// - No asterisks (*) and no hashtags (#) in the user-facing output
// - No assumptions: do not claim missing facilities, temperatures, cooking status, or time-based storage unless clearly visible

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
const COHERE_VISION_MODEL = process.env.COHERE_VISION_MODEL || 'c4ai-aya-vision-8b'

const rawEmbedModel = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_EMBED_MODEL = rawEmbedModel === 'embed-english-v4.0' ? 'embed-v4.0' : rawEmbedModel
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1536

const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v3.5'
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
  return String(text)
    .replace(/\bViolation Types\s*\|\s*Washtenaw County.*?\b/gi, '')
    .replace(/\bEnforcement Action\s*\|\s*Washtenaw County.*?\b/gi, '')
    .replace(/\bMichigan Modified Food Code\b/gi, '')
    .replace(/\bAct\s*92\s*of\s*2000\b/gi, '')
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
// PINNED POLICY RETRIEVAL (CORPUS-BASED) + FALLBACK BLOCK
// ============================================================================

const PINNED_POLICY_QUERIES = [
  'Washtenaw County violation types Priority Priority Foundation Core correct within 10 days 90 days follow-up inspection',
  'Washtenaw County enforcement action imminent health hazard closure office conference informal hearing formal hearing license suspension revocation',
  'Michigan Modified Food Code Priority item Priority Foundation item correct within 10 days Core within 90 days',
  'MCL Act 92 of 2000 Priority Item Priority Foundation Item definition',
]

const WASHTENAW_POLICY_FALLBACK = `WASHTENAW COUNTY POLICY (FALLBACK IF CORPUS CHUNKS NOT RETRIEVED)
- Categories: Priority (P), Priority Foundation (Pf), Core.
- Typical correction: P and Pf corrected at inspection or within 10 days; Core corrected by a specified date (typically within 90 days).
- If imminent health hazard exists (no water, no power, sewage backup, severe pests, fire, flood, outbreak), the county may order immediate closure; reopen only after correction and approval.
- Otherwise: progressive enforcement can escalate (follow-up inspection, Office Conference, Informal Hearing, license limitation/suspension/revocation; Formal Hearing may be requested to appeal).`

function normalizeSourceLabel(src) {
  const s = String(src || '').toLowerCase()
  if (s.includes('violation types')) return 'Washtenaw Violation Categories'
  if (s.includes('enforcement action')) return 'Washtenaw Enforcement Process'
  if (s.includes('modified food code')) return 'Michigan Modified Food Code'
  if (s.includes('act 92')) return 'Michigan Food Law (Act 92)'
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

async function fetchPinnedPolicyDocs(searchDocumentsFn, county) {
  try {
    const tasks = PINNED_POLICY_QUERIES.map((q) =>
      withTimeout(searchDocumentsFn(q, county, 6), PINNED_RETRIEVAL_TIMEOUT_MS, 'PINNED_TIMEOUT').catch(() => [])
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
      correction: 'Correct immediately; operations may be ordered closed until corrected and approved.',
      ifNotCorrected:
        'Imminent health hazard: the county may order immediate closure; reopening only after violations are corrected and approval is given.',
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
    /ill\s*employee|vomit|diarrhea|exclude|restrict/i,
    /sanitize|sanitiz(?:e|ing) (?:food|utensil|equipment)|food[- ]?contact.*sanit/i,
    /\bpest\b|rodent|roach|flies/i,
    /toxic|poison|chemical.*(label|store)|cleaner.*(label|store)/i,
  ]
  if (priorityPatterns.some((p) => p.test(hay))) {
    return {
      category: 'Priority (P)',
      correction: 'Correct at inspection or within 10 days; follow-up inspection may occur if not permanently corrected at inspection.',
      ifNotCorrected:
        'Likely follow-up inspection; repeated or unresolved violations can escalate (Office Conference, Informal Hearing, license limitation/suspension/revocation).',
    }
  }

  const pfPatterns = [
    /thermometer|probe\s*therm/i,
    /test\s*strip|sanitizer\s*test/i,
    /soap|paper\s*towel|hand\s*sink.*(soap|towel)/i,
    /calibrat(?:e|ion)/i,
    /haccp|plan|critical\s*limit/i,
    /training|policy|procedure|documentation|record[- ]?keeping/i,
  ]
  if (pfPatterns.some((p) => p.test(hay))) {
    return {
      category: 'Priority Foundation (Pf)',
      correction: 'Correct at inspection or within 10 days; follow-up inspection may occur if not permanently corrected at inspection.',
      ifNotCorrected:
        'Likely follow-up inspection; repeated or unresolved violations can escalate (Office Conference, Informal Hearing, license limitation/suspension/revocation).',
    }
  }

  return {
    category: 'Core',
    correction: 'Correct by an agreed or specified date, typically no later than 90 days after inspection.',
    ifNotCorrected:
      'Unresolved or repeat core issues can still lead to enforcement after opportunities to correct during inspection and follow-up.',
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
// ============================================================================

function parseViolationBlocks(text) {
  const out = safeText(text || '')
  const lines = out.split('\n').filter((l) => l.trim().length > 0)
  if (!lines.length) return { header: '', blocks: [], tail: [] }

  const header = lines[0].trim()
  const body = lines.slice(1)

  const starts = []
  for (let i = 0; i < body.length; i++) {
    if (/^\s*-\s*Type\s*:\s*/i.test(body[i])) starts.push(i)
  }

  // If no structured blocks, treat as tail-only
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
}

function looksLikeNonVisualAssumption(issue, remediation, type) {
  const t = `${issue || ''} ${remediation || ''} ${type || ''}`.toLowerCase()

  // Absence / "missing" claims that are commonly NOT confirmable unless the photo is specifically of that station
  const absenceFacility = [
    /no\s+hand\s*wash/i,
    /no\s+handwashing/i,
    /lack\s+of\s+hand/i,
    /missing\s+hand/i,
    /lack\s+of\s+soap/i,
    /missing\s+soap/i,
    /no\s+soap/i,
    /lack\s+of\s+paper\s*towel/i,
    /missing\s+paper\s*towel/i,
    /no\s+paper\s*towel/i,
    /no\s+thermometer/i,
    /missing\s+thermometer/i,
    /lack\s+of\s+thermometer/i,
    /no\s+test\s*strips/i,
    /missing\s+test\s*strips/i,
  ]

  // Time/temperature/storage-status assertions often NOT confirmable from a photo
  const timeTempInference = [
    /\bleftover\b/i,
    /\bstored\s+at\s+room\s+temperature\b/i,
    /\bat\s+room\s+temperature\b/i,
    /\bheld\s+at\s+room\s+temperature\b/i,
    /\bimproperly\s+cooled\b/i,
    /\bnot\s+(?:cooled|reheated|held)\b/i,
    /\btime\s+in\s+temperature\s+danger\s+zone\b/i,
  ]

  // NEW: Operational/cooking-status inferences (not a food-code violation and usually not confirmable)
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

  return (
    absenceFacility.some((p) => p.test(t)) ||
    timeTempInference.some((p) => p.test(t)) ||
    operationalInference.some((p) => p.test(t))
  )
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
      add('Is there a designated handwashing sink available, and is it stocked with soap and paper towels?')
      continue
    }

    if (t.includes('thermometer') || t.includes('test strips') || t.includes('sanitizer')) {
      add('Do you have a thermometer or test-strip reading you can share (or a photo of the gauge/label)?')
      continue
    }

    if (t.includes('room temperature') || t.includes('leftover') || t.includes('stored')) {
      add('Was the food in the photo being actively cooked/served, or was it being cooled/held for storage?')
      continue
    }

    // NEW: stove/burner/timer assumptions -> ask instead of claiming
    if (t.includes('stove') || t.includes('stovetop') || t.includes('burner') || t.includes('timer') || t.includes('unattended')) {
      add('Were any burners actually on at the time of the photo, or was the pot just sitting on the stovetop?')
      continue
    }

    // generic fallback
    add('Can you share one more photo that shows the specific area being referenced more clearly?')
  }

  if (!qs.length) {
    add('Can you share a clearer photo or one more angle of the area you want reviewed?')
  }

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
    for (const q of clarificationQuestions.slice(0, 3)) {
      parts.push(`- ${safeLine(q)}`)
    }
  }

  return parts.join('\n').trim()
}

function applyNoAssumptionsGuard(text, hasImage) {
  if (!hasImage) return { text, dropped: 0 }

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

  // If everything was assumption-based, return clarification-only
  if (!keep.length) {
    const parts = ['Need a quick clarification:']
    for (const q of questions) parts.push(`- ${safeLine(q)}`)
    return { text: parts.join('\n').trim(), dropped: drop.length }
  }

  const rebuilt = rebuildResponseFromBlocks('Violations observed:', keep, questions)
  return { text: rebuilt, dropped: drop.length }
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

  // Heuristic fallback
  if (/\bNeed a quick clarification\b/i.test(out) || /\?\s*$/.test(out)) {
    return `Need a quick clarification:\n- ${safeLine(out).slice(0, 220)}`
  }
  if (/\bType\s*:\s*/i.test(out) || /-\s*Type\s*:\s*/i.test(out)) return `Violations observed:\n${out}`
  return `No violations observed.\n${safeLine(out).slice(0, 180)}`
}

// ============================================================================
// COHERE v2 (REST) CHAT CALL FOR VISION
// ============================================================================

async function callCohereChatV2Rest({ model, messages }) {
  const apiKey = process.env.COHERE_API_KEY
  if (!apiKey) throw new Error('COHERE_API_KEY not configured')

  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
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

// ============================================================================
// COHERE CHAT CALL
// - Vision uses v2 REST (messages + image_url)
// - Text uses SDK legacy (message + preamble + chat_history)
// ============================================================================

function isVisionModel(model) {
  const m = String(model || '').toLowerCase()
  return m.includes('vision') || m.includes('aya-vision') || m.includes('command-a-vision')
}

function buildV2Messages({ preamble, chatHistory, userMessage, images }) {
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

  const parts = []
  const msgText = safeText(userMessage)
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

async function callCohereChat({ model, message, chatHistory, preamble, documents, images }) {
  const docs = (documents || []).map((doc) => ({
    id: doc?.id || 'internal',
    title: doc?.title || doc?.source || 'Policy',
    snippet: doc?.snippet || doc?.text || '',
    text: doc?.text || '',
  }))

  if (isVisionModel(model) && images) {
    const { messages, normalizedImagesCount } = buildV2Messages({
      preamble,
      chatHistory,
      userMessage: message,
      images,
    })

    if (normalizedImagesCount === 0) throw new Error('Image payload missing after normalization (v2)')

    const respV2 = await callCohereChatV2Rest({ model, messages })
    respV2.__text = cohereResponseToText(respV2)
    respV2.__format = 'v2_rest'
    return respV2
  }

  const payloadLegacy = {
    model,
    message,
    preamble,
    chat_history: chatHistory,
    documents: docs,
  }

  const normalizedImages = normalizeImagesForCohere(images)
  if (normalizedImages.length) payloadLegacy.images = normalizedImages

  if (!safeText(message) && !payloadLegacy.images?.length) {
    throw new Error('Missing message content for Cohere chat')
  }

  const respLegacy = await cohereClient.chat(payloadLegacy)
  respLegacy.__text = cohereResponseToText(respLegacy)
  respLegacy.__format = 'legacy_sdk'
  return respLegacy
}

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms))])
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
    'office conference',
    'informal hearing',
    'formal hearing',
    'enforcement action',
    'imminent health hazard',
    'closure',
    'license suspension',
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
  if (errorMessage === 'VISION_TIMEOUT') return 'Photo analysis took too long. Try a smaller image or wait 10 seconds and try again.'
  if (errorMessage === 'RETRIEVAL_TIMEOUT') return 'Document search timed out. Please try again.'
  if (errorMessage === 'ANSWER_TIMEOUT') return 'Response generation timed out. System may be busy. Try again in 10 seconds.'
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
// FINALIZE USER-FACING OUTPUT (HARD VALIDATOR PIPELINE)
// ============================================================================

function finalizeUserFacingText(raw, hasImage) {
  let out = sanitizeOutput(raw || '')

  out = sanitizeOutput(enforceViolationFormat(out))
  out = sanitizeOutput(enrichViolationsIfMissingFields(out))
  out = sanitizeOutput(normalizeCategoryLines(out))

  // No-assumptions guard (image mode)
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

    const imageInput = body?.image || body?.imageBase64 || body?.image_url || body?.imageDataUrl || body?.image_data
    const hasImage = Boolean(imageInput)

    let fullDataUrl = null
    if (hasImage) {
      const validation = validateImageData(imageInput)
      if (!validation.valid) {
        logger.warn('Invalid image data', { error: validation.error })
        return NextResponse.json({ error: `Image validation failed: ${validation.error}` }, { status: 400 })
      }
      fullDataUrl = validation.dataUrl
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
        'Review the photo for food safety and sanitation issues. Only report violations you can directly see in the photo. Do not assume missing sinks, soap, towels, temperatures, time out of temperature control, storage duration, or that cooking is actively occurring unless clearly visible. Do not report cooking timers or generic "stove is on" operational warnings as violations. If you cannot confirm, ask up to three short clarification questions instead of guessing. For each confirmed violation: provide Type, Category (Priority (P), Priority Foundation (Pf), or Core), Issue, Remediation, Correction time frame, and what typically happens if it is not corrected.'
    }

    if (!userMessage) return NextResponse.json({ error: 'Missing user message' }, { status: 400 })

    const county = safeLine(body?.county || 'washtenaw') || 'washtenaw'
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
    const searchQuery = [effectivePrompt, userKeywords.slice(0, 7).join(' '), 'Washtenaw County Michigan food code']
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
    // SYSTEM PROMPT (PLAIN TEXT FORMAT, NO MARKDOWN)
    // ========================================================================

    const systemPrompt = `You are ProtocolLM - a Washtenaw County, Michigan food service compliance assistant.

You may receive a user question and sometimes one or more photos. You also receive internal policy excerpts for grounding.
Do not mention, cite, or reference any documents, excerpts, page numbers, ids, filenames, or sources in your response.

Critical rule for photos:
- Only report violations you can directly see in the photo.
- Do not assume missing sinks, missing soap/towels, temperatures, time out of temperature control, "leftovers," storage duration, or whether cooking is actively occurring unless clearly visible (labels, gauges, timestamps, thermometer readings, visible flame/glow/indicator).
- Do NOT report cooking timers, “timer not set”, or generic “stove/burner is on” operational warnings as food-code violations.
- If you cannot confirm, ask up to three short clarification questions instead of guessing.

Goals:
- Identify specific violations based on observed conditions or user descriptions.
- Provide clear, actionable remediation steps for each violation.
- Specify the violation Type (example: Food Storage, Sanitation, Temperature Control).
- Classify each issue as Category: Priority (P), Priority Foundation (Pf), or Core.
- For each violation, include Correction time frame and what typically happens if not corrected (follow-up, enforcement, closure for imminent hazards).
- Avoid false positives. If unsure, ask clarifying questions instead of guessing.
- No emojis. No citations. Do not mention confidence.

Output format:
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
    const fallbackBlock = pinnedPolicyDocs.length ? '' : WASHTENAW_POLICY_FALLBACK

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
    let assistantMessage = ''
    let status = 'guidance'
    let usedModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    let billedUnits = {}
    let tokenUsage = {}
    let visionFallbackUsed = false

    try {
      const buildCohereRequest = (model) => {
        const visionImages = hasImage && fullDataUrl ? [fullDataUrl] : []
        return {
          model,
          message: userMessage,
          chatHistory: cohereChatHistory,
          preamble,
          documents: contextDocs.map((doc) => ({
            id: 'internal',
            title: normalizeSourceLabel(doc.source || doc.title || 'Policy'),
            snippet: docTextForExcerpt(doc, 900),
            text: docTextForExcerpt(doc, 1400),
          })),
          images: visionImages,
        }
      }

      const req = buildCohereRequest(usedModel)

      try {
        const answerResp = await withTimeout(callCohereChat(req), ANSWER_TIMEOUT_MS, 'ANSWER_TIMEOUT')
        billedUnits = answerResp?.meta?.billed_units || answerResp?.billed_units || {}
        tokenUsage = answerResp?.meta?.tokens || answerResp?.tokens || {}
        modelText = answerResp?.__text || answerResp?.text || responseOutputToString(answerResp) || ''
        assistantMessage = finalizeUserFacingText(modelText || 'Unable to process request. Please try again.', hasImage)
      } catch (visionErr) {
        const detail = safeErrorDetails(visionErr)
        const isLikelyBadRequest =
          detail.includes('COHERE_V2_CHAT_4') ||
          detail.includes('COHERE_V2_CHAT_400') ||
          detail.includes('COHERE_V2_CHAT_422')

        if (hasImage && isLikelyBadRequest) {
          visionFallbackUsed = true
          logger.warn('Vision rejected; falling back to text-only.', { detail, model: usedModel })

          usedModel = COHERE_TEXT_MODEL
          const fallbackReq = buildCohereRequest(usedModel)
          fallbackReq.images = []

          const fallbackResp = await withTimeout(callCohereChat(fallbackReq), ANSWER_TIMEOUT_MS, 'ANSWER_TIMEOUT')
          billedUnits = fallbackResp?.meta?.billed_units || fallbackResp?.billed_units || {}
          tokenUsage = fallbackResp?.meta?.tokens || fallbackResp?.tokens || {}
          modelText = fallbackResp?.__text || fallbackResp?.text || responseOutputToString(fallbackResp) || ''
          assistantMessage = finalizeUserFacingText(
            `Photo analysis is temporarily unavailable. Answering based on the request text.\n\n${modelText || 'Unable to process request. Please try again.'}`,
            false
          )
        } else {
          throw visionErr
        }
      }
    } catch (e) {
      const detail = safeErrorDetails(e)
      logger.error('Generation failed', { error: e?.message, detail, hasImage, model: usedModel })
      return NextResponse.json(
        { error: 'Generation failed', details: detail },
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
          assistantResponse: assistantMessage,
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
      pinnedPolicyDocs: pinnedPolicyDocs.length,
      fullAudit,
      includeFines,
      model: usedModel,
      visionFallbackUsed,
      embedModel: COHERE_EMBED_MODEL,
      embedDims: COHERE_EMBED_DIMS,
      rerankUsed,
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
        message: assistantMessage,
        _meta: {
          model: usedModel,
          modelLabel: MODEL_LABEL,
          hasImage,
          status,
          fullAudit,
          includeFines,
          docsRetrieved: contextDocs.length,
          pinnedPolicyDocs: pinnedPolicyDocs.length,
          durationMs: Date.now() - startedAt,
          visionFallbackUsed,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message, stack: e?.stack })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
