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
const VISION_TIMEOUT_MS = 25000
const ANSWER_TIMEOUT_MS = 35000

const TOPK = 24
const PRIORITY_TOPK = 8 // pinned pulls per priority doc

const MAX_CONTEXT_CHARS = 60000
const PRIORITY_CTX_MAX = 10
const OTHER_CTX_MAX = 18

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

function clampQuery(q, maxLen = 1800) {
  const s = safeText(q)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

function partitionDocs(docs) {
  const priority = []
  const other = []
  for (const d of docs || []) {
    if (isPriorityDoc(d)) priority.push(d)
    else other.push(d)
  }
  return { priority, other }
}

// Ensures we include priority + “other docs” (not just the two pinned files)
function buildContextString(docs) {
  const { priority, other } = partitionDocs(docs)

  let buf = ''
  let usedPriority = 0
  let usedOther = 0

  const pushDoc = (d) => {
    const src = d.source || 'Unknown'
    const pg = d.page ?? 'N/A'
    const chunk =
      `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${Number(d.score || 0).toFixed(3)}]\n` +
      `${d.text}\n`
    if (buf.length + chunk.length > MAX_CONTEXT_CHARS) return false
    buf += chunk
    return true
  }

  for (const d of priority) {
    if (usedPriority >= PRIORITY_CTX_MAX) break
    if (!pushDoc(d)) break
    usedPriority++
  }

  for (const d of other) {
    if (usedOther >= OTHER_CTX_MAX) break
    if (!pushDoc(d)) break
    usedOther++
  }

  return buf.trim()
}

function parseJsonLoose(text) {
  const t = safeText(text)
  if (!t) return null
  const m =
    t.match(/```json\s*([\s\S]*?)\s*```/i) ||
    t.match(/```([\s\S]*?)```/i) ||
    t.match(/\{[\s\S]*\}/)
  const jsonText = m ? (m[1] || m[0]) : t
  try {
    return JSON.parse(jsonText)
  } catch {
    return null
  }
}

function normalizeLikelihood(x) {
  const v = safeText(x).toLowerCase()
  if (!v) return 'Needs context'
  if (v.includes('very')) return 'Very likely'
  if (v.includes('likely')) return 'Likely'
  if (v.includes('possible')) return 'Possible'
  if (v.includes('unlikely')) return 'Unlikely'
  if (v.includes('need')) return 'Needs context'
  return 'Needs context'
}

function normalizeSeverity(x) {
  const v = safeText(x).toLowerCase()
  if (!v) return 'Needs context'
  if (v.includes('critical')) return 'Critical'
  if (v.includes('important')) return 'Important'
  if (v.includes('routine')) return 'Routine'
  if (v.includes('need')) return 'Needs context'
  return 'Needs context'
}

function normalizeCategory(x) {
  const v = safeText(x).toLowerCase()
  if (!v) return 'Needs context'
  if (v.includes('priority foundation')) return 'Priority Foundation'
  if (v === 'priority' || v.includes('priority')) return 'Priority'
  if (v.includes('core')) return 'Core'
  if (v.includes('need')) return 'Needs context'
  return 'Needs context'
}

function compact(s, max = 220) {
  const t = safeText(s)
  if (t.length <= max) return t
  return t.slice(0, max - 1) + '…'
}

// We format the final message ourselves so UI is always clean.
function formatForUser(payload) {
  const issues = Array.isArray(payload?.issues) ? payload.issues : []
  const actions = Array.isArray(payload?.actions) ? payload.actions : []
  const needConfirm = Array.isArray(payload?.need_confirm) ? payload.need_confirm : []

  const cleanIssues = issues
    .slice(0, 3)
    .map((it) => {
      const severity = normalizeSeverity(it?.severity)
      const category = normalizeCategory(it?.category)
      const likelihood = normalizeLikelihood(it?.likelihood)
      const finding = compact(it?.finding || '')
      const why = compact(it?.why || '', 180)

      const catPart = category !== 'Needs context' ? ` (${category})` : ''
      const whyPart = why ? ` ${why}` : ''
      return `- Severity: ${severity}${catPart} | Likelihood: ${likelihood} | ${finding}${whyPart}`
    })
    .filter(Boolean)

  const cleanActions = actions
    .map((a) => compact(a, 180))
    .filter(Boolean)
    .slice(0, 3)

  const cleanConfirm = needConfirm
    .map((q) => compact(q, 170))
    .filter(Boolean)
    .slice(0, 2)

  const lines = []

  lines.push('LIKELY ISSUES (what I can see)')
  if (cleanIssues.length) lines.push(...cleanIssues)
  else lines.push('- Severity: Needs context | Likelihood: Needs context | I can’t confidently flag a specific violation from this photo alone.')

  lines.push('')
  lines.push('TIMELINE')
  lines.push('- Critical/Important: fix immediately or within 10 days')
  lines.push('- Routine: fix within 90 days')

  lines.push('')
  lines.push('WHAT TO DO NOW')
  if (cleanActions.length) {
    cleanActions.forEach((a, idx) => lines.push(`${idx + 1}) ${a}`))
  } else {
    lines.push('1) Re-send a wider angle plus one close-up of the area you want checked.')
    lines.push('2) If this area touches food, packaging, or clean utensils, clean and keep it dry and protected.')
    lines.push('3) Keep employee drinks/personal items away from food-contact and clean storage areas.')
  }

  lines.push('')
  lines.push('NEED TO CONFIRM')
  if (cleanConfirm.length) lines.push(...cleanConfirm.map((q) => `- ${q}`))
  else lines.push('- Is this area used for food, packaging, clean utensils, or storage?')

  return lines.join('\n')
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
 * Always pull a small set of priority doc chunks and merge them in.
 * This prevents “priority docs missing” due to retrieval variance.
 */
async function fetchPinnedPriorityDocs(county) {
  const a = await searchDocuments(
    'Violation Types Washtenaw County Priority Priority Foundation Core correction window immediate 10 days 90 days',
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

    // Always avoid NULL inserts
    const plan = safeText(body?.plan) || 'unknown'

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
    let visionScene = 'unclear'
    let visionFoodContext = 'unclear'
    let visionConfidence = 'low'

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.responses.create({
            model: OPENAI_CHAT_MODEL,
            reasoning: { effort: 'medium' },
            text: { verbosity: 'low' },
            max_output_tokens: 600,
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
                      '"search_terms":"..."' +
                      '}. ' +
                      'Do not use acronyms. Keep summary short and factual.',
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
          visionScene = safeText(parsed?.scene || '') || 'unclear'
          visionFoodContext = safeText(parsed?.food_context || '') || 'unclear'
          visionConfidence = safeText(parsed?.confidence || '') || 'low'
        } else {
          visionSummary = safeText(vt).slice(0, 600)
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
    // Retrieval (pin priority docs + search all docs)
    // -------------------------
    const pinned = await fetchPinnedPriorityDocs(county)

    const retrievalQuery = clampQuery(
      [
        visionSearchTerms,
        effectiveUserPrompt,
        // anchors so it still works outside “kitchen-looking” scenes
        'Washtenaw County food establishment employee drink storage transport vehicle catering food truck dish area walk-in sanitizer handwashing contamination packaging single-use items',
        'Violation Types Priority Priority Foundation Core correction window immediate 10 days 90 days',
        'Enforcement Action warning conference hearing progressive enforcement',
      ]
        .filter(Boolean)
        .join('\n')
    ) || 'Washtenaw County Violation Types Enforcement Action'

    logger.info('Document search started', { env, county, queryLength: retrievalQuery.length, topK: TOPK })

    let docs = await searchDocuments(retrievalQuery, county, TOPK)
    docs = dedupeByText([...(pinned || []), ...(docs || [])])

    // Sort: priority docs first, then score
    docs.sort((a, b) => {
      const ap = isPriorityDoc(a) ? 1 : 0
      const bp = isPriorityDoc(b) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const context = buildContextString(docs)

    if (!context) {
      const msg = hasImage
        ? 'I could not load the Washtenaw reference material right now. Please try again in a moment. If urgent, re-send one wider shot and one close-up, and say where this is (kitchen line, dish area, walk-in, storage, vehicle transport, etc.).'
        : 'I could not load the Washtenaw reference material right now. Please try again in a moment.'
      return NextResponse.json({ message: msg, confidence: 'LOW' }, { status: 200 })
    }

    // -------------------------
    // Final answer (MODEL RETURNS JSON ONLY; server formats output)
    // -------------------------
    const systemPrompt =
      'You are ProtocolLM: a Washtenaw County food-safety compliance assistant for restaurants.\n\n' +
      'Use ONLY the provided REGULATORY EXCERPTS for any claims about: categories (Priority / Priority Foundation / Core), timelines (10 days / 90 days), and enforcement.\n\n' +
      'Rules:\n' +
      '- Return ONLY valid JSON. No markdown. No asterisks. No code fences.\n' +
      '- Do NOT mention documents, sources, excerpts, retrieval, embeddings, or citations.\n' +
      '- No percentages. Use a 5-point likelihood scale ONLY: Very likely, Likely, Possible, Unlikely, Needs context.\n' +
      '- Avoid assumptions. If unsure, phrase conditionally ("If this is used for…").\n' +
      '- Avoid acronyms. If you must use one, define it in plain words.\n' +
      '- Keep it short: max 3 issues, max 3 actions, max 2 confirm questions.\n\n' +
      'JSON schema (exact keys):\n' +
      '{\n' +
      '  "issues":[\n' +
      '    {"severity":"Critical|Important|Routine|Needs context","category":"Priority|Priority Foundation|Core|Needs context","likelihood":"Very likely|Likely|Possible|Unlikely|Needs context","finding":"...","why":"..."}\n' +
      '  ],\n' +
      '  "actions":["..."],\n' +
      '  "need_confirm":["..."]\n' +
      '}\n'

    const userBlock =
      `USER REQUEST:\n${effectiveUserPrompt || '[No additional text provided]'}\n\n` +
      `VISION SUMMARY:\n${visionSummary || '[No photo analysis available]'}\n\n` +
      `SCENE:\n${visionScene || 'unclear'}\n\n` +
      `FOOD CONTEXT:\n${visionFoodContext || 'unclear'}\n\n` +
      `REGULATORY EXCERPTS:\n${context}`

    let formatted = ''
    let rawJson = null

    try {
      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_CHAT_MODEL,
          reasoning: { effort: 'high' },
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

      const out = extractTextFromOpenAI(answerResp)
      rawJson = parseJsonLoose(out)

      if (rawJson) {
        formatted = formatForUser(rawJson)
      }
    } catch (e) {
      logger.error('Answer generation failed', { env, error: e?.message || String(e) })
    }

    // Hard guarantee: never return empty / messy blob
    if (!safeText(formatted)) {
      formatted =
        'LIKELY ISSUES (what I can see)\n' +
        '- Severity: Needs context | Likelihood: Needs context | I can’t confidently flag a specific violation from this photo alone.\n\n' +
        'TIMELINE\n' +
        '- Critical/Important: fix immediately or within 10 days\n' +
        '- Routine: fix within 90 days\n\n' +
        'WHAT TO DO NOW\n' +
        '1) Re-send a wider angle plus one close-up of the exact area you want checked.\n' +
        '2) If this area is used for food, packaging, or clean utensils, clean it and keep it dry/protected.\n' +
        '3) Keep employee drinks and personal items away from food-contact and clean storage areas.\n\n' +
        'NEED TO CONFIRM\n' +
        '- Is this area used for food, packaging, clean utensils, or storage?\n' +
        '- Is there any uncovered food or clean equipment nearby?\n'
    }

    const priorityDocsUsed = docs.filter((d) => isPriorityDoc(d)).length

    await safeLogUsage({
      userId,
      plan,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
      county,
    })

    return NextResponse.json(
      {
        message: formatted,
        confidence: visionConfidence === 'high' ? 'HIGH' : visionConfidence === 'medium' ? 'MEDIUM' : 'LOW',
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
