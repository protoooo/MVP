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
const PRIORITY_TOPK = 8 // used for pinned priority pulls

// Priority docs: detect by source OR early text
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
  const MAX_CHARS = 60000
  let buf = ''
  for (const d of docs) {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const chunk =
      `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${Number(d.score || 0).toFixed(3)}]\n` +
      `${d.text}\n`
    if (buf.length + chunk.length > MAX_CHARS) break
    buf += chunk
  }
  return buf.trim()
}

function normalizeIssues(issues) {
  // accept strings or objects, always return strings
  if (!Array.isArray(issues)) return []
  return issues
    .map((x) => {
      if (typeof x === 'string') return safeText(x)
      if (x && typeof x === 'object') {
        const label = safeText(x.label || x.issue || '')
        const why = safeText(x.why || x.reason || '')
        const odds = safeText(x.odds || '')
        const bits = [label, odds ? `(${odds})` : '', why].filter(Boolean).join(' ')
        return safeText(bits)
      }
      return ''
    })
    .filter(Boolean)
    .slice(0, 10)
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    // keep non-blocking
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
  }
}

/**
 * Always pull a small set of priority doc chunks and merge them in.
 * This reduces “priority docs missing” events due to retrieval variance.
 */
async function fetchPinnedPriorityDocs(county) {
  const a = await searchDocuments('Violation Types Washtenaw County Priority Priority Foundation Core correction window', county, PRIORITY_TOPK)
  const b = await searchDocuments('Enforcement Action Washtenaw County warning conference hearing progressive enforcement', county, PRIORITY_TOPK)
  return dedupeByText([...(a || []), ...(b || [])])
}

function clampQuery(q, maxLen = 1800) {
  const s = safeText(q)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
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

    // Optional: send from client to avoid NULL in analytics table
    const plan = safeText(body?.plan || '') || 'unknown'

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
    let visionScene = ''
    let visionFoodContext = ''
    let visionConfidence = 'low'

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
                      'You are a food-safety compliance vision assistant. Return ONLY valid JSON (no markdown) with schema: ' +
                      '{"summary":"...",' +
                      '"scene":"kitchen_line|dish_area|walk_in|storage|front_counter|food_truck|vehicle_transport|other|unclear",' +
                      '"food_context":"food_present|food_adjacent|no_food_visible|unclear",' +
                      '"confidence":"high|medium|low",' +
                      '"search_terms":"...",' +
                      '"issues_spotted":["..."],' +
                      '"needs_confirm":["..."]' +
                      '}. ' +
                      'If the image is not clearly a food context, still describe what is visible and include 1-2 needs_confirm questions that would make it relevant to food safety (transport/staging/employee drink near food/packaging).',
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
          visionIssues = normalizeIssues(parsed?.issues_spotted)
          visionNeedsConfirm = Array.isArray(parsed?.needs_confirm)
            ? parsed.needs_confirm.map(safeText).filter(Boolean).slice(0, 5)
            : []

          visionScene = safeText(parsed?.scene || '') || 'unclear'
          visionFoodContext = safeText(parsed?.food_context || '') || 'unclear'
          visionConfidence = safeText(parsed?.confidence || '') || 'low'
        } catch (parseError) {
          logger.warn('Vision JSON parse failed, using raw text', { error: parseError.message })
          visionSummary = safeText(vt).slice(0, 600)
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
          summaryLen: visionSummary.length,
          searchTermsLen: visionSearchTerms.length,
          issuesCount: visionIssues.length,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { env, error: e?.message || String(e) })
      }
    }

    // -------------------------
    // Retrieval (always pin priority docs)
    // -------------------------
    const pinned = await fetchPinnedPriorityDocs(county)

    const retrievalQuery = clampQuery(
      [
        visionSearchTerms,
        effectiveUserPrompt,
        // extra anchors so retrieval still works for non-kitchen scenes
        'Washtenaw County food establishment employee drink storage transport vehicle catering food truck dish area walk-in sanitizer handwashing time temperature',
        'Violation Types Priority Priority Foundation Core correction window immediate 10 days 90 days',
        'Enforcement Action warning conference hearing progressive enforcement',
      ]
        .filter(Boolean)
        .join('\n')
    ) || 'Washtenaw County Violation Types Enforcement Action'

    logger.info('Document search started', {
      env,
      county,
      queryLength: retrievalQuery.length,
      topK: TOPK,
    })

    let docs = await searchDocuments(retrievalQuery, county, TOPK)
    docs = dedupeByText([...(pinned || []), ...(docs || [])])

    // Sort: priority docs first, then by score
    docs.sort((a, b) => {
      const ap = isPriorityDoc(a) ? 1 : 0
      const bp = isPriorityDoc(b) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const priorityHits = docs.filter((d) => isPriorityDoc(d)).length
    if (priorityHits < 2) {
      // should be rare now because we pinned
      logger.warn('Priority docs still low after pinning', { priorityHits })
    }

    const context = buildContextString(docs)

    if (!context) {
      // Always respond (don’t return empty / confusing UI)
      const msg =
        hasImage
          ? 'I could not load the Washtenaw reference documents right now. Please try again in a moment. If this is urgent, re-send 1 clearer photo and add where this is (kitchen line, dish, walk-in, storage, vehicle transport, etc.).'
          : 'I could not load the Washtenaw reference documents right now. Please try again in a moment.'
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    // -------------------------
    // Final answer (plain text, no markdown, no asterisks, no “N/A”)
    // -------------------------
    const systemPrompt =
      'You are ProtocolLM: a Washtenaw County food-safety compliance assistant for restaurants.\n\n' +
      'CRITICAL SOURCES (use these excerpts):\n' +
      '1) "Violation Types" = maps issues to Priority / Priority Foundation / Core and correction windows\n' +
      '2) "Enforcement Action" = progressive enforcement steps\n\n' +
      'Rules:\n' +
      '- Use ONLY the provided REGULATORY EXCERPTS for claims about categories, timelines, enforcement.\n' +
      '- You MAY describe what is visible in the photo directly.\n' +
      '- NEVER output markdown. No asterisks. No bullet styling that uses * or **.\n' +
      '- NEVER output category as "N/A". If unclear, write "Needs context" and ask 1–2 short questions.\n' +
      '- Prefer simple language: Critical / Important / Routine, with (Priority / Priority Foundation / Core) in parentheses only when confident.\n' +
      '- Provide odds as ranges (e.g., 60–80%).\n' +
      '- Even if the photo is not a kitchen, still produce a useful compliance answer for transport/staging/storage scenarios.\n\n' +
      'Output template (plain text, exactly these sections):\n' +
      'LIKELY ISSUES (what I can see)\n' +
      '- Severity: <Critical|Important|Routine|Needs context> (<Priority|Priority Foundation|Core if confident>) | Odds: xx–yy% | <one sentence>\n\n' +
      'TIMELINE\n' +
      '- Critical/Important: fix immediately or within 10 days\n' +
      '- Routine: fix within 90 days\n\n' +
      'WHAT TO DO NOW\n' +
      '1) <step>\n' +
      '2) <step>\n' +
      '3) <step>\n\n' +
      'NEED TO CONFIRM\n' +
      '- <question>\n' +
      '- <question>\n'

    const issuesSection =
      visionIssues.length > 0
        ? `VISION FLAGS (not authoritative, just what seems visible):\n- ${visionIssues.join('\n- ')}\n`
        : ''

    const needsConfirmSection =
      visionNeedsConfirm.length > 0
        ? `VISION NEEDS CONFIRM:\n- ${visionNeedsConfirm.join('\n- ')}\n`
        : ''

    const userBlock =
      `USER REQUEST:\n${effectiveUserPrompt || '[No additional text provided]'}\n\n` +
      `VISION SUMMARY:\n${visionSummary || '[No photo analysis available]'}\n\n` +
      `SCENE:\n${visionScene || 'unclear'}\n\n` +
      `FOOD CONTEXT:\n${visionFoodContext || 'unclear'}\n\n` +
      (issuesSection ? `${issuesSection}\n` : '') +
      (needsConfirmSection ? `${needsConfirmSection}\n` : '') +
      `REGULATORY EXCERPTS:\n${context}`

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
      finalText = ''
    }

    // Hard guarantee: never return empty message
    if (!safeText(finalText)) {
      const fallbackNeedConfirm =
        visionNeedsConfirm.length > 0
          ? visionNeedsConfirm.slice(0, 2)
          : [
              'Is this area used to store/transport food, packaging, utensils, or single-use items?',
              'Is there any uncovered food or clean equipment near this area?',
            ]

      finalText =
        'LIKELY ISSUES (what I can see)\n' +
        `- Severity: Needs context | Odds: 40–60% | ${visionSummary ? visionSummary : 'The photo is not clearly a kitchen scene, but it may still matter if this area is used for food/packaging transport or staging.'}\n\n` +
        'TIMELINE\n' +
        '- Critical/Important: fix immediately or within 10 days\n' +
        '- Routine: fix within 90 days\n\n' +
        'WHAT TO DO NOW\n' +
        '1) If this area is used for food/packaging transport/staging, clean and keep it free of grime/liquids.\n' +
        '2) Keep employee drinks covered and away from food/packaging/clean utensils.\n' +
        '3) Re-send a wider angle and a close-up of anything that touches food (bins, coolers, racks, prep surfaces).\n\n' +
        'NEED TO CONFIRM\n' +
        `- ${fallbackNeedConfirm[0]}\n` +
        `- ${fallbackNeedConfirm[1]}\n`
    }

    const priorityDocsUsed = docs.filter((d) => isPriorityDoc(d)).length

    logger.info('Final answer generated', {
      env,
      priorityDocsUsed,
      totalDocsUsed: docs.length,
      hasImage,
      visionIssuesCount: visionIssues.length,
      scene: visionScene || 'unclear',
      foodContext: visionFoodContext || 'unclear',
    })

    await safeLogUsage({
      userId,
      plan, // ✅ prevents NULL plan insert (assuming your analytics expects it)
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
      county,
    })

    return NextResponse.json(
      {
        message: finalText,
        confidence: visionConfidence === 'high' ? 'HIGH' : visionConfidence === 'medium' ? 'MEDIUM' : 'LOW',
        _meta: {
          priorityDocsUsed,
          totalDocsRetrieved: docs.length,
          visionIssuesSpotted: visionIssues.length,
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
