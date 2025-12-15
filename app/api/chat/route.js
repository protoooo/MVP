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

// ✅ IMPORTANT: your "source" is often "Unknown Source" right now.
// So treat “priority” as source OR the beginning of the text.
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
    const chunk = `\n\n[SOURCE: ${src} | PAGE: ${pg} | SCORE: ${Number(d.score || 0).toFixed(3)}]\n${d.text}\n`
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
      (hasImage ? 'Analyze this photo for possible food safety / health inspection violations.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // Vision pre-pass
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionIssues = []

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.responses.create({
            model: OPENAI_CHAT_MODEL,

            // ✅ FIXED: correct GPT-5.x Responses parameters
            reasoning: { effort: 'high' },
            text: { verbosity: 'low' },

            max_output_tokens: 800,
            input: [
              {
                role: 'system',
                content: [
                  {
                    type: 'input_text',
                    text:
                      'You are a food-safety inspection assistant. Return ONLY valid JSON with this schema: {"summary":"...", "search_terms":"...", "issues_spotted":["..."]}. No markdown, no code blocks, just raw JSON.',
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
          visionIssues = Array.isArray(parsed?.issues_spotted) ? parsed.issues_spotted : []
        } catch (parseError) {
          logger.warn('JSON parse failed, using raw text', { error: parseError.message })
          visionSummary = safeText(vt).slice(0, 500)
          visionSearchTerms = ''
          visionIssues = []
        }

        logger.info('Vision analysis ok', {
          env,
          summaryLen: visionSummary.length,
          searchTermsLen: visionSearchTerms.length,
          issuesCount: visionIssues.length,
        })
      } catch (e) {
        logger.error('Vision analysis failed', { env, error: e?.message || String(e) })
      }
    }

    // Retrieval
    const retrievalQuery =
      safeText(
        [
          visionSearchTerms || '',
          effectiveUserPrompt || '',
          'Violation Types Washtenaw County Enforcement Action Priority Priority-Foundation Core correction window 10 days 90 days imminent hazard',
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

      const priorityQuery = 'Violation Types Priority Foundation Core correction Enforcement Action Washtenaw County'
      const extra = await searchDocuments(priorityQuery, county, PRIORITY_TOPK)

      if (extra && extra.length > 0) {
        docs = dedupeByText([...extra, ...(docs || [])])
        logger.info('Added priority docs via fallback', { count: extra.length })
      }
    }

    docs.sort((a, b) => {
      const ap = isPriorityDoc(a) ? 1 : 0
      const bp = isPriorityDoc(b) ? 1 : 0
      if (ap !== bp) return bp - ap
      return (b.score || 0) - (a.score || 0)
    })

    const context = buildContextString(docs)

    if (!context) {
      return NextResponse.json(
        {
          message:
            'I could not retrieve any relevant Washtenaw documents for this request. Please try again, or re-upload the photo with a clearer close-up and re-run.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    // Final answer
    const systemPrompt = `You are ProtocolLM: a Washtenaw County food-safety compliance assistant for restaurants.

CRITICAL CONTEXT SOURCES (always reference these):
1. "Violation Types" document → tells you Priority (P), Priority Foundation (Pf), Core (C) classifications + correction windows
2. "Enforcement Action" document → tells you progressive enforcement (warnings → conferences → hearings)

Rules:
- ALWAYS classify violations as Priority (P), Priority Foundation (Pf), or Core (C) using Violation Types doc
- ALWAYS state correction window: immediate/10 days (P/Pf) or 90 days (Core)
- Use ONLY the provided "REGULATORY EXCERPTS" for claims about rules, categories, time windows, etc.
- You MAY describe what is visible in the photo directly (your vision analysis)
- If the photo is unclear, say what is unclear and what you would need to confirm
- Provide probabilities as ranges for each suspected issue (e.g., 70–90%)
- Do NOT ask "what do you see?" — proactively find issues
- Keep responses SHORT and ACTIONABLE. No long paragraphs. Bullet points only.

Output format (exact sections, concise):
**Likely issues (visible):**
- **(P/Pf/C)** [ODDS: xx–yy%] <one-sentence issue + why>

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
        ? `POTENTIAL ISSUES SPOTTED:\n${visionIssues.map((i) => `- ${i}`).join('\n')}\n`
        : ''

    const userBlock = `USER REQUEST:
${effectiveUserPrompt || '[No additional text provided]'}

VISION SUMMARY (what I can see in the photo):
${visionSummary || '[No photo analysis available]'}

${issuesSection}
REGULATORY EXCERPTS:
${context}`

    let finalText = ''
    try {
      logger.info('Generating response (Extended High)', { env })

      const answerResp = await withTimeout(
        openai.responses.create({
          model: OPENAI_CHAT_MODEL,

          // ✅ FIXED: correct GPT-5.x Responses parameters
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
      return NextResponse.json(
        { message: 'The analysis timed out. Please try again (or re-send 1–2 clearer angles).', confidence: 'LOW' },
        { status: 200 }
      )
    }

    const priorityDocsUsed = docs.filter((d) => isPriorityDoc(d)).length

    logger.info('Final answer generated', {
      env,
      priorityDocsUsed,
      totalDocsUsed: docs.length,
      hasImage,
      visionIssuesCount: visionIssues.length,
    })

    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        message: finalText || 'No response text returned.',
        confidence: 'HIGH',
        _meta: {
          priorityDocsUsed,
          totalDocsRetrieved: docs.length,
          visionIssuesSpotted: visionIssues.length,
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
