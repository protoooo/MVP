// app/api/chat/route.js
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { searchDocuments } from '@/lib/searchDocs'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics } from '@/lib/usage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ✅ Best default for “ChatGPT-like” behavior
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.2-chat-latest'

// Reasoning controls (Chat Completions supports reasoning_effort including xhigh) :contentReference[oaicite:3]{index=3}
const VISION_REASONING_EFFORT = process.env.OPENAI_VISION_EFFORT || 'minimal'
const ANSWER_REASONING_EFFORT = process.env.OPENAI_ANSWER_EFFORT || 'xhigh'

const VISION_TIMEOUT_MS = 25000
const ANSWER_TIMEOUT_MS = 35000

const TOPK = 30
const MAX_CONTEXT_CHARS = 80000

// Try to avoid “everything comes from one PDF”
const PER_SOURCE_CAP = 3

// Priority sources: tune these substrings to match your metadata->source values
const PRIORITY_SOURCE_HINTS = [
  { key: 'enforcement', label: 'Enforcement Action', rx: /enforcement/i },
  { key: 'violation_types', label: 'Violation Types', rx: /violation|priority foundation|priority\b|core\b/i },
]

// Fallback queries to force-prime those docs into context if retrieval misses them
const PRIORITY_FALLBACK_QUERIES = {
  enforcement: 'Washtenaw enforcement action immediate 10 days 90 days priority foundation core',
  violation_types: 'Priority Priority Foundation Core violation types definitions Washtenaw',
}

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms)),
  ])
}

function asDataUrl(maybeBase64) {
  if (!maybeBase64 || typeof maybeBase64 !== 'string') return null
  const s = maybeBase64.trim()
  if (!s) return null
  if (s.startsWith('data:image/')) return s
  return `data:image/jpeg;base64,${s}`
}

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

function getLastUserText(messages) {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'user') continue

    if (typeof m.content === 'string') return safeText(m.content)

    if (Array.isArray(m.content)) {
      const t = m.content
        .map((c) => (typeof c === 'string' ? c : c?.text))
        .filter(Boolean)
        .join(' ')
      return safeText(t)
    }
  }
  return ''
}

function clampQuery(q, maxLen = 1800) {
  const s = safeText(q)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

function normalizeSource(src) {
  return safeText(src || 'Unknown')
}

function matchesPriority(source, rx) {
  try {
    return rx.test(source)
  } catch {
    return false
  }
}

function docKey(d) {
  const src = normalizeSource(d?.source)
  const pg = String(d?.page ?? 'N/A')
  const head = safeText(d?.text || '').slice(0, 120)
  return `${src}||${pg}||${head}`
}

function buildSearchQuery(userPrompt, visionSummary, visionSearchTerms) {
  const parts = []
  if (visionSearchTerms) parts.push(visionSearchTerms)
  if (userPrompt) parts.push(userPrompt)
  if (visionSummary) parts.push(visionSummary)
  parts.push('Washtenaw County food code compliance')
  return clampQuery(parts.filter(Boolean).join(' '))
}

async function ensurePriorityDocs(docs, county) {
  const existing = Array.isArray(docs) ? docs : []
  const srcs = new Set(existing.map((d) => normalizeSource(d?.source)))

  const have = {
    enforcement: [...srcs].some((s) => matchesPriority(s, PRIORITY_SOURCE_HINTS[0].rx)),
    violation_types: [...srcs].some((s) => matchesPriority(s, PRIORITY_SOURCE_HINTS[1].rx)),
  }

  const extras = []
  for (const hint of PRIORITY_SOURCE_HINTS) {
    if (hint.key === 'enforcement' && have.enforcement) continue
    if (hint.key === 'violation_types' && have.violation_types) continue

    const q = PRIORITY_FALLBACK_QUERIES[hint.key]
    if (!q) continue

    try {
      logger.info('Priority-doc fallback search', { key: hint.key, county })
      const more = await searchDocuments(q, county, 12)
      if (Array.isArray(more) && more.length) extras.push(...more)
    } catch (e) {
      logger.warn('Priority-doc fallback failed', { key: hint.key, error: e?.message })
    }
  }

  if (!extras.length) return existing

  const seen = new Set(existing.map(docKey))
  const merged = [...existing]
  for (const d of extras) {
    const k = docKey(d)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(d)
  }

  logger.info('Priority-doc merge complete', { before: existing.length, after: merged.length })
  return merged
}

function buildContextString(docs) {
  if (!docs || docs.length === 0) return ''

  // Clean + score sort
  const cleaned = docs
    .filter((d) => d && safeText(d.text))
    .map((d) => ({
      ...d,
      source: normalizeSource(d.source),
      score: typeof d.score === 'number' ? d.score : Number(d.score || 0),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  // Group by source for diversity
  const bySource = new Map()
  for (const d of cleaned) {
    const src = d.source || 'Unknown'
    if (!bySource.has(src)) bySource.set(src, [])
    bySource.get(src).push(d)
  }

  // Order sources:
  // 1) priority docs first (if present)
  // 2) then the rest by best chunk score
  const sources = [...bySource.entries()].map(([src, arr]) => ({
    src,
    arr,
    best: arr[0]?.score || 0,
    isPriority: PRIORITY_SOURCE_HINTS.some((h) => matchesPriority(src, h.rx)),
  }))

  const prioritySources = sources
    .filter((s) => s.isPriority)
    .sort((a, b) => (b.best || 0) - (a.best || 0))

  const otherSources = sources
    .filter((s) => !s.isPriority)
    .sort((a, b) => (b.best || 0) - (a.best || 0))

  const orderedSources = [...prioritySources, ...otherSources]

  let buf = ''
  let usedDocs = 0
  let usedScores = []

  for (const s of orderedSources) {
    const chunks = s.arr.slice(0, PER_SOURCE_CAP)
    for (const doc of chunks) {
      if (buf.length >= MAX_CONTEXT_CHARS) break

      const src = doc.source || 'Unknown'
      const pg = doc.page ?? 'N/A'
      const score = (doc.score || 0).toFixed(3)

      const chunk = `\n\n[SOURCE: ${src} | PAGE: ${pg} | RELEVANCE: ${score}]\n${doc.text}\n`
      if (buf.length + chunk.length > MAX_CONTEXT_CHARS) break

      buf += chunk
      usedDocs++
      usedScores.push(doc.score || 0)
    }
    if (buf.length >= MAX_CONTEXT_CHARS) break
  }

  const avg = usedScores.length ? usedScores.reduce((a, b) => a + b, 0) / usedScores.length : 0

  logger.info('Context built', {
    docsUsed: usedDocs,
    totalChars: buf.length,
    avgScore: avg.toFixed(3),
    uniqueSourcesUsed: new Set(cleaned.slice(0, usedDocs).map((d) => d.source)).size,
  })

  return buf.trim()
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
  }
}

export async function POST(request) {
  const startedAt = Date.now()
  const env = process.env.NODE_ENV || 'unknown'

  try {
    if (!isServiceEnabled()) {
      return NextResponse.json(
        { error: getMaintenanceMessage() || 'Service temporarily unavailable.' },
        { status: 503 }
      )
    }

    try {
      await validateCSRF(request)
    } catch (e) {
      logger.warn('CSRF validation failed', { error: e?.message })
      return NextResponse.json({ error: 'Invalid request.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const county = safeText(body?.county || 'washtenaw') || 'washtenaw'

    const imageDataUrl = asDataUrl(body?.image || body?.imageBase64 || body?.image_url)
    const hasImage = Boolean(imageDataUrl)

    const plan = safeText(body?.plan) || 'unknown'

    // Auth
    let userId = null
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
            set(name, value, options) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name, options) {
              cookieStore.set({ name, value: '', ...options })
            },
          },
        }
      )
      const { data } = await supabase.auth.getUser()
      userId = data?.user?.id || null
    } catch (e) {
      logger.warn('Auth check failed (continuing)', { error: e?.message })
    }

    const lastUserText = getLastUserText(messages)
    const effectiveUserPrompt =
      lastUserText ||
      (hasImage ? 'Analyze this photo for food safety violations in a Washtenaw County food establishment.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // Vision pre-pass (for search terms + a quick neutral description)
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionConfidence = 'low'
    let visionOk = true

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,

            // ✅ Use max_completion_tokens (max_tokens is deprecated/not compatible for these models) :contentReference[oaicite:4]{index=4}
            max_completion_tokens: 650,

            reasoning_effort: VISION_REASONING_EFFORT,

            response_format: { type: 'json_object' },

            messages: [
              {
                role: 'system',
                content:
                  'Return ONLY valid JSON with keys: summary (string), search_terms (string), confidence ("high"|"medium"|"low"). ' +
                  'Be literal: describe everything visible, include equipment, surfaces, food contact areas, storage, chemicals, sinks, temps/labels if visible.',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: effectiveUserPrompt },
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
              },
            ],
          }),
          VISION_TIMEOUT_MS,
          'OPENAI_TIMEOUT'
        )

        const visionText = visionResp.choices[0]?.message?.content || '{}'
        try {
          const parsed = JSON.parse(visionText)
          visionSummary = safeText(parsed.summary || '')
          visionSearchTerms = safeText(parsed.search_terms || '')
          visionConfidence = safeText(parsed.confidence || 'low') || 'low'
        } catch {
          visionSummary = safeText(visionText).slice(0, 650)
        }

        logger.info('Vision analysis complete', { confidence: visionConfidence })
      } catch (e) {
        visionOk = false
        logger.error('Vision analysis failed', { error: e?.message })
      }
    }

    // Build retrieval query (don’t stuff it with enforcement words; we’ll force-inject those docs separately)
    const searchQuery = buildSearchQuery(effectiveUserPrompt, visionSummary, visionSearchTerms)

    logger.info('Document search starting', { queryLength: searchQuery.length, topK: TOPK })

    // Search documents
    let docs = await searchDocuments(searchQuery, county, TOPK)

    // Ensure priority docs are present (Violation Types + Enforcement Action) even if the user asked something else
    docs = await ensurePriorityDocs(docs, county)

    if (!docs || docs.length === 0) {
      logger.warn('No documents retrieved')
      return NextResponse.json(
        {
          message: hasImage
            ? 'I could not find relevant Washtenaw County excerpts for this image. Tell me what area this is (prep line, dish, walk-in, bar, etc.) and what you want checked.'
            : 'I could not find relevant Washtenaw County excerpts for your question. Try rephrasing with a specific topic.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    const context = buildContextString(docs)

    if (!context || context.length < 200) {
      logger.warn('Insufficient context built', { contextLength: context.length })
      return NextResponse.json(
        {
          message:
            'I found some excerpts but they may not match your scenario. Tell me the exact process/food/item and what you want checked.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // ✅ Tight inspector-style system prompt
    const systemPrompt = `
You are protocolLM — a Washtenaw County food safety compliance assistant.

MISSION:
Help food service establishments (restaurants, bars, food trucks, schools, etc.) prevent violations by catching them early.

NON-NEGOTIABLE RULES:
- Use ONLY the REGULATORY EXCERPTS provided below. If you cannot support a claim from excerpts, mark it as "needs context".
- When you state a VIOLATION, you MUST include: (a) the exact excerpt evidence (short quote <= 25 words) and (b) the SOURCE + PAGE shown in brackets.
- Only mention enforcement/timelines (immediate / 10 days / 90 days) IF a violation is identified AND the excerpt supports that timeline. Otherwise say "timeline not specified in excerpts".
- Be concise: no essays. Aim for 6–14 bullets total unless the user asked for detail.
- Be practical: always give a clear fix.

OUTPUT FORMAT (always follow):
1) QUICK VERDICT (1–2 lines): "Clear violations found" OR "No clear violations from excerpts" OR "Needs context"
2) WHAT I SEE (image) OR KEY FACTS (text): 3–7 bullets
3) VIOLATIONS (ONLY IF ANY): numbered list
   Each item:
   - Issue (plain English)
   - Category: Priority / Priority Foundation / Core (ONLY if supported; else "needs context")
   - Timeline: immediate / 10 days / 90 days (ONLY if supported; else "timeline not specified")
   - Evidence: "short quote" — SOURCE, p.PAGE
   - Fix: 1–3 bullets
4) POSSIBLE CONCERNS (NEEDS CONTEXT): only if applicable, 1–4 bullets
5) NEXT BEST ACTION: 1–3 bullets (what to do right now)

REGULATORY EXCERPTS:
${context}
`.trim()

    const userBlock = hasImage
      ? [
          {
            type: 'text',
            text:
              `USER REQUEST: ${effectiveUserPrompt}\n\n` +
              `VISION SUMMARY (may be incomplete): ${visionSummary || 'N/A'}\n` +
              (visionOk ? '' : '\nNOTE: Vision pre-pass failed; rely on the image + excerpts only.'),
          },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]
      : `USER REQUEST: ${effectiveUserPrompt}`

    let formatted = ''
    let answerOk = true

    try {
      const answerResp = await withTimeout(
        openai.chat.completions.create({
          model: OPENAI_CHAT_MODEL,

          // ✅ Use max_completion_tokens (not max_tokens) :contentReference[oaicite:5]{index=5}
          max_completion_tokens: 2200,

          reasoning_effort: ANSWER_REASONING_EFFORT,

          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userBlock },
          ],
        }),
        ANSWER_TIMEOUT_MS,
        'OPENAI_TIMEOUT'
      )

      formatted = answerResp.choices[0]?.message?.content || ''
    } catch (e) {
      answerOk = false
      logger.error('Answer generation failed', { error: e?.message })
    }

    if (!safeText(formatted)) {
      formatted =
        'I encountered an error generating a response. Please try rephrasing your question or providing one more detail about the scenario.'
    }

    await safeLogUsage({
      userId,
      plan,
      mode: hasImage ? 'vision' : 'chat',
      success: Boolean(answerOk),
      durationMs: Date.now() - startedAt,
      county,
    })

    return NextResponse.json(
      {
        message: formatted,
        confidence:
          visionConfidence === 'high' ? 'HIGH' : visionConfidence === 'medium' ? 'MEDIUM' : 'LOW',
        _meta: {
          model: OPENAI_CHAT_MODEL,
          reasoning_effort: ANSWER_REASONING_EFFORT,
          docsRetrieved: docs.length,
          topScore: docs[0]?.score?.toFixed?.(3),
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
