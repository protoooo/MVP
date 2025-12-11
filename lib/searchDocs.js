// lib/searchDocs.js - Fixed county filter
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const FETCH_MULTIPLIER = 4
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

    logger.info('Document search initiated', {
      queryLength: safeQuery.length,
      county: safeCounty,
      topK
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const embeddingPromise = openai.embeddings.create({
      model: "text-embedding-3-small",
      input: safeQuery,
    })

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('EMBEDDING_TIMEOUT')), 8000)
    )

    const embeddingResponse = await Promise.race([embeddingPromise, timeoutPromise])
    const queryEmbedding = embeddingResponse.data[0]?.embedding

    if (!queryEmbedding) {
      logger.error('No embedding returned from OpenAI')
      return []
    }

    logger.debug('Embedding generated', { dimensions: queryEmbedding.length })

    const fetchCount = topK * FETCH_MULTIPLIER
    
    // FIXED: Pass null instead of county filter to get all results
    const searchPromise = supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: fetchCount,
      filter_county: null, // Changed from safeCounty to null
    })

    const searchTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 5000)
    )

    const { data: documents, error } = await Promise.race([searchPromise, searchTimeout])

    if (error) {
      logger.error('Supabase search error', { error: error.message })
      return []
    }

    if (!documents || documents.length === 0) {
      logger.warn('No documents found', { county: safeCounty })
      return []
    }

    const results = documents.map(doc => ({
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page_estimate || doc.metadata?.page || 'N/A',
      text: doc.content,
      score: doc.similarity,
      county: doc.metadata?.county || 'general'
    }))

    results.sort((a, b) => b.score - a.score)
    const finalResults = results.slice(0, topK)

    const duration = Date.now() - startTime
    logger.info('Search completed', {
      resultsCount: finalResults.length,
      durationMs: duration,
      topScore: finalResults[0]?.score
    })

    return finalResults

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Search failed', {
      error: error.message,
      durationMs: duration
    })
    return []
  }
}
