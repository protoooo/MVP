// lib/searchDocs.js - OpenAI Version (NO GOOGLE CLOUD)

if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const FETCH_MULTIPLIER = 4
const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland', 'macomb', 'general']

const OPERATION_TIMEOUTS = {
  EMBEDDING: 10000,   // 10s for OpenAI embedding
  DATABASE: 8000,     // 8s for database query
  TOTAL: 20000        // 20s total hard limit
}

function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return ''
  let clean = query.replace(/[\x00-\x1F\x7F]/g, '')
  clean = clean.replace(/;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE)/gi, '')
  clean = clean.replace(/\.\.\//g, '')
  if (clean.length > 2000) clean = clean.substring(0, 2000)
  return clean.trim()
}

function withTimeout(promise, ms, operationName) {
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName}_TIMEOUT`))
    }, ms)
  })
  
  return Promise.race([promise, timeoutPromise])
    .finally(() => clearTimeout(timeoutId))
}

export async function searchDocuments(query, county = 'washtenaw', topK = 20) {
  const startTime = Date.now()
  
  try {
    console.log('[SearchDocs] === START ===')

    const safeQuery = sanitizeQuery(query)
    if (!safeQuery || safeQuery.length === 0) {
      console.log('[SearchDocs] Empty query after sanitization')
      return []
    }

    const safeCounty = VALID_COUNTIES.includes(county.toLowerCase())
      ? county.toLowerCase()
      : 'washtenaw'

    console.log(`[SearchDocs] Query: "${safeQuery.substring(0, 50)}..." | County: ${safeCounty}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Generate embedding with OpenAI
    console.log('[SearchDocs] Step 1: Calling OpenAI embedding API...')
    const embeddingStart = Date.now()

    const embeddingPromise = openai.embeddings.create({
      model: "text-embedding-3-small",
      input: safeQuery,
    })

    const embeddingResponse = await withTimeout(
      embeddingPromise,
      OPERATION_TIMEOUTS.EMBEDDING,
      'EMBEDDING'
    )

    console.log(`[SearchDocs] Embedding API responded in ${Date.now() - embeddingStart}ms`)

    const queryEmbedding = embeddingResponse.data[0]?.embedding || null

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.error('[SearchDocs] ❌ Invalid embedding response')
      return []
    }

    console.log(`[SearchDocs] ✅ Embedding generated: ${queryEmbedding.length} dimensions`)

    // Search Supabase
    console.log('[SearchDocs] Step 2: Searching database...')
    const fetchCount = topK * FETCH_MULTIPLIER
    const dbStart = Date.now()

    const dbPromise = supabase.rpc(
      'match_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: fetchCount,
        filter_county: safeCounty,
      }
    )

    const { data: documents, error } = await withTimeout(
      dbPromise,
      OPERATION_TIMEOUTS.DATABASE,
      'DATABASE'
    )

    console.log(`[SearchDocs] Database query completed in ${Date.now() - dbStart}ms`)

    if (error) {
      console.error('[SearchDocs] ❌ Supabase RPC error:', error)
      return []
    }

    if (!documents || documents.length === 0) {
      console.log('[SearchDocs] ⚠️ No documents found')
      return []
    }

    const results = documents.map(doc => ({
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: doc.similarity,
      county: doc.metadata?.county || 'general'
    }))

    results.sort((a, b) => b.score - a.score)

    const finalResults = results.slice(0, topK)
    
    const totalTime = Date.now() - startTime
    console.log(`[SearchDocs] ✅ SUCCESS: Found ${finalResults.length} docs in ${totalTime}ms`)
    console.log(`[SearchDocs] Top score: ${finalResults[0]?.score.toFixed(3)}`)

    return finalResults

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`[SearchDocs] ❌ FATAL ERROR after ${totalTime}ms:`, error.message)
    
    if (error.message.includes('TIMEOUT')) {
      console.error('[SearchDocs] ⏱️ Operation timed out - check OpenAI connectivity')
    }
    
    return []
  }
}
