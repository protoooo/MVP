if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const FETCH_MULTIPLIER = 4
const COUNTY_MATCH_BOOST = 2.0  // Increased
const STATE_DOC_PENALTY = 0.7   // Demote state docs
const FEDERAL_DOC_PENALTY = 0.5 // Demote federal docs heavily
const CRITICAL_DOC_BOOST = 1.4

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

const DOCUMENT_PRIORITY = {
  // County-specific enforcement/inspection
  'enforcement': 150,
  'inspection': 140,
  'violation': 130,
  'sanitary code': 120,
  'health division': 110,
  // State
  'michigan': 60,
  'mi_modified': 55,
  // Federal (fallback only)
  'fda': 30,
  'food code 2022': 25
}

function getDocType(docName) {
  const lower = docName.toLowerCase()
  if (lower.includes('fda') || lower.includes('food code 2022')) return 'federal'
  if (lower.includes('michigan') || lower.includes('mi_modified')) return 'state'
  return 'county'
}

function getDocumentPriority(docName, county) {
  if (!docName) return 1
  const lower = docName.toLowerCase()
  
  // Exact county match gets massive boost
  if (lower.includes(county)) return 200
  
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (lower.includes(key.toLowerCase())) return priority
  }
  return 5
}

function calculateRelevanceScore(doc, query, county) {
  let score = doc.similarity || 0
  
  const docName = doc.metadata?.source || ''
  const docCounty = doc.metadata?.county || ''
  const docType = getDocType(docName)
  
  // HIERARCHY: County > State > Federal
  if (docCounty === county) {
    score *= COUNTY_MATCH_BOOST
  } else if (docType === 'state') {
    score *= STATE_DOC_PENALTY
  } else if (docType === 'federal') {
    score *= FEDERAL_DOC_PENALTY
  }
  
  score += getDocumentPriority(docName, county) * 0.005
  
  return score
}

export async function searchDocuments(query, county = 'washtenaw', topK = 20) {
  const { genAI: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) return []

  try {
    if (!query || query.trim().length === 0) return []

    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    const fetchCount = topK * FETCH_MULTIPLIER
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null 
    })
    
    if (error || !allDocuments) return []

    // STRICT: County docs first, then state, then federal
    const filtered = allDocuments.map(doc => ({
      ...doc,
      docType: getDocType(doc.metadata?.source || ''),
      isCountyMatch: doc.metadata?.county === county
    }))

    const scoredResults = filtered.map(doc => ({
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: calculateRelevanceScore(doc, query, county),
      county: doc.metadata?.county || 'general',
      docType: doc.docType
    }))

    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    return []
  }
}
