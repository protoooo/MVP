// app/api/chat/route.js - FIXED VERSION
import OpenAI from 'openai'
import { logUsageForAnalytics } from '@/lib/usage'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { searchDocuments } from '@/lib/searchDocs'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const OPENAI_CHAT_MODEL = 'gpt-4o' // Using GPT-4o for better reliability

const GENERATION_CONFIG = {
  reasoningEffort: 'high',
  maxOutputTokens: 3400,
}

const VISION_CONFIG = {
  reasoningEffort: 'low',
  maxOutputTokens: 800,
}

const MAX_CONTEXT_LENGTH = 22000
const MAX_IMAGE_SIZE_MB = 10
const VISION_TIMEOUT = 15000
const GENERATION_TIMEOUT = 35000

const rateLimits = new Map()
const RATE_LIMIT_WINDOW_MS = 60000
const MAX_REQUESTS_PER_WINDOW = 20
let lastRateLimitCleanupAt = 0

function cleanupRateLimits(now) {
  if (now - lastRateLimitCleanupAt < 5 * 60 * 1000) return
  lastRateLimitCleanupAt = now
  for (const [userId, requests] of rateLimits.entries()) {
    const recent = (requests || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (recent.length === 0) rateLimits.delete(userId)
    else rateLimits.set(userId, recent)
  }
}

function checkRateLimit(userId) {
  const now = Date.now()
  cleanupRateLimits(now)
  const userRequests = rateLimits.get(userId) || []
  const recentRequests = userRequests.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    logger.security('Rate limit exceeded', { userId, requestCount: recentRequests.length })
    return false
  }
  recentRequests.push(now)
  rateLimits.set(userId, recentRequests)
  return true
}

const timeoutPromise = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

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

function fallbackAnswer(reason = 'Temporary model output issue. Please retry.') {
  return [
    'Likely issues (visible):',
    '- Unable to analyze at this time',
    '',
    'What to do now:',
    `- ${reason}`,
    '',
    'Need to confirm:',
    '- Try again or contact support if issue persists',
  ].join('\n')
}

// ✅ CRITICAL FIX: Proper vision analysis using chat completions
async function analyzeImageWithVision(imageBase64) {
  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe what you see in this restaurant/kitchen photo. Focus on: cleanliness, food storage, equipment condition, labeling, temperatures (if visible), cross-contamination risks. Be specific but concise (3-6 bullets max). No headings, just bullets starting with dashes.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
      timeoutPromise(VISION_TIMEOUT, 'VISION_TIMEOUT')
    ])

    const visionText = response.choices[0]?.message?.content || ''
    logger.info('Vision analysis completed', { length: visionText.length })
    return visionText.trim()
  } catch (error) {
    logger.error('Vision analysis failed', { error: error.message })
    return 'food safety restaurant kitchen equipment storage'
  }
}

// ✅ CRITICAL FIX: Better document retrieval with multi-query approach
async function retrieveRelevantDocs(searchTerms, imageBase64 = null) {
  logger.info('Starting document retrieval', { searchTermsLength: searchTerms.length })
  
  try {
    // Build comprehensive search query
    const queries = [
      searchTerms,
      'Washtenaw County violation types Priority Foundation Core',
      'enforcement action imminent health hazard',
      'Michigan Modified Food Code',
    ]
    
    // If we have an image, add specific food safety terms
    if (imageBase64) {
      queries.push('temperature control time temperature control for safety')
      queries.push('cross contamination separation storage')
      queries.push('cleaning sanitizing')
    }
    
    const combinedQuery = queries.join(' | ')
    
    const searchResults = await searchDocuments(combinedQuery, 'washtenaw', 40)
    
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      logger.warn('No search results returned')
      return ''
    }
    
    logger.info('Documents retrieved', { count: searchResults.length })
    
    // Format documents with clear source attribution
    const formattedDocs = searchResults
      .map((doc) => {
        const text = doc.text || doc.content || doc.chunk || ''
        if (!text || !text.trim()) return ''
        const source = doc.source || doc.metadata?.source || 'Washtenaw food code'
        return `[SOURCE: ${source}]\n${text}\n`
      })
      .filter(Boolean)
      .join('\n---\n\n')
    
    return formattedDocs
  } catch (error) {
    logger.error('Document retrieval failed', { error: error.message })
    return ''
  }
}

// ✅ CRITICAL FIX: Improved system prompt with better structure
const SYSTEM_PROMPT = `You are protocolLM, a food safety assistant for Washtenaw County, Michigan restaurants.

HARD RULES:
1. Use ONLY the provided regulatory context below
2. For photos: describe ONLY what is visible - never guess temperatures, dates, or sanitizer PPM
3. NO markdown headings (no # or ##)
4. Keep answers short and scannable for line cooks/managers

OUTPUT FORMAT (MANDATORY):
Likely issues (visible):
- [LIKELIHOOD: HIGH/MED/LOW] (Category if known) Description
- [LIKELIHOOD: HIGH/MED/LOW] (Category if known) Description

What to do now:
- Immediate action step 1
- Immediate action step 2

Need to confirm:
- Item that requires verification 1
- Item that requires verification 2

VIOLATION CATEGORIES:
- Priority (P): Most serious - directly reduces foodborne illness (temps, handwashing)
- Priority Foundation (Pf): Supports Priority compliance (thermometers, test strips, soap)
- Core: General sanitation (cleaning, facility maintenance)

Only tag violations with (P), (Pf), or (Core) if the context explicitly supports it.

LIKELIHOOD TAGS:
- HIGH (~70-90%): Clear visual evidence of likely violation
- MED (~40-70%): Possible violation, needs closer look
- LOW (~10-40%): Minor concern or unclear from photo

If you see potential imminent health hazard (no water, sewage backup, severe pest infestation), say "STOP - Get manager immediately" first.`

export async function POST(req) {
  const requestId = randomUUID()
  const startTime = Date.now()

  logger.info('Chat request started', { requestId })

  try {
    const serviceEnabled = await isServiceEnabled()
    if (!serviceEnabled) {
      const message = await getMaintenanceMessage()
      return NextResponse.json({ error: message, maintenance: true }, { status: 503 })
    }

    if (!validateCSRF(req)) {
      logger.security('CSRF validation failed in chat', { requestId })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

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

    let imageBase64 = null
    try {
      if (body.image) imageBase64 = validateImage(body.image)
    } catch (e) {
      logger.warn('Image validation failed', { requestId, error: e.message })
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    // Auto-scan mode for photo-only uploads
    if (imageBase64 && (!lastMessageText || !lastMessageText.trim())) {
      lastMessageText =
        'Scan this photo for food safety violations and risks. Report what you see and what to do.'
      if (messages.length > 0) {
        messages[messages.length - 1].content = lastMessageText
      }
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

    const chatId = body.chatId || null
    const { data: { user } } = await supabase.auth.getUser()

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = !!user && !!adminEmail && user.email === adminEmail

    // Rate limiting (non-admin only)
    if (user && !isAdmin) {
      if (!checkRateLimit(user.id)) {
        logger.security('Rate limit exceeded for user', { userId: user.id, requestId })
        return NextResponse.json(
          { error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMIT_EXCEEDED' },
          { status: 429 }
        )
      }
    }

    // Auth/subscription gates (non-admin only)
    if (user && !isAdmin) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('accepted_terms')
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

      if (!hasActiveSub) {
        return NextResponse.json({ error: 'Subscription required', code: 'NO_ACTIVE_SUBSCRIPTION' }, { status: 402 })
      }

      try {
        await logUsageForAnalytics(user.id, { isImage: !!imageBase64 })
      } catch (err) {
        if (err?.code === 'NO_SUBSCRIPTION' || err?.code === 'SUB_EXPIRED') {
          return NextResponse.json({ error: 'Subscription required or expired.', code: err.code }, { status: 402 })
        }
        if (err?.code === 'USAGE_LIMIT_REACHED') {
          logger.warn('Usage limit reached for user', { requestId, userId: user.id })
          return NextResponse.json(
            { error: 'Monthly usage limit reached. Contact support for higher limits.', code: 'USAGE_LIMIT_REACHED' },
            { status: 429 }
          )
        }
        logger.error('Usage logging failed', { requestId, error: err?.message })
      }
    }

    // ✅ STEP 1: Vision analysis (if image)
    let visionDescription = ''
    if (imageBase64) {
      logger.info('Starting vision analysis', { requestId })
      visionDescription = await analyzeImageWithVision(imageBase64)
    }

    // ✅ STEP 2: Build search query
    const searchQuery = visionDescription || lastMessageText || 'food safety violations'
    
    // ✅ STEP 3: Retrieve documents
    const retrievedContext = await retrieveRelevantDocs(searchQuery, imageBase64)
    
    if (!retrievedContext || retrievedContext.trim().length < 100) {
      logger.error('Insufficient regulatory context', { requestId, contextLength: retrievedContext.length })
      return NextResponse.json(
        {
          error: 'Could not find relevant Washtenaw County regulations for this query. Try rephrasing.',
          code: 'NO_DOCUMENT_CONTEXT',
        },
        { status: 503 }
      )
    }

    const clippedContext = retrievedContext.length > MAX_CONTEXT_LENGTH 
      ? retrievedContext.slice(0, MAX_CONTEXT_LENGTH) 
      : retrievedContext

    // ✅ STEP 4: Build final prompt
    const finalUserPrompt = `WASHTENAW COUNTY REGULATIONS (Retrieved from official documents):
${clippedContext}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n\n` : ''}

USER QUESTION:
${lastMessageText}

${visionDescription ? `\nVISIBLE IN PHOTO:\n${visionDescription}` : ''}

Provide your answer in the exact format specified in the system instructions.`

    logger.info('Generating response', { requestId, contextLength: clippedContext.length })

    // ✅ STEP 5: Generate response using standard chat completion
    let rawText = ''
    try {
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: OPENAI_CHAT_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: finalUserPrompt }
          ],
          max_tokens: GENERATION_CONFIG.maxOutputTokens,
          temperature: 0.3,
        }),
        timeoutPromise(GENERATION_TIMEOUT, 'GENERATION_TIMEOUT')
      ])

      rawText = completion.choices[0]?.message?.content || ''
      
      if (!rawText || rawText.trim().length < 50) {
        logger.warn('Empty/short model output, using fallback', { requestId, length: rawText.length })
        rawText = fallbackAnswer('Model returned insufficient output. Please try again.')
      }
    } catch (e) {
      logger.error('OpenAI generation failed', { requestId, error: e.message })
      rawText = fallbackAnswer(
        e.message === 'GENERATION_TIMEOUT' ? 'Request timed out. Please try again.' : 'Temporary issue. Please try again.'
      )
    }

    const duration = Date.now() - startTime
    logger.info('Response generated successfully', {
      requestId,
      durationMs: duration,
      responseLength: rawText.length,
    })

    // Save to database
    if (user && chatId && lastMessageText) {
      await supabase.from('messages').insert([
        {
          chat_id: chatId,
          role: 'user',
          content: lastMessageText,
          image: imageBase64 ? 'stored' : null,
        },
        {
          chat_id: chatId,
          role: 'assistant',
          content: rawText,
          metadata: { requestId, durationMs: duration },
        },
      ])
    }

    return NextResponse.json({ message: rawText }, { status: 200 })

  } catch (err) {
    const duration = Date.now() - startTime
    logger.error('Fatal error in chat', { requestId, error: err.message, durationMs: duration })
    const msg = fallbackAnswer('An error occurred. Please try again or contact support.')
    return NextResponse.json({ message: msg }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
