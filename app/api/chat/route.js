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

// ✅ IMPORTANT: Use the chat model ID for Chat Completions
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.2-chat-latest'

const VISION_TIMEOUT_MS = 25000
const ANSWER_TIMEOUT_MS = 35000

const TOPK = 30
const MAX_CONTEXT_CHARS = 80000

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

function buildContextString(docs) {
  if (!docs || docs.length === 0) return ''

  let buf = ''
  let usedDocs = 0

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

  const usedSlice = sorted.slice(0, usedDocs)
  const avg =
    usedSlice.length > 0
      ? usedSlice.reduce((sum, d) => sum + (d.score || 0), 0) / usedSlice.length
      : 0

  logger.info('Context built', {
    docsUsed: usedDocs,
    totalChars: buf.length,
    avgScore: avg.toFixed(3),
  })

  return buf.trim()
}

function buildSearchQuery(userPrompt, visionSummary, visionSearchTerms) {
  const parts = []

  if (visionSearchTerms) parts.push(visionSearchTerms)
  if (userPrompt) parts.push(userPrompt)
  if (visionSummary) parts.push(visionSummary)

  // Keep these minimal so you don’t “force” enforcement docs every time
  parts.push('Washtenaw County food code compliance')

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
      (hasImage ? 'Analyze this photo for food safety violations in a Washtenaw County restaurant' : '')

    if (!effectiveUserPrompt && !hasImage) {
      return NextResponse.json({ error: 'No input provided.' }, { status: 400 })
    }

    // Vision pre-pass
    let visionSummary = ''
    let visionSearchTerms = ''
    let visionConfidence = 'low'
    let visionOk = true

    if (hasImage) {
      try {
        logger.info('Vision analysis started', { env })

        const visionResp = await withTimeout(
          openai.chat.completions.create({
            model: OPENAI_CHAT_MODEL,

            // ✅ FIX: max_tokens -> max_completion_tokens (required for GPT-5.x/o-series)
            max_completion_tokens: 700,

            // ✅ Force valid JSON so parsing doesn’t randomly fail
            response_format: { type: 'json_object' },

            messages: [
              {
                role: 'system',
                content:
                  'Return ONLY valid JSON with keys: summary (string), search_terms (string), confidence ("high"|"medium"|"low").',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: effectiveUserPrompt },
                  { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
              },
            ],
          }),
          VISION_TIMEOUT_MS,
          'OPENAI_TIMEOUT'
        )

        const visionText = visionResp.choices[0]?.message?.content || '{}'

        try {
          const parsed = JSON.parse(visionText)
          visionSummary = safeText(parsed.summary || '')
          visionSearchTerms = safeText(parsed.search_terms || '')
          visionConfidence = safeText(parsed.confidence || 'low') || 'low'
        } catch {
          // Should be rare with response_format json_object, but keep a safe fallback
          visionSummary = safeText(visionText).slice(0, 600)
        }

        logger.info('Vision analysis complete', { confidence: visionConfidence })
      } catch (e) {
        visionOk = false
        logger.error('Vision analysis failed', { error: e?.message })
      }
    }

    const searchQuery = buildSearchQuery(effectiveUserPrompt, visionSummary, visionSearchTerms)

    logger.info('Document search starting', {
      queryLength: searchQuery.length,
      topK: TOPK,
    })

    const docs = await searchDocuments(searchQuery, county, TOPK)

    if (!docs || docs.length === 0) {
      logger.warn('No documents retrieved')
      return NextResponse.json(
        {
          message: hasImage
            ? 'I cannot find relevant Washtenaw County regulations for this image. Please add context (walk-in, prep station, dish area, etc.) and what you want checked.'
            : 'I cannot find relevant Washtenaw County regulations for your question. Please try rephrasing or asking about a specific topic.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    const context = buildContextString(docs)

    if (!context || context.length < 100) {
      logger.warn('Insufficient context built', { contextLength: context.length })
      return NextResponse.json(
        {
          message:
            'I found some regulations but they may not be relevant. Please be more specific about what you want me to check.',
          confidence: 'LOW',
        },
        { status: 200 }
      )
    }

    const systemPrompt = `You are protocolLM, a Washtenaw County food safety compliance assistant for restaurants.

Your job is to analyze photos and answer questions using ONLY the REGULATORY EXCERPTS provided below.

CRITICAL RULES:
1) ALWAYS cite specific text from the excerpts when you identify a violation
2) Use the exact categories: Priority, Priority Foundation, or Core
3) Use exact correction timelines only if supported by excerpts: immediate, 10 days, or 90 days
4) If you're unsure, say "needs context" and ask ONE specific question
5) Keep responses practical and actionable (bullet points are fine)

REGULATORY EXCERPTS:
${context}
`

    const userBlock = hasImage
      ? [
          {
            type: 'text',
            text: `USER QUESTION: ${effectiveUserPrompt}\n\nVISION SUMMARY: ${visionSummary || 'N/A'}${
              visionOk ? '' : '\n\nNOTE: Vision pre-pass failed; rely on the image + excerpts only.'
            }`,
          },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]
      : `USER QUESTION: ${effectiveUserPrompt}`

    let formatted = ''
    let answerOk = true

    try {
      const answerResp = await withTimeout(
        openai.chat.completions.create({
          model: OPENAI_CHAT_MODEL,

          // ✅ FIX: max_tokens -> max_completion_tokens
          // Give room for reasoning + output (this budget includes reasoning tokens)
          max_completion_tokens: 2200,

          // ✅ IMPORTANT: remove temperature for GPT-5.x reasoning-default compatibility
          // (If you later set reasoning_effort: "none", you can safely re-add temperature.)
          // temperature: 0.3,

          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userBlock },
          ],
        }),
        ANSWER_TIMEOUT_MS,
        'OPENAI_TIMEOUT'
      )

      formatted = answerResp.choices[0]?.message?.content || ''
    } catch (e) {
      answerOk = false
      logger.error('Answer generation failed', { error: e?.message })
    }

    if (!safeText(formatted)) {
      formatted = 'I encountered an error generating a response. Please try rephrasing your question or providing more context.'
    }

    await safeLogUsage({
      userId,
      plan,
      mode: hasImage ? 'vision' : 'chat',
      success: Boolean(answerOk),
      durationMs: Date.now() - startedAt,
      county,
    })

    return NextResponse.json(
      {
        message: formatted,
        confidence:
          visionConfidence === 'high' ? 'HIGH' : visionConfidence === 'medium' ? 'MEDIUM' : 'LOW',
        _meta: {
          model: OPENAI_CHAT_MODEL,
          docsRetrieved: docs.length,
          topScore: docs[0]?.score?.toFixed(3),
          avgScore: (docs.reduce((sum, d) => sum + (d.score || 0), 0) / docs.length).toFixed(3),
        },
      },
      { status: 200 }
    )
  } catch (e) {
    logger.error('Chat route failed', { error: e?.message })
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
