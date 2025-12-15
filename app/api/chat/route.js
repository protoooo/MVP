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

const OPENAI_CHAT_MODEL = 'gpt-5.2'
const VISION_TIMEOUT_MS = 30000
const ANSWER_TIMEOUT_MS = 45000
const TOPK = 24
const PRIORITY_TOPK = 10

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
  if (s.startsWith('data:image/')) return s
  return `data:image/jpeg;base64,${s}`
}

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

function safeArray(x) {
  if (!Array.isArray(x)) return []
  return x.map((v) => safeText(String(v))).filter(Boolean)
}

function getLastUserText(messages) {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user') {
      if (typeof m.content === 'string') return safeText(m.content)
      if (Array.isArray(m.content)) {
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
  if (resp?.output_text) return String(resp.output_text).trim()
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

function getDocSourceString(d) {
  const src =
    d?.source ||
    d?.metadata?.source ||
    d?.metadata?.filename ||
    d?.metadata?.title ||
    ''
  return safeText(String(src || ''))
}

// ✅ Treat “priority” as source OR filename OR early text (handles null/unknown source)
function isPriorityDoc(d) {
  const src = getDocSourceString(d)
  const textHead = safeText((d?.text || '').slice(0, 3000))
  const hay = `${src}\n${textHead}`
  return PRIORITY_SOURCE_MATCHERS.some((re) => re.test(hay))
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
  const MAX_CHARS = 60000
  let buf = ''
  for (const d of docs) {
    const src = getDocSourceString(d) || 'Unknown'
    const pg = d?.page ?? d?.metadata?.page ?? 'N/A'
    const score = Number(d?.score || 0)
    const chunk = `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${Number.isFinite(score) ? score.toFixed(3) : '0.000'}]\n${d?.text || ''}\n`
    if ((buf.length + chunk.length) > MAX_CHARS) break
    buf += chunk
  }
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

function buildClarifyingFallback({
  scene = 'unknown',
  visionSummary = '',
  clarify = [],
  hasImage = false,
}) {
  const sceneLine =
    scene && scene !== 'unknown'
      ? `This looks like **${scene}**.`
      : 'This environment is unclear from the photo.'

  const summaryLine = visionSummary ? `- ${visionSummary}` : '- (No vision summary available)'

  const clarifyQs = (clarify?.length ? clarify : [
    'What area is this (kitchen line, dish, walk-in, storage, front counter, food truck, delivery/transport vehicle)?',
    'Is any food (open or packaged) being stored/handled/transported here?',
  ]).slice(0, 2)

  // Keep your same format, but allow N/A classification when context is non-food/unclear
  return `**Likely issues (visible):**
- **(N/A)** [ODDS: 0–20%] No clear food-handling violation is confirmed from this image alone. ${sceneLine}

**Correction windows:**
- Priority/Priority Foundation: Fix immediately or within 10 days
- Core: Fix within 90 days

**What to do now:**
1. If this is a food-handling area or food transport, re-take the photo closer to the food/contact surfaces (2 angles).
2. If food is present, keep it **covered**, **protected from contamination**, and **temperature-controlled** until confirmed compliant.

**Need to confirm:**
- ${clarifyQs[0]}
- ${clarifyQs[1] || 'Is this an active food area right now (during prep/service)?'}

(Internal note: Vision ran=${hasImage ? 'yes' : 'no'} | Summary: ${summaryLine})`
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

    // ✅ Fix analytics insert plan=null (safe default)
    const plan =
      safeText(body?.plan) ||
      safeText(body?.subscriptionPlan) ||
      safeText(body?.tier) ||
      'unknown'

    const imageDataUrl = asDataUrl(body?.image || body?.imageBase64 || body?.image_url)
    const hasImage = Boolean(imageDataUrl)

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

    // ✅ Stronger default prompt: not just kitchens
    const effectiveUserPrompt =
      lastUserText ||
      (hasImage
        ? 'Analyze this photo for possible food safety / health inspection violations. Consider non-kitchen contexts too: dish area, walk-ins, storage, front counter/POS, food trucks, and food transport/delivery vehicles.'
        : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // ------------------------
    // Vision pre-pass (now includes scene + food-context + clarify questions)
    // ------------------------
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionIssues = []
    let visionScene = 'unknown'
    let visionFoodContext = 'unclear' // "yes" | "no" | "unclear"
    let visionClarify = []

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.responses.create({
            model: OPENAI_CHAT_MODEL,
            reasoning: { effort: 'high' },
            text: { verbosity: 'low' },
            max_output_tokens: 900,
            input: [
              {
                role: 'system',
                content: [
                  {
                    type: 'input_text',
                    text:
                      'You are a food-safety inspection assistant. Return ONLY valid JSON. Schema: {"summary":"...", "search_terms":"...", "issues_spotted":["..."], "scene":"kitchen|dish|walk-in|storage|front_counter|food_truck|vehicle_transport|outdoors|unknown", "food_context":"yes|no|unclear", "clarify":["...","..."]}. No markdown. No code blocks. Raw JSON only.',
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
          let jsonText = vt.trim()
          const jsonMatch = vt.match(/```json\s*([\s\S]*?)\s*```/) || vt.match(/\{[\s\S]*\}/)
          if (jsonMatch) jsonText = jsonMatch[1] || jsonMatch[0]

          const parsed = JSON.parse(jsonText)

          visionSummary = safeText(parsed?.summary || '')
          visionSearchTerms = safeText(parsed?.search_terms || '')
          visionIssues = safeArray(parsed?.issues_spotted)

          const scene = safeText(parsed?.scene || '')
          visionScene = scene || 'unknown'

          const fc = safeText(parsed?.food_context || '')
          visionFoodContext = fc || 'unclear'

          visionClarify = safeArray(parsed?.clarify)
        } catch (parseError) {
          logger.warn('JSON parse failed, using raw text', { error: parseError.message })
          visionSummary = safeText(vt).slice(0, 500)
          visionSearchTerms = ''
          visionIssues = []
          visionScene = 'unknown'
          visionFoodContext = 'unclear'
          visionClarify = []
        }

        logger.info('Vision analysis ok', {
          env,
          summaryLen: visionSummary.length,
          searchTermsLen: visionSearchTerms.length,
          issuesCount: visionIssues.length,
          scene: visionScene,
          foodContext: visionFoodContext,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { env, error: e?.message || String(e) })
      }
    }

    // ------------------------
    // Retrieval (still prioritizes your 2 key docs, but keeps full corpus available)
    // ------------------------
    const retrievalQuery =
      safeText(
        [
          visionSearchTerms || '',
          effectiveUserPrompt || '',
          // Always include these anchor terms so the two key docs stay in play:
          'Violation Types Washtenaw County Enforcement Action Priority Priority-Foundation Core correction window 10 days 90 days imminent hazard',
          // If the scene suggests transport/FOH/dish/etc, help retrieval:
          visionScene ? `scene:${visionScene}` : '',
          visionFoodContext ? `food_context:${visionFoodContext}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      ) || 'Violation Types Enforcement Action Washtenaw County'

    logger.info('Document search started', { env, county, queryLength: retrievalQuery.length, topK: TOPK })

    let docs = await searchDocuments(retrievalQuery, county, TOPK)
    docs = dedupeByText(docs || [])

    const priorityHits = (docs || []).filter((d) => isPriorityDoc(d)).length
    if (priorityHits < 2) {
      logger.warn('Priority docs missing, fetching manually', { priorityHits })

      const priorityQuery =
        'Violation Types Priority Foundation Core correction window Enforcement Action Washtenaw County'
      const extra = await searchDocuments(priorityQuery, county, PRIORITY_TOPK)

      if (extra && extra.length > 0) {
        docs = dedupeByText([...extra, ...(docs || [])])
        logger.info('Added priority docs via fallback', { count: extra.length })
      }
    }

    // Priority first, then score
    docs.sort((a, b) => {
      const ap = isPriorityDoc(a) ? 1 : 0
      const bp = isPriorityDoc(b) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b?.score || 0) - (a?.score || 0)
    })

    const context = buildContextString(docs)

    if (!context) {
      // Still respond (don’t return “no docs” dead-end)
      const fallback = buildClarifyingFallback({
        scene: visionScene,
        visionSummary,
        clarify: visionClarify,
        hasImage,
      })

      await safeLogUsage({
        userId,
        plan,
        mode: hasImage ? 'vision' : 'chat',
        success: true,
        durationMs: Date.now() - startedAt,
        note: 'no_context_fallback',
      })

      return NextResponse.json(
        { message: fallback, confidence: 'LOW' },
        { status: 200 }
      )
    }

    // ------------------------
    // Final answer (ALWAYS respond, even if not obviously a kitchen)
    // ------------------------
    const systemPrompt = `You are ProtocolLM: a Washtenaw County food-safety compliance assistant for restaurants.

CRITICAL CONTEXT SOURCES (always reference these when classifying/time windows):
1. "Violation Types" document → Priority (P), Priority Foundation (Pf), Core (C) classifications + correction windows
2. "Enforcement Action" document → progressive enforcement (warnings → conferences → hearings)

Key behavior:
- Analyze ANY environment where food could be present: kitchen line, dish, walk-in, storage, front counter/POS, food trucks, and transport/delivery vehicles.
- If the scene is NOT clearly a food environment, DO NOT output nothing. Instead:
  (a) Provide conditional risks with low odds, and
  (b) Ask 1–2 targeted clarifying questions to raise certainty.
- If you cannot responsibly classify P/Pf/C because food context is unclear, you may use (N/A) and put the classification under **Need to confirm**.

Rules:
- Use ONLY the provided REGULATORY EXCERPTS for claims about categories/time windows/enforcement.
- You MAY describe what is visible in the photo directly (vision).
- Provide probabilities as ranges for each suspected issue (e.g., 70–90%).
- Keep responses SHORT and ACTIONABLE. Bullet points only.
- NEVER return an empty response.

Output format (exact sections, concise):
**Likely issues (visible):**
- **(P/Pf/C/N/A)** [ODDS: xx–yy%] <one-sentence issue + why>

**Correction windows:**
- Priority/Priority Foundation: Fix immediately or within 10 days
- Core: Fix within 90 days

**What to do now:**
- <action steps, numbered, 1-3 items max>

**Need to confirm:**
- <questions to raise certainty, 1-2 items max>

Only include "Sources used:" if user explicitly asks for citations.`

    const issuesSection =
      visionIssues.length > 0
        ? `POTENTIAL ISSUES SPOTTED:\n${visionIssues.map((i) => `- ${safeText(i)}`).join('\n')}\n`
        : ''

    const userBlock = `USER REQUEST:
${effectiveUserPrompt || '[No additional text provided]'}

SCENE:
${visionScene || 'unknown'} | FOOD CONTEXT: ${visionFoodContext || 'unclear'}

VISION SUMMARY (what I can see in the photo):
${visionSummary || '[No photo analysis available]'}

${issuesSection}
SUGGESTED CLARIFICATIONS:
${(visionClarify?.length ? visionClarify.slice(0, 2) : []).map((q) => `- ${q}`).join('\n') || '- (none)'}

REGULATORY EXCERPTS:
${context}`

    let finalText = ''
    try {
      logger.info('Generating response (Extended High)', { env })

      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_CHAT_MODEL,
          reasoning: { effort: 'high' },
          text: { verbosity: 'low' },
          max_output_tokens: 1200,
          input: [
            { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
            {
              role: 'user',
              content: hasImage
                ? [
                    { type: 'input_text', text: userBlock },
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
      // Still respond with a clean fallback
      finalText = buildClarifyingFallback({
        scene: visionScene,
        visionSummary,
        clarify: visionClarify,
        hasImage,
      })
    }

    // ✅ Hard guarantee: never send “No response text returned.”
    if (!safeText(finalText)) {
      finalText = buildClarifyingFallback({
        scene: visionScene,
        visionSummary,
        clarify: visionClarify,
        hasImage,
      })
    }

    const priorityDocsUsed = docs.filter((d) => isPriorityDoc(d)).length

    logger.info('Final answer generated', {
      env,
      priorityDocsUsed,
      totalDocsUsed: docs.length,
      hasImage,
      visionIssuesCount: visionIssues.length,
      scene: visionScene,
      foodContext: visionFoodContext,
    })

    await safeLogUsage({
      userId,
      plan,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        message: finalText,
        confidence: 'HIGH',
        _meta: {
          priorityDocsUsed,
          totalDocsRetrieved: docs.length,
          visionIssuesSpotted: visionIssues.length,
          scene: visionScene,
          foodContext: visionFoodContext,
          reasoningLevel: 'high',
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
