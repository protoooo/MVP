// app/api/chat/route.js - FIXED with better context handling
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

const TOPK = 30 // Increased from 24
const MAX_CONTEXT_CHARS = 80000 // Increased from 60000

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

function clampQuery(q, maxLen = 1800) {
  const s = safeText(q)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

// NEW: Better context building with metadata
function buildContextString(docs) {
  if (!docs || docs.length === 0) return ''
  
  let buf = ''
  let usedDocs = 0
  
  // Sort by score first
  const sorted = [...docs].sort((a, b) => (b.score || 0) - (a.score || 0))
  
  for (const doc of sorted) {
    if (buf.length >= MAX_CONTEXT_CHARS) break
    
    const src = doc.source || 'Unknown'
    const pg = doc.page ?? 'N/A'
    const score = (doc.score || 0).toFixed(3)
    
    const chunk = `\n\n[SOURCE: ${src} | PAGE: ${pg} | RELEVANCE: ${score}]\n${doc.text}\n`
    
    if (buf.length + chunk.length > MAX_CONTEXT_CHARS) break
    
    buf += chunk
    usedDocs++
  }
  
  logger.info('Context built', {
    docsUsed: usedDocs,
    totalChars: buf.length,
    avgScore: (docs.slice(0, usedDocs).reduce((sum, d) => sum + (d.score || 0), 0) / usedDocs).toFixed(3)
  })
  
  return buf.trim()
}

// NEW: Build comprehensive search query
function buildSearchQuery(userPrompt, visionSummary, visionSearchTerms) {
  const parts = []
  
  if (visionSearchTerms) parts.push(visionSearchTerms)
  if (userPrompt) parts.push(userPrompt)
  if (visionSummary) parts.push(visionSummary)
  
  // Add context-specific terms
  parts.push('Washtenaw County food safety health code violation inspection compliance')
  parts.push('kitchen restaurant preparation storage temperature cleaning sanitization')
  parts.push('Priority Foundation Core violation immediate 10 days 90 days correction')
  
  return clampQuery(parts.filter(Boolean).join(' '))
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

    const plan = safeText(body?.plan) || 'unknown'

    // Auth
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
        ? 'Analyze this photo for food safety violations in a Washtenaw County restaurant'
        : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // Vision pre-pass if image provided
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionConfidence = 'low'

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,
            max_tokens: 600,
            messages: [
              {
                role: 'system',
                content: 'You are a food safety expert. Analyze restaurant photos for potential health code violations. Return JSON: {"summary":"detailed description","search_terms":"keywords for searching regulations","confidence":"high|medium|low"}'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: effectiveUserPrompt },
                  { type: 'image_url', image_url: { url: imageDataUrl } }
                ]
              }
            ]
          }),
          VISION_TIMEOUT_MS,
          'OPENAI_TIMEOUT'
        )

        const visionText = visionResp.choices[0]?.message?.content || ''
        
        try {
          const parsed = JSON.parse(visionText.replace(/```json|```/g, '').trim())
          visionSummary = parsed.summary || ''
          visionSearchTerms = parsed.search_terms || ''
          visionConfidence = parsed.confidence || 'low'
        } catch {
          visionSummary = visionText.substring(0, 600)
        }

        logger.info('Vision analysis complete', { confidence: visionConfidence })
      } catch (e) {
        logger.error('Vision analysis failed', { error: e?.message })
      }
    }

    // Build comprehensive search query
    const searchQuery = buildSearchQuery(effectiveUserPrompt, visionSummary, visionSearchTerms)
    
    logger.info('Document search starting', { 
      queryLength: searchQuery.length,
      topK: TOPK 
    })

    // Search documents
    const docs = await searchDocuments(searchQuery, county, TOPK)

    if (!docs || docs.length === 0) {
      logger.warn('No documents retrieved')
      return NextResponse.json({
        message: hasImage
          ? 'I cannot find relevant Washtenaw County regulations for this image. Please provide more context about what area of your restaurant this is (walk-in, prep station, dish area, etc.) and what you want me to check.'
          : 'I cannot find relevant Washtenaw County regulations for your question. Please try rephrasing or asking about a specific food safety topic.',
        confidence: 'LOW'
      }, { status: 200 })
    }

    const context = buildContextString(docs)

    if (!context || context.length < 100) {
      logger.warn('Insufficient context built', { contextLength: context.length })
      return NextResponse.json({
        message: 'I found some regulations but they may not be relevant. Please be more specific about what you want me to check.',
        confidence: 'LOW'
      }, { status: 200 })
    }

    // IMPROVED: Better system prompt
    const systemPrompt = `You are protocolLM, a Washtenaw County food safety compliance assistant for restaurants.

Your job is to analyze photos and answer questions using the REGULATORY EXCERPTS provided below.

CRITICAL RULES:
1. ALWAYS cite specific violations from the excerpts when you see them
2. Use the exact categories: Priority, Priority Foundation, or Core
3. Use exact correction timelines: immediate, 10 days, or 90 days
4. If you're unsure, say "needs context" - never guess
5. Keep responses practical and actionable

For photos:
- Describe what you see
- List specific violations you can identify from the excerpts
- Give the violation category and timeline
- Provide immediate action items

For text questions:
- Answer using the excerpts
- Cite specific regulations
- Give practical guidance

REGULATORY EXCERPTS:
${context}

Remember: You're helping restaurant staff prevent violations and pass inspections. Be direct, specific, and helpful.`

    const userBlock = hasImage
      ? [
          { type: 'text', text: `USER QUESTION: ${effectiveUserPrompt}\n\nVISION ANALYSIS: ${visionSummary || 'N/A'}` },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      : `USER QUESTION: ${effectiveUserPrompt}`

    let formatted = ''

    try {
      const answerResp = await withTimeout(
        openai.chat.completions.create({
          model: OPENAI_CHAT_MODEL,
          max_tokens: 1000,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userBlock }
          ]
        }),
        ANSWER_TIMEOUT_MS,
        'OPENAI_TIMEOUT'
      )

      formatted = answerResp.choices[0]?.message?.content || ''

    } catch (e) {
      logger.error('Answer generation failed', { error: e?.message })
    }

    if (!safeText(formatted)) {
      formatted = 'I encountered an error generating a response. Please try rephrasing your question or providing more context.'
    }

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
          docsRetrieved: docs.length,
          topScore: docs[0]?.score?.toFixed(3),
          avgScore: (docs.reduce((sum, d) => sum + (d.score || 0), 0) / docs.length).toFixed(3)
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
