if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const FETCH_MULTIPLIER = 3 
const COUNTY_MATCH_BOOST = 1.5 
const MAX_RELEVANCE_SCORE = 2.0 

let genAI = null
let supabase = null

function initializeClients() {
  if (genAI && supabase) return { genAI, supabase }
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (apiKey && !genAI) {
      genAI = new GoogleGenerativeAI(apiKey)
    }
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.SUPABASE_SERVICE_ROLE_KEY && 
        !supabase) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
  } catch (error) {
    console.error('[SearchDocs] Initialization error:', error)
  }
  
  return { genAI, supabase }
}

function calculateRelevanceScore(doc, query, county) {
  let score = doc.similarity || 0
  const docCounty = doc.metadata?.county || ''
  
  // Boost local county docs
  if (docCounty === county) score *= COUNTY_MATCH_BOOST
  if (docCounty && docCounty !== county && docCounty !== 'general') score *= 0.3 // Penalty for wrong county
  
  return Math.min(score, MAX_RELEVANCE_SCORE)
}

export async function searchDocuments(query, county = 'washtenaw', topK = 25) {
  const { genAI: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) return []

  try {
    if (!query || query.trim().length === 0) return []

    // 1. Generate Embedding (Using the SAME model you used in the script)
    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    // 2. Search Database
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: topK * FETCH_MULTIPLIER,
      filter_county: null
    })
    
    if (error || !allDocuments) return []

    // 3. Rank & Filter
    const scoredResults = allDocuments.map(doc => ({
      source: doc.metadata?.source || doc.metadata?.filename || 'Unknown',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: calculateRelevanceScore(doc, query, county),
      county: doc.metadata?.county || 'general',
      metadata: doc.metadata
    }))

    // Return top results sorted by score
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    return []
  }
}
