// app/api/chat/route.js
import OpenAI from 'openai'
import { logUsageForAnalytics } from '@/lib/usage'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { searchDocuments } from '@/lib/searchDocs'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ✅ Main model - GPT-5.2
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.2'

// Output controls
const GENERATION_CONFIG = {
  reasoningEffort: 'high',
  maxOutputTokensByEffort: {
    low: 1600,
    medium: 2400,
    high: 3400,
  },
}

const VISION_CONFIG = {
  reasoningEffort: 'low',
  maxOutputTokens: 700,
}

const MAX_CONTEXT_LENGTH = 22000
const MAX_IMAGE_SIZE_MB = 10

// Timeouts
const VISION_TIMEOUT = 12000
const GENERATION_TIMEOUT = 30000

// ✅ Rate limiting (in-memory best-effort)
const rateLimits = new Map()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20 // per minute per user
let lastRateLimitCleanupAt = 0

function cleanupRateLimits(now) {
  // clean up at most once every 5 minutes (avoid setInterval in serverless)
  if (now - lastRateLimitCleanupAt < 5 * 60 * 1000) return
  lastRateLimitCleanupAt = now

  for (const [userId, requests] of rateLimits.entries()) {
    const recent = (requests || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (recent.length === 0) rateLimits.delete(userId)
    else rateLimits.set(userId, recent)
  }
}

function checkRateLimit(userId) {
  const now = Date.now()
  cleanupRateLimits(now)

  const userRequests = rateLimits.get(userId) || []
  const recentRequests = userRequests.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    logger.security('Rate limit exceeded', { userId, requestCount: recentRequests.length })
    return false
  }

  recentRequests.push(now)
  rateLimits.set(userId, recentRequests)
  return true
}

const timeoutPromise = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

function normalizeEffort(effort) {
  const v = String(effort || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '')

  if (v === 'xhigh') return 'high'
  if (v === 'high' || v === 'medium' || v === 'low') return v
  if (v === 'none') return 'low'
  return 'high'
}

function getTokenBudgetForEffort(effort) {
  const e = normalizeEffort(effort)
  return (
    GENERATION_CONFIG.maxOutputTokensByEffort?.[e] ||
    GENERATION_CONFIG.maxOutputTokensByEffort.high ||
    3400
  )
}

function sanitizeInput(input, maxLength = 4000) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/\0/g, '')
    .replace(/[\u202A-\u202E]/g, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .trim()
    .substring(0, maxLength)
}

function getHistoryContext(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return ''
  const history = messages.slice(-7, -1)
  return history
    .map((m) => {
      const role = m.role === 'user' ? 'USER' : 'AI_ASSISTANT'
      const imgNote = m.image ? '[User uploaded an image here]' : ''
      return `${role}: ${m.content} ${imgNote}`.trim()
    })
    .join('\n\n')
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages.slice(-10).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeInput(msg.content),
    image: msg.image || null,
  }))
}

function validateImage(base64String) {
  if (!base64String) return null
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  const cleanBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String

  if (!base64Regex.test(cleanBase64)) throw new Error('Invalid image format')

  const sizeInBytes = (cleanBase64.length * 3) / 4
  if (sizeInBytes > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large (Max ${MAX_IMAGE_SIZE_MB}MB)`)
  }
  return cleanBase64
}

function extractConfidence(text) {
  const t = typeof text === 'string' ? text : ''
  const match = t.match(/^\s*\[CONFIDENCE:\s*(HIGH|MEDIUM|LOW)\]\s*/i)
  if (match) {
    return {
      confidence: match[1].toUpperCase(),
      text: t.replace(match[0], '').trim(),
    }
  }
  return { confidence: 'UNKNOWN', text: (t || '').trim() }
}

function stripMarkdownHeadings(text) {
  if (!text) return text
  return text.replace(/^#{1,6}\s+/gm, '')
}

function cleanModelText(text) {
  if (!text) return ''
  return stripMarkdownHeadings(
    text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/\r/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function ensureConfidenceLine(confidence, cleanText) {
  const c = confidence === 'HIGH' || confidence === 'MEDIUM' || confidence === 'LOW' ? confidence : 'MEDIUM'
  return { confidence: c, message: cleanText }
}

function ensureThreeSections(text) {
  const safe = (text || '').trim()
  if (!safe) return safe

  const hasLikely = /(^|\n)Likely issues \(visible\):/i.test(safe)
  const hasDoNow = /(^|\n)What to do now:/i.test(safe)
  const hasConfirm = /(^|\n)Need to confirm:/i.test(safe)

  if (hasLikely && hasDoNow && hasConfirm) return safe

  const lines = safe
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const bullets = lines.filter((l) => l.startsWith('-'))
  const nonBullets = lines.filter((l) => !l.startsWith('-'))

  const likely = bullets.slice(0, 3)
  const doNow = bullets.slice(3, 6)
  const confirm = bullets.slice(6, 9)

  const repaired = [
    'Likely issues (visible):',
    ...(likely.length ? likely : ['- (none listed)']),
    '',
    'What to do now:',
    ...(doNow.length ? doNow : ['- (none listed)']),
    '',
    'Need to confirm:',
    ...(confirm.length ? confirm : ['- Ask manager / verify temps / verify sanitizer with test strips']),
  ].join('\n')

  if (nonBullets.length > 0) {
    return repaired + '\n- ' + nonBullets.join(' ').slice(0, 240)
  }

  return repaired
}

function normalizeBulletCounts(text) {
  const sections = [
    { name: 'Likely issues (visible):', max: 4 },
    { name: 'What to do now:', max: 4 },
    { name: 'Need to confirm:', max: 4 },
  ]

  let out = text
  for (const s of sections) {
    const re = new RegExp(`(${escapeRegExp(s.name)}\\n)([\\s\\S]*?)(\\n\\n|$)`, 'i')
    out = out.replace(re, (_, header, body, tail) => {
      const lines = body.split('\n').filter((l) => l.trim().length > 0)
      const bullets = lines.filter((l) => l.trim().startsWith('-')).slice(0, s.max)
      const fallback = bullets.length ? bullets : ['- (none)']
      return header + fallback.join('\n') + (tail || '\n\n')
    })
  }
  return out.trim()
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * ✅ PINNED CONTEXT (2 docs first)
 * These two documents define how Washtenaw categorizes violations (P/Pf/Core + correction windows)
 * and the high-level enforcement framework (imminent health hazard / progressive enforcement).
 * Source docs:
 * - "Violation Types | Washtenaw County, MI" :contentReference[oaicite:1]{index=1}
 * - "Enforcement Action | Washtenaw County, MI" :contentReference[oaicite:2]{index=2}
 */
const PINNED_WASHTENAW_CONTEXT = `
WASHTENAW VIOLATION TYPES + CORRECTION WINDOWS (Violation Types):
- Violations are categorized as Priority (P), Priority Foundation (Pf), or Core.
- Priority: most directly reduces foodborne illness hazards (examples include temps, handwashing).
- Priority Foundation: supports Priority compliance (examples include thermometer, sanitizer test strips, hand soap/paper towels).
- Core: general sanitation / facility maintenance (examples include dirty floors, lighting, disrepair).
- Priority + Priority Foundation must be corrected immediately at inspection or within ~10 days; Core within ~90 days.

WASHTENAW ENFORCEMENT ACTION OVERVIEW (Enforcement Action):
- Summary enforcement is used when violations pose an imminent health hazard (examples include no water/power, sewage backup, severe pest infestation, fire/flood, outbreak, or other immediate danger).
- In imminent health hazard situations, the operation can be ordered closed and may reopen only after correcting issues.
- Progressive enforcement: license holders are typically given multiple opportunities to correct via inspection/follow-up, then conference/hearing steps before license limitation/suspension/revocation; formal appeal may be available.
`.trim()

async function callResponses({ model, instructions, input, reasoningEffort, maxOutputTokens, timeoutMs }) {
  const effort = normalizeEffort(reasoningEffort)

  const req = openai.responses.create({
    model,
    instructions,
    input,
    reasoning: { effort },
    max_output_tokens: maxOutputTokens,
  })

  const resp = await Promise.race([req, timeoutPromise(timeoutMs, 'OPENAI_TIMEOUT')])

  const outputText = typeof resp?.output_text === 'string' ? resp.output_text.trim() : ''
  const status = resp?.status || null

  return { resp, outputText, status, effort }
}

function fallbackAnswer(reason = 'Temporary model output issue. Please retry.') {
  return [
    '[CONFIDENCE: LOW]',
    '',
    'Likely issues (visible):',
    '- (none listed)',
    '',
    'What to do now:',
    `- ${reason}`,
    '',
    'Need to confirm:',
    '- Retry the request. If it keeps failing, shorten the photo set or ask a more specific question.',
  ].join('\n')
}

export async function POST(req) {
  const requestId = randomUUID()
  const startTime = Date.now()

  logger.info('Chat request started', { requestId })

  try {
    const serviceEnabled = await isServiceEnabled()
    if (!serviceEnabled) {
      const message = await getMaintenanceMessage()
      return NextResponse.json({ error: message, maintenance: true }, { status: 503 })
    }

    if (!validateCSRF(req)) {
      logger.security('CSRF validation failed in chat', { requestId })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 12 * 1024 * 1024) {
      logger.warn('Payload too large', { requestId, size: contentLength })
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = await req.json()

    const requestedEffort = normalizeEffort(
      body?.reasoningEffort || body?.settings?.reasoningEffort || GENERATION_CONFIG.reasoningEffort
    )

    const messages = validateMessages(body.messages || [])
    const historyText = getHistoryContext(messages)
    const lastMsgObj = messages[messages.length - 1] || {}
    let lastMessageText = lastMsgObj.content || ''

    let imageBase64 = null
    try {
      if (body.image) imageBase64 = validateImage(body.image)
    } catch (e) {
      logger.warn('Image validation failed', { requestId, error: e.message })
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // ✅ PHOTO-ONLY MODE: if an image exists and user typed nothing, auto-scan
    if (imageBase64 && (!lastMessageText || !lastMessageText.trim())) {
      lastMessageText =
        'Auto-scan this photo for possible food safety / sanitation violations and operational risks. ' +
        'Report what you can see, the likelihood it’s a violation, and what to do next.'
      if (messages.length > 0) {
        messages[messages.length - 1].content = lastMessageText
      }
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    if (imageBase64) {
      const { data: imageFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_name', 'image_analysis_enabled')
        .maybeSingle()

      if (imageFlag?.enabled === false) {
        return NextResponse.json(
          { error: 'Image analysis is temporarily disabled.', code: 'IMAGE_DISABLED' },
          { status: 503 }
        )
      }
    }

    const chatId = body.chatId || null
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = !!user && !!adminEmail && user.email === adminEmail

    // ✅ Rate limiting (non-admin only)
    if (user && !isAdmin) {
      if (!checkRateLimit(user.id)) {
        logger.security('Rate limit exceeded for user', { userId: user.id, requestId })
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment before trying again.', code: 'RATE_LIMIT_EXCEEDED' },
          { status: 429 }
        )
      }
    }

    // ✅ Auth/subscription gates (non-admin only)
    if (user && !isAdmin) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms')
        .eq('id', user.id)
        .single()

      if (!profile?.accepted_terms) {
        return NextResponse.json({ error: 'Terms not accepted' }, { status: 403 })
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()

      let hasActiveSub = false
      if (sub && ['active', 'trialing'].includes(sub.status) && new Date(sub.current_period_end) > new Date()) {
        hasActiveSub = true
      }

      if (!hasActiveSub) {
        const { data: recentCheckout } = await supabase
          .from('checkout_attempts')
          .select('created_at, stripe_session_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recentCheckout && Date.now() - new Date(recentCheckout.created_at).getTime() < 300000) {
          const { data: completedSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle()

          if (completedSub) hasActiveSub = true
        }
      }

      if (!hasActiveSub) {
        return NextResponse.json({ error: 'Subscription required', code: 'NO_ACTIVE_SUBSCRIPTION' }, { status: 402 })
      }

      try {
        await logUsageForAnalytics(user.id, { isImage: !!imageBase64 })
      } catch (err) {
        if (err?.code === 'NO_SUBSCRIPTION' || err?.code === 'SUB_EXPIRED') {
          return NextResponse.json({ error: 'Subscription required or expired.', code: err.code }, { status: 402 })
        }
        if (err?.code === 'USAGE_LIMIT_REACHED') {
          logger.warn('Usage limit reached for user', { requestId, userId: user.id, meta: err.meta || null })
          return NextResponse.json(
            {
              error: 'Monthly usage limit reached for your plan. Contact support if you need a higher limit.',
              code: 'USAGE_LIMIT_REACHED',
            },
            { status: 429 }
          )
        }
        logger.error('Usage logging failed', { requestId, error: err?.message || 'unknown' })
      }
    }

    // 1) Vision → short visible description (for searchTerms)
    let searchTerms = ''
    if (imageBase64) {
      logger.info('Vision analysis started', { requestId })
      try {
        const visionInput = [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Write a short, plain description (2–6 bullets). No headings.' },
              { type: 'input_image', image_url: `data:image/jpeg;base64,${imageBase64}` },
            ],
          },
        ]

        const { outputText } = await callResponses({
          model: OPENAI_CHAT_MODEL,
          instructions:
            'Describe only what is visible in this restaurant photo. Focus on cleanliness/buildup, storage order, separation, labeling, and obvious contamination risks. No guesses. No markdown.',
          input: visionInput,
          reasoningEffort: VISION_CONFIG.reasoningEffort,
          maxOutputTokens: VISION_CONFIG.maxOutputTokens,
          timeoutMs: VISION_TIMEOUT,
        })

        searchTerms = (outputText || '').trim()
        logger.info('Vision analysis completed', { requestId, length: searchTerms.length })
      } catch (visionError) {
        logger.error('Vision analysis failed', { requestId, error: visionError.message })
        searchTerms = lastMessageText || 'food safety sanitation cleanliness'
      }
    } else {
      searchTerms = lastMessageText || 'food safety code'
    }

    // 2) Retrieval → dynamic context (other docs)
    let dynamicContext = ''
    let retrievalStatus = 'NOT_ATTEMPTED'
    if (searchTerms) {
      logger.info('Document search started', { requestId })
      let searchResults = []
      try {
        const searchQuery = [
          searchTerms,
          'Washtenaw County',
          'Priority Priority Foundation Core',
          'correction windows 10 days 90 days',
          'enforcement action imminent health hazard',
          'Michigan Modified Food Code',
        ].join(' | ')

        searchResults = await searchDocuments(searchQuery, 'washtenaw', 30)
        retrievalStatus = 'OK'
      } catch (err) {
        retrievalStatus = 'FAILED'
        logger.error('Search failed', { requestId, error: err.message })
      }

      let normalizedResults = []
      if (Array.isArray(searchResults)) normalizedResults = searchResults
      else if (Array.isArray(searchResults?.results)) normalizedResults = searchResults.results
      else if (Array.isArray(searchResults?.matches)) normalizedResults = searchResults.matches

      if (normalizedResults.length > 0) {
        // Optional: prioritize chunks that came from the two pinned docs (if present in DB results too)
        const pinnedSourceHints = ['Violation Types', 'Enforcement Action']
        normalizedResults.sort((a, b) => {
          const aSrc = String(a.source || a.metadata?.source || a.title || '')
          const bSrc = String(b.source || b.metadata?.source || b.title || '')
          const aPinned = pinnedSourceHints.some((h) => aSrc.toLowerCase().includes(h.toLowerCase()))
          const bPinned = pinnedSourceHints.some((h) => bSrc.toLowerCase().includes(h.toLowerCase()))
          if (aPinned !== bPinned) return aPinned ? -1 : 1
          return (b.score || b.similarity || 0) - (a.score || a.similarity || 0)
        })

        dynamicContext = normalizedResults
          .map((doc) => {
            const text = doc.text || doc.content || doc.chunk || ''
            if (!text || !text.trim()) return ''
            const source =
              doc.source || doc.metadata?.source || doc.document_name || doc.title || 'Washtenaw food code'
            return `[SOURCE: ${source}]\n${text}`
          })
          .filter(Boolean)
          .join('\n\n')

        logger.info('Search completed', { requestId, resultsCount: normalizedResults.length })
      } else {
        logger.warn('No search results; dynamic context empty', { requestId })
        retrievalStatus = retrievalStatus === 'FAILED' ? 'FAILED' : 'EMPTY'
      }
    }

    // ✅ Pinned context ALWAYS first; dynamic context appended
    const fullContext = `${PINNED_WASHTENAW_CONTEXT}\n\n${dynamicContext || ''}`.trim()

    // If somehow everything is empty (shouldn’t happen), refuse
    if (!fullContext) {
      logger.warn('No regulatory context at all; refusing to answer', { requestId, searchTerms })
      return NextResponse.json(
        {
          error:
            'ProtocolLM could not find relevant food code passages for this request. ' +
            'To avoid answering from general AI training data, no answer will be provided. ' +
            'Please try rephrasing your question.',
          code: 'NO_DOCUMENT_CONTEXT',
        },
        { status: 503 }
      )
    }

    const clippedContext =
      fullContext.length > MAX_CONTEXT_LENGTH ? fullContext.slice(0, MAX_CONTEXT_LENGTH) : fullContext

    const SYSTEM_PROMPT = `You are ProtocolLM, a food-safety assistant for restaurants in Washtenaw County, Michigan.

Hard rules:
- Use ONLY the provided OFFICIAL REGULATORY CONTEXT. If it doesn't support a claim, put it under "Need to confirm".
- For photos: describe ONLY what is visible. No guessing (no temps, no dates, no sanitizer ppm unless visible).
- NO markdown headings. Do NOT use # or ## anywhere.
- Keep the whole answer short and scannable for an entry-level employee.

Very important:
- When you list a likely issue, tag it as (P), (Pf), or (Core) ONLY if the context supports it.
- If the category is not supported by the context, do NOT guess — put it in "Need to confirm".
- Add a likelihood tag to EACH bullet in "Likely issues (visible)":
  [LIKELIHOOD: HIGH (~70–90%)] or [LIKELIHOOD: MED (~40–70%)] or [LIKELIHOOD: LOW (~10–40%)].
  Use HIGH only when the photo evidence is very clear.
- If something looks like an imminent health hazard scenario, say "Stop and get a manager" and recommend pausing until corrected/verified.

Output format (MANDATORY):
Line 1: [CONFIDENCE: HIGH] or [CONFIDENCE: MEDIUM] or [CONFIDENCE: LOW]
Then EXACTLY these 3 sections, each 1–4 bullets max:

Likely issues (visible):
- [LIKELIHOOD: ...] (P/Pf/Core if supported) ...
What to do now:
- ...
Need to confirm:
- ...

Citations:
- Do NOT cite sources by default.
- Only include citations if the user explicitly asks ("cite") OR if confidence is LOW.

Tone:
- Calm, direct, operational.
- Avoid absolutes like "will fail inspection".`

    const finalUserPrompt = `OFFICIAL REGULATORY CONTEXT (PINNED FIRST, THEN OTHER DOCS):
${clippedContext}

RETRIEVAL STATUS:
${retrievalStatus}

CHAT HISTORY:
${historyText || 'None.'}

USER QUERY:
${lastMessageText || '[No additional text provided. Base your answer on the image and context.]'}

${imageBase64 ? `VISIBLE DESCRIPTION (from vision):
${searchTerms}` : ''}`

    logger.info('Generating response', { requestId, reasoningEffort: requestedEffort })

    const generationInput = [{ role: 'user', content: finalUserPrompt }]

    let rawText = ''
    let usedEffort = requestedEffort

    try {
      const firstBudget = getTokenBudgetForEffort(requestedEffort)

      const first = await callResponses({
        model: OPENAI_CHAT_MODEL,
        instructions: SYSTEM_PROMPT,
        input: generationInput,
        reasoningEffort: requestedEffort,
        maxOutputTokens: firstBudget,
        timeoutMs: GENERATION_TIMEOUT,
      })

      rawText = first.outputText || ''
      usedEffort = first.effort

      if (!rawText || rawText.trim().length < 10 || first.status === 'incomplete') {
        logger.warn('Empty/incomplete model output; retrying once', {
          requestId,
          firstStatus: first.status || null,
          firstEffort: first.effort,
          firstLen: rawText ? rawText.length : 0,
        })

        const retryEffort = requestedEffort === 'high' ? 'medium' : 'low'
        const retryBudget = Math.max(getTokenBudgetForEffort(retryEffort), 2600)

        const retry = await callResponses({
          model: OPENAI_CHAT_MODEL,
          instructions: SYSTEM_PROMPT,
          input: generationInput,
          reasoningEffort: retryEffort,
          maxOutputTokens: retryBudget,
          timeoutMs: GENERATION_TIMEOUT,
        })

        rawText = retry.outputText || ''
        usedEffort = retry.effort
      }
    } catch (e) {
      logger.error('OpenAI generation failed', { requestId, error: e.message })
      const msg = fallbackAnswer(
        e.message === 'OPENAI_TIMEOUT' ? 'Request timed out. Please try again.' : 'Temporary issue. Please try again.'
      )
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    const parsed = extractConfidence(rawText)
    let cleaned = cleanModelText(parsed.text)

    if (!cleaned || cleaned.length < 10) {
      logger.warn('Model output still empty after retry; returning fallback', { requestId, effort: usedEffort })
      const msg = fallbackAnswer('Temporary issue. Please try again.')
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    cleaned = ensureThreeSections(cleaned)
    cleaned = normalizeBulletCounts(cleaned)

    const ensured = ensureConfidenceLine(parsed.confidence, cleaned)

    const duration = Date.now() - startTime
    logger.info('Response generated successfully', {
      requestId,
      durationMs: duration,
      responseLength: ensured.message.length,
      confidence: ensured.confidence,
      reasoningEffortUsed: usedEffort,
    })

    const dbTasks = []
    if (user && chatId && lastMessageText) {
      dbTasks.push(
        supabase.from('messages').insert([
          {
            chat_id: chatId,
            role: 'user',
            content: lastMessageText,
            image: imageBase64 ? 'stored' : null,
          },
          {
            chat_id: chatId,
            role: 'assistant',
            content: ensured.message,
            metadata: { confidence: ensured.confidence, reasoning_effort: usedEffort },
          },
        ])
      )
    }
    await Promise.allSettled(dbTasks)

    return NextResponse.json({ message: ensured.message, confidence: ensured.confidence }, { status: 200 })
  } catch (err) {
    const duration = Date.now() - startTime
    logger.error('Fatal error in chat', { requestId, error: err.message, durationMs: duration })

    const msg = fallbackAnswer('An error occurred. Please try again or contact support.')
    return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
