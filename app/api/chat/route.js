import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit, incrementUsage } from '@/lib/rateLimit'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { trackEvent } from '@/lib/analytics'
import { logError, logPerformance } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

// --- 1. OPENAI CONFIG ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const OPENAI_CHAT_MODEL = 'gpt-4.1-mini' // can swap later if you want

// --- 2. GENERATION / LIMITS ---
const GENERATION_CONFIG = {
  maxOutputTokens: 1200,
  temperature: 0.1,
  topP: 0.8,
}

const MAX_CONTEXT_LENGTH = 20000
const MAX_IMAGE_SIZE_MB = 10
const DEMO_LIMIT = 3

const VISION_TIMEOUT = 12000
const SEARCH_TIMEOUT = 10000
const GENERATION_TIMEOUT = 35000

const timeoutPromise = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

const REQUIRED_VARS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'OPENAI_API_KEY']
REQUIRED_VARS.forEach((v) => {
  if (!process.env[v]) console.error(`CRITICAL: Missing Env Var ${v}`)
})

// --- 3. HELPERS ---
function sanitizeInput(input, maxLength = 4000) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/\0/g, '')
    .replace(/[\u202A-\u202E]/g, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .trim()
    .substring(0, maxLength)
}

function getHistoryContext(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return ''
  const history = messages.slice(-7, -1)
  return history
    .map((m) => {
      const role = m.role === 'user' ? 'USER' : 'AI_ASSISTANT'
      const imgNote = m.image ? '[User uploaded an image here]' : ''
      return `${role}: ${m.content} ${imgNote}`
    })
    .join('\n\n')
}

function validateMessages(messages) {
  if (!Array.isArray(messages)) return []
  return messages.slice(-10).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: sanitizeInput(msg.content),
    image: msg.image || null,
  }))
}

function validateImage(base64String) {
  if (!base64String) return null
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  const cleanBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String
  if (!base64Regex.test(cleanBase64)) throw new Error('Invalid image format')
  const sizeInBytes = (cleanBase64.length * 3) / 4
  if (sizeInBytes > MAX_IMAGE_SIZE_MB * 1024 * 1024) throw new Error(`Image too large (Max ${MAX_IMAGE_SIZE_MB}MB)`)
  return cleanBase64
}

// --- 4. HANDLERS ---
export async function POST(req) {
  console.log('[API STEP 1] Request Received')
  const startTime = Date.now()

  try {
    const serviceEnabled = await isServiceEnabled()
    if (!serviceEnabled) {
      const message = await getMaintenanceMessage()
      return NextResponse.json({ error: message, maintenance: true }, { status: 503 })
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const body = await req.json()
    const messages = validateMessages(body.messages || [])

    const historyText = getHistoryContext(messages)
    const lastMsgObj = messages[messages.length - 1] || {}
    let lastMessageText = lastMsgObj.content || ''

    if (!lastMessageText && !body.image) {
      if (!historyText && messages.length > 0) {
        messages[messages.length - 1].content = 'Analyze safety status based on previous image.'
        lastMessageText = messages[messages.length - 1].content
      }
    }

    let imageBase64 = null
    try {
      if (body.image) imageBase64 = validateImage(body.image)
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    // Feature Flag: Vision
    if (imageBase64) {
      const { data: imageFlag } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_name', 'image_analysis_enabled')
        .maybeSingle()
      if (imageFlag?.enabled === false) {
        return NextResponse.json(
          { error: 'Image analysis is temporarily disabled.', code: 'IMAGE_DISABLED' },
          { status: 503 }
        )
      }
    }

    const chatId = body.chatId || null

    console.log('[API STEP 2] Checking Auth')
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'guest_ip'
    const userIdentifier = user ? user.id : body.deviceFingerprint || ip
    const isDemo = !user
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isAdmin = !!user && user.email === adminEmail

    if (isDemo) {
      const limitCheck = await checkRateLimit(userIdentifier, imageBase64 ? 'image' : 'text')
      if (!limitCheck.success) {
        return NextResponse.json(
          { error: 'Demo limit reached.', code: 'DEMO_LIMIT', requiresAuth: true },
          { status: 429 }
        )
      }
    }

    if (user && !isAdmin) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms, created_at')
        .eq('id', user.id)
        .single()

      if (!profile?.accepted_terms) {
        return NextResponse.json({ error: 'Terms not accepted' }, { status: 403 })
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle()

      let hasActiveSub = false
      if (sub && ['active', 'trialing'].includes(sub.status) && new Date(sub.current_period_end) > new Date()) {
        hasActiveSub = true
      }

      if (!hasActiveSub && profile?.created_at) {
        if (Date.now() - new Date(profile.created_at).getTime() < 600000) {
          hasActiveSub = true
        }
      }

      if (!hasActiveSub) {
        const { data: recentCheckout } = await supabase
          .from('checkout_attempts')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recentCheckout && Date.now() - new Date(recentCheckout.created_at).getTime() < 300000) {
          hasActiveSub = true
        }
      }

      if (!hasActiveSub) {
        return NextResponse.json(
          { error: 'Subscription required', code: 'NO_ACTIVE_SUBSCRIPTION' },
          { status: 402 }
        )
      }
    }

    // --- 3. VISION DESCRIPTION (OpenAI) ---
    let searchTerms = ''
    if (imageBase64) {
      console.log('[API STEP 3] Vision Start (OpenAI)')
      try {
        const messagesVision = [
          {
            role: 'system',
            content:
              'You are reviewing a single photo from a restaurant as a health inspector. Describe only what is visible, focusing on storage, separation, cleanliness, buildup, and obvious contamination risks.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Describe the visible food safety conditions in this image in plain text. Do not speculate about areas not shown.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ]

        const visionPromise = openai.chat.completions.create({
          model: OPENAI_CHAT_MODEL,
          messages: messagesVision,
          temperature: 0.1,
          max_tokens: 400,
        })

        const visionResult = await Promise.race([
          visionPromise,
          timeoutPromise(VISION_TIMEOUT, 'VISION_TIMEOUT'),
        ])

        searchTerms = visionResult?.choices?.[0]?.message?.content?.trim() || ''
        console.log('[API STEP 3] Vision Success:', searchTerms.substring(0, 100))
      } catch (visionError) {
        console.error('[API STEP 3] Vision Error:', visionError.message)
        searchTerms = lastMessageText || 'general food safety equipment cleanliness'
      }
    } else {
      searchTerms = lastMessageText || 'food safety code'
    }

    // --- 4. SEARCH CONTEXT (TEMP: may be empty while RAG is off) ---
    let context = ''
    if (searchTerms) {
      console.log('[API STEP 4] DB Search Start')
      try {
        const searchQuery = `${searchTerms}
Washtenaw County Michigan food service inspection violation types enforcement actions date marking cooling hot holding cold holding handwashing cross contamination temperature control ready-to-eat food`

        const searchPromise = searchDocuments(searchQuery, 'washtenaw', 25)
        const searchResults = await Promise.race([
          searchPromise,
          timeoutPromise(SEARCH_TIMEOUT, 'SEARCH_TIMEOUT'),
        ]).catch((searchError) => {
          console.error('[API STEP 4] Search Error:', searchError.message)
          return []
        })

        if (searchResults && searchResults.length > 0) {
          context = searchResults
            .map((doc) => `[SOURCE: ${doc.source}]\n${doc.text}`)
            .join('\n\n')
          console.log('[API STEP 4] Search Success: Found', searchResults.length, 'docs')
        } else {
          console.log('[API STEP 4] No search results found')
        }
      } catch (err) {
        console.error('[API STEP 4] Search Exception:', err)
      }
    }

    if (context && context.length > MAX_CONTEXT_LENGTH) {
      context = context.slice(0, MAX_CONTEXT_LENGTH)
    }

    // --- 5. SYSTEM PROMPT & FINAL CALL ---
    const SYSTEM_PROMPT = `You are ProtocolLM, a food safety and inspection assistant focused on restaurants in Washtenaw County, Michigan.

Your answers should read like concise inspection notes that a general manager can act on. You do three things:
1) Identify violations.
2) Explain the potential enforcement risk if they are not corrected.
3) Provide clear remediation steps.

Your tone is direct, clear, and professional. You sound like an experienced inspector who wants the operator to succeed. Keep sentences short and factual. Avoid filler language, academic wording, or long explanations.

AUTHORITY (INTERNAL ONLY)
When interpreting rules, use this hierarchy in your reasoning:
- First: Washtenaw County documents (violation types, enforcement actions, inspection program, local guidance).
- Second: Michigan documents (Michigan Modified Food Code, Michigan Food Law, state guidance).
- Third: Federal documents present in the context (FDA Food Code, USDA temperature charts, national guidance).
This hierarchy is for internal reasoning only. Do not mention documents, section numbers, or page numbers in your answer.

SOURCE OF TRUTH
Only rely on the regulatory context provided in this prompt combined with the authority hierarchy. Do not invent rules, temperatures, time limits, or enforcement steps. If the documents do not clearly address the question, say:
"I cannot find a specific requirement for that in the documents available in this tool. Contact the Washtenaw County Environmental Health Division or your local health department to confirm."

IMAGE BEHAVIOR
You will be told whether an image is present using IMAGE_PRESENT.

If IMAGE_PRESENT = "yes":
Treat the request as an inspection of what is visible in that single image. Only comment on conditions that are actually visible or clearly described. Do not mention missing items or equipment that are outside the frame.

Always respond in this structure, using these exact section labels:

Summary:
Findings:
Enforcement risk:
Remediation:

Summary:
Write 1–3 short sentences. Describe what area is shown (for example, stove, prep table, cooler) and whether conditions appear clean, marginal, or clearly out of compliance.

Findings:
List only visible issues. Each finding should be one sentence and follow this pattern:
- Violation (P): ...
- Violation (Pf): ...
- Violation (Core): ...
- Likely violation (P): ...
- Likely violation (Pf): ...
- No violation identified: ...

For each violation, state briefly:
- What the condition is (for example, buildup, cross-contamination, unsafe storage).
- Why it matters in plain operational language (for example, risk of contamination of ready-to-eat food).

Use a professional "Tone C":
- Clear and firm, but not harsh.
- Avoid hedging such as "could indicate," "might suggest," or "potentially." Use "Likely violation" only when the image strongly suggests a violation but angle or clarity limit certainty.

Enforcement risk:
Write 1–3 short sentences that summarize the overall enforcement consequence if these issues were found on an inspection and not corrected. Stay general and qualitative:
- Distinguish between mostly Core issues versus Priority / Priority Foundation issues.
- Refer to things like follow-up inspections, repeat-violation concern, office conferences, or temporary closure only if the context supports that type of response.
- Do not mention specific dollar amounts for fines unless the documents explicitly provide them.

Remediation:
Include this section when there is anything the operator should change or correct. Write 2–5 short sentences with direct, practical steps staff can take. Focus on what they can actually do during prep or between services:
- Clean and degrease specific surfaces or areas.
- Move, cover, or separate foods.
- Adjust cooling, hot holding, or cold holding practices.
- Improve basic organization or storage.

If everything appears acceptable and no issues are found, you may omit the Remediation section or write a single short sentence such as:
"Maintain current cleaning and storage practices to keep this area in compliance."

TEXT-ONLY QUESTION BEHAVIOR
If IMAGE_PRESENT = "no":
Treat the input as a question or scenario description. Do not use the Summary/Findings/Enforcement risk/Remediation headings unless the user asks for a structured format.

Answer with short, clear sentences that cover:
1) The rule or requirement.
2) When the described practice would become a violation and how it would generally be classified.
3) A brief enforcement note, if the rule is violated.
4) Simple remediation or best-practice steps the operator should follow.

TONE RULES
- Do not use markdown, headings with hash symbols, numbered lists, bullets, or asterisks.
- Do not include document names, code numbers, or page references.
- Do not greet the user or sign off.
- Do not apologize unless you previously gave incorrect technical information.
- Never speculate about items or equipment that are not visible in an image.`

    const finalPrompt = `${SYSTEM_PROMPT}

IMAGE_PRESENT: ${imageBase64 ? 'yes' : 'no'}

OFFICIAL REGULATORY CONTEXT:
${context || 'No specific document passages were retrieved for this request. If you cannot find a clear requirement in this context, you must say that the available documents do not cover it and refer the user to their local health department.'}

CHAT HISTORY:
${historyText || 'No prior chat history relevant to this request.'}

CURRENT USER QUERY:
${lastMessageText || '[No additional text provided. Base your answer on the image and context.]'}

${imageBase64 ? `VISION DESCRIPTION OF CURRENT IMAGE:
${searchTerms}` : ''}`

    console.log('[API STEP 5] Generating Final Answer (OpenAI)')

    const messagesFinal = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: finalPrompt },
    ]

    const generationPromise = openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages: messagesFinal,
      temperature: GENERATION_CONFIG.temperature,
      top_p: GENERATION_CONFIG.topP,
      max_tokens: GENERATION_CONFIG.maxOutputTokens,
    })

    const result = await Promise.race([
      generationPromise,
      timeoutPromise(GENERATION_TIMEOUT, 'GENERATION_TIMEOUT'),
    ])

    let text = result?.choices?.[0]?.message?.content || ''
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')

    if (!text || text.length < 10) {
      throw new Error('Empty response from model')
    }

    console.log('[API STEP 6] Success - Response length:', text.length)

    const dbTasks = []
    if (user && chatId && lastMessageText) {
      dbTasks.push(
        supabase.from('messages').insert([
          {
            chat_id: chatId,
            role: 'user',
            content: lastMessageText,
            image: imageBase64 ? 'stored' : null,
          },
          { chat_id: chatId, role: 'assistant', content: text },
        ])
      )
    }
    dbTasks.push(incrementUsage(userIdentifier, imageBase64 ? 'image' : 'text'))
    await Promise.allSettled(dbTasks)

    const duration = Date.now() - startTime
    console.log(`[API] Total duration: ${duration}ms`)

    return NextResponse.json({ message: text })
  } catch (err) {
    console.error('[API] Fatal Error:', err)
    logError('chat_api', err, {})

    let msg = 'System error. Please try again.'
    let statusCode = 500

    if (err.message.includes('TIMEOUT')) {
      msg = 'Request timed out. The system is busy, please try again in a moment.'
      statusCode = 504
    } else if (err.message.includes('RATE_LIMIT')) {
      msg = 'Too many requests. Please wait a moment.'
      statusCode = 429
    } else if (err.message.includes('Invalid image')) {
      msg = err.message
      statusCode = 400
    }

    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
