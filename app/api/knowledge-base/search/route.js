// app/api/knowledge-base/search/route.js
// Public semantic search endpoint for Michigan food safety regulations
import { NextResponse } from 'next/server'
import { checkRateLimit, getIpAddress, RATE_LIMITS } from '@/lib/rateLimiting'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let searchDocuments = null
let cohere = null

async function getSearchDocuments() {
  if (!searchDocuments) {
    const searchDocsModule = await import('@/lib/searchDocs')
    searchDocuments = searchDocsModule.searchDocuments
  }
  return searchDocuments
}

async function getCohereClient() {
  if (!cohere && process.env.COHERE_API_KEY) {
    const { CohereClient } = await import('cohere-ai')
    cohere = new CohereClient({ token: process.env.COHERE_API_KEY })
  }
  return cohere
}

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    // Rate limiting by IP
    const ip = getIpAddress(request)
    const rateLimit = await checkRateLimit(ip, RATE_LIMITS.KNOWLEDGE_BASE_SEARCH)
    
    if (!rateLimit.allowed) {
      logger.info('Knowledge base search rate limit exceeded', { ip, retryAfter: rateLimit.retryAfter })
      return NextResponse.json(
        {
          error: `You've reached the search limit. Try again in ${rateLimit.retryAfter} minutes or contact us for API access.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const query = body?.query || body?.question || ''
    
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Query must be at least 3 characters' },
        { status: 400 }
      )
    }

    const sanitizedQuery = query.trim().slice(0, 500)
    
    logger.info('Knowledge base search', { 
      ip, 
      queryLength: sanitizedQuery.length,
      remaining: rateLimit.remaining 
    })

    // Search documents
    const searchFn = await getSearchDocuments()
    const topK = Math.min(body?.topK || 5, 10) // Max 10 results
    
    const results = await searchFn(sanitizedQuery, 'michigan', topK * 2, 'food_safety')
    
    if (!results || results.length === 0) {
      return NextResponse.json({
        query: sanitizedQuery,
        results: [],
        message: 'No relevant regulations found. Try rephrasing your question.',
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt
      })
    }

    // Rerank results for better relevance
    const cohereClient = await getCohereClient()
    let finalResults = results.slice(0, topK)
    
    if (cohereClient && results.length > 3) {
      try {
        const rerankResponse = await cohereClient.rerank({
          model: process.env.COHERE_RERANK_MODEL || 'rerank-v4.0-pro',
          query: sanitizedQuery,
          documents: results.map(doc => doc.text || ''),
          topN: Math.min(topK, results.length)
        })
        
        finalResults = (rerankResponse?.results || [])
          .map(r => ({
            ...results[r.index],
            relevanceScore: r.relevanceScore
          }))
          .slice(0, topK)
      } catch (rerankError) {
        logger.warn('Rerank failed, using original results', { error: rerankError.message })
      }
    }

    // Format results
    const formattedResults = finalResults.map(doc => ({
      regulation: doc.text?.slice(0, 1000) || '',
      source: doc.source || 'Michigan Food Code',
      page: doc.page || 'N/A',
      relevance: doc.relevanceScore || doc.score || 0,
      // Add practical example placeholder
      example: generatePracticalExample(doc.text || '')
    }))

    // Find related requirements (semantically similar)
    const relatedQuery = `${sanitizedQuery} related requirements similar regulations`
    const relatedResults = await searchFn(relatedQuery, 'michigan', 3, 'food_safety')
    
    const relatedRequirements = relatedResults
      .filter(doc => {
        // Exclude results that are too similar to main results
        return !finalResults.some(r => 
          r.text?.slice(0, 200) === doc.text?.slice(0, 200)
        )
      })
      .slice(0, 3)
      .map(doc => ({
        regulation: doc.text?.slice(0, 500) || '',
        source: doc.source || 'Michigan Food Code',
        page: doc.page || 'N/A'
      }))

    const duration = Date.now() - startTime
    
    // Track query for analytics
    await trackKnowledgeBaseQuery(ip, sanitizedQuery, finalResults.length, duration)
    
    logger.info('Knowledge base search completed', {
      ip,
      resultsCount: finalResults.length,
      durationMs: duration
    })

    return NextResponse.json({
      query: sanitizedQuery,
      results: formattedResults,
      relatedRequirements,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
      conversionMessage: finalResults.length > 0 
        ? `This is ${finalResults.length} of 200+ requirements we check automatically. See how your establishment measures up.`
        : null
    })
    
  } catch (error) {
    logger.error('Knowledge base search error', { error: error.message, stack: error.stack })
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Generate a practical example based on regulation text
 */
function generatePracticalExample(text) {
  const lower = text.toLowerCase()
  
  if (lower.includes('temperature') && lower.includes('refrigera')) {
    return 'Example: Store raw chicken at 38°F or below in a properly functioning refrigerator.'
  }
  if (lower.includes('handwash') || lower.includes('hand wash')) {
    return 'Example: Wash hands for 20 seconds with soap and warm water before handling food.'
  }
  if (lower.includes('chemical') && lower.includes('storage')) {
    return 'Example: Store cleaning chemicals in a locked cabinet away from food preparation areas.'
  }
  if (lower.includes('cross') && lower.includes('contamination')) {
    return 'Example: Use separate cutting boards for raw meat and ready-to-eat foods.'
  }
  if (lower.includes('sanitiz')) {
    return 'Example: Sanitize food-contact surfaces with approved sanitizer after each use.'
  }
  
  return 'Contact us for specific guidance on implementing this requirement.'
}

/**
 * Track knowledge base queries for analytics and conversion optimization
 */
async function trackKnowledgeBaseQuery(ip, query, resultsCount, duration) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    await supabase.from('knowledge_base_queries').insert({
      ip_address: ip,
      query,
      results_count: resultsCount,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.warn('Failed to track knowledge base query', { error: error.message })
  }
}
