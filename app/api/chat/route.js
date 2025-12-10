// app/api/chat/route.js - Production-ready with enhanced security and confidence levels
import OpenAI from 'openai'
import { checkAndIncrementUsage } from '@/lib/usage'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { searchDocuments } from '@/lib/searchDocs'
import { isServiceEnabled, getMaintenanceMessage } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import { validateCSRF } from '@/lib/csrfProtection'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const OPENAI_CHAT_MODEL = 'gpt-4o'

// Generation limits
const GENERATION_CONFIG = {
  maxOutputTokens: 1200,
  temperature: 0.1,
  topP: 0.8,
}

const MAX_CONTEXT_LENGTH = 20000
const MAX_IMAGE_SIZE_MB = 10

// Timeouts
const VISION_TIMEOUT = 10000
const SEARCH_TIMEOUT = 8000
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
  if (sizeInBytes > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large (Max ${MAX_IMAGE_SIZE_MB}MB)`)
  }
  return cleanBase64
}

export async function POST(req) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  logger.info('Chat request started', { requestId })

  try {
    // Check feature flags
    const serviceEnabled = await isServiceEnabled()
    if (!serviceEnabled) {
      const message = await getMaintenanceMessage()
      return NextResponse.json({ error: message, maintenance: true }, { status: 503 })
    }

    // CSRF validation
    if (!validateCSRF(req)) {
      logger.security('CSRF validation failed in chat', { requestId })
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    // Validate payload size
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

    // Get authenticated user
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

    // Check subscription for non-admin users
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
      if (sub && ['active', 'trialing'].includes(sub.status) && 
          new Date(sub.current_period_end) > new Date()) {
        hasActiveSub = true
      }

      // Grace periods
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

      // Log usage (no limits enforced for unlimited plan)
      try {
        await checkAndIncrementUsage(user.id, { isImage: !!imageBase64 })
      } catch (err) {
        if (err.code === 'NO_SUBSCRIPTION' || err.code === 'SUB_EXPIRED') {
          return NextResponse.json(
            { error: 'Subscription required or expired.', code: err.code },
            { status: 402 }
          )
        }
        logger.error('Usage check failed', { requestId, error: err.message })
      }
    }

    // Vision analysis
    let searchTerms = ''
    if (imageBase64) {
      logger.info('Vision analysis started', { requestId })
      try {
        const messagesVision = [
          {
            role: 'system',
            content: 'You are reviewing a single photo from a restaurant as a health inspector. Describe only what is visible, focusing on storage, separation, cleanliness, buildup, and obvious contamination risks.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe the visible food safety conditions in this image in plain text. Do not speculate about areas not shown.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ]

        const visionResult = await Promise.race([
          openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,
            messages: messagesVision,
            temperature: 0.1,
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
      try {
        const searchQuery = `${searchTerms} Washtenaw County Michigan food service inspection violation types enforcement actions date marking cooling hot holding cold holding handwashing cross contamination temperature control ready-to-eat food`

        const searchResults = await Promise.race([
          searchDocuments(searchQuery, 'washtenaw', 25),
          timeoutPromise(SEARCH_TIMEOUT, 'SEARCH_TIMEOUT'),
        ]).catch((searchError) => {
          logger.error('Search failed', { requestId, error: searchError.message })
          return []
        })

        if (searchResults && searchResults.length > 0) {
          context = searchResults
            .map((doc) => `[SOURCE: ${doc.source}]\n${doc.text}`)
            .join('\n\n')
          logger.info('Search completed', { requestId, resultsCount: searchResults.length })
        } else {
          logger.info('No search results', { requestId })
        }
      } catch (err) {
        logger.error('Search exception', { requestId, error: err.message })
      }
    }

    if (context && context.length > MAX_CONTEXT_LENGTH) {
      context = context.slice(0, MAX_CONTEXT_LENGTH)
    }

    // IMPROVED System prompt with confidence levels
    const SYSTEM_PROMPT = `You are ProtocolLM, a food safety and inspection assistant focused on restaurants in Washtenaw County, Michigan.

Your role:
- Provide accurate guidance on Michigan Food Code requirements
- Reference Washtenaw County Health Department enforcement practices
- Help identify potential violations in facility photos
- Offer corrective action recommendations

CRITICAL: Confidence Levels
You must ALWAYS express confidence levels when identifying potential violations. Never state violations as absolute certainty unless explicitly documented in the provided context.

Use this format:
- HIGH CONFIDENCE (90-100%): Clear violation directly referenced in code/guidance with visible confirmation
- MODERATE CONFIDENCE (60-89%): Likely violation based on code interpretation and visual evidence
- LOW CONFIDENCE (30-59%): Possible concern that should be verified with local health department
- UNCERTAIN (<30%): Cannot determine from image/information provided

Example responses:
❌ BAD: "This is a temperature control violation."
✅ GOOD: "MODERATE CONFIDENCE: This appears to be a potential temperature control violation based on visible condensation and placement, though the actual food temperature cannot be confirmed from the image."

Guidelines:
1. Base answers on provided regulatory context when available
2. Clearly distinguish between:
   - Code requirements (what the law says)
   - Local enforcement practices (how it is applied)
   - Best practices (recommended but not required)
   - Your assessment confidence level
3. When uncertain, direct users to contact Washtenaw County Health Department
4. For images: describe only what is visible, do not speculate beyond what can be seen
5. Be professional but clear - use plain language
6. Always caveat image-based assessments with confidence levels

Important limitations:
- You are NOT a substitute for professional consultation
- You cannot guarantee compliance or predict inspection outcomes
- Image analysis has inherent limitations - actual inspection may reveal different findings
- Users should verify critical requirements with local authorities`

    const finalPrompt = `${SYSTEM_PROMPT}

IMAGE_PRESENT: ${imageBase64 ? 'yes' : 'no'}

OFFICIAL REGULATORY CONTEXT:
${context || 'No specific document passages were retrieved for this request. If you cannot find a clear requirement in this context, you must say that the available documents do not cover it and refer the user to their local health department.'}

CHAT HISTORY:
${historyText || 'No prior chat history relevant to this request.'}

CURRENT USER QUERY:
${lastMessageText || '[No additional text provided. Base your answer on the image and context.]'}

${imageBase64 ? `VISION DESCRIPTION OF CURRENT IMAGE:\n${searchTerms}` : ''}

REMINDER: Include appropriate confidence levels (HIGH/MODERATE/LOW/UNCERTAIN) for any potential violations identified.`

    logger.info('Generating response', { requestId })

    const messagesFinal = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: finalPrompt },
    ]

    try {
      const result = await Promise.race([
        openai.chat.completions.create({
          model: OPENAI_CHAT_MODEL,
          messages: messagesFinal,
          temperature: GENERATION_CONFIG.temperature,
          top_p: GENERATION_CONFIG.topP,
        }),
        timeoutPromise(GENERATION_TIMEOUT, 'GENERATION_TIMEOUT'),
      ])

      let text = result?.choices?.[0]?.message?.content || ''
      text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')

      if (!text || text.length < 10) {
        throw new Error('Empty or invalid response from model')
      }

      const duration = Date.now() - startTime
      logger.info('Response generated successfully', {
        requestId,
        durationMs: duration,
        responseLength: text.length
      })

      // Save to database
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

      await Promise.allSettled(dbTasks)

      return NextResponse.json({ message: text })
      
    } catch (genError) {
      logger.error('Generation failed', { requestId, error: genError.message })

      let errorMsg = 'Unable to generate response. Please try again.'
      let statusCode = 500

      if (genError.message.includes('TIMEOUT')) {
        errorMsg = 'Request took too long. Please try a simpler query.'
        statusCode = 504
      } else if (genError.message.includes('Empty')) {
        errorMsg = 'No response generated. Please rephrase your question.'
        statusCode = 500
      }

      return NextResponse.json({ error: errorMsg }, { status: statusCode })
    }
  } catch (err) {
    const duration = Date.now() - startTime
    logger.error('Fatal error in chat', {
      requestId,
      error: err.message,
      durationMs: duration
    })

    let msg = 'System error. Please try again.'
    let statusCode = 500

    if (err.message.includes('TIMEOUT')) {
      msg = 'Request timed out. The system is busy, please try again in a moment.'
      statusCode = 504
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
