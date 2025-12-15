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

// Timeouts
const VISION_TIMEOUT_MS = 25000
const ANSWER_TIMEOUT_MS = 35000

// Retrieval
const TOPK = 22
const PINNED_TOPK = 4 // small so the pinned docs don't crowd out the other 23

// Priority doc detection by source OR early text
const PRIORITY_SOURCE_MATCHERS = [
  /violation\s*types/i,
  /enforcement\s*action/i,
  /correction\s*windows/i,
  /priority\s*foundation/i,
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

function extractTextFromOpenAI(resp) {
  if (resp?.output_text) return String(resp.output_text).trim()
  try {
    const parts = resp?.output?.flatMap((o) => o?.content || []) || []
    return parts
      .map((p) => p?.text)
      .filter(Boolean)
      .join('\n')
      .trim()
  } catch {
    return ''
  }
}

function isPriorityDoc(d) {
  const src = d?.source || ''
  const textHead = (d?.text || '').slice(0, 3000)
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
  // Keep enough to answer, but not so much that pinned docs drown everything else
  const MAX_CHARS = 52000
  let buf = ''
  for (const d of docs) {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const chunk =
      `\n\n[REF: ${src} | PAGE: ${pg} | SCORE: ${Number(d.score || 0).toFixed(3)}]\n` +
      `${d.text}\n`
    if (buf.length + chunk.length > MAX_CHARS) break
    buf += chunk
  }
  return buf.trim()
}

function normalizeList(arr, limit = 8) {
  if (!Array.isArray(arr)) return []
  return arr.map(safeText).filter(Boolean).slice(0, limit)
}

function clampQuery(q, maxLen = 1600) {
  const s = safeText(q)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

function sanitizeAssistantText(s) {
  let out = safeText(s)

  // Strip common markdown artifacts if the model slips
  out = out.replace(/```[\s\S]*?```/g, '')
  out = out.replace(/`([^`]*)`/g, '$1')
  out = out.replace(/\*\*(.*?)\*\*/g, '$1')
  out = out.replace(/\*(.*?)\*/g, '$1')

  // Remove any accidental "sources/documents/excerpts" talk
  out = out.replace(/sources used\s*:\s*.*$/gim, '')
  out = out.replace(/provided (regulatory )?excerpts?/gim, 'rules')
  out = out.replace(/\b(documents?|excerpts?|sources?|vector search|retrieval)\b/gi, 'rules')

  // Reduce excess spacing
  out = out.replace(/\n{3,}/g, '\n\n').trim()

  return out
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    // non-blocking
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
  }
}

/**
 * Always pin a small set of chunks from the two priority documents.
 * This eliminates "priority docs missing" variance.
 */
async function fetchPinnedPriorityDocs(county) {
  const a = await searchDocuments(
    'Violation Types Washtenaw County Priority Priority Foundation Core correction window immediate 10 days 90 days',
    county,
    PINNED_TOPK
  )
  const b = await searchDocuments(
    'Enforcement Action Washtenaw County warning conference hearing progressive enforcement',
    county,
    PINNED_TOPK
  )
  return dedupeByText([...(a || []), ...(b || [])])
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

    // Hard default so analytics can't be NULL even if client sends nothing
    const planFromBody = safeText(body?.plan || '')
    const plan = planFromBody || 'unknown'

    // Auth (non-blocking)
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
      (hasImage
        ? 'Analyze this photo for possible food safety / health inspection compliance risks and likely violations.'
        : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // -------------------------
    // Vision pre-pass (JSON)
    // -------------------------
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionIssues = []
    let visionNeedsConfirm = []
    let visionScene = 'unclear'
    let visionFoodContext = 'unclear'
    let visionConfidence = 'low'

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.responses.create({
            model: OPENAI_CHAT_MODEL,
            // Faster pre-pass
            reasoning: { effort: 'medium' },
            text: { verbosity: 'low' },
            max_output_tokens: 700,
            input: [
              {
                role: 'system',
                content: [
                  {
                    type: 'input_text',
                    text:
                      'Return ONLY valid JSON (no markdown) with schema: ' +
                      '{"summary":"...",' +
                      '"scene":"kitchen_line|dish_area|walk_in|storage|front_counter|food_truck|vehicle_transport|office|other|unclear",' +
                      '"food_context":"food_present|food_adjacent|no_food_visible|unclear",' +
                      '"confidence":"high|medium|low",' +
                      '"search_terms":"...",' +
                      '"issues_spotted":["..."],' +
                      '"needs_confirm":["..."]' +
                      '}. ' +
                      'Do not guess. If unclear, say what is visible and add 1–2 needs_confirm questions.',
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
          visionIssues = normalizeList(parsed?.issues_spotted, 8)
          visionNeedsConfirm = normalizeList(parsed?.needs_confirm, 6)

          visionScene = safeText(parsed?.scene || '') || 'unclear'
          visionFoodContext = safeText(parsed?.food_context || '') || 'unclear'
          visionConfidence = safeText(parsed?.confidence || '') || 'low'
        } catch (parseError) {
          logger.warn('Vision JSON parse failed, using raw text', { error: parseError.message })
          visionSummary = safeText(vt).slice(0, 500)
          visionSearchTerms = ''
          visionIssues = []
          visionNeedsConfirm = []
          visionScene = 'unclear'
          visionFoodContext = 'unclear'
          visionConfidence = 'low'
        }

        logger.info('Vision analysis ok', {
          env,
          scene: visionScene,
          foodContext: visionFoodContext,
          confidence: visionConfidence,
          issuesCount: visionIssues.length,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { env, error: e?.message || String(e) })
      }
    }

    // -------------------------
    // Retrieval (pin priority docs + search all docs)
    // -------------------------
    const pinned = await fetchPinnedPriorityDocs(county)

    const retrievalQuery =
      clampQuery(
        [
          visionSearchTerms,
          effectiveUserPrompt,
          // Anchors so non-kitchen scenes still retrieve relevant rules across the full library
          'Washtenaw County food establishment transport delivery vehicle catering food truck storage walk-in dish area sanitizer handwashing employee drink contamination cleaning',
          'time temperature hot holding cold holding reheating cooling cross contamination bare hand contact',
          'ill employee vomiting diarrhea reporting exclusion restriction',
          'Violation Types Priority Priority Foundation Core correction window immediate 10 days 90 days',
          'Enforcement Action warning conference hearing progressive enforcement',
        ]
          .filter(Boolean)
          .join('\n')
      ) || 'Washtenaw County Violation Types Enforcement Action'

    logger.info('Document search started', { env, county, queryLength: retrievalQuery.length, topK: TOPK })

    let docs = await searchDocuments(retrievalQuery, county, TOPK)
    docs = dedupeByText([...(pinned || []), ...(docs || [])])

    // Sort: priority first, then score
    docs.sort((a, b) => {
      const ap = isPriorityDoc(a) ? 1 : 0
      const bp = isPriorityDoc(b) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const context = buildContextString(docs)

    if (!context) {
      const msg = hasImage
        ? 'I could not load the Washtenaw reference rules right now. Please try again in a moment. If urgent, re-send 1 clearer photo and say where this is (kitchen line, dish area, walk-in, storage, front counter, vehicle transport, etc.).'
        : 'I could not load the Washtenaw reference rules right now. Please try again in a moment.'
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    // -------------------------
    // Final answer (short, no odds, no assumptions, no "docs/excerpts")
    // -------------------------
    const systemPrompt =
      'You are ProtocolLM: a Washtenaw County food-safety compliance assistant.\n\n' +
      'Hard rules:\n' +
      '- NEVER mention documents, excerpts, sources, retrieval, or databases.\n' +
      '- Avoid assumptions. State what is visible. If something depends on context, say so and ask 1–2 short questions.\n' +
      '- No percentages, no odds numbers. Use a 5-level likelihood scale: Very likely / Likely / Possible / Unclear / Unlikely.\n' +
      '- Avoid jargon. If you must use an acronym, define it once.\n' +
      '- Use the internal reference notes to justify Priority/Priority Foundation/Core and timelines, but do not talk about those notes.\n' +
      '- Keep it concise: max 3 issues, max 3 actions, max 2 confirm questions.\n\n' +
      'Output template (plain text, exactly these sections):\n' +
      'LIKELY ISSUES\n' +
      '- <Likelihood> | Severity: <Critical|Important|Routine|Needs context> (<Priority|Priority Foundation|Core ONLY if confident>) | <one short sentence>\n' +
      '- ... (max 3)\n\n' +
      'FIX TIMELINE\n' +
      '- Critical/Important: fix immediately or within 10 days\n' +
      '- Routine: fix within 90 days\n\n' +
      'DO THIS NOW\n' +
      '1) <step>\n' +
      '2) <step>\n' +
      '3) <step>\n\n' +
      'NEED TO CONFIRM\n' +
      '- <question>\n' +
      '- <question>\n'

    const userBlock =
      `USER REQUEST:\n${effectiveUserPrompt || '[No additional text provided]'}\n\n` +
      `WHAT IS VISIBLE (vision summary):\n${visionSummary || '[No photo analysis available]'}\n\n` +
      `SCENE:\n${visionScene || 'unclear'}\n\n` +
      `FOOD CONTEXT:\n${visionFoodContext || 'unclear'}\n\n` +
      (visionIssues.length ? `POSSIBLE FLAGS:\n- ${visionIssues.join('\n- ')}\n\n` : '') +
      (visionNeedsConfirm.length ? `SUGGESTED CONFIRM QUESTIONS:\n- ${visionNeedsConfirm.join('\n- ')}\n\n` : '') +
      `INTERNAL REFERENCE NOTES (do not mention):\n${context}`

    let finalText = ''
    try {
      logger.info('Generating response', { env })

      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_CHAT_MODEL,
          reasoning: { effort: 'high' }, // keep accuracy, output is short
          text: { verbosity: 'low' },
          max_output_tokens: 700,
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
      finalText = sanitizeAssistantText(finalText)
    } catch (e) {
      logger.error('Answer generation failed', { env, error: e?.message || String(e) })
      finalText = ''
    }

    // Hard guarantee: never return empty/confusing message
    if (!safeText(finalText)) {
      const q1 =
        visionNeedsConfirm[0] ||
        'Is this area used to store/transport food, packaging, utensils, or single-use items?'
      const q2 =
        visionNeedsConfirm[1] ||
        'Is there any uncovered food or clean equipment near this area?'

      finalText =
        'LIKELY ISSUES\n' +
        `- Unclear | Severity: Needs context | ${visionSummary || 'The photo is not clearly a food-prep scene, but it may matter if this area is used for food/packaging transport or staging.'}\n\n` +
        'FIX TIMELINE\n' +
        '- Critical/Important: fix immediately or within 10 days\n' +
        '- Routine: fix within 90 days\n\n' +
        'DO THIS NOW\n' +
        '1) If this area is used for food/packaging transport/staging, clean it and keep it dry.\n' +
        '2) Keep employee drinks covered and away from food/packaging/clean utensils.\n' +
        '3) Re-send a wider angle plus a close-up of anything that touches food.\n\n' +
        'NEED TO CONFIRM\n' +
        `- ${q1}\n` +
        `- ${q2}\n`
    }

    const priorityDocsUsed = docs.filter((d) => isPriorityDoc(d)).length

    logger.info('Final answer generated', {
      env,
      priorityDocsUsed,
      totalDocsUsed: docs.length,
      hasImage,
      scene: visionScene || 'unclear',
      foodContext: visionFoodContext || 'unclear',
    })

    // Last-moment hard default so plan can't be NULL even if something upstream is weird
    const safePlan = safeText(plan) || 'unknown'

    await safeLogUsage({
      userId,
      plan: safePlan,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
      county,
    })

    const conf =
      visionConfidence === 'high' ? 'HIGH' : visionConfidence === 'medium' ? 'MEDIUM' : 'LOW'

    return NextResponse.json(
      {
        message: finalText,
        confidence: conf,
        _meta: {
          priorityDocsUsed,
          totalDocsRetrieved: docs.length,
          scene: visionScene || 'unclear',
          foodContext: visionFoodContext || 'unclear',
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
