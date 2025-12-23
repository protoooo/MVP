// app/api/chat/route.js - Cohere text + Aya vision (legacy payload only)
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
// IMAGE VALIDATION + NORMALIZATION (COHERE: ALWAYS PRODUCE A DATA URL)
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

    return {
      valid: true,
      base64Data,
      mediaType,
      dataUrl,
    }
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
const COHERE_VISION_MODEL = 'c4ai-aya-vision-8b'
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || 'embed-english-v4.0'
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1024
const COHERE_RERANK_MODEL = process.env.COHERE_RERANK_MODEL || 'rerank-v3.5'
const MODEL_LABEL = 'Cohere'

// Time budgets
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000

// Retrieval + rerank config
const TOPK_PER_QUERY = 20
const MAX_DOCS_FOR_CONTEXT = 5
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
// COHERE CHAT CALL
// Aya vision: legacy payload with explicit images, no v2 fallback.
// ============================================================================

function cohereResponseToText(resp) {
  // v2 shape: resp.message.content = [{type:'text', text:'...'}]
  const msg = resp?.message
  const content = Array.isArray(msg?.content) ? msg.content : []
  for (const c of content) {
    if (typeof c?.text === 'string' && c.text.trim()) return c.text
  }

  // legacy shapes
  if (typeof resp?.text === 'string' && resp.text.trim()) return resp.text
  if (typeof resp?.output_text === 'string' && resp.output_text.trim()) return resp.output_text

  // extra fallbacks
  const alt = responseOutputToString(resp)
  if (alt && alt.trim()) return alt

  return ''
}

async function callCohereChat({ model, message, chatHistory, preamble, documents, images }) {
  const docs = (documents || []).map((doc) => ({
    id: doc?.id || 'unknown',
    title: doc?.title || doc?.source || 'Source',
    snippet: doc?.snippet || doc?.text || '',
    text: doc?.text || '',
  }))

  const payloadLegacy = {
    model,
    message,
    preamble,
    chat_history: chatHistory,
    documents: docs,
  }

  const normalizedImages = normalizeImagesForCohere(images)
  if (normalizedImages.length) {
    payloadLegacy.images = normalizedImages
  }

  if (!safeText(message) && !payloadLegacy.images?.length) {
    throw new Error('Missing message content for Cohere chat')
  }

  const respLegacy = await cohereClient.chat(payloadLegacy)
  respLegacy.__text = cohereResponseToText(respLegacy)
  respLegacy.__format = 'legacy'
  return respLegacy
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

function safeErrorDetails(err) {
  try {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return safeLine(err).slice(0, 400) || 'Unknown error'

    const parts = []
    const msg = safeLine(err?.message || '')
    if (msg) parts.push(msg)

    const responseData = err?.response?.body ?? err?.response?.data ?? err?.body ?? err?.data
    if (typeof responseData === 'string') {
      parts.push(responseData)
    } else if (responseData && typeof responseData === 'object') {
      try {
        parts.push(JSON.stringify(responseData))
      } catch {}
    }

    const text = parts.filter(Boolean).join(' | ')
    return safeLine(text).slice(0, 400) || 'Unknown error'
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

    // Accept multiple possible shapes
    const imageInput = body?.image || body?.imageBase64 || body?.image_url || body?.imageDataUrl || body?.image_data
    const hasImage = Boolean(imageInput)

    // ✅ Validate/normalize image before processing
    let imageBase64 = null
    let imageMediaType = null
    let fullDataUrl = null

    if (hasImage) {
      const validation = validateImageData(imageInput)

      if (!validation.valid) {
        logger.warn('Invalid image data', { error: validation.error })
        return NextResponse.json({ error: `Image validation failed: ${validation.error}` }, { status: 400 })
      }

      imageBase64 = validation.base64Data
      imageMediaType = validation.mediaType
      fullDataUrl = validation.dataUrl

      logger.info('Image validated', {
        mediaType: imageMediaType,
        dataLength: imageBase64.length,
      })
    }

    const lastUserIndex = Array.isArray(messages)
      ? messages
          .slice()
          .reverse()
          .findIndex((m) => m?.role === 'user' && typeof m?.content === 'string')
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
      userMessage = 'Please inspect the attached image for potential food safety violations based on county regulations.'
    }

    if (!userMessage) {
      return NextResponse.json({ error: 'Missing user message' }, { status: 400 })
    }

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

    // Placeholder for future image-derived search cues
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
    const preambleParts = [
      systemPrompt,
      systemHistoryPreamble,
      excerptBlock ? `Reference documents:\n${excerptBlock}` : '',
      'Cite document IDs (e.g., DOC_1) and regulation sections from the text when applicable.',
    ].filter(Boolean)
    const preamble = preambleParts.join('\n\n')

    // ========================================================================
    // GENERATE RESPONSE (FIXED IMAGE PASS-THROUGH FOR COHERE VISION)
    // ========================================================================

    let modelText = ''
    let assistantMessage = ''
    let status = 'guidance'
    let usedModel = hasImage ? COHERE_VISION_MODEL : COHERE_TEXT_MODEL
    let billedUnits = {}
    let tokenUsage = {}

    try {
      const buildCohereRequest = (model) => {
        const visionImages = hasImage && fullDataUrl ? [fullDataUrl] : []

        if (hasImage && visionImages.length === 0) {
          throw new Error('Image payload missing after validation')
        }

        const requestPayload = {
          model,
          message: userMessage,
          chatHistory: cohereChatHistory,
          preamble,
          documents: contextDocs.map((doc) => ({
            id: doc.id || 'unknown',
            title: doc.source || 'Source',
            snippet: doc.text || '',
            text: doc.text || '',
          })),
          images: visionImages,
        }

        if (hasImage && fullDataUrl) {
          logger.info('Vision request prepared', {
            mediaType: imageMediaType,
            dataLength: imageBase64?.length || 0,
            dataUrlPrefix: fullDataUrl.slice(0, 30),
            model,
            imagesAttached: visionImages.length,
          })
        }

        return requestPayload
      }

      const req = buildCohereRequest(usedModel)
      const answerResp = await withTimeout(callCohereChat(req), ANSWER_TIMEOUT_MS, 'ANSWER_TIMEOUT')

      billedUnits = answerResp?.billed_units || {}
      tokenUsage = answerResp?.tokens || {}

      modelText = answerResp?.__text || answerResp?.text || responseOutputToString(answerResp) || ''
      assistantMessage = sanitizeOutput(modelText || 'Unable to process request. Please try again.')

      if (hasImage) {
        logger.info('Vision response received', {
          model: usedModel,
          responseLength: assistantMessage.length,
          hasImage: true,
          payloadFormat: answerResp?.__format || 'unknown',
        })
      }
    } catch (e) {
      const detail = safeErrorDetails(e)
      logger.error('Generation failed', {
        error: e?.message,
        detail,
        hasImage,
        model: usedModel,
      })
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
        message: assistantMessage,
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
