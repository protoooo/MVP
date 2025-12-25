// app/api/chat/route.js

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
import { checkDeviceFreeUsage, incrementDeviceUsage, getSessionInfoFromRequest, FREE_USAGE_LIMIT } from '@/lib/deviceUsage'

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
const FEATURE_VISION_DOUBLECHECK =
  (process.env.FEATURE_VISION_DOUBLECHECK ?? 'true').toLowerCase() === 'true'

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
const DOUBLECHECK_TIMEOUT_MS = 12000

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
  // Priority/Pf/Core + correction timelines
  'Michigan Modified Food Code Priority item Priority Foundation item Core item definitions correction time frames',
  'MCL Act 92 of 2000 Michigan Food Law enforcement authority license suspension revocation hearing',

  // Enforcement / imminent hazard
  'Michigan food safety enforcement action imminent health hazard closure order reopen approval',

  // Time/temperature anchors
  'Michigan Modified Food Code time temperature control for safety TCS hot holding cold holding cooling reheating',

  // Chemical storage anchors (Windex-in-sink type misses)
  'Michigan Modified Food Code poisonous or toxic materials storage separation not above food equipment utensils single-service warewashing area stored to prevent contamination',
  'Michigan Modified Food Code chemical cleaners sanitizers stored to prevent contamination of food equipment utensils',
]

const MICHIGAN_POLICY_FALLBACK = `MICHIGAN STATE FOOD SAFETY POLICY (FALLBACK IF CORPUS CHUNKS NOT RETRIEVED)
- Authority: Michigan Food Law (MCL Act 92 of 2000) and Michigan Modified Food Code.
- Categories: Priority (P), Priority Foundation (Pf), Core.
- Typical correction: P and Pf corrected at inspection or within 10 days; Core corrected by a specified date (typically within 90 days).
- Imminent health hazard examples: no water, no power, sewage backup, fire, flood, outbreak, severe pests; may require immediate closure until corrected and approved.

CHEMICAL HANDLING (POISONOUS/TOXIC MATERIALS) - PRACTICAL RULE:
- Cleaning chemicals must be stored/placed so they cannot contaminate food, equipment, utensils, linens, or single-service items.
- In photos: a cleaner bottle sitting in a sink basin, on a drainboard where dishes are handled, on food-contact surfaces, or stored with/above dishes is a reportable Chemical Handling violation.`

function normalizeSourceLabel(src) {
  const s = String(src || '').toLowerCase()
  if (s.includes('modified food code')) return 'Michigan Modified Food Code'
  if (s.includes('act 92') || s.includes('mcl')) return 'Michigan Food Law (MCL Act 92)'
  if (s.includes('violation types')) return 'Violation Categories'
  if (s.includes('enforcement action')) return 'Enforcement Process'
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
    chemical: 'Chemical Handling',
    toxic: 'Chemical Handling',
    poisonous: 'Chemical Handling',
    cleaner: 'Chemical Handling',
    'glass cleaner': 'Chemical Handling',
    windex: 'Chemical Handling',
    bleach: 'Chemical Handling',
    degreaser: 'Chemical Handling',
    'spray bottle': 'Chemical Handling',

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

  // ✅ Chemical handling should be treated as Priority when it involves storage/placement that can contaminate
  const chemicalPatterns = [
    /\bwindex\b/i,
    /\bbleach\b/i,
    /\bdegreaser\b/i,
    /\bglass\s*cleaner\b/i,
    /\bpoison(?:ous)?\b/i,
    /\btoxic\b/i,
    /\bchemical\b/i,
    /\bcleaner\b/i,
    /\bsanitizer\b/i,
  ]

  if (chemicalPatterns.some((p) => p.test(hay))) {
    return {
      category: 'Priority (P)',
      correction: 'Immediately',
      ifNotCorrected:
        'Contamination risk; may require follow-up inspection and can escalate to enforcement for repeat/unresolved issues.',
    }
  }

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
    /\bwindex\b/i,
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
// + EVIDENCE GATE FOR TIME/TEMP CLAIMS
// ============================================================================

// Also wrap parseViolationBlocks in try-catch (defensive, prevents 500s)
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
  } catch (error) {
    logger.warn('Parse violation blocks error (non-breaking)', { error: error?.message })
    return { header: '', blocks: [], tail: [] }
  }
}

// Evidence gate: time/temperature/cooking/storage claims require explicit evidence language
function hasExplicitEvidenceLanguage(text) {
  const t = String(text || '').toLowerCase()
  if (!t) return false

  // Evidence indicators that can plausibly be visible in a photo
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
    /\b\d{1,2}:\d{2}\b/i, // clock time
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

// UPDATED: tighter “absence” patterns so we don’t delete legit “blocked/dirty/obstructed” findings
function looksLikeNonVisualAssumption(issue, remediation, type) {
  const t = `${issue || ''} ${remediation || ''} ${type || ''}`.toLowerCase()

  // Only flag true “absence / not present” claims (not “blocked/dirty/inaccessible”)
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

  // We explicitly allow visible “accessibility” findings; do NOT treat them as assumptions
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

  // If it’s an accessibility/condition claim, keep it (it can be visible)
  if (isAccessibilityFinding) return false

  // Hard-block operational/cooking-status claims as “violations”
  const operationalInference = [
    /\bstove(top)?\s+(?:is|was)\s+on\b/i,
    /\bburner(s)?\s+(?:is|are|was|were)\s+on\b/i,
    /\b(timer|cook\s*timer)\s+(?:is|was)\s+not\s+set\b/i,
    /\bleft\s+unattended\b/i,
    /\bunattended\s+(?:cooking|heat|stove|burner)\b/i,
    /\bactively\s+cook(?:ing)?\b/i,
  ]

  // Time/temp/storage/cooking claims require evidence language somewhere in the block
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

    // Presence vs accessibility nuance
    if (t.includes('hand') && (t.includes('wash') || t.includes('handwash'))) {
      add(
        'Is the handwashing sink present in the area, and is it currently accessible (not blocked or used for storage) and stocked with soap and paper towels?'
      )
      continue
    }

    if (t.includes('thermometer') || t.includes('test strip') || t.includes('sanitizer')) {
      add('Do you have a thermometer/test-strip reading you can share, or a photo showing the display/label/reading?')
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
      add(
        'Is there a visible label, date mark, or thermometer reading for the food/item in question? If so, can you share a close-up photo of it?'
      )
      continue
    }

    if (
      t.includes('stove') ||
      t.includes('stovetop') ||
      t.includes('burner') ||
      t.includes('timer') ||
      t.includes('unattended')
    ) {
      add('Were any burners actually on at the time of the photo, or was the pot just sitting on the stovetop?')
      continue
    }

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

// Replace the applyNoAssumptionsGuard function (wrapped in try/catch for safety)
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

      if (looksLikeNonVisualAssumption(issue, remediation, type)) {
        drop.push(b)
      } else {
        keep.push(b)
      }
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
  } catch (error) {
    // If parsing fails, return original text (non-breaking) to prevent 500s
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

  // Heuristic fallback
  if (/\bNeed a quick clarification\b/i.test(out) || /\?\s*$/.test(out)) {
    return `Need a quick clarification:\n- ${safeLine(out).slice(0, 220)}`
  }
  if (/\bType\s*:\s*/i.test(out) || /-\s*Type\s*:\s*/i.test(out)) return `Violations observed:\n${out}`
  return `No violations observed.\n${safeLine(out).slice(0, 180)}`
}

// NEW: Encourage visibility language in Issue lines (non-breaking).
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
  // For v2/chat: documents are supported as "documents" in v2 (but schema differs),
  // so we keep them inside the preamble as excerpts and also pass minimal docs as a best-effort.
  // If Cohere rejects documents in v2 for your model, it will fall back to text-only later.
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
  })

  // If images were provided but got normalized away, throw so we can fall back cleanly.
  if (images && Array.isArray(images) && images.length && normalizedImagesCount === 0) {
    throw new Error('Image payload missing after normalization (v2)')
  }

  const payload = { model, messages }

  // Best-effort: only attach documents if present (some models accept, some may reject)
  if (docs.length) payload.documents = docs

  const respV2 = await callCohereChatV2Rest(payload)
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
    'poisonous',
    'toxic materials',
    'chemical storage',
    'cleaner',
    'glass cleaner',
    'windex',
    'bleach',
    'degreaser',
    'detergent',
    'sanitizer bottle',
    'spray bottle',
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

  // Encourage “visible in photo” phrasing in Issue lines (image mode)
  out = sanitizeOutput(enforceVisibilityLanguage(out, hasImage))

  // No-assumptions guard (image mode) - now non-breaking
  const guarded = applyNoAssumptionsGuard(out, hasImage)
  out = sanitizeOutput(guarded.text)

  out = sanitizeOutput(ensureAllowedHeader(out))
  out = sanitizeOutput(stripStarsAndHashes(out))

  return out.trim()
}

// ============================================================================
// VISION DOUBLE-CHECK PROMPT (CHEMICAL HANDLING)
// ============================================================================

function buildVisionDoublecheckPrompt(original = '') {
  const base = safeLine(original || '')
  return (
    'Double-check the photo specifically for visible CHEMICAL HANDLING issues. ' +
    'Look for cleaner bottles/spray chemicals (e.g., Windex/bleach/degreaser) stored in a sink basin, on drainboards, ' +
    'on food-contact surfaces, above/with dishes or utensils, or near exposed food. ' +
    'Only report what you can directly see. Use the exact same output format rules.\n' +
    (base ? `\nContext from user: ${base}\n` : '')
  )
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
        'Review the photo for food safety and sanitation issues. Only report violations you can directly see in the photo. ' +
        'Do not assume missing sinks, soap, towels, temperatures, time out of temperature control, storage duration, or that cooking is actively occurring unless clearly visible (labels, date marks, displays, thermometer readings). ' +
        'DO report visible chemical handling problems: cleaner bottles (e.g., Windex/bleach/degreaser) sitting in a sink basin, on a drainboard where dishes are handled, on food-contact surfaces, or stored with/above dishes/utensils. ' +
        'If you cannot confirm something, ask up to three short clarification questions instead of guessing. ' +
        'For each confirmed violation: provide Type, Category (Priority (P), Priority Foundation (Pf), or Core), Issue, Remediation, Correction time frame, and what typically happens if it is not corrected.'
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

      // ========================================================================
      // ANONYMOUS FREE USAGE PATH
      // ========================================================================
      if (!userId || !data?.user) {
        isAnonymous = true
        logger.info('Anonymous chat request - checking device free usage')

        // Check device free usage limit
        const deviceCheck = await checkDeviceFreeUsage(sessionInfo)
        
        if (!deviceCheck.allowed) {
          logger.info('Anonymous device free usage exhausted', { 
            fingerprint: deviceCheck.fingerprint?.substring(0, 8) + '***',
            blocked: deviceCheck.blocked
          })
          return NextResponse.json({ 
            error: 'Free usage limit reached. Sign up to continue using protocolLM.',
            code: 'FREE_USAGE_EXHAUSTED',
            remaining: 0,
            limit: FREE_USAGE_LIMIT
          }, { status: 402 })
        }

        deviceUsageRemaining = deviceCheck.remaining
        logger.info('Anonymous device has free uses remaining', { remaining: deviceUsageRemaining })

        // Increment usage atomically BEFORE processing (decrement before use)
        const incrementResult = await incrementDeviceUsage(sessionInfo)
        if (!incrementResult.success) {
          logger.info('Anonymous device usage increment failed - limit may have been reached', {
            fingerprint: deviceCheck.fingerprint?.substring(0, 8) + '***'
          })
          return NextResponse.json({ 
            error: 'Free usage limit reached. Sign up to continue using protocolLM.',
            code: 'FREE_USAGE_EXHAUSTED',
            remaining: 0,
            limit: FREE_USAGE_LIMIT
          }, { status: 402 })
        }

        deviceUsageRemaining = incrementResult.remaining

        // Rate limit for anonymous users (stricter)
        const anonRateLimitKey = `anon_${deviceCheck.fingerprint}_${Math.floor(Date.now() / 60000)}`
        const MAX_ANON_REQUESTS_PER_MINUTE = 5

        try {
          const rateLimitMap = global.chatRateLimits || (global.chatRateLimits = new Map())
          const count = rateLimitMap.get(anonRateLimitKey) || 0

          if (count >= MAX_ANON_REQUESTS_PER_MINUTE) {
            logger.security('Anonymous chat rate limit exceeded', { count, limit: MAX_ANON_REQUESTS_PER_MINUTE })
            return NextResponse.json(
              { error: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMIT_EXCEEDED' },
              { status: 429 }
            )
          }

          rateLimitMap.set(anonRateLimitKey, count + 1)
        } catch (rateLimitError) {
          logger.warn('Anonymous rate limit check failed', { error: rateLimitError?.message })
        }

        // Skip to document retrieval for anonymous users (no subscription/license checks)
      } else {
        // ========================================================================
        // AUTHENTICATED USER PATH
        // ========================================================================
        
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
    const searchQuery = [effectivePrompt, userKeywords.slice(0, 7).join(' '), 'Michigan food code MCL Act 92']
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

    const systemPrompt = `You are ProtocolLM - a Michigan food service compliance tool. Be extremely concise.

CRITICAL: Keep responses SHORT. Maximum 3-4 sentences for no violations, maximum 1-2 bullet points for violations.

For photos:
- Only report what you can directly see
- DO report visible chemical handling problems (cleaners in sinks, on food surfaces, etc.)
- Do NOT assume temperatures, times, or missing items unless clearly visible

Output format (FOLLOW EXACTLY):

If no violations visible:
NO VIOLATIONS ✓

If violations found:
VIOLATIONS:
• [Type]: [Brief issue description]. FIX: [One sentence remediation]

If clarification needed:
NEED INFO:
• [Short question]

Examples:
"NO VIOLATIONS ✓"
"VIOLATIONS:
• Chemical Storage: Windex bottle in sink basin. FIX: Store chemicals away from food prep and dishwashing areas."
"NEED INFO:
• Can you show the temperature display on the unit?"`

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
    let assistantMessage = ''
    let status = 'guidance'
    let usedModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    let billedUnits = {}
    let tokenUsage = {}
    let visionFallbackUsed = false

    try {
      const buildCohereRequest = (model) => {
        const visionImages = hasImage && normalizedImageUrls.length ? normalizedImageUrls : []
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

        // ✅ Vision double-check: if the model says "No violations observed." on an image,
        // do a fast second pass focused on chemical handling (catches Windex-in-sink misses).
        if (
          hasImage &&
          FEATURE_VISION_DOUBLECHECK &&
          !visionFallbackUsed &&
          /^no violations\b/i.test(safeLine(assistantMessage))
        ) {
          try {
            const dcReq = buildCohereRequest(usedModel)
            dcReq.message = buildVisionDoublecheckPrompt(userMessage)

            const dcResp = await withTimeout(callCohereChat(dcReq), DOUBLECHECK_TIMEOUT_MS, 'DOUBLECHECK_TIMEOUT')
            const dcText = dcResp?.__text || dcResp?.text || responseOutputToString(dcResp) || ''
            const dcMsg = finalizeUserFacingText(dcText || 'No violations observed.', true)

            // Only override if the double-check finds something actionable (or needs clarification)
            if (/^(Violations observed:|Need a quick clarification:)/i.test(dcMsg)) {
              assistantMessage = dcMsg
            }
          } catch (err) {
            logger.warn('Vision double-check failed (non-blocking)', { error: err?.message })
          }
        }
      } catch (visionErr) {
        const detail = safeErrorDetails(visionErr)
        const isLikelyBadRequest =
          detail.includes('COHERE_V2_CHAT_4') || detail.includes('COHERE_V2_CHAT_400') || detail.includes('COHERE_V2_CHAT_422')

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

    const imageMode = hasImage ? 'vision' : 'text'
    if (userId && effectivePrompt) {
      try {
        await updateMemory(userId, {
          userMessage: effectivePrompt,
          assistantResponse: assistantMessage,
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

    // Only log usage for authenticated users
    if (userId && !isAnonymous) {
      await logModelUsageDetail({
        userId,
        provider: 'cohere',
        model: usedModel,
        mode: imageMode,
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
          status,
          fullAudit,
          includeFines,
          docsRetrieved: contextDocs.length,
          pinnedPolicyDocs: pinnedPolicyDocs.length,
          durationMs: Date.now() - startedAt,
          visionFallbackUsed,
          // Include device usage info for anonymous users
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
