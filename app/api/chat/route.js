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

// Time budgets
const VISION_TIMEOUT_MS = 20000
const ANSWER_TIMEOUT_MS = 35000
const RETRIEVAL_TIMEOUT_MS = 9000

// Retrieval
const TOPK = 18
const PINNED_TOPK = 10

// These two are “always fetch” so they shape every response (text + image).
const PINNED_QUERIES = [
  'Washtenaw County Violation Types Priority Priority Foundation Core corrected immediately or within 10 days within 90 days',
  'Washtenaw County Enforcement Action summary enforcement action imminent health hazard progressive enforcement office conference informal hearing formal hearing appeal',
]

// Washtenaw framing (kept short, and grounded in your Washtenaw docs)
const WASHTENAW_RULES = `
Violation classes used by Washtenaw County:
P (Priority): directly reduces a foodborne illness hazard.
Pf (Priority Foundation): supports Priority compliance (supplies, equipment, facilities, programs).
C (Core): general sanitation and facility maintenance.

Correction timing used by Washtenaw County:
P and Pf: correct immediately at inspection or within 10 days. If not permanently corrected at inspection, a follow-up may occur.
C: correct within 90 days.

Enforcement overview in Washtenaw County:
Summary enforcement action is used for imminent health hazards and can include immediate limitation, suspension, or revocation of a license. Imminent hazards can include no water/power, an uncontained outbreak, severe pests, sewage backup, fire, flood, or other immediate public danger.
If violations do not pose an imminent hazard, progressive enforcement is used with multiple opportunities to correct (routine/follow-up process, then office conference, then informal hearing, then license action with an appeal option).
`

const SOURCE_PRIORITY = {
  washtenaw: [
    /washtenaw/i,
    /violation\s*types/i,
    /enforcement\s*action/i,
    /inspection.*program/i,
    /inspection\s*report\s*types/i,
    /food\s*service\s*inspection/i,
  ],
  michigan: [
    /mi.*modified.*food.*code/i,
    /michigan.*food/i,
    /mcl.*act.*92/i,
    /administration.*enforcement.*michigan/i,
    /procedures.*administration.*enforcement/i,
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
    /fog/i,
  ],
}

const ALLOWED_LIKELIHOOD = new Set(['Very likely', 'Likely', 'Possible', 'Unclear'])
const ALLOWED_CLASS = new Set(['P', 'Pf', 'C', 'Unclear'])

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

function wantsFullAudit(text) {
  const t = safeText(text).toLowerCase()
  if (!t) return false
  return (
    t.includes('full audit') ||
    t.includes('full-audit') ||
    t.includes('everything you see') ||
    t.includes('check everything') ||
    t.includes('scan everything') ||
    t.includes('complete audit')
  )
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
    const key = (it?.text || '').slice(0, 1600)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function buildExcerptContext(docs) {
  // We number excerpts internally so the model can cite by excerpt id,
  // but we DO NOT show excerpt numbers in the user-facing output.
  const MAX_CHARS = 36000
  const excerpts = []
  let buf = ''
  let id = 1

  for (const d of docs || []) {
    const source = safeText(d?.source || 'Unknown Source')
    const page = d?.page ? ` (p. ${d.page})` : ''
    const text = safeText(d?.text || '')
    if (!text) continue

    const header = `[EXCERPT_${id}] SOURCE: ${source}${page}\n`
    const chunk = `${header}${text}\n\n`
    if (buf.length + chunk.length > MAX_CHARS) break

    excerpts.push({
      id: `EXCERPT_${id}`,
      source,
      page: d?.page || null,
      tier: getSourceTier(source),
    })

    buf += chunk
    id++
  }

  return {
    excerptIndex: excerpts,
    contextText: buf.trim(),
  }
}

function sanitizePlainText(text) {
  let out = safeText(text || '')

  // strip common markdown triggers / formatting noise
  out = out.replace(/[`#*]/g, '')
  out = out.replace(/\u2022/g, '') // bullet char
  out = out.replace(/_{2,}/g, '_')
  out = out.replace(/\n{3,}/g, '\n\n')

  // remove emoji / pictographs when supported
  try {
    out = out.replace(/\p{Extended_Pictographic}/gu, '')
    out = out.replace(/\uFE0F/gu, '')
  } catch {}

  // remove numbered-list prefixes at start of lines (keeps temps/times intact)
  out = out.replace(/^\s*\d+[\)\.\:\-]\s+/gm, '')

  // keep it tight
  const HARD_LIMIT = 2600
  if (out.length > HARD_LIMIT) {
    out = out.slice(0, HARD_LIMIT).trimEnd()
    out += '\nIf you want, say "full audit" and I will list more items.'
  }

  return out.trim()
}

function extractJsonObject(text) {
  const raw = safeText(text || '')
  if (!raw) return null

  // Strip ```json fences if present
  const unfenced = raw.replace(/```json/gi, '```').replace(/```/g, '')

  const first = unfenced.indexOf('{')
  const last = unfenced.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null

  const candidate = unfenced.slice(first, last + 1)
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

function computeDeadlineByClass(cls) {
  if (cls === 'P' || cls === 'Pf') return 'Immediately or within 10 days'
  if (cls === 'C') return 'Within 90 days'
  return 'Unclear'
}

function normalizeLikelihood(x) {
  const v = safeText(x)
  if (ALLOWED_LIKELIHOOD.has(v)) return v
  return 'Unclear'
}

function normalizeClass(x) {
  const v = safeText(x)
  if (ALLOWED_CLASS.has(v)) return v
  return 'Unclear'
}

function pickSourcesFromIds(sourceIds, excerptIndex) {
  const map = new Map(excerptIndex.map((e) => [e.id, e]))
  const used = []
  for (const sid of sourceIds || []) {
    const id = safeText(sid)
    if (!id) continue
    const ex = map.get(id)
    if (!ex) continue
    used.push(ex)
  }
  // de-dupe by source+page
  const seen = new Set()
  const out = []
  for (const u of used) {
    const k = `${u.source}::${u.page || ''}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(u)
  }
  return out
}

function renderAuditPlainText(payload, excerptIndex, maxItems) {
  const opening = sanitizePlainText(payload?.opening_line || '')
  const findings = Array.isArray(payload?.findings) ? payload.findings : []
  const questions = Array.isArray(payload?.clarifying_questions)
    ? payload.clarifying_questions
    : []

  const status = safeText(payload?.status || '')
  const out = []

  if (opening) out.push(opening)
  else out.push('Here is what I can tell from what was provided.')

  if (status === 'clear' || findings.length === 0) {
    // Keep it satisfying but still professional (UI can color it)
    // No scoring, no gimmicks.
    if (!opening) out.push('No clear violations visible from this photo.')
    // If there are questions, ask them (sometimes “clear” still needs one check).
    if (questions.length > 0) {
      out.push('')
      for (const q of questions.slice(0, 3)) {
        const qq = sanitizePlainText(q)
        if (!qq) continue
        out.push(`Question: ${qq}`)
      }
    }
    return sanitizePlainText(out.join('\n'))
  }

  const trimmed = findings.slice(0, maxItems)

  for (const f of trimmed) {
    const cls = normalizeClass(f?.class)
    const likelihood = normalizeLikelihood(f?.likelihood)
    const title = sanitizePlainText(f?.title || 'Possible issue')
    const why = sanitizePlainText(f?.why || '')
    const fix = sanitizePlainText(f?.fix || '')
    const deadlineRaw = sanitizePlainText(f?.deadline || '')
    const deadline = deadlineRaw || computeDeadlineByClass(cls)

    const srcIds = Array.isArray(f?.source_ids) ? f.source_ids : []
    const sources = pickSourcesFromIds(srcIds, excerptIndex)

    out.push('')
    out.push(`[${cls}] ${title} (Likelihood: ${likelihood})`)
    if (why) out.push(`Why: ${why}`)
    if (fix) out.push(`Fix: ${fix}`)
    out.push(`Deadline: ${deadline}`)

    if (sources.length > 0) {
      const srcLine = sources
        .slice(0, 2)
        .map((s) => (s.page ? `${s.source} (p. ${s.page})` : `${s.source}`))
        .join('; ')
      out.push(`Source: ${srcLine}`)
    } else {
      out.push('Source: Unclear (no matching excerpt was provided)')
    }
  }

  if (questions.length > 0) {
    out.push('')
    for (const q of questions.slice(0, 3)) {
      const qq = sanitizePlainText(q)
      if (!qq) continue
      out.push(`Question: ${qq}`)
    }
  }

  return sanitizePlainText(out.join('\n'))
}

function renderGuidancePlainText(payload, excerptIndex) {
  const opening = sanitizePlainText(payload?.opening_line || '')
  const steps = Array.isArray(payload?.guidance_steps) ? payload.guidance_steps : []
  const vio = Array.isArray(payload?.optional_violation_context)
    ? payload.optional_violation_context
    : []
  const questions = Array.isArray(payload?.clarifying_questions)
    ? payload.clarifying_questions
    : []

  const out = []
  if (opening) out.push(opening)
  else out.push('Here is the safest way to handle that.')

  for (const s of steps.slice(0, 6)) {
    const line = sanitizePlainText(s)
    if (!line) continue
    out.push(`Do: ${line}`)
  }

  // Only add violation framing if it truly helps.
  for (const v of vio.slice(0, 2)) {
    const cls = normalizeClass(v?.class)
    const likelihood = normalizeLikelihood(v?.likelihood)
    const title = sanitizePlainText(v?.title || 'Potential violation')
    const why = sanitizePlainText(v?.why || '')
    const srcIds = Array.isArray(v?.source_ids) ? v.source_ids : []
    const sources = pickSourcesFromIds(srcIds, excerptIndex)

    out.push('')
    out.push(`If this isn’t followed, it could be flagged as: [${cls}] ${title} (Likelihood: ${likelihood})`)
    if (why) out.push(`Why: ${why}`)
    if (sources.length > 0) {
      const srcLine = sources
        .slice(0, 2)
        .map((s) => (s.page ? `${s.source} (p. ${s.page})` : `${s.source}`))
        .join('; ')
      out.push(`Source: ${srcLine}`)
    }
  }

  if (questions.length > 0) {
    out.push('')
    for (const q of questions.slice(0, 3)) {
      const qq = sanitizePlainText(q)
      if (!qq) continue
      out.push(`Question: ${qq}`)
    }
  }

  return sanitizePlainText(out.join('\n'))
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

    const lastUserText = getLastUserText(messages)
    const effectiveUserPrompt =
      lastUserText || (hasImage ? 'Analyze this photo for food safety issues.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    const fullAudit = wantsFullAudit(effectiveUserPrompt) || Boolean(body?.fullAudit)
    const maxFindings = fullAudit ? 10 : 4

    // Auth (non-blocking)
    let userId = null
    try {
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

    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    // 1) Conservative vision scan (only: visible facts + conservative “possible issues” + search terms)
    let vision = {
      summary: '',
      search_terms: '',
      visible_facts: [],
      possible_issues: [],
      unclear: [],
    }

    if (hasImage && imageBase64) {
      try {
        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            temperature: 0,
            max_tokens: 500,
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
                    text: `You are doing a conservative kitchen photo scan.
Rules:
- Only describe what is clearly visible.
- Only list an "issue" if it is visible; otherwise put it in "unclear".
- Do NOT guess times/temperatures, do NOT assume a violation.

Return ONLY valid JSON:
{
  "summary": "one short sentence about what the photo shows",
  "search_terms": "short keywords for regulation lookup",
  "visible_facts": ["short factual observations (no guesses)"],
  "possible_issues": [
    {"issue":"short issue","likelihood":"Possible","needs_check":"what to verify with thermometer/label/test strip/etc"}
  ],
  "unclear": ["things you cannot confirm from the photo"]
}
No emojis. No numbered lists.`,
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

        const parsed = extractJsonObject(visionText)
        if (parsed) {
          vision.summary = safeText(parsed.summary || '')
          vision.search_terms = safeText(parsed.search_terms || '')
          if (Array.isArray(parsed.visible_facts)) {
            vision.visible_facts = parsed.visible_facts
              .map((x) => safeText(x))
              .filter(Boolean)
              .slice(0, 10)
          }
          if (Array.isArray(parsed.possible_issues)) {
            vision.possible_issues = parsed.possible_issues
              .map((i) => ({
                issue: safeText(i?.issue || ''),
                likelihood: 'Possible',
                needs_check: safeText(i?.needs_check || ''),
              }))
              .filter((i) => i.issue)
              .slice(0, 8)
          }
          if (Array.isArray(parsed.unclear)) {
            vision.unclear = parsed.unclear.map((x) => safeText(x)).filter(Boolean).slice(0, 8)
          }
        } else {
          vision.summary = safeText(visionText).slice(0, 220)
        }
      } catch (e) {
        logger.warn('Vision failed (continuing)', { error: e?.message })
      }
    }

    // 2) Retrieval (main query + pinned Washtenaw shaping docs)
    const retrievalQuery = [
      effectiveUserPrompt,
      vision.search_terms,
      'Washtenaw County Michigan food service',
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 900)

    let docs = []
    try {
      const main = withTimeout(
        searchDocumentsFn(retrievalQuery, county, TOPK),
        RETRIEVAL_TIMEOUT_MS,
        'RETRIEVAL_TIMEOUT_MAIN'
      )

      const pinned = Promise.all(
        PINNED_QUERIES.map((q) =>
          withTimeout(
            searchDocumentsFn(q, county, PINNED_TOPK),
            RETRIEVAL_TIMEOUT_MS,
            'RETRIEVAL_TIMEOUT_PINNED'
          ).catch(() => [])
        )
      )

      const [mainDocs, pinnedDocsList] = await Promise.all([main.catch(() => []), pinned])

      docs = [...(mainDocs || []), ...((pinnedDocsList || []).flat() || [])]
      docs = dedupeByText(docs)
    } catch (e) {
      logger.warn('Retrieval failed (continuing)', { error: e?.message })
    }

    // Sort by tier (Washtenaw first) then score
    docs.sort((a, b) => {
      const tierA = getSourceTier(a?.source)
      const tierB = getSourceTier(b?.source)
      if (tierA !== tierB) return tierA - tierB
      return (b?.score || 0) - (a?.score || 0)
    })

    const { excerptIndex, contextText } = buildExcerptContext(docs)

    // 3) Final answer: model returns JSON ONLY, server renders clean plain-text.
    const systemPrompt = `You are ProtocolLM, a compliance assistant for Washtenaw County, Michigan food service establishments.

Primary goals:
- Be actionable, concise, and easy for any employee to understand.
- Be conservative about calling something a violation. If it is not clearly supported by the photo or the excerpts, mark it Unclear and say what to verify.
- Never claim certainty. Never use confidence percentages.
- Use these likelihood words only: Very likely, Likely, Possible, Unclear.
- Plain language. No emojis. No markdown. No hashtags. No asterisks. No numbered lists.

Critical grounding rules:
- Use ONLY the provided "Relevant excerpts" as your regulatory basis.
- If something is not in the excerpts, say Unclear and ask a clarifying question or recommend checking with the Person In Charge / local health department.
- Every finding or violation context MUST cite at least one excerpt id (EXCERPT_#) in "source_ids". If you cannot cite it, mark it Unclear.

Washtenaw framing:
${WASHTENAW_RULES}

Decide response mode:
- If a photo is provided: mode = "audit"
- If no photo: mode = "guidance"

Return ONLY valid JSON in this schema (no extra text):
{
  "mode": "audit" | "guidance",
  "opening_line": "one short sentence summarizing the answer",
  "audit": {
    "status": "clear" | "findings" | "needs_info",
    "findings": [
      {
        "class": "P" | "Pf" | "C" | "Unclear",
        "title": "short issue name",
        "likelihood": "Very likely" | "Likely" | "Possible" | "Unclear",
        "why": "one short sentence",
        "fix": "one short sentence",
        "deadline": "Immediately or within 10 days" | "Within 90 days" | "Unclear",
        "source_ids": ["EXCERPT_1"]
      }
    ]
  },
  "guidance_steps": ["short do-this steps"],
  "optional_violation_context": [
    {
      "class":"P"|"Pf"|"C"|"Unclear",
      "title":"short name",
      "likelihood":"Possible"|"Unclear"|"Likely"|"Very likely",
      "why":"one short sentence",
      "source_ids":["EXCERPT_2"]
    }
  ],
  "clarifying_questions": ["up to 3 short questions only if needed"]
}

Hard caps:
- In audit mode: max findings = ${maxFindings}
- Keep everything short.`

    const factsBlock =
      vision.visible_facts?.length > 0
        ? `Visible facts from photo (no guesses):\n${vision.visible_facts
            .map((x) => `- ${x}`)
            .join('\n')}`
        : 'Visible facts from photo: None provided.'

    const possibleIssuesBlock =
      vision.possible_issues?.length > 0
        ? `Conservative possible issues (need verification):\n${vision.possible_issues
            .map((x) => `- ${x.issue}${x.needs_check ? ` (Verify: ${x.needs_check})` : ''}`)
            .join('\n')}`
        : 'Conservative possible issues: None listed.'

    const userPrompt = `User request:
${effectiveUserPrompt || (hasImage ? 'Analyze photo.' : '')}

Photo summary:
${vision.summary || (hasImage ? 'No summary available.' : 'No photo provided.')}

${hasImage ? `${factsBlock}\n\n${possibleIssuesBlock}` : ''}

Relevant excerpts (cite by EXCERPT id only):
${contextText || 'No excerpts retrieved.'}`

    let modelText = ''
    let parsed = null

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
          temperature: 0.2,
          max_tokens: fullAudit ? 1400 : 1000,
          system: systemPrompt,
          messages: finalMessages,
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      modelText = answerResp.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')

      parsed = extractJsonObject(modelText)
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })
    }

    // 4) Render response (server-side) to guarantee clean formatting
    let message = ''
    let status = 'unknown'

    if (parsed && parsed.mode === 'audit') {
      const auditPayload = parsed.audit || {}
      const audit = {
        status: safeText(auditPayload.status || 'findings'),
        opening_line: parsed.opening_line || '',
        findings: Array.isArray(auditPayload.findings) ? auditPayload.findings : [],
        clarifying_questions: Array.isArray(parsed.clarifying_questions)
          ? parsed.clarifying_questions
          : [],
      }

      // Enforce caps + enforce sources exist (otherwise downgrade to Unclear)
      const cleanedFindings = []
      for (const f of (audit.findings || []).slice(0, maxFindings)) {
        const sourceIds = Array.isArray(f?.source_ids) ? f.source_ids : []
        const usableSources = pickSourcesFromIds(sourceIds, excerptIndex)
        if (!usableSources.length) {
          cleanedFindings.push({
            class: 'Unclear',
            title: safeText(f?.title || 'Possible issue'),
            likelihood: 'Unclear',
            why: 'Not enough supporting information in the provided excerpts.',
            fix: 'Ask the Person In Charge to verify and check the applicable section.',
            deadline: 'Unclear',
            source_ids: [],
          })
        } else {
          cleanedFindings.push({
            class: normalizeClass(f?.class),
            title: safeText(f?.title || ''),
            likelihood: normalizeLikelihood(f?.likelihood),
            why: safeText(f?.why || ''),
            fix: safeText(f?.fix || ''),
            deadline: safeText(f?.deadline || ''),
            source_ids: usableSources.map((s) => {
              // Keep the model’s ids if valid; this is just a safe fallback
              // but we still store excerpt ids in output.
              const match = excerptIndex.find(
                (e) => e.source === s.source && (e.page || null) === (s.page || null)
              )
              return match?.id || ''
            }).filter(Boolean),
          })
        }
      }

      const opening = safeText(parsed.opening_line || '') || 'No clear violations visible from this photo.'
      const statusRaw = safeText(audit.status || '')
      status = statusRaw === 'clear' ? 'clear' : 'findings'

      message = renderAuditPlainText(
        {
          status: statusRaw,
          opening_line: opening,
          findings: cleanedFindings,
          clarifying_questions: audit.clarifying_questions,
        },
        excerptIndex,
        maxFindings
      )

      // If model said clear and we truly have no findings, keep it “satisfying”
      if ((statusRaw === 'clear' || cleanedFindings.length === 0) && hasImage) {
        status = 'clear'
      }
    } else if (parsed && parsed.mode === 'guidance') {
      status = 'guidance'
      message = renderGuidancePlainText(
        {
          opening_line: parsed.opening_line || '',
          guidance_steps: Array.isArray(parsed.guidance_steps) ? parsed.guidance_steps : [],
          optional_violation_context: Array.isArray(parsed.optional_violation_context)
            ? parsed.optional_violation_context
            : [],
          clarifying_questions: Array.isArray(parsed.clarifying_questions)
            ? parsed.clarifying_questions
            : [],
        },
        excerptIndex
      )
    } else {
      // Fallback: best-effort clean output
      status = hasImage ? 'findings' : 'guidance'
      const fallback = modelText || (hasImage ? 'Analysis timed out. Please try again.' : 'Please try again.')
      message = sanitizePlainText(fallback)
    }

    logger.info('Response complete', {
      hasImage,
      status,
      totalDocsRetrieved: docs.length,
      washtenawDocsUsed: docs.filter((d) => getSourceTier(d?.source) === 1).length,
      durationMs: Date.now() - startedAt,
      model: CLAUDE_MODEL,
      fullAudit,
    })

    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json(
      {
        message,
        _meta: {
          model: CLAUDE_MODEL,
          hasImage,
          status, // "clear" | "findings" | "guidance" | "unknown"
          fullAudit,
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
