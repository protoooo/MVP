// lib/searchDocs.js - COHERE VERSION
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

const FETCH_MULTIPLIER = 3
const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland', 'macomb', 'general']

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

    logger.info('Document search initiated (Cohere)', {
      queryLength: safeQuery.length,
      county: safeCounty,
      topK,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Generate embedding with Cohere
    let queryEmbedding
    try {
      const embeddingResponse = await Promise.race([
        cohere.embed({
          texts: [safeQuery],
          model: 'embed-english-v3.0',
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

      logger.debug('Embedding generated (Cohere)', { dimensions: queryEmbedding.length })
    } catch (embedError) {
      logger.error('Embedding generation failed', { error: embedError.message })
      return []
    }

    const fetchCount = Math.min(topK * FETCH_MULTIPLIER, 100)

    try {
      const { data: documents, error } = await Promise.race([
        supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: fetchCount,
          filter_county: safeCounty,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 8000)),
      ])

      if (error) {
        logger.error('Supabase search error', {
          error: error.message,
          code: error.code,
          details: error.details,
        })
        return []
      }

      if (!documents || documents.length === 0) {
        logger.warn('No documents found', {
          county: safeCounty,
          queryLength: safeQuery.length,
        })
        return []
      }

      const results = documents.map((doc) => ({
        source: doc.metadata?.source || 'Unknown Source',
        page: doc.metadata?.page_estimate || doc.metadata?.page || 'N/A',
        text: doc.content || '',
        score: doc.similarity || 0,
        county: doc.metadata?.county || safeCounty,
      }))

      results.sort((a, b) => b.score - a.score)
      const finalResults = results.slice(0, topK)

      const duration = Date.now() - startTime
      logger.info('Search completed successfully (Cohere)', {
        resultsCount: finalResults.length,
        durationMs: duration,
        topScore: finalResults[0]?.score?.toFixed(4),
        avgScore: (finalResults.reduce((sum, r) => sum + r.score, 0) / finalResults.length).toFixed(4),
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
