// app/api/chat/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CohereClient } from 'cohere-ai'

// Initialize API clients
const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY 
})

const cohere = new CohereClient({ 
  token: process.env.COHERE_API_KEY 
})

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const FREE_TIER_LIMIT = 3 // 3 requests per hour for free users
const PREMIUM_TIER_LIMIT = 1000 // 1000 requests per hour for premium users

// Cohere connector ID for Washtenaw County documents
const COHERE_CONNECTOR_ID = process.env.COHERE_CONNECTOR_ID || 'washtenaw-food-safety'

/**
 * Helper function to check if user has active subscription
 */
async function checkSubscriptionStatus(supabase, userId) {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, stripe_subscription_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription) {
      return { hasActive: false, subscription: null }
    }

    const periodEnd = new Date(subscription.current_period_end)
    const now = new Date()
    const hasActive = periodEnd > now

    return { hasActive, subscription }
  } catch (error) {
    console.error('Error checking subscription:', error)
    return { hasActive: false, subscription: null }
  }
}

/**
 * Helper function to check rate limits
 */
async function checkRateLimit(supabase, userId, isPremium) {
  try {
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW
    const windowStartISO = new Date(windowStart).toISOString()

    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStartISO)

    if (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true, count: 0, limit: isPremium ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT }
    }

    const limit = isPremium ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT
    const allowed = count < limit

    return { allowed, count, limit }
  } catch (error) {
    console.error('Rate limit check exception:', error)
    return { allowed: true, count: 0, limit: isPremium ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT }
  }
}

/**
 * Helper function to fetch relevant context from Cohere
 */
async function fetchCohereContext(query, hasImage = false) {
  try {
    // Enhance query for image analysis
    const enhancedQuery = hasImage 
      ? `Analyze kitchen photo for food safety violations in Washtenaw County: ${query}`
      : query

    const cohereResponse = await cohere.chat({
      model: 'command-r-plus',
      message: enhancedQuery,
      connectors: [
        { 
          id: COHERE_CONNECTOR_ID,
          options: {
            max_results: 10
          }
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    })

    // Extract relevant document snippets
    if (cohereResponse.documents && cohereResponse.documents.length > 0) {
      const context = cohereResponse.documents
        .slice(0, 8) // Top 8 most relevant documents
        .map(doc => {
          const title = doc.title || 'Regulation Document'
          const content = doc.snippet || doc.text || ''
          return `Document: ${title}\n${content}`
        })
        .join('\n\n---\n\n')

      return context
    }

    return ''
  } catch (error) {
    console.error('Cohere context fetch error:', error)
    return ''
  }
}

/**
 * Helper function to build Claude message array
 */
function buildClaudeMessages(messages) {
  const claudeMessages = []

  for (const msg of messages) {
    if (msg.role === 'user') {
      const content = []

      // Add image if present
      if (msg.image) {
        try {
          const base64Data = msg.image.split(',')[1]
          const mediaType = msg.image.split(';')[0].split(':')[1]

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          })
        } catch (error) {
          console.error('Error processing image:', error)
        }
      }

      // Add text content
      const textContent = msg.content?.trim() || 'Analyze this image for food safety compliance.'
      content.push({
        type: 'text',
        text: textContent,
      })

      claudeMessages.push({ 
        role: 'user', 
        content 
      })
    } else if (msg.role === 'assistant' && msg.content) {
      claudeMessages.push({ 
        role: 'assistant', 
        content: msg.content 
      })
    }
  }

  return claudeMessages
}

/**
 * Helper function to create system prompt
 */
function createSystemPrompt(context, hasImage) {
  const basePrompt = `You are a Washtenaw County food safety compliance assistant. Your job is to give clear, actionable guidance to restaurant staff at all levels—from entry-level employees to managers to owners.

## CRITICAL RESPONSE RULES:

1. NO FORMATTING: Never use asterisks, hashtags, emojis, or markdown formatting
2. NO FLUFF: Skip confidence scores, lengthy explanations, and unnecessary sections
3. BE DIRECT: Start with what matters—violations and fixes
4. USE PLAIN LANGUAGE: Write like you're talking to someone on the line during a busy shift
5. NEVER GIVE 100% CERTAINTY: Always acknowledge limitations to avoid liability

## VIOLATION CATEGORIES (Washtenaw County):

PRIORITY (P): Items that directly eliminate or reduce foodborne illness hazards
- Must be corrected immediately or within 10 days
- Examples: improper food temps, lack of handwashing, bare-hand contact with RTE food, improper cooking temps
- Repeated Priority violations lead to enforcement action

PRIORITY FOUNDATION (Pf): Items that support Priority compliance
- Must be corrected immediately or within 10 days
- Examples: no thermometer, no sanitizer test strips, no soap/towels at hand sink
- Repeated Pf violations lead to enforcement action

CORE: General sanitation and facility maintenance
- Must be corrected within 90 days
- Examples: dirty floors, improper lighting, equipment disrepair

## ENFORCEMENT CONTEXT:

Washtenaw County uses progressive enforcement:
1. First chance: Correct during routine inspection
2. Second chance: Office Conference
3. Third chance: Informal Hearing
4. Final: License limitation, suspension, or revocation

IMMINENT HEALTH HAZARDS (immediate closure):
- No water/power
- Foodborne illness outbreak
- Severe pest infestation
- Sewage backup in kitchen
- Fire/flood`

  const imageGuidance = hasImage ? `

## FOR IMAGE ANALYSIS:

Structure your response like this:

ISSUES FOUND:

[List each potential violation concisely with likelihood]
- [Violation description] (Priority/Pf/Core) - Likely/Possible/Worth checking
  Fix: [Specific action to take]

LOOKS GOOD:

[Only mention if relevant and brief - skip this section if there are violations]
- [What's compliant]

Keep it conversational and practical. Example:

"Raw chicken stored above ready-to-eat food (Priority) - Likely violation
Fix: Move raw poultry to bottom shelf immediately

Missing date label on prep container (Priority Foundation) - Possible violation
Fix: Label with prep date and 7-day discard date

Temperature logs not visible (Priority Foundation) - Worth checking
Fix: Keep logs posted and current"` : `

## FOR TEXT QUESTIONS:

Answer directly using the Washtenaw County regulations and Michigan Food Code. Reference specific requirements when relevant. Keep answers short and actionable.

Examples:
- "What temp should I reheat soup to?" → "165°F for at least 15 seconds. Use a calibrated thermometer to verify."
- "How long can I keep cut lettuce?" → "7 days max if held at 41°F or below. Date-label when prepped."
- "Do I need gloves for ready-to-eat food?" → "You can use clean, bare hands if you wash properly before each task, but gloves or utensils are safer and prevent cross-contamination."`

  const contextSection = context ? `

## RELEVANT REGULATIONS FROM WASHTENAW COUNTY:

${context}

Use this context to provide accurate, locally-relevant answers based on actual Washtenaw County enforcement patterns and Michigan Food Code requirements.` : ''

  return basePrompt + imageGuidance + contextSection
}

/**
 * Helper function to save messages to database
 */
async function saveMessagesToDatabase(supabase, chatId, userId, userMessage, assistantMessage, hasImage) {
  try {
    const messages = [
      {
        chat_id: chatId,
        user_id: userId,
        role: 'user',
        content: userMessage,
        has_image: hasImage,
      },
      {
        chat_id: chatId,
        user_id: userId,
        role: 'assistant',
        content: assistantMessage,
      },
    ]

    const { error } = await supabase
      .from('chat_messages')
      .insert(messages)

    if (error) {
      console.error('Error saving messages:', error)
    }
  } catch (error) {
    console.error('Exception saving messages:', error)
  }
}

/**
 * Main POST handler
 */
export async function POST(request) {
  let supabase
  let session

  try {
    // Initialize Supabase client
    supabase = createRouteHandlerClient({ cookies })

    // Get user session
    const { data: { session: userSession }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !userSession) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    session = userSession

    // Parse request body
    const body = await request.json()
    const { messages, image, chatId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Messages array required.' },
        { status: 400 }
      )
    }

    // Check subscription status
    const { hasActive: hasActiveSubscription } = await checkSubscriptionStatus(
      supabase,
      session.user.id
    )

    // Check rate limits
    const { allowed, count, limit } = await checkRateLimit(
      supabase,
      session.user.id,
      hasActiveSubscription
    )

    if (!allowed) {
      if (!hasActiveSubscription) {
        return NextResponse.json(
          { 
            error: `Free tier limit reached (${limit} requests/hour). Upgrade to continue.`,
            requiresUpgrade: true
          },
          { status: 402 }
        )
      }

      return NextResponse.json(
        { 
          error: `Rate limit exceeded (${limit} requests/hour). Please try again later.`,
          retryAfter: 3600
        },
        { status: 429 }
      )
    }

    // Get last user message
    const lastUserMessage = messages[messages.length - 1]
    const hasImage = !!image || !!lastUserMessage.image
    const userQuery = lastUserMessage.content || ''

    // Fetch relevant context from Cohere
    const context = await fetchCohereContext(userQuery, hasImage)

    // Build Claude messages
    const claudeMessages = buildClaudeMessages(messages)

    // Create system prompt
    const systemPrompt = createSystemPrompt(context, hasImage)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2048,
      temperature: 0.3,
      system: systemPrompt,
      messages: claudeMessages,
    })

    // Extract assistant message
    const assistantMessage = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim()

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response generated. Please try again.' },
        { status: 500 }
      )
    }

    // Save to database if chatId provided
    if (chatId) {
      await saveMessagesToDatabase(
        supabase,
        chatId,
        session.user.id,
        userQuery,
        assistantMessage,
        hasImage
      )
    }

    // Return successful response
    return NextResponse.json({ 
      message: assistantMessage,
      usage: {
        requests_used: count + 1,
        requests_limit: limit,
        is_premium: hasActiveSubscription
      }
    })

  } catch (error) {
    console.error('Chat API error:', error)

    // Handle specific Anthropic API errors
    if (error.status === 529) {
      return NextResponse.json(
        { 
          error: 'AI service temporarily overloaded. Please try again in a moment.',
          retryable: true
        },
        { status: 503 }
      )
    }

    if (error.status === 429) {
      return NextResponse.json(
        { 
          error: 'Too many requests to AI service. Please wait a moment.',
          retryable: true
        },
        { status: 429 }
      )
    }

    if (error.status === 401) {
      return NextResponse.json(
        { error: 'API authentication failed. Please contact support.' },
        { status: 500 }
      )
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to process request. Please try again.',
        retryable: true
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
