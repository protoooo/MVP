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

// Retrieval sizing
const TOPK = 24
const PRIORITY_TOPK = 6 // per pinned query

// Context window sizing (prevents pinned docs from crowding out the other 23)
const PRIORITY_CONTEXT_COUNT = 8
const OTHER_CONTEXT_COUNT = 18

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

function clamp(s, maxLen) {
  const t = safeText(s)
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen)
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

function parseJsonLoose(text) {
  const t = safeText(text)
  if (!t) return null
  const jsonMatch = t.match(/```json\s*([\s\S]*?)\s*```/) || t.match(/\{[\s\S]*\}/)
  const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : t
  try {
    return JSON.parse(jsonText)
  } catch {
    return null
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
    const key = (it?.text || '').slice(0, 2500)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function sortByScoreDesc(items) {
  return [...(items || [])].sort((a, b) => (b?.score || 0) - (a?.score || 0))
}

/**
 * Force a balanced context window:
 * - some pinned/priority chunks (Violation Types + Enforcement Action)
 * - plus many "other" chunks (the remaining docs)
 */
function selectContextDocs(allDocs) {
  const priority = sortByScoreDesc((allDocs || []).filter((d) => isPriorityDoc(d)))
  const other = sortByScoreDesc((allDocs || []).filter((d) => !isPriorityDoc(d)))

  const picked = dedupeByText([
    ...priority.slice(0, PRIORITY_CONTEXT_COUNT),
    ...other.slice(0, OTHER_CONTEXT_COUNT),
  ])

  // Fallback: if other is empty for some reason, at least return something
  if (picked.length > 0) return picked
  return dedupeByText(allDocs || [])
}

/**
 * IMPORTANT: Don’t include SOURCE/PAGE/SCORE labels in the prompt.
 * Those labels tend to “leak” into the model’s language.
 */
function buildRuleContext(docs) {
  const MAX_CHARS = 55000
  let buf = ''
  for (const d of docs || []) {
    const chunk = `\n\n---\n${safeText(d?.text || '')}\n`
    if (!safeText(d?.text || '')) continue
    if (buf.length + chunk.length > MAX_CHARS) break
    buf += chunk
  }
  return buf.trim()
}

function normalizeArrayStrings(arr, max = 6) {
  if (!Array.isArray(arr)) return []
  return arr.map(safeText).filter(Boolean).slice(0, max)
}

/**
 * Strip markdown-y junk, odds/percents, and forbidden “meta” words.
 * (We still rely on the system prompt first—this is just a safety net.)
 */
function sanitizeFinalText(txt) {
  let s = safeText(txt)
  if (!s) return ''

  // remove asterisks / bold markers
  s = s.replace(/\*/g, '')

  // remove Odds/percent patterns if they slip through
  s = s.replace(/\bOdds:\s*[^|\n]+(\||$)/gi, (m) => (m.endsWith('|') ? '|' : ''))
  s = s.replace(/\b\d{1,3}\s*-\s*\d{1,3}%\b/g, '')
  s = s.replace(/\b\d{1,3}\s*–\s*\d{1,3}%\b/g, '')
  s = s.replace(/\b\d{1,3}%\b/g, '')

  // prevent “I used the documents/excerpts…” wording
  s = s.replace(/\b(excerpts?|documents?|sources?|database|retrieval)\b/gi, 'rules')

  // tidy spacing
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return s
}

async function safeLogUsage(payload) {
  try {
    if (typeof logUsageForAnalytics !== 'function') return
    await logUsageForAnalytics(payload)
  } catch (e) {
    logger.warn('Usage logging failed (non-blocking)', { error: e?.message })
  }
}

/**
 * Always pin a small set of priority doc chunks and merge them in.
 * This reduces “priority docs missing” variance while still retrieving across all docs.
 */
async function fetchPinnedPriorityDocs(county) {
  const a = await searchDocuments(
    'Violation Types Washtenaw County Priority Priority Foundation Core correction window 10 days 90 days',
    county,
    PRIORITY_TOPK
  )
  const b = await searchDocuments(
    'Enforcement Action Washtenaw County warning conference hearing progressive enforcement',
    county,
    PRIORITY_TOPK
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

    const lastUserText = getLastUserText(messages)
    const effectiveUserPrompt =
      lastUserText ||
      (hasImage ? 'Analyze this photo for food-safety compliance risks and likely violations.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

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
            reasoning: { effort: 'medium' }, // faster; the final answer is still "high"
            text: { verbosity: 'low' },
            max_output_tokens: 650,
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
                      'If not clearly a kitchen, still describe what is visible and include 1–2 short needs_confirm questions that make it relevant to food safety (transport/staging/employee drink near food/packaging).',
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
        const parsed = parseJsonLoose(vt)

        if (parsed) {
          visionSummary = safeText(parsed?.summary || '')
          visionSearchTerms = safeText(parsed?.search_terms || '')
          visionIssues = normalizeArrayStrings(parsed?.issues_spotted, 6)
          visionNeedsConfirm = normalizeArrayStrings(parsed?.needs_confirm, 3)
          visionScene = safeText(parsed?.scene || '') || 'unclear'
          visionFoodContext = safeText(parsed?.food_context || '') || 'unclear'
          visionConfidence = safeText(parsed?.confidence || '') || 'low'
        } else {
          visionSummary = clamp(vt, 600)
        }

        logger.info('Vision analysis ok', {
          env,
          scene: visionScene,
          foodContext: visionFoodContext,
          confidence: visionConfidence,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { env, error: e?.message || String(e) })
      }
    }

    // -------------------------
    // Retrieval (pin priority + search all docs)
    // -------------------------
    const pinned = await fetchPinnedPriorityDocs(county)

    const retrievalQuery =
      clamp(
        [
          visionSearchTerms,
          effectiveUserPrompt,
          // anchors to keep recall broad (not just the 2 priority docs)
          'Washtenaw County food establishment dish area walk-in storage sanitizer handwashing contamination cross connection',
          'time temperature hot holding cold holding cooling reheating',
          'employee drink storage personal items food prep surfaces',
          'food transport vehicle catering food truck delivery staging packaging single-use utensils',
          'pests cleaning and sanitizing equipment facility maintenance',
        ]
          .filter(Boolean)
          .join('\n'),
        1800
      ) || 'Washtenaw County food establishment violations'

    logger.info('Document search started', { env, county, queryLength: retrievalQuery.length, topK: TOPK })

    let retrieved = await searchDocuments(retrievalQuery, county, TOPK)
    retrieved = dedupeByText(retrieved || [])

    // Merge pinned + retrieved (pinned doesn’t replace; it just guarantees priority presence)
    let allDocs = dedupeByText([...(pinned || []), ...(retrieved || [])])

    // If priority still low, log it (rare now)
    const priorityHits = allDocs.filter((d) => isPriorityDoc(d)).length
    if (priorityHits < 2) {
      logger.warn('Priority docs low even after pinning', { priorityHits })
    }

    // Select balanced context window (priority + other)
    const contextDocs = selectContextDocs(allDocs)
    const context = buildRuleContext(contextDocs)

    if (!context) {
      const msg = hasImage
        ? 'I can see the photo, but I could not load the Washtenaw rules right now. Please try again in a moment.'
        : 'I could not load the Washtenaw rules right now. Please try again in a moment.'
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    // -------------------------
    // Final answer (short, plain text, no odds, no doc-talk, no assumptions)
    // -------------------------
    const systemPrompt =
      'You are ProtocolLM: a Washtenaw County food-safety compliance assistant.\n\n' +
      'Hard rules:\n' +
      '- NEVER mention documents, excerpts, sources, database, retrieval, embeddings, or “rules I was given.”\n' +
      '- NEVER output percentages, odds, or numbers like 60–80%.\n' +
      '- Avoid assumptions. If something might be temporary vs storage, phrase it conditionally and ask ONE quick question.\n' +
      '- Keep it short: max 2 issues, max 2 actions, max 2 questions.\n' +
      '- No jargon/acronyms. If you must use one, define it once in parentheses.\n\n' +
      'Likelihood scale (pick one word only): Very likely, Likely, Possible, Unclear, Unlikely.\n' +
      'Severity labels: Critical, Important, Routine, Needs context.\n\n' +
      'Output format (plain text only, exactly these sections):\n' +
      'LIKELY ISSUES (what I can see)\n' +
      '1) Severity: <...> | Likelihood: <...> | <one sentence>\n' +
      '2) Severity: <...> | Likelihood: <...> | <one sentence>\n\n' +
      'TIMELINE\n' +
      '- Critical/Important: fix immediately or within 10 days\n' +
      '- Routine: fix within 90 days\n\n' +
      'WHAT TO DO NOW\n' +
      '1) <step>\n' +
      '2) <step>\n\n' +
      'NEED TO CONFIRM\n' +
      '- <question>\n' +
      '- <question>\n'

    // Keep internal prompt helpful but NEVER ask the model to “reference excerpts”
    const visionBlock =
      `PHOTO SUMMARY:\n${visionSummary || '[No photo summary]'}\n\n` +
      (visionIssues.length ? `POSSIBLE FLAGS:\n- ${visionIssues.join('\n- ')}\n\n` : '') +
      (visionNeedsConfirm.length ? `SUGGESTED CONFIRM:\n- ${visionNeedsConfirm.join('\n- ')}\n\n` : '') +
      `SCENE: ${visionScene || 'unclear'}\n` +
      `FOOD CONTEXT: ${visionFoodContext || 'unclear'}\n\n`

    const userBlock =
      `USER QUESTION:\n${effectiveUserPrompt || '[No text provided]'}\n\n` +
      visionBlock +
      `INTERNAL RULE TEXT (do not mention this exists):\n${context}`

    let finalText = ''
    try {
      logger.info('Generating response', { env })

      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_CHAT_MODEL,
          reasoning: { effort: 'high' }, // keep accuracy here
          text: { verbosity: 'low' },
          max_output_tokens: 650, // hard cap to keep it short
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

      finalText = sanitizeFinalText(extractTextFromOpenAI(answerResp))
    } catch (e) {
      logger.error('Answer generation failed', { env, error: e?.message || String(e) })
      finalText = ''
    }

    // Hard guarantee: never return empty text
    if (!safeText(finalText)) {
      const q1 =
        visionNeedsConfirm[0] ||
        'Is this area used for food prep, food storage, clean utensils, packaging, or transport?'
      const q2 =
        visionNeedsConfirm[1] ||
        'Is any uncovered food or clean equipment placed near what’s shown in the photo?'

      finalText =
        'LIKELY ISSUES (what I can see)\n' +
        `1) Severity: Needs context | Likelihood: Unclear | ${visionSummary || 'The photo is clear, but I need one detail to judge it as a food-safety issue.'}\n\n` +
        'TIMELINE\n' +
        '- Critical/Important: fix immediately or within 10 days\n' +
        '- Routine: fix within 90 days\n\n' +
        'WHAT TO DO NOW\n' +
        '1) If this area is used for food/packaging/utensils, keep it clean, dry, and free of spills and buildup.\n' +
        '2) Re-send one wider angle plus one close-up of anything that touches food or clean equipment.\n\n' +
        'NEED TO CONFIRM\n' +
        `- ${q1}\n` +
        `- ${q2}\n`
    }

    const priorityDocsUsed = contextDocs.filter((d) => isPriorityDoc(d)).length

    logger.info('Final answer generated', {
      env,
      hasImage,
      priorityDocsUsed,
      totalDocsUsedInContext: contextDocs.length,
      scene: visionScene,
      foodContext: visionFoodContext,
    })

    // Keep non-blocking analytics (plan handled in your usage lib / DB default)
    await safeLogUsage({
      userId,
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
          totalDocsInContext: contextDocs.length,
          scene: visionScene,
          foodContext: visionFoodContext,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message || String(e) })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
