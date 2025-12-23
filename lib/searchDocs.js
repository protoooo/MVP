// lib/searchDocs.js - FIXED: Best Cohere model + dimension validation + extended cache
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

// ✅ UPDATED: Use best Cohere model with dimension validation
const COHERE_MODEL = 'embed-english-v3.0' // Best production model
const EXPECTED_DIMENSIONS = 1024 // embed-english-v3.0 produces 1024-dim vectors

const FETCH_MULTIPLIER = 3
const MATCH_THRESHOLD = 0.25
const FALLBACK_THRESHOLD = 0.2
const MIN_PRIMARY_RESULTS = 6
const GENERAL_COUNTY = 'general'
const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland', 'macomb', 'general']

// ✅ UPDATED: Extended cache TTL from 1 minute to 1 hour (regulations don't change)
const searchCache = new Map()
const CACHE_TTL = 60 * 60 * 1000  // 1 hour
const MAX_CACHE_SIZE = 100

// Cache cleanup
function cleanupCache() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key)
      cleaned++
    }
  }
  
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.slice(0, searchCache.size - MAX_CACHE_SIZE)
    toRemove.forEach(([key]) => searchCache.delete(key))
    cleaned += toRemove.length
  }
  
  if (cleaned > 0) {
    logger.debug('Cache cleanup', { entriesRemoved: cleaned, cacheSize: searchCache.size })
  }
}

setInterval(cleanupCache, 5 * 60 * 1000)

function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return ''
  let clean = query.replace(/[\x00-\x1F\x7F]/g, '')
  clean = clean.replace(/\s+/g, ' ')
  clean = clean.replace(/[<>]/g, '')
  if (clean.length > 2000) {
    logger.warn('Query truncated', { originalLength: clean.length })
    clean = clean.substring(0, 2000)
  }
  return clean.trim()
}

export async function searchDocuments(query, county = 'washtenaw', topK = 20) {
  const startTime = Date.now()

  try {
    const safeQuery = sanitizeQuery(query)
    if (!safeQuery) {
      logger.warn('Empty query after sanitization')
      return []
    }

    const safeCounty = VALID_COUNTIES.includes(county.toLowerCase())
      ? county.toLowerCase()
      : 'washtenaw'

    // Check cache first
    const cacheKey = `${safeQuery}:${safeCounty}:${topK}`
    
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey)
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        logger.info('Search cache hit', {
          query: safeQuery.substring(0, 50),
          county: safeCounty,
          age: Math.round((Date.now() - cached.timestamp) / 1000) + 's'
        })
        return cached.results
      } else {
        searchCache.delete(cacheKey)
      }
    }

    logger.info('Document search initiated (Cohere)', {
      queryLength: safeQuery.length,
      county: safeCounty,
      topK,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // ========================================================================
    // ✅ FIXED: Generate embedding with model validation
    // ========================================================================
    let queryEmbedding
    try {
      const embeddingResponse = await Promise.race([
        cohere.embed({
          texts: [safeQuery],
          model: COHERE_MODEL, // Best production model
          inputType: 'search_query',
          embeddingTypes: ['float']
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('EMBEDDING_TIMEOUT')), 10000)),
      ])

      queryEmbedding = embeddingResponse.embeddings.float[0]

      if (!queryEmbedding) {
        logger.error('No embedding returned from Cohere')
        return []
      }

      // ✅ NEW: Validate embedding dimensions
      if (queryEmbedding.length !== EXPECTED_DIMENSIONS) {
        logger.error('Unexpected embedding dimensions', {
          model: COHERE_MODEL,
          expected: EXPECTED_DIMENSIONS,
          received: queryEmbedding.length
        })
        throw new Error('Embedding model dimension mismatch - database may need re-ingestion')
      }

      logger.debug('Embedding generated', { 
        model: COHERE_MODEL,
        dimensions: queryEmbedding.length 
      })
    } catch (embedError) {
      logger.error('Embedding generation failed', { error: embedError.message })
      return []
    }

    const fetchCount = Math.min(topK * FETCH_MULTIPLIER, 100)

    const runSearch = async (filterCounty, threshold, label) => {
      const { data: documents, error } = await Promise.race([
        supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: fetchCount,
          filter_county: filterCounty,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 8000)),
      ])

      if (error) {
        logger.error('Supabase search error', {
          error: error.message,
          code: error.code,
          details: error.details,
          phase: label,
        })
        return []
      }

      return (documents || []).map((doc) => ({
        source: doc.metadata?.source || 'Unknown Source',
        page: doc.metadata?.page_estimate || doc.metadata?.page || 'N/A',
        text: doc.content || '',
        score: doc.similarity || 0,
        county: doc.metadata?.county || filterCounty,
      }))
    }

    try {
      // Primary, stricter threshold to reduce false positives
      let results = await runSearch(safeCounty, MATCH_THRESHOLD, 'primary')
      let fallbackUsed = false

      // Fallback 1: same county, slightly lower threshold
      if ((results?.length || 0) < MIN_PRIMARY_RESULTS) {
        const relaxed = await runSearch(safeCounty, FALLBACK_THRESHOLD, 'fallback_same_county')
        results = [...results, ...relaxed]
        fallbackUsed = fallbackUsed || relaxed.length > 0
      }

      // Fallback 2: general corpus if still sparse
      if ((results?.length || 0) < MIN_PRIMARY_RESULTS && safeCounty !== GENERAL_COUNTY) {
        const general = await runSearch(GENERAL_COUNTY, FALLBACK_THRESHOLD, 'fallback_general')
        results = [...results, ...general]
        fallbackUsed = fallbackUsed || general.length > 0
      }

      // Dedupe on source+page+text prefix to avoid repetition
      const seen = new Set()
      results = (results || []).filter((r) => {
        const key = `${r.source}|${r.page}|${(r.text || '').slice(0, 120)}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      if (!results || results.length === 0) {
        logger.warn('No documents found', {
          county: safeCounty,
          queryLength: safeQuery.length,
        })
        return []
      }

      results.sort((a, b) => b.score - a.score)
      const finalResults = results.slice(0, topK)

      const duration = Date.now() - startTime
      
      // Store in cache
      searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now()
      })

      logger.info('Search completed successfully (Cohere)', {
        resultsCount: finalResults.length,
        durationMs: duration,
        topScore: finalResults[0]?.score?.toFixed(4),
        avgScore: (finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length).toFixed(4),
        cached: false,
        cacheSize: searchCache.size,
        model: COHERE_MODEL,
        threshold: MATCH_THRESHOLD,
        fallbackUsed,
      })

      return finalResults
    } catch (searchError) {
      logger.error('Search execution failed', {
        error: searchError.message,
        stack: searchError.stack,
      })
      return []
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Search failed catastrophically', {
      error: error.message,
      stack: error.stack,
      durationMs: duration,
    })
    return []
  }
}

// Export cache stats for monitoring
export function getCacheStats() {
  return {
    size: searchCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
    ttlHours: CACHE_TTL / (60 * 60 * 1000),
    model: COHERE_MODEL,
    expectedDimensions: EXPECTED_DIMENSIONS
  }
}

// Manual cache clear
export function clearSearchCache() {
  searchCache.clear()
  logger.info('Search cache manually cleared')
}
