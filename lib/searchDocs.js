// lib/searchDocs.js - UPDATED: Multi-sector support + Michigan-first (statewide) + safer county handling + serverless-safe cache cleanup
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'
import { SECTORS, getSectorFromCounty } from './sectors'

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

const rawEmbedModel = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_MODEL = rawEmbedModel === 'embed-english-v4.0' ? 'embed-v4.0' : rawEmbedModel
const EXPECTED_DIMENSIONS = Number(process.env.COHERE_EMBED_DIMS) || 1536

const FETCH_MULTIPLIER = 3
const MATCH_THRESHOLD = 0.25
const FALLBACK_THRESHOLD = 0.2
const MIN_PRIMARY_RESULTS = 6

const GENERAL_SCOPE = 'general'
const STATEWIDE_ALIASES = new Set(['michigan', 'statewide', 'mi', 'all', 'all_counties', 'state'])

const VALID_SCOPES = new Set([
  'washtenaw',
  'wayne',
  'oakland',
  'macomb',
  GENERAL_SCOPE,
  ...STATEWIDE_ALIASES,
])

const searchCache = new Map()
const CACHE_TTL = 60 * 60 * 1000
const MAX_CACHE_SIZE = 100

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

function sanitizeScope(scope) {
  const raw = String(scope || '').toLowerCase().trim()
  if (!raw) return GENERAL_SCOPE

  const cleaned = raw.replace(/[^a-z0-9_-]/g, '')
  if (!cleaned) return GENERAL_SCOPE

  if (STATEWIDE_ALIASES.has(cleaned)) return GENERAL_SCOPE
  if (VALID_SCOPES.has(cleaned)) return cleaned
  return GENERAL_SCOPE
}

function cleanupCache() {
  const now = Date.now()
  let cleaned = 0

  for (const [key, value] of searchCache.entries()) {
    if (!value?.timestamp || now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key)
      cleaned++
    }
  }

  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
    entries.sort((a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0))
    const toRemove = entries.slice(0, searchCache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) searchCache.delete(key)
    cleaned += toRemove.length
  }

  if (cleaned > 0) {
    logger.debug('Cache cleanup', { entriesRemoved: cleaned, cacheSize: searchCache.size })
  }
}

function maybeCleanupCache() {
  if (searchCache.size > MAX_CACHE_SIZE || Math.random() < 0.05) cleanupCache()
}

function mapMatchDocumentsRow(doc, filterScope) {
  return {
    source: doc?.metadata?.source || doc?.metadata?.title || 'Unknown Source',
    page: doc?.metadata?.page_estimate || doc?.metadata?.page || 'N/A',
    text: doc?.content || '',
    score: doc?.similarity || 0,
    county: doc?.metadata?.county || filterScope || 'unknown',
  }
}

async function generateEmbedding(safeQuery) {
  const embeddingResponse = await Promise.race([
    cohere.embed({
      texts: [safeQuery],
      model: COHERE_MODEL,
      inputType: 'search_query',
      embeddingTypes: ['float'],
      truncate: 'END',
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('EMBEDDING_TIMEOUT')), 10000)),
  ])

  const queryEmbedding = embeddingResponse?.embeddings?.float?.[0]
  if (!queryEmbedding) throw new Error('No embedding returned from Cohere')

  if (queryEmbedding.length !== EXPECTED_DIMENSIONS) {
    logger.error('Unexpected embedding dimensions', {
      model: COHERE_MODEL,
      expected: EXPECTED_DIMENSIONS,
      received: queryEmbedding.length,
    })
    throw new Error('Embedding model dimension mismatch - database may need re-ingestion')
  }

  return queryEmbedding
}

async function runMatchDocuments({ supabase, queryEmbedding, filterScope, filterSector, threshold, fetchCount, label }) {
  const { data: documents, error } = await Promise.race([
    supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: fetchCount,
      filter_county: filterScope,
      filter_sector: filterSector || null,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 8000)),
  ])

  if (error) {
    logger.error('Supabase search error', {
      error: error.message,
      code: error.code,
      details: error.details,
      phase: label,
      filterScope,
      filterSector,
    })
    return []
  }

  return (documents || []).map((doc) => mapMatchDocumentsRow(doc, filterScope))
}

function dedupeResults(results) {
  const seen = new Set()
  return (results || []).filter((r) => {
    const key = `${r.source}|${r.page}|${(r.text || '').slice(0, 120)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function searchDocuments(query, countyOrScope = 'michigan', topK = 20, sectorId = null) {
  const startTime = Date.now()
  maybeCleanupCache()

  try {
    const safeQuery = sanitizeQuery(query)
    if (!safeQuery) {
      logger.warn('Empty query after sanitization')
      return []
    }

    const safeScope = sanitizeScope(countyOrScope)
    const fetchCount = Math.min(topK * FETCH_MULTIPLIER, 100)
    
    // ✅ FOOD SAFETY ONLY: Always use FOOD_SAFETY sector regardless of input
    const effectiveSector = SECTORS.FOOD_SAFETY

    const cacheKey = `${safeQuery}:${safeScope}:${topK}:${effectiveSector}`
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info('Search cache hit', {
        query: safeQuery.substring(0, 50),
        scope: safeScope,
        sector: effectiveSector,
        age: Math.round((Date.now() - cached.timestamp) / 1000) + 's',
      })
      return cached.results
    } else if (cached) {
      searchCache.delete(cacheKey)
    }

    logger.info('Document search initiated (Cohere) - Food Safety Only', {
      queryLength: safeQuery.length,
      scope: safeScope,
      sector: effectiveSector,
      topK,
    })

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('Supabase env missing for searchDocs', {
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      })
      return []
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    let queryEmbedding
    try {
      queryEmbedding = await generateEmbedding(safeQuery)
      logger.debug('Embedding generated', { model: COHERE_MODEL, dimensions: queryEmbedding.length })
    } catch (embedError) {
      logger.error('Embedding generation failed', { error: embedError.message })
      return []
    }

    try {
      let results = []
      let fallbackUsed = false

      if (safeScope !== GENERAL_SCOPE) {
        const primary = await runMatchDocuments({
          supabase,
          queryEmbedding,
          filterScope: safeScope,
          filterSector: effectiveSector,
          threshold: MATCH_THRESHOLD,
          fetchCount,
          label: 'primary_county',
        })
        results = results.concat(primary)

        if (results.length < MIN_PRIMARY_RESULTS) {
          const relaxed = await runMatchDocuments({
            supabase,
            queryEmbedding,
            filterScope: safeScope,
            filterSector: effectiveSector,
            threshold: FALLBACK_THRESHOLD,
            fetchCount,
            label: 'fallback_same_county',
          })
          results = results.concat(relaxed)
          fallbackUsed = fallbackUsed || relaxed.length > 0
        }

        if (results.length < MIN_PRIMARY_RESULTS) {
          const general = await runMatchDocuments({
            supabase,
            queryEmbedding,
            filterScope: GENERAL_SCOPE,
            filterSector: effectiveSector,
            threshold: FALLBACK_THRESHOLD,
            fetchCount,
            label: 'fallback_general',
          })
          results = results.concat(general)
          fallbackUsed = fallbackUsed || general.length > 0
        }
      } else {
        const general = await runMatchDocuments({
          supabase,
          queryEmbedding,
          filterScope: GENERAL_SCOPE,
          filterSector: effectiveSector,
          threshold: MATCH_THRESHOLD,
          fetchCount,
          label: 'primary_general',
        })
        results = results.concat(general)

        if (results.length < MIN_PRIMARY_RESULTS) {
          const relaxedGeneral = await runMatchDocuments({
            supabase,
            queryEmbedding,
            filterScope: GENERAL_SCOPE,
            filterSector: effectiveSector,
            threshold: FALLBACK_THRESHOLD,
            fetchCount,
            label: 'fallback_general_relaxed',
          })
          results = results.concat(relaxedGeneral)
          fallbackUsed = fallbackUsed || relaxedGeneral.length > 0
        }
      }

      results = dedupeResults(results)

      if (!results.length) {
        logger.warn('No documents found', { scope: safeScope, sector: effectiveSector, queryLength: safeQuery.length })
        return []
      }

      results.sort((a, b) => (b.score || 0) - (a.score || 0))
      const finalResults = results.slice(0, topK)

      searchCache.set(cacheKey, { results: finalResults, timestamp: Date.now() })

      const duration = Date.now() - startTime
      logger.info('Search completed successfully (Cohere)', {
        resultsCount: finalResults.length,
        durationMs: duration,
        topScore: finalResults[0]?.score?.toFixed?.(4),
        avgScore: (finalResults.reduce((sum, r) => sum + (r.score || 0), 0) / finalResults.length).toFixed(4),
        cacheSize: searchCache.size,
        model: COHERE_MODEL,
        threshold: MATCH_THRESHOLD,
        fallbackUsed,
        scope: safeScope,
        sector: effectiveSector,
      })

      return finalResults
    } catch (searchError) {
      logger.error('Search execution failed', { error: searchError.message, stack: searchError.stack })
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

export function getCacheStats() {
  return {
    size: searchCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
    ttlHours: CACHE_TTL / (60 * 60 * 1000),
    model: COHERE_MODEL,
    expectedDimensions: EXPECTED_DIMENSIONS,
    generalScope: GENERAL_SCOPE,
  }
}

export function clearSearchCache() {
  searchCache.clear()
  logger.info('Search cache manually cleared')
}
