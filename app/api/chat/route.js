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
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

async function getSearchDocuments() {
  if (!searchDocuments) {
    const module = await import('@/lib/searchDocs')
    searchDocuments = module.searchDocuments
  }
  return searchDocuments
}

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const VISION_TIMEOUT_MS = 25000
const ANSWER_TIMEOUT_MS = 40000
const TOPK = 25
const PRIORITY_TOPK = 8

const WASHTENAW_VIOLATION_TYPES = `
## WASHTENAW COUNTY VIOLATION CLASSIFICATION SYSTEM
Source: Violation Types | Washtenaw County, MI (Official)

### PRIORITY (P) VIOLATIONS
Definition: Items that most directly eliminate or reduce a hazard associated with foodborne illness.
Correction Window: IMMEDIATELY at time of inspection OR within 10 days
Consequence: If repeated, leads to enforcement action

Examples of Priority violations:
- Failure to restrict ill employees from handling food
- Failure of food employees to wash their hands when required
- Food employees touching ready-to-eat foods with bare hands
- Failure to cook raw meats to safe temperature
- Failure to cool foods cooked ahead of time rapidly
- Failure to reheat foods made ahead of time rapidly
- Failure to store refrigerated foods at or below 41°F
- Failure to hold hot foods at or above 135°F
- Cross contamination between raw (uncooked) and ready-to-eat foods
- Failure to clean and sanitize equipment/utensils that contact food
- Presence of pests in the establishment
- Failure to use, store, or label cleaners/poisons/toxic chemicals properly
- Absence of knowledgeable person-in-charge during operation

### PRIORITY FOUNDATION (Pf) VIOLATIONS
Definition: Items that help keep Priority violations in compliance and support Priority items.
Correction Window: Within 10 days
Consequence: If repeated, leads to enforcement action

Examples of Priority Foundation violations:
- Not having a metal stem thermometer
- Not having sanitizer test strips
- Not having soap at hand sink
- Not having paper towels at hand sink
- Inadequate handwashing facilities

### CORE (C) VIOLATIONS
Definition: Items related to general sanitation and facility maintenance.
Correction Window: Within 90 days

Examples of Core violations:
- Failure to keep floors, walls, ceilings clean
- Failure of food employees to wear hair restraints
- Facility or equipment in disrepair
- Improper facility lighting
`

const WASHTENAW_ENFORCEMENT = `
## WASHTENAW COUNTY ENFORCEMENT PROCEDURES
Source: Enforcement Action | Washtenaw County, MI (Official)

### SUMMARY ENFORCEMENT (IMMEDIATE CLOSURE)
Triggered by: Imminent health hazards
Action: Immediate limitation, suspension, or revocation of license
Reopening: Only after correcting all violations

Imminent Health Hazards that trigger immediate closure:
- Lack of water or electrical power
- Uncontained foodborne illness outbreak
- Severe pest infestation
- Back-up of sewage in kitchen
- Fire
- Flood
- Any situation where public is in immediate danger

### PROGRESSIVE ENFORCEMENT (Non-Imminent Violations)
Per Michigan Administrative Procedures Act, license holders get 3 opportunities:

**Opportunity 1:** Correct during routine/follow-up inspection
→ If failed: Called to Office Conference

**Opportunity 2:** Correct immediately after Office Conference
→ If failed: Called to Informal Hearing

**Opportunity 3:** Correct immediately after Informal Hearing
→ If failed: License limited, suspended, or revoked
→ May request Formal Hearing before Washtenaw County Environmental Health Food Service Board to appeal
`

const SOURCE_PRIORITY = {
  washtenaw: [
    /washtenaw/i,
    /violation\s*types/i,
    /enforcement\s*action/i,
    /inspection.*program/i,
    /food\s*allergy.*washtenaw/i,
  ],
  michigan: [
    /mi.*modified.*food.*code/i,
    /michigan.*food/i,
    /mcl.*act.*92/i,
    /procedures.*administration.*enforcement.*michigan/i,
  ],
  fda: [
    /fda.*food.*code/i,
  ],
  guides: [
    /cooking.*temp/i,
    /cooling.*foods/i,
    /cross.*contam/i,
    /date.*mark/i,
    /internal.*temp/i,
    /safe.*minimum/i,
    /3.*comp.*sink/i,
    /consumer.*advisory/i,
    /norovirus/i,
    /emergency.*action/i,
  ],
}

const TOPIC_KEYWORDS = {
  temperature: ['temp', 'cold', 'hot', 'holding', 'cooling', 'cooking', 'thaw', 'refrigerat', '41', '135', '165', 'thermometer', 'danger zone'],
  sanitation: ['clean', 'sanitiz', 'wash', 'dirty', 'soil', 'debris', 'pest', 'rodent', 'insect', 'roach', 'mouse', 'rat'],
  storage: ['storage', 'shelf', 'container', 'label', 'date mark', 'fifo', 'cover', 'raw', 'ready-to-eat', '7 day'],
  equipment: ['equipment', 'sink', 'refrigerator', 'freezer', 'hood', 'vent', 'broken', 'repair', 'thermometer'],
  personnel: ['handwash', 'glove', 'hair', 'sick', 'ill', 'vomit', 'diarrhea', 'bare hand', 'employee'],
  crosscontam: ['cross', 'contam', 'raw meat', 'above', 'below', 'separate', 'ready-to-eat'],
  chemicals: ['chemical', 'toxic', 'poison', 'cleaner', 'sanitizer', 'label'],
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

function detectTopics(text) {
  const lower = text.toLowerCase()
  const detected = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(topic)
    }
  }
  return detected
}

function enrichQuery(originalQuery, visionContext = '', detectedTopics = []) {
  const parts = [originalQuery]
  parts.push('Washtenaw County Michigan food service violation')
  
  if (detectedTopics.includes('temperature')) {
    parts.push('temperature TCS 41F 135F cold holding hot holding')
  }
  if (detectedTopics.includes('crosscontam')) {
    parts.push('cross contamination raw ready-to-eat storage')
  }
  if (detectedTopics.includes('sanitation')) {
    parts.push('cleaning sanitizing food contact surfaces')
  }
  if (detectedTopics.includes('storage')) {
    parts.push('food storage labeling date marking 7 day')
  }
  if (detectedTopics.includes('personnel')) {
    parts.push('handwashing employee health bare hand contact')
  }
  
  if (visionContext) {
    parts.push(visionContext)
  }
  
  return parts.filter(Boolean).join(' ')
}

function getSourceTier(source) {
  if (!source) return 5
  for (const pattern of SOURCE_PRIORITY.washtenaw) {
    if (pattern.test(source)) return 1
  }
  for (const pattern of SOURCE_PRIORITY.michigan) {
    if (pattern.test(source)) return 2
  }
  for (const pattern of SOURCE_PRIORITY.fda) {
    if (pattern.test(source)) return 3
  }
  for (const pattern of SOURCE_PRIORITY.guides) {
    if (pattern.test(source)) return 4
  }
  return 5
}

function dedupeByText(items) {
  const seen = new Set()
  const out = []
  for (const it of items || []) {
    const key = (it?.text || '').slice(0, 2000)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

function buildContextString(docs) {
  const MAX_CHARS = 55000
  
  const tiers = {
    1: docs.filter(d => getSourceTier(d.source) === 1),
    2: docs.filter(d => getSourceTier(d.source) === 2),
    3: docs.filter(d => getSourceTier(d.source) === 3),
    4: docs.filter(d => getSourceTier(d.source) === 4),
    5: docs.filter(d => getSourceTier(d.source) === 5),
  }
  
  let buf = ''
  
  if (tiers[1].length > 0) {
    buf += '═══════════════════════════════════════════════════════════\n'
    buf += '📍 WASHTENAW COUNTY SPECIFIC REGULATIONS\n'
    buf += '═══════════════════════════════════════════════════════════\n\n'
    for (const d of tiers[1]) {
      const chunk = `[${d.source}${d.page ? `, pg ${d.page}` : ''}]\n${d.text}\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS * 0.35) break
      buf += chunk
    }
  }
  
  if (tiers[2].length > 0 && buf.length < MAX_CHARS * 0.6) {
    buf += '\n═══════════════════════════════════════════════════════════\n'
    buf += '📋 MICHIGAN STATE FOOD CODE\n'
    buf += '═══════════════════════════════════════════════════════════\n\n'
    for (const d of tiers[2]) {
      const chunk = `[${d.source}${d.page ? `, pg ${d.page}` : ''}]\n${d.text}\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS * 0.7) break
      buf += chunk
    }
  }
  
  const remaining = [...tiers[3], ...tiers[4], ...tiers[5]]
  if (remaining.length > 0 && buf.length < MAX_CHARS * 0.85) {
    buf += '\n═══════════════════════════════════════════════════════════\n'
    buf += '📚 ADDITIONAL REGULATORY GUIDANCE\n'
    buf += '═══════════════════════════════════════════════════════════\n\n'
    for (const d of remaining) {
      const chunk = `[${d.source}${d.page ? `, pg ${d.page}` : ''}]\n${d.text}\n\n`
      if ((buf.length + chunk.length) > MAX_CHARS) break
      buf += chunk
    }
  }
  
  return buf.trim()
}

function calculateConfidence(docs, visionIssues, hasImage) {
  let score = 50
  
  const washtenawCount = docs.filter(d => getSourceTier(d.source) === 1).length
  if (washtenawCount >= 2) score += 20
  else if (washtenawCount >= 1) score += 10
  
  const michiganCount = docs.filter(d => getSourceTier(d.source) === 2).length
  if (michiganCount >= 2) score += 15
  
  if (docs.length >= 12) score += 10
  else if (docs.length >= 6) score += 5
  
  if (hasImage && visionIssues.length >= 2) score += 15
  else if (hasImage && visionIssues.length === 1) score += 10
  else if (hasImage && visionIssues.length === 0) score -= 5
  
  if (score >= 75) return 'HIGH'
  if (score >= 55) return 'MEDIUM'
  return 'LOW'
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
      // ✅ FIXED: await cookies()
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
    const effectiveUserPrompt = lastUserText || (hasImage ? 'Analyze this photo for health code violations.' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    const detectedTopics = detectTopics(effectiveUserPrompt)

    const anthropic = await getAnthropicClient()
    const searchDocumentsFn = await getSearchDocuments()

    let visionSummary = ''
    let visionSearchTerms = ''
    let visionIssues = []
    
    if (hasImage && imageBase64) {
      try {
        logger.info('Vision analysis started')

        const visionMessages = [
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
                text: `You are a Washtenaw County health inspector. Analyze this photo for food safety issues.

Return ONLY valid JSON:
{
  "area": "kitchen/walk-in/prep/storage/other",
  "summary": "What you observe (2 sentences max)",
  "search_terms": "Keywords for regulation lookup",
  "issues": [
    {"issue": "Description", "severity": "critical/serious/minor", "category": "temperature/sanitation/storage/equipment/personnel/crosscontam/chemicals"}
  ],
  "positives": ["Good practices observed"],
  "unclear": ["What you cannot determine"]
}

FOCUS ON:
- Temperatures (read any visible thermometers)
- Storage order (raw below ready-to-eat?)
- Labels and dates
- Cleanliness of surfaces
- Equipment condition
- Pest evidence
- Chemical storage

Be specific. If you see "45°F" on a cooler thermometer, say that.`,
              },
            ],
          },
        ]

        const visionResp = await withTimeout(
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 800,
            messages: visionMessages,
          }),
          VISION_TIMEOUT_MS,
          'VISION_TIMEOUT'
        )

        const visionText = visionResp.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('')

        try {
          const jsonMatch = visionText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            visionSummary = safeText(parsed?.summary || '')
            visionSearchTerms = safeText(parsed?.search_terms || '')
            
            if (Array.isArray(parsed?.issues)) {
              visionIssues = parsed.issues.map(i => ({
                issue: safeText(i.issue || ''),
                severity: safeText(i.severity || 'minor'),
                category: safeText(i.category || 'other'),
              })).filter(i => i.issue)
            }
            
            visionIssues.forEach(i => {
              if (i.category && !detectedTopics.includes(i.category)) {
                detectedTopics.push(i.category)
              }
            })
          } else {
            visionSummary = safeText(visionText).slice(0, 400)
          }
        } catch {
          visionSummary = safeText(visionText).slice(0, 400)
        }

        logger.info('Vision complete', { issues: visionIssues.length })
      } catch (e) {
        logger.error('Vision failed', { error: e?.message })
        visionSummary = 'Vision analysis unavailable.'
      }
    }

    const retrievalQuery = enrichQuery(effectiveUserPrompt, visionSearchTerms, detectedTopics)

    logger.info('Searching documents', { topics: detectedTopics, queryLen: retrievalQuery.length })

    let docs = await searchDocumentsFn(retrievalQuery, county, TOPK)
    docs = dedupeByText(docs || [])

    const washtenawHits = docs.filter(d => getSourceTier(d.source) === 1).length
    if (washtenawHits < 2) {
      logger.warn('Low Washtenaw docs, fetching more', { hits: washtenawHits })
      const extra = await searchDocumentsFn(
        'Washtenaw County violation types enforcement action inspection food service',
        county,
        PRIORITY_TOPK
      )
      if (extra?.length) {
        docs = dedupeByText([...extra, ...(docs || [])])
      }
    }

    docs.sort((a, b) => {
      const tierA = getSourceTier(a.source)
      const tierB = getSourceTier(b.source)
      if (tierA !== tierB) return tierA - tierB
      return (b.score || 0) - (a.score || 0)
    })

    const retrievedContext = buildContextString(docs)
    const confidence = calculateConfidence(docs, visionIssues, hasImage)

    const systemPrompt = `You are ProtocolLM, the AI compliance assistant for Washtenaw County, Michigan food service establishments.

YOUR JOB: Help operators catch violations BEFORE the health inspector arrives.

${WASHTENAW_VIOLATION_TYPES}

${WASHTENAW_ENFORCEMENT}

## RESPONSE FORMAT (Keep it scannable - operators are busy)

### 📸 What I See
[1-2 sentences describing the situation/photo]

### 🚨 Violations Found

**[P] Violation Name** — XX% confidence
↳ **Why:** [1 sentence - the risk]
↳ **Fix:** [Specific action to take]
↳ **Deadline:** Immediate or 10 days
↳ **Ref:** [Source document]

**[Pf] Violation Name** — XX% confidence
↳ **Why:** [1 sentence]
↳ **Fix:** [Action]
↳ **Deadline:** 10 days
↳ **Ref:** [Source]

**[C] Violation Name** — XX% confidence
↳ **Why:** [1 sentence]
↳ **Fix:** [Action]
↳ **Deadline:** 90 days
↳ **Ref:** [Source]

### ✅ What's Good
[Note anything done correctly - 1-2 bullets max]

### ⚡ Do This Now
1. [Most urgent - today]
2. [Next priority]
3. [Can wait]

---

## CRITICAL RULES

**ALWAYS DO:**
✓ Classify EVERY violation as P, Pf, or C per Washtenaw County definitions above
✓ Use the exact correction deadlines: Immediate/10 days (P/Pf) or 90 days (C)
✓ Give confidence % (90%+ only for obvious issues you can clearly see)
✓ Cite sources (prefer Washtenaw County docs, then MI Food Code, then FDA)
✓ Put Priority violations first
✓ Be direct about clear violations - "This IS a Priority violation" not "may be"
✓ Keep each violation to 4 lines max

**NEVER DO:**
✗ List more than 4 violations unless asked for complete audit
✗ Say "potential" or "possible" for obvious issues
✗ Write paragraphs - bullet points only
✗ Cite sources not in the provided documents
✗ Skip the classification (P/Pf/C)
✗ Forget the correction deadline

## QUICK REFERENCE

**Temperature Requirements:**
- Cold TCS foods: ≤41°F (≤5°C)
- Hot holding: ≥135°F (≥57°C)
- Danger zone: 41-135°F
- Cooling: 135→70°F in 2 hrs, 70→41°F in 4 hrs (6 hr max total)
- Cooking: Poultry 165°F, Ground meat 155°F, Whole cuts 145°F, Fish 145°F

**Common Priority Violations (immediate/10 days):**
- TCS food in danger zone (41-135°F)
- Bare hand contact with ready-to-eat food
- Sick employee working
- No handwashing
- Raw meat stored above ready-to-eat
- Pests present
- Toxic chemicals near food

**Common Pf Violations (10 days):**
- No thermometer
- No sanitizer test strips
- No soap/towels at hand sink

**Immediate Closure Triggers:**
- No water/power
- Sewage backup
- Severe pest infestation
- Foodborne illness outbreak

Remember: One avoided Priority violation saves them $200-500+. Be helpful, be accurate, be fast.`

    let issuesText = ''
    if (visionIssues.length > 0) {
      issuesText = '\n\n**Issues spotted in photo:**\n'
      visionIssues.forEach((v, i) => {
        const emoji = v.severity === 'critical' ? '🔴' : v.severity === 'serious' ? '🟠' : '🟡'
        issuesText += `${i + 1}. ${emoji} ${v.issue} [${v.category}]\n`
      })
    }

    const userPrompt = `**USER QUESTION:**
${effectiveUserPrompt || '[Analyze photo]'}

**PHOTO ANALYSIS:**
${visionSummary || '[No photo provided]'}${issuesText}

**RETRIEVED REGULATIONS:**
${retrievedContext || '[No additional context retrieved]'}`

    let finalText = ''
    try {
      logger.info('Generating response')

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
          max_tokens: 1600,
          system: systemPrompt,
          messages: finalMessages,
        }),
        ANSWER_TIMEOUT_MS,
        'ANSWER_TIMEOUT'
      )

      finalText = answerResp.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
    } catch (e) {
      logger.error('Generation failed', { error: e?.message })
      
      if (visionSummary && visionIssues.length > 0) {
        const fallback = visionIssues.map(v => {
          const sev = v.severity === 'critical' ? '[P]' : v.severity === 'serious' ? '[Pf]' : '[C]'
          return `${sev} ${v.issue}`
        }).join('\n')
        
        return NextResponse.json({
          message: `⚠️ Full analysis timed out. Quick assessment:\n\n${visionSummary}\n\n**Potential issues:**\n${fallback}\n\nTry again for complete classification and code references.`,
          confidence: 'LOW',
        }, { status: 200 })
      }
      
      return NextResponse.json({
        message: 'Analysis timed out. Please try again or simplify your question.',
        confidence: 'LOW',
      }, { status: 200 })
    }

    const washtenawDocsUsed = docs.filter(d => getSourceTier(d.source) === 1).length
    const michiganDocsUsed = docs.filter(d => getSourceTier(d.source) === 2).length

    logger.info('Response complete', {
      washtenawDocs: washtenawDocsUsed,
      michiganDocs: michiganDocsUsed,
      totalDocs: docs.length,
      hasImage,
      visionIssues: visionIssues.length,
      confidence,
      durationMs: Date.now() - startedAt,
    })

    await safeLogUsage({
      userId,
      mode: hasImage ? 'vision' : 'chat',
      success: true,
      durationMs: Date.now() - startedAt,
    })

    return NextResponse.json({
      message: finalText || 'No response generated.',
      confidence,
      _meta: {
        washtenawDocsUsed,
        michiganDocsUsed,
        totalDocsRetrieved: docs.length,
        visionIssuesSpotted: visionIssues.length,
        detectedTopics,
        model: CLAUDE_MODEL,
        durationMs: Date.now() - startedAt,
      }
    }, { status: 200 })
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message })
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}
