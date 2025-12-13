// app/api/chat/route.js
import OpenAI from 'openai'
import { logUsageForAnalytics } from '@/lib/usage'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { searchDocuments } from '@/lib/searchDocs'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ✅ Keep this as your main model
const OPENAI_CHAT_MODEL = 'gpt-5.2'

// Output controls (GPT-5.2: use reasoning_effort + verbosity; DO NOT send temperature/top_p when reasoning_effort != "none")
const GENERATION_CONFIG = {
  maxCompletionTokens: 520, // total completion budget (includes any internal reasoning + visible output)
  reasoningEffort: 'high',  // 'medium' | 'high' | 'xhigh' (use 'xhigh' if you want max)
  verbosity: 'low',         // 'low' | 'medium' | 'high'
}

const VISION_CONFIG = {
  maxCompletionTokens: 220,
  // Vision description should be fast & literal; do NOT pass temperature/top_p.
  reasoningEffort: 'none',
  verbosity: 'low',
}

const MAX_CONTEXT_LENGTH = 20000
const MAX_IMAGE_SIZE_MB = 10

// Timeouts
const VISION_TIMEOUT = 10000
const GENERATION_TIMEOUT = 25000

const timeoutPromise = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

// Input sanitization
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
      return `${role}: ${m.content} ${imgNote}`.trim()
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
  if (sizeInBytes > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large (Max ${MAX_IMAGE_SIZE_MB}MB)`)
  }
  return cleanBase64
}

// Confidence parsing
function extractConfidence(text) {
  const match = text.match(/^\s*\[CONFIDENCE:\s*(HIGH|MEDIUM|LOW)\]\s*/i)
  if (match) {
    return {
      confidence: match[1].toUpperCase(),
      text: text.replace(match[0], '').trim(),
    }
  }
  return { confidence: 'UNKNOWN', text: (text || '').trim() }
}

// Remove markdown headings (# / ## / ###)
function stripMarkdownHeadings(text) {
  if (!text) return text
  return text.replace(/^#{1,6}\s+/gm, '')
}

// Reduce format noise and keep output clean
function cleanModelText(text) {
  if (!text) return ''
  return stripMarkdownHeadings(
    text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\r/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Ensure we always return a confidence line (even if the model forgets)
function ensureConfidenceLine(confidence, cleanText) {
  const c = confidence === 'HIGH' || confidence === 'MEDIUM' || confidence === 'LOW'
    ? confidence
    : 'MEDIUM'
  return { confidence: c, message: cleanText }
}

export async function POST(req) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  logger.info('Chat request started', { requestId })

  try {
    // Feature flag: service enabled
    const serviceEnabled = await isServiceEnabled()
    if (!serviceEnabled) {
      const message = await getMaintenanceMessage()
      return NextResponse.json({ error: message, maintenance: true }, { status: 503 })
    }

    // CSRF
    if (!validateCSRF(req)) {
      logger.security('CSRF validation failed in chat', { requestId })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    // Payload size
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
    if (contentLength > 12 * 1024 * 1024) {
      logger.warn('Payload too large', { requestId, size: contentLength })
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

    // Validate image
    let imageBase64 = null
    try {
      if (body.image) imageBase64 = validateImage(body.image)
    } catch (e) {
      logger.warn('Image validation failed', { requestId, error: e.message })
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // Supabase user
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
    const { data: { user } } = await supabase.auth.getUser()

    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isAdmin = !!user && user.email === adminEmail

    // Subscription check (non-admin)
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
      if (
        sub &&
        ['active', 'trialing'].includes(sub.status) &&
        new Date(sub.current_period_end) > new Date()
      ) {
        hasActiveSub = true
      }

      // Grace periods
      if (!hasActiveSub && profile?.created_at) {
        if (Date.now() - new Date(profile.created_at).getTime() < 600000) hasActiveSub = true
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

      // Usage logging
      try {
        await logUsageForAnalytics(user.id, { isImage: !!imageBase64 })
      } catch (err) {
        if (err.code === 'NO_SUBSCRIPTION' || err.code === 'SUB_EXPIRED') {
          return NextResponse.json(
            { error: 'Subscription required or expired.', code: err.code },
            { status: 402 }
          )
        }
        if (err.code === 'USAGE_LIMIT_REACHED') {
          logger.warn('Usage limit reached for user', {
            requestId,
            userId: user.id,
            meta: err.meta || null,
          })
          return NextResponse.json(
            {
              error:
                'Monthly usage limit reached for your plan. Contact support if you need a higher limit.',
              code: 'USAGE_LIMIT_REACHED',
            },
            { status: 429 }
          )
        }
        logger.error('Usage logging failed', { requestId, error: err.message })
      }
    }

    // Vision analysis (literal description ONLY)
    let searchTerms = ''
    if (imageBase64) {
      logger.info('Vision analysis started', { requestId })
      try {
        const messagesVision = [
          {
            role: 'system',
            content:
              'Describe only what is visible in this restaurant photo. Focus on cleanliness/buildup, storage order, separation, labeling, and obvious contamination risks. No guesses. No markdown.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Write a short, plain description (2–6 bullets). No headings.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ]

        const visionResult = await Promise.race([
          openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,
            messages: messagesVision,
            max_completion_tokens: VISION_CONFIG.maxCompletionTokens,
            reasoning_effort: VISION_CONFIG.reasoningEffort, // ✅ none
            verbosity: VISION_CONFIG.verbosity,              // ✅ low
            // ✅ DO NOT pass temperature/top_p here
          }),
          timeoutPromise(VISION_TIMEOUT, 'VISION_TIMEOUT'),
        ])

        searchTerms = visionResult?.choices?.[0]?.message?.content?.trim() || ''
        logger.info('Vision analysis completed', { requestId, length: searchTerms.length })
      } catch (visionError) {
        logger.error('Vision analysis failed', { requestId, error: visionError.message })
        searchTerms = lastMessageText || 'general food safety equipment cleanliness'
      }
    } else {
      searchTerms = lastMessageText || 'food safety code'
    }

    // Document search
    let context = ''
    if (searchTerms) {
      logger.info('Document search started', { requestId })
      let searchResults = []
      try {
        const searchQuery = `${searchTerms} Washtenaw County Michigan food service inspection enforcement actions`
        searchResults = await searchDocuments(searchQuery, 'washtenaw', 25)
      } catch (err) {
        logger.error('Search failed', { requestId, error: err.message })
      }

      let normalizedResults = []
      if (Array.isArray(searchResults)) normalizedResults = searchResults
      else if (Array.isArray(searchResults?.results)) normalizedResults = searchResults.results
      else if (Array.isArray(searchResults?.matches)) normalizedResults = searchResults.matches

      if (normalizedResults.length > 0) {
        context = normalizedResults
          .map((doc) => {
            const text = doc.text || doc.content || doc.chunk || ''
            if (!text || !text.trim()) return ''
            const source =
              doc.source ||
              doc.metadata?.source ||
              doc.document_name ||
              doc.title ||
              'Washtenaw food code'
            // Keep source tags for internal grounding, but we instruct the model not to cite unless asked.
            return `[SOURCE: ${source}]\n${text}`
          })
          .filter(Boolean)
          .join('\n\n')

        logger.info('Search completed', { requestId, resultsCount: normalizedResults.length })
      } else {
        logger.warn('No search results; no regulatory context available', { requestId })
      }
    }

    // Hard rule: never answer without doc context
    if (!context) {
      logger.warn('No regulatory context; refusing to answer from general model', { requestId, searchTerms })
      return NextResponse.json(
        {
          error:
            'ProtocolLM could not find relevant food code passages for this question. ' +
            'To avoid answering from general AI training data, no answer will be provided. ' +
            'Please try rephrasing your question.',
          code: 'NO_DOCUMENT_CONTEXT',
        },
        { status: 503 }
      )
    }

    if (context.length > MAX_CONTEXT_LENGTH) context = context.slice(0, MAX_CONTEXT_LENGTH)

    // System prompt: concise, scannable, no headings, no default citations
    const SYSTEM_PROMPT = `You are ProtocolLM, a food-safety assistant for restaurants in Washtenaw County, Michigan.

Hard rules:
- Use ONLY the provided OFFICIAL REGULATORY CONTEXT. If it doesn't support a claim, put it under "Need to confirm".
- Describe ONLY what is visible in photos. No guessing.
- NO markdown headings. Do NOT use # or ## anywhere.
- Keep the whole answer short and scannable for an entry-level employee.

Output format (MANDATORY):
Line 1: [CONFIDENCE: HIGH] or [CONFIDENCE: MEDIUM] or [CONFIDENCE: LOW]
Then EXACTLY these 3 sections, each 1–4 bullets max:

Likely issues (visible):
- ...

What to do now:
- ...

Need to confirm:
- ...

Citations:
- Do NOT cite sources by default.
- Only include citations if the user explicitly asks ("cite") OR if confidence is LOW.

Tone:
- Calm, direct, operational.
- Avoid "will fail inspection" / absolutes.`

    const finalUserPrompt = `OFFICIAL REGULATORY CONTEXT:
${context}

CHAT HISTORY:
${historyText || 'None.'}

USER QUERY:
${lastMessageText || '[No additional text provided. Base your answer on the image and context.]'}

${imageBase64 ? `VISIBLE DESCRIPTION (from vision):
${searchTerms}` : ''}`

    logger.info('Generating response', { requestId })

    const messagesFinal = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: finalUserPrompt },
    ]

    const result = await Promise.race([
      openai.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        messages: messagesFinal,
        max_completion_tokens: GENERATION_CONFIG.maxCompletionTokens,
        reasoning_effort: GENERATION_CONFIG.reasoningEffort, // ✅ high (or xhigh)
        verbosity: GENERATION_CONFIG.verbosity,              // ✅ low
        // ✅ DO NOT pass temperature/top_p here
      }),
      timeoutPromise(GENERATION_TIMEOUT, 'GENERATION_TIMEOUT'),
    ])

    let rawText = result?.choices?.[0]?.message?.content || ''
    const parsed = extractConfidence(rawText)
    const cleaned = cleanModelText(parsed.text)

    if (!cleaned || cleaned.length < 10) {
      throw new Error('Empty or invalid response from model')
    }

    const ensured = ensureConfidenceLine(parsed.confidence, cleaned)

    const duration = Date.now() - startTime
    logger.info('Response generated successfully', {
      requestId,
      durationMs: duration,
      responseLength: ensured.message.length,
      confidence: ensured.confidence,
    })

    // Save messages
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
          {
            chat_id: chatId,
            role: 'assistant',
            content: ensured.message,
            metadata: { confidence: ensured.confidence },
          },
        ])
      )
    }
    await Promise.allSettled(dbTasks)

    return NextResponse.json({ message: ensured.message, confidence: ensured.confidence })
  } catch (err) {
    const duration = Date.now() - startTime
    logger.error('Fatal error in chat', { requestId, error: err.message, durationMs: duration })

    let msg = 'System error. Please try again.'
    let statusCode = 500

    if (err.message.includes('TIMEOUT')) {
      msg = 'Request timed out. Please try again.'
      statusCode = 504
    } else if (err.message.includes('Invalid image')) {
      msg = err.message
      statusCode = 400
    } else if (err.message.includes('Unsupported')) {
      msg = err.message
      statusCode = 400
    }

    return NextResponse.json({ error: msg }, { status: statusCode })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
