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

// Main model
const OPENAI_CHAT_MODEL = 'gpt-5.2'

// Timeouts (ms)
const VISION_TIMEOUT_MS = 22000
const ANSWER_TIMEOUT_MS = 30000

// Retrieval
const TOPK = 24
const PRIORITY_TOPK = 10

// “Always include” priority sources (fuzzy match)
const PRIORITY_SOURCE_MATCHERS = [
  /violation\s*types/i,
  /enforcement\s*action/i,
  /correction\s*windows/i,
  /washtenaw.*violation/i,
  /washtenaw.*enforcement/i,
]

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
  // If it already looks like data:image/...;base64, keep it.
  if (s.startsWith('data:image/')) return s
  // Otherwise assume raw base64 JPEG.
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
    if (m?.role === 'user') {
      // support either {content:""} or {content:[...]}
      if (typeof m.content === 'string') return safeText(m.content)
      if (Array.isArray(m.content)) {
        // try to pull text chunks
        const t = m.content
          .map((c) => (typeof c === 'string' ? c : c?.text))
          .filter(Boolean)
          .join(' ')
        return safeText(t)
      }
    }
  }
  return ''
}

function extractTextFromOpenAI(resp) {
  // OpenAI Responses SDK usually exposes output_text
  if (resp?.output_text) return String(resp.output_text).trim()
  // Fallback: attempt to read structured output array
  try {
    const parts = resp?.output?.flatMap((o) => o?.content || []) || []
    const text = parts
      .map((p) => p?.text)
      .filter(Boolean)
      .join('\n')
      .trim()
    return text
  } catch {
    return ''
  }
}

function isPrioritySource(source) {
  if (!source) return false
  return PRIORITY_SOURCE_MATCHERS.some((re) => re.test(source))
}

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 3000)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function buildContextString(docs) {
  // Keep context compact-ish; your model can handle more, but don’t send megabytes.
  const MAX_CHARS = 22000
  let buf = ''
  for (const d of docs) {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const chunk = `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${Number(d.score || 0).toFixed(3)}]\n${d.text}\n`
    if ((buf.length + chunk.length) > MAX_CHARS) break
    buf += chunk
  }
  return buf.trim()
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    // Support either object-style or positional-style implementations.
    if (logUsageForAnalytics.length <= 1) {
      await logUsageForAnalytics(payload)
    } else {
      await logUsageForAnalytics(
        payload.userId,
        payload.plan || 'unknown',
        payload.mode || 'chat',
        payload.success === true,
        payload.durationMs || null
      )
    }
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

    // CSRF (non-fatal if your helper throws; but it should block if configured)
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

    // Auth (optional, but keeps your existing behavior)
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

    // If user sent ONLY a photo, default prompt (so they don’t have to type “what do you see?”)
    const effectiveUserPrompt = lastUserText || (hasImage ? 'Analyze this photo for possible food safety / health inspection violations.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // ---------------------------
    // 1) Vision pre-pass (best-effort)
    // ---------------------------
    let visionSummary = ''
    let visionSearchTerms = ''
    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.responses.create({
            model: OPENAI_CHAT_MODEL,
            reasoning_effort: 'low',
            verbosity: 'low',
            max_output_tokens: 450,
            input: [
              {
                role: 'system',
                content: [
                  {
                    type: 'input_text',
                    text:
                      'You are a food-safety inspection assistant. Return STRICT JSON only. ' +
                      'Schema: {"summary":"...", "search_terms":"...", "notable_details":["..."]}. ' +
                      'summary = 1-2 sentences describing what is visible. ' +
                      'search_terms = short keyword string for retrieving relevant regulations (no prose).',
                  },
                ],
              },
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: effectiveUserPrompt },
                  { type: 'input_image', image_url: imageDataUrl },
                ],
              },
            ],
          }),
          VISION_TIMEOUT_MS,
          'OPENAI_TIMEOUT'
        )

        const vt = extractTextFromOpenAI(visionResp)
        try {
          const parsed = JSON.parse(vt)
          visionSummary = safeText(parsed?.summary || '')
          visionSearchTerms = safeText(parsed?.search_terms || '')
        } catch {
          // If model didn’t return JSON, keep a trimmed version as summary
          visionSummary = safeText(vt).slice(0, 400)
          visionSearchTerms = ''
        }

        logger.info('Vision analysis ok', {
          env,
          summaryLen: visionSummary.length,
          searchTermsLen: visionSearchTerms.length,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { env, error: e?.message || String(e) })
        // IMPORTANT: we continue anyway; final answer call will still include the image.
      }
    }

    // ---------------------------
    // 2) Retrieval (vector search)
    // ---------------------------
    const retrievalQuery =
      safeText(
        [
          visionSearchTerms || '',
          effectiveUserPrompt || '',
          // force relevant “classification” concepts into retrieval
          'Priority Priority-Foundation Core violation correction window enforcement action Washtenaw',
        ]
          .filter(Boolean)
          .join('\n')
      ) || 'food safety violations Washtenaw'

    logger.info('Document search started', {
      env,
      county,
      queryLength: retrievalQuery.length,
      topK: TOPK,
    })

    let docs = await searchDocuments(retrievalQuery, county, TOPK)

    // Ensure priority docs appear: if not enough priority hits, do a small priority pull and merge
    const priorityHits = (docs || []).filter((d) => isPrioritySource(d.source)).length
    if (priorityHits < 4) {
      const priorityQuery =
        'WASHTENAW Violation Types correction windows Priority Priority-Foundation Core Enforcement Action'
      const extra = await searchDocuments(priorityQuery, county, PRIORITY_TOPK)
      docs = dedupeByText([...(extra || []), ...(docs || [])])
    }

    // Boost priority sources to the top (without deleting relevance ordering entirely)
    docs.sort((a, b) => {
      const ap = isPrioritySource(a.source) ? 1 : 0
      const bp = isPrioritySource(b.source) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const context = buildContextString(docs)

    if (!context) {
      // Your product philosophy: don’t answer without regulatory context
      return NextResponse.json(
        {
          message:
            'I couldn’t retrieve any relevant Washtenaw documents for this request. Please try again, or re-upload the photo with a clearer close-up and re-run.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // ---------------------------
    // 3) Final answer (ALWAYS include image if provided)
    // ---------------------------
    const systemPrompt = `
You are ProtocolLM: a Washtenaw County food-safety compliance assistant.
Rules:
- Use ONLY the provided "REGULATORY EXCERPTS" for claims about rules, categories (Priority/Pf/Core), time windows, etc.
- You MAY describe what is visible in the photo directly.
- If the photo is unclear, say what is unclear and what you would need to confirm.
- Provide probabilities as ranges for each suspected issue (e.g., 70–90%).
- Do NOT ask "what do you see?" — assume the user wants you to proactively find issues.

Output format (exact sections, concise):
Likely issues (visible):
- (Priority|Pf|Core|Unclear) [ODDS: xx–yy%] <one-sentence issue + why, based on photo + excerpts>

What to do now:
- <action steps>

Need to confirm:
- <questions to raise certainty>

Only include a "Sources used:" section if the user explicitly asks for citations or sources.
`.trim()

    const userBlock = `
USER REQUEST:
${effectiveUserPrompt || '[No additional text provided]'}

VISION SUMMARY (may be empty if the pre-pass timed out):
${visionSummary || '[none]'}

REGULATORY EXCERPTS:
${context}
`.trim()

    let finalText = ''
    try {
      logger.info('Generating response', { env })

      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_CHAT_MODEL,
          reasoning_effort: 'high',
          verbosity: 'low',
          max_output_tokens: 900,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: systemPrompt }],
            },
            {
              role: 'user',
              content: hasImage
                ? [
                    { type: 'input_text', text: userBlock },
                    // ✅ CRITICAL FIX: include image here too, so we can still answer if the vision pre-pass timed out
                    { type: 'input_image', image_url: imageDataUrl },
                  ]
                : [{ type: 'input_text', text: userBlock }],
            },
          ],
        }),
        ANSWER_TIMEOUT_MS,
        'OPENAI_TIMEOUT'
      )

      finalText = extractTextFromOpenAI(answerResp)
    } catch (e) {
      logger.error('Answer generation failed', { env, error: e?.message || String(e) })
      return NextResponse.json(
        {
          message: 'The analysis timed out. Please try again (or re-send 1–2 clearer angles).',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // Non-blocking usage log (prevents your “plan null” from killing responses)
    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        message: finalText || 'No response text returned.',
        confidence: 'MEDIUM',
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
