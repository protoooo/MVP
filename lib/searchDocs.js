// lib/searchDocs.js - Fixed with better error handling
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const FETCH_MULTIPLIER = 4
const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland', 'macomb', 'general']

function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return ''
  let clean = query.replace(/[\x00-\x1F\x7F]/g, '')
  if (clean.length > 2000) clean = clean.substring(0, 2000)
  return clean.trim()
}

export async function searchDocuments(query, county = 'washtenaw', topK = 20) {
  try {
    const safeQuery = sanitizeQuery(query)
    if (!safeQuery) {
      console.warn('[SearchDocs] Empty query after sanitization')
      return []
    }

    const safeCounty = VALID_COUNTIES.includes(county.toLowerCase()) ? county.toLowerCase() : 'washtenaw'

    console.log(`[SearchDocs] Query: "${safeQuery.substring(0, 50)}..." | County: ${safeCounty}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Generate embedding with OpenAI with timeout
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
      console.error('[SearchDocs] No embedding returned from OpenAI')
      return []
    }

    console.log(`[SearchDocs] ✅ Embedding generated: ${queryEmbedding.length} dimensions`)

    // Search Supabase with timeout
    const fetchCount = topK * FETCH_MULTIPLIER
    
    const searchPromise = supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: fetchCount,
      filter_county: safeCounty,
    })

    const searchTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), 5000)
    )

    const { data: documents, error } = await Promise.race([searchPromise, searchTimeout])

    if (error) {
      console.error('[SearchDocs] Supabase RPC error:', error)
      return []
    }

    if (!documents || documents.length === 0) {
      console.warn('[SearchDocs] No documents found in database')
      return []
    }

    console.log(`[SearchDocs] Found ${documents.length} documents`)

    const results = documents.map(doc => ({
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: doc.similarity,
      county: doc.metadata?.county || 'general'
    }))

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)

  } catch (error) {
    console.error('[SearchDocs] Critical Error:', error.message)
    // Return empty array instead of throwing - allows chat to continue without context
    return []
  }
}
