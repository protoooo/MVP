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

// Retrieval tuning
const TOPK = 24 // non-pinned semantic retrieval
const PINNED_TOPK = 6 // per priority doc (Violation Types + Enforcement Action)
const PRIORITY_BUDGET = 12 // max priority chunks included in final context
const TOTAL_BUDGET = 34 // total chunks used to build context (before char cap)

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

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

function asImageUrl(maybe) {
  if (!maybe || typeof maybe !== 'string') return null
  const s = maybe.trim()
  if (!s) return null
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  // assume raw base64
  return `data:image/jpeg;base64,${s}`
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
    return parts.map((p) => p?.text).filter(Boolean).join('\n').trim()
  } catch {
    return ''
  }
}

function stripMarkdownAndNoise(text) {
  if (!text) return ''
  let s = String(text)

  // Remove code-fence markers but keep content
  s = s.replace(/```(?:json)?/gi, '')
  s = s.replace(/```/g, '')

  // Remove markdown emphasis/backticks/quotes
  s = s.replace(/\*\*/g, '')
  s = s.replace(/\*/g, '') // user explicitly wants no asterisks
  s = s.replace(/__/g, '')
  s = s.replace(/`/g, '')
  s = s.replace(/^\s*>/gm, '')

  // Normalize common “N/A” patterns
  s = s.replace(/\bN\/A\b/gi, 'Needs context')
  s = s.replace(/\(N\/A\)/gi, '(Needs context)')

  // Trim & collapse excessive blank lines
  s = s.replace(/[ \t]+\n/g, '\n')
  s = s.replace(/\n{4,}/g, '\n\n\n')
  return s.trim()
}

function isPriorityDoc(d) {
  if (d?.pinned === true) return true
  const src = d?.source || ''
  const head = (d?.text || '').slice(0, 3000)
  const hay = `${src}\n${head}`
  return PRIORITY_SOURCE_MATCHERS.some((re) => re.test(hay))
}

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 2500)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function clampQuery(q, maxLen = 1800) {
  const s = safeText(q)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

function balanceDocs(allDocs) {
  const priority = allDocs.filter((d) => isPriorityDoc(d)).slice(0, PRIORITY_BUDGET)
  const nonPriority = allDocs
    .filter((d) => !isPriorityDoc(d))
    .slice(0, Math.max(0, TOTAL_BUDGET - priority.length))
  return [...priority, ...nonPriority]
}

function buildContextString(docs) {
  const MAX_CHARS = 60000
  let buf = ''
  for (const d of docs) {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const score = Number(d.score || 0).toFixed(3)
    const chunk =
      `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${score}]\n` +
      `${d.text}\n`
    if (buf.length + chunk.length > MAX_CHARS) break
    buf += chunk
  }
  return buf.trim()
}

function normalizeIssues(issues) {
  if (!Array.isArray(issues)) return []
  return issues
    .map((x) => {
      if (typeof x === 'string') return safeText(x)
      if (x && typeof x === 'object') {
        const label = safeText(x.label || x.issue || '')
        const why = safeText(x.why || x.reason || '')
        const odds = safeText(x.odds || '')
        return safeText([label, odds ? `(${odds})` : '', why].filter(Boolean).join(' '))
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
    // Keep non-blocking, but avoid scary red errors bubbling up to user flow
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
  }
}

/**
 * Always pull small pinned sets of the two priority docs and mark them as pinned.
 * This prevents retrieval variance from “losing” your most important two docs.
 */
async function fetchPinnedPriorityDocs(county) {
  try {
    const [a, b] = await Promise.all([
      searchDocuments(
        'Violation Types Washtenaw County Priority Priority Foundation Core correction window immediate 10 days 90 days',
        county,
        PINNED_TOPK
      ),
      searchDocuments(
        'Enforcement Action Washtenaw County warning conference hearing progressive enforcement suspension closure',
        county,
        PINNED_TOPK
      ),
    ])

    const pinnedA = (a || []).map((d) => ({
      ...d,
      pinned: true,
      source: d?.source || 'Violation Types (pinned)',
    }))
    const pinnedB = (b || []).map((d) => ({
      ...d,
      pinned: true,
      source: d?.source || 'Enforcement Action (pinned)',
    }))

    return dedupeByText([...pinnedA, ...pinnedB])
  } catch (e) {
    logger.warn('Pinned priority fetch failed (continuing)', { error: e?.message })
    return []
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

    const imageUrl = asImageUrl(body?.image || body?.imageBase64 || body?.image_url)
    const hasImage = Boolean(imageUrl)

    // IMPORTANT: ensure non-null plan to avoid NOT NULL insert failures
    const plan = safeText(body?.plan || '') || 'free'

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
                      'Return ONLY valid JSON (no markdown) with schema: ' +
                      '{"summary":"...",' +
                      '"scene":"kitchen_line|dish_area|walk_in|storage|front_counter|food_truck|vehicle_transport|other|unclear",' +
                      '"food_context":"food_present|food_adjacent|no_food_visible|unclear",' +
                      '"confidence":"high|medium|low",' +
                      '"search_terms":"...",' +
                      '"issues_spotted":["..."],' +
                      '"needs_confirm":["..."]' +
                      '}. ' +
                      'If not clearly a kitchen, still describe what is visible and add 1-2 needs_confirm questions to connect it to food safety (transport/staging/storage/employee drink near food or packaging).',
                  },
                ],
              },
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: effectiveUserPrompt },
                  { type: 'input_image', image_url: imageUrl },
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
          const jsonMatch =
            vt.match(/```json\s*([\s\S]*?)\s*```/i) ||
            vt.match(/\{[\s\S]*\}/)
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
    // Retrieval: pin priority docs + retrieve across all docs
    // -------------------------
    const pinned = await fetchPinnedPriorityDocs(county)

    const retrievalQuery = clampQuery(
      [
        visionSearchTerms,
        effectiveUserPrompt,
        // anchors so non-kitchen scenes still retrieve relevant policy
        'Washtenaw County food establishment transport storage vehicle catering food truck dish area walk-in storage sanitizer handwashing employee drinks contamination',
        'time temperature hot holding cold holding cooling reheating cross contamination allergens bare hand contact',
        'cleaning sanitizing food-contact surfaces non-food-contact surfaces pest control equipment maintenance',
      ]
        .filter(Boolean)
        .join('\n')
    ) || 'Washtenaw County food safety compliance'

    logger.info('Document search started', { env, county, queryLength: retrievalQuery.length, topK: TOPK })

    let docs = await searchDocuments(retrievalQuery, county, TOPK)
    docs = dedupeByText([...(pinned || []), ...(docs || [])])

    // sort: priority first, then by score
    docs.sort((a, b) => {
      const ap = isPriorityDoc(a) ? 1 : 0
      const bp = isPriorityDoc(b) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const balanced = balanceDocs(docs)
    const context = buildContextString(balanced)

    if (!context) {
      const msg = hasImage
        ? 'I could not load the Washtenaw reference documents right now. Try again in a moment. If urgent, re-send 1 clearer photo and add where this is (kitchen line, dish area, walk-in, storage, vehicle transport, food truck, etc.).'
        : 'I could not load the Washtenaw reference documents right now. Please try again in a moment.'
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    // -------------------------
    // Final answer (plain text, easy language)
    // -------------------------
    const systemPrompt =
      'You are ProtocolLM: a Washtenaw County food-safety compliance assistant for restaurants.\n\n' +
      'CRITICAL SOURCES:\n' +
      '1) "Violation Types" = maps issues to Priority / Priority Foundation / Core and correction windows\n' +
      '2) "Enforcement Action" = progressive enforcement steps\n\n' +
      'Hard rules:\n' +
      '- Use ONLY the provided REGULATORY EXCERPTS for claims about categories, timelines, enforcement.\n' +
      '- You MAY describe what is visible in the photo directly.\n' +
      '- Output must be plain text only. NO markdown. NO asterisks.\n' +
      '- Never output "N/A". If you cannot classify, write "Needs context" and ask 1–2 short questions.\n' +
      '- Prefer simple language for staff: Critical / Important / Routine. Avoid acronyms (do not say "TCS").\n' +
      '- If FOOD CONTEXT is "no_food_visible", do NOT ask "is food in the pan?" etc. Ask about how it’s used and how long since cleaned.\n' +
      '- If the scene is not a kitchen, still provide useful compliance guidance for transport/staging/storage scenarios.\n' +
      '- Provide odds as ranges (e.g., 60–80%). Keep it short.\n\n' +
      'Output template (exact sections):\n' +
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
        ? `VISION FLAGS (not authoritative):\n- ${visionIssues.join('\n- ')}\n`
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
                    { type: 'input_image', image_url: imageUrl },
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

    finalText = stripMarkdownAndNoise(finalText)

    // Hard guarantee: never return empty message
    if (!safeText(finalText)) {
      const fallbackQs =
        visionNeedsConfirm.length > 0
          ? visionNeedsConfirm.slice(0, 2)
          : [
              'Is this area used to store/transport food, packaging, utensils, or single-use items?',
              'Is there any uncovered food or clean equipment near this area?',
            ]

      finalText =
        'LIKELY ISSUES (what I can see)\n' +
        `- Severity: Needs context | Odds: 40–60% | ${visionSummary || 'The photo is not clearly a kitchen scene, but it may still matter if this area is used for food/packaging transport or staging.'}\n\n` +
        'TIMELINE\n' +
        '- Critical/Important: fix immediately or within 10 days\n' +
        '- Routine: fix within 90 days\n\n' +
        'WHAT TO DO NOW\n' +
        '1) If this area is used for food/packaging transport or staging, clean it and keep it dry.\n' +
        '2) Keep employee drinks covered and away from food, packaging, and clean utensils.\n' +
        '3) Re-send a wider angle and a close-up of anything that touches food (bins, coolers, racks, prep surfaces).\n\n' +
        'NEED TO CONFIRM\n' +
        `- ${fallbackQs[0]}\n` +
        `- ${fallbackQs[1]}\n`
    }

    const priorityDocsUsed = balanced.filter((d) => isPriorityDoc(d)).length

    logger.info('Final answer generated', {
      env,
      priorityDocsUsed,
      totalDocsUsed: balanced.length,
      hasImage,
      visionIssuesCount: visionIssues.length,
      scene: visionScene || 'unclear',
      foodContext: visionFoodContext || 'unclear',
    })

    await safeLogUsage({
      userId,
      plan,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
      county,
    })

    const confidenceOut =
      visionConfidence === 'high' ? 'HIGH' : visionConfidence === 'medium' ? 'MEDIUM' : 'LOW'

    return NextResponse.json(
      {
        message: finalText,
        confidence: confidenceOut,
        _meta: {
          priorityDocsUsed,
          totalDocsUsed: balanced.length,
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
