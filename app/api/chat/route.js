// app/api/chat/route.js
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { logUsageForAnalytics } from '@/lib/usage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

let Anthropic = null
let searchDocuments = null

async function getAnthropicClient() {
  if (!Anthropic) {
    const module = await import('@anthropic-ai/sdk')
    Anthropic = module.default
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

async function getSearchDocuments() {
  if (!searchDocuments) {
    const module = await import('@/lib/searchDocs')
    searchDocuments = module.searchDocuments
  }
  return searchDocuments
}

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const VISION_TIMEOUT_MS = 20000
const ANSWER_TIMEOUT_MS = 35000

const TOPK = 18
const PRIORITY_TOPK = 10

// Keep these short. They’re here to enforce Washtenaw-specific framing without bloating output.
const WASHTENAW_RULES = `
Washtenaw violation classes:
P (Priority): directly reduces foodborne illness hazard.
Pf (Priority Foundation): supports P compliance (supplies, facilities, tools).
C (Core): general sanitation and facility maintenance.

Correction timing:
P and Pf: correct immediately at inspection or within 10 days.
C: correct within 90 days.

Enforcement overview:
Imminent hazards can trigger immediate closure (summary action): no water/power, uncontained outbreak, severe pests, sewage backup, fire/flood, or immediate public danger.
Non-imminent issues use progressive enforcement with 3 opportunities: inspection/follow-up, office conference, informal hearing, then license action (with appeal path).
`

const SOURCE_PRIORITY = {
  washtenaw: [
    /washtenaw/i,
    /violation\s*types/i,
    /enforcement\s*action/i,
    /inspection.*program/i,
    /food\s*allergy.*washtenaw/i,
    /inspection\s*report\s*types/i,
  ],
  michigan: [
    /mi.*modified.*food.*code/i,
    /michigan.*food/i,
    /mcl.*act.*92/i,
    /administration.*enforcement.*michigan/i,
  ],
  fda: [/fda.*food.*code/i],
  guides: [
    /cooking.*temp/i,
    /cooling.*foods/i,
    /cross.*contam/i,
    /date.*mark/i,
    /internal.*temp/i,
    /safe.*minimum/i,
    /consumer.*advisory/i,
    /norovirus/i,
    /emergency.*action/i,
    /3.*comp.*sink/i,
  ],
}

function safeText(x) {
  if (typeof x !== 'string') return ''
  return x.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

function withTimeout(promise, ms, timeoutName = 'TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutName)), ms)),
  ])
}

function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const s = dataUrl.trim()
  if (!s) return null
  if (s.startsWith('data:image/')) {
    const parts = s.split(',')
    return parts[1] || null
  }
  return s
}

function getMediaTypeFromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'image/jpeg'
  if (dataUrl.includes('data:image/png')) return 'image/png'
  if (dataUrl.includes('data:image/gif')) return 'image/gif'
  if (dataUrl.includes('data:image/webp')) return 'image/webp'
  return 'image/jpeg'
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

function getSourceTier(source) {
  if (!source) return 5
  for (const p of SOURCE_PRIORITY.washtenaw) if (p.test(source)) return 1
  for (const p of SOURCE_PRIORITY.michigan) if (p.test(source)) return 2
  for (const p of SOURCE_PRIORITY.fda) if (p.test(source)) return 3
  for (const p of SOURCE_PRIORITY.guides) if (p.test(source)) return 4
  return 5
}

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 1800)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function buildContextString(docs) {
  const MAX_CHARS = 36000
  let buf = ''
  for (const d of docs || []) {
    const source = safeText(d?.source || 'Unknown Source')
    const page = d?.page ? ` (p. ${d.page})` : ''
    const text = safeText(d?.text || '')
    if (!text) continue

    const chunk = `SOURCE: ${source}${page}\n${text}\n\n`
    if ((buf.length + chunk.length) > MAX_CHARS) break
    buf += chunk
  }
  return buf.trim()
}

function sanitizeModelOutput(text) {
  let out = safeText(text || '')

  // Remove common markdown triggers and “formatting noise”
  out = out.replace(/[`#*]/g, '')
  out = out.replace(/_{2,}/g, '_') // reduce underscore runs
  out = out.replace(/\n{3,}/g, '\n\n')

  // Remove emoji / pictographs when supported
  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '') // variation selector
  } catch {}

  // Keep it tight
  const HARD_LIMIT = 2200
  if (out.length > HARD_LIMIT) {
    out = out.slice(0, HARD_LIMIT).trimEnd()
    out += '\nIf you want, say "full audit" and I will list more items.'
  }

  return out.trim()
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

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 500 }
      )
    }

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

    const imageDataUrl = body?.image || body?.imageBase64 || body?.image_url
    const hasImage = Boolean(imageDataUrl)
    const imageBase64 = hasImage ? extractBase64FromDataUrl(imageDataUrl) : null
    const imageMediaType = hasImage ? getMediaTypeFromDataUrl(imageDataUrl) : null

    let userId = null
    try {
      // keep your current cookie approach to avoid regressions
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {}
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
      lastUserText || (hasImage ? 'Analyze this photo for food safety issues.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    // 1) Quick vision pass (only to generate search terms + a short observation list)
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionIssues = []

    if (hasImage && imageBase64) {
      try {
        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 450,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: imageMediaType,
                      data: imageBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: `Analyze the photo for food safety issues.
Return ONLY valid JSON:
{
  "summary": "1 sentence describing what matters",
  "search_terms": "short keywords for regulation lookup",
  "issues": [
    {"issue": "short issue", "category": "temperature/sanitation/storage/equipment/personnel/crosscontam/chemicals", "severity": "critical/serious/minor"}
  ],
  "unclear": ["short list of what cannot be confirmed from the photo"]
}
Do not use emojis. Keep it brief.`,
                  },
                ],
              },
            ],
          }),
          VISION_TIMEOUT_MS,
          'VISION_TIMEOUT'
        )

        const visionText = visionResp.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('')

        const jsonMatch = visionText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          visionSummary = safeText(parsed?.summary || '')
          visionSearchTerms = safeText(parsed?.search_terms || '')
          if (Array.isArray(parsed?.issues)) {
            visionIssues = parsed.issues
              .map((i) => ({
                issue: safeText(i?.issue || ''),
                category: safeText(i?.category || ''),
                severity: safeText(i?.severity || ''),
              }))
              .filter((i) => i.issue)
              .slice(0, 6)
          }
        } else {
          visionSummary = safeText(visionText).slice(0, 220)
        }
      } catch (e) {
        logger.warn('Vision failed (continuing)', { error: e?.message })
      }
    }

    // 2) Retrieval
    const retrievalQuery = [
      effectiveUserPrompt,
      visionSearchTerms,
      'Washtenaw County Michigan food service',
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 800)

    let docs = await searchDocumentsFn(retrievalQuery, county, TOPK)
    docs = dedupeByText(docs || [])

    // If we didn’t pull enough county-specific docs, nudge it.
    const washtenawHits = docs.filter((d) => getSourceTier(d.source) === 1).length
    if (washtenawHits < 2) {
      const extra = await searchDocumentsFn(
        'Washtenaw County violation types enforcement action inspection food service',
        county,
        PRIORITY_TOPK
      )
      if (extra?.length) docs = dedupeByText([...(extra || []), ...(docs || [])])
    }

    docs.sort((a, b) => {
      const tierA = getSourceTier(a.source)
      const tierB = getSourceTier(b.source)
      if (tierA !== tierB) return tierA - tierB
      return (b.score || 0) - (a.score || 0)
    })

    const retrievedContext = buildContextString(docs)

    // 3) Final answer prompt (plain text only, concise, actionable)
    const systemPrompt = `You are ProtocolLM, a compliance assistant for Washtenaw County, Michigan food service establishments.

Goal: Give an actionable, concise answer a busy employee or manager can follow.
Output must be plain text only. Do not use markdown. Do not use hashtags. Do not use asterisks. Do not use emojis.
Do not provide confidence percentages.

Use these likelihood words only: Very likely, Likely, Possible, Unclear.
Never claim certainty. Avoid words like "guaranteed", "definitely", "certain", "100%".

Format:
Start with one short sentence that summarizes the biggest problem(s), or say "No clear violations visible from this photo."

Then list up to 4 items (unless the user explicitly asks for "full audit").
For each item, use exactly this structure:

[CLASS] Short violation name (Likelihood: ...)
Why: ...
Fix: ...
Deadline: ... (P/Pf = immediately or within 10 days; C = within 90 days)
Source: document title + page if available

If something cannot be confirmed from the photo, mark it Unclear and say what to check (measure temp, check labels, confirm sanitizer strength, etc).

Classification rules and enforcement context:
${WASHTENAW_RULES}

Prefer Washtenaw County sources first, then Michigan sources, then FDA/USDA guidance.
Keep lines short. No paragraphs.`

    let issuesCompact = ''
    if (visionIssues.length > 0) {
      issuesCompact =
        '\nPhoto flags (from quick scan):\n' +
        visionIssues
          .slice(0, 6)
          .map((v, idx) => `${idx + 1}. ${v.issue}${v.category ? ` (${v.category})` : ''}`)
          .join('\n')
    }

    const userPrompt = `User request:
${effectiveUserPrompt || (hasImage ? 'Analyze photo.' : '')}

Photo summary:
${visionSummary || (hasImage ? 'No summary available.' : 'No photo provided.')}${issuesCompact ? `\n${issuesCompact}` : ''}

Relevant excerpts:
${retrievedContext || 'No excerpts retrieved.'}`

    let finalText = ''
    try {
      const finalMessages = []

      if (hasImage && imageBase64) {
        finalMessages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType,
                data: imageBase64,
              },
            },
            { type: 'text', text: userPrompt },
          ],
        })
      } else {
        finalMessages.push({ role: 'user', content: userPrompt })
      }

      const answerResp = await withTimeout(
        anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 900,
          system: systemPrompt,
          messages: finalMessages,
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      finalText = answerResp.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })

      // Fallback: short, still actionable, no markdown / emojis
      if (hasImage && (visionSummary || visionIssues.length)) {
        const fallbackIssues = visionIssues
          .slice(0, 4)
          .map((v, i) => `${i + 1}. Possible issue: ${v.issue}`)
          .join('\n')

        const fallback = [
          'Response timed out. Quick scan only:',
          visionSummary ? `Summary: ${visionSummary}` : '',
          fallbackIssues ? `\n${fallbackIssues}` : '',
          '\nTry again and/or ask for "full audit" if you want more items.',
        ]
          .filter(Boolean)
          .join('\n')

        return NextResponse.json({ message: sanitizeModelOutput(fallback) }, { status: 200 })
      }

      return NextResponse.json(
        { message: 'Analysis timed out. Please try again or simplify your request.' },
        { status: 200 }
      )
    }

    const message = sanitizeModelOutput(finalText || 'No response generated.')

    logger.info('Response complete', {
      totalDocsRetrieved: docs.length,
      washtenawDocsUsed: docs.filter((d) => getSourceTier(d.source) === 1).length,
      hasImage,
      visionIssues: visionIssues.length,
      durationMs: Date.now() - startedAt,
      model: CLAUDE_MODEL,
    })

    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    // Keep payload minimal; front-end can display `message` only.
    return NextResponse.json(
      {
        message,
        _meta: {
          model: CLAUDE_MODEL,
          hasImage,
          totalDocsRetrieved: docs.length,
          durationMs: Date.now() - startedAt,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
