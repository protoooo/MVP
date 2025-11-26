if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// CONFIGURATION
const FETCH_MULTIPLIER = 5 // Fetch 5x docs to allow for heavy filtering
const COUNTY_MATCH_BOOST = 1.5 
const CRITICAL_DOC_BOOST = 1.3 
const PRIORITY_SCORE_MULTIPLIER = 0.003 
const TERM_MATCH_BOOST = 0.1 
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

const CRITICAL_DOCS = {
  washtenaw: ['Enforcement', 'Inspection'],
  wayne: ['Enforcement', 'Inspection'],
  oakland: ['Enforcement', 'Inspection']
}

// Priority Scoring for Specific Files
const DOCUMENT_PRIORITY = {
  'Enforcement Action': 100,
  'Food Service Inspection': 90,
  'Food Allergy': 85,
  'FDA_FOOD_CODE': 50,
  'MI_MODIFIED_FOOD_CODE': 48,
  'Norovirus': 30,
  'Cooling': 28,
  'Cook_temps': 26
}

function getDocumentPriority(docName, county) {
  if (!docName) return 1
  const docNameLower = docName.toLowerCase()
  // Boost files that explicitly match the selected county name
  if (docNameLower.includes(county)) return 150
  
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (docNameLower.includes(key.toLowerCase())) return priority
  }
  return 5
}

function isCriticalDoc(docName, county) {
  if (!docName) return false
  const docNameLower = docName.toLowerCase()
  const criticalKeywords = CRITICAL_DOCS[county] || []
  return criticalKeywords.some(keyword => docNameLower.includes(keyword.toLowerCase()))
}

function calculateRelevanceScore(doc, query, county) {
  let score = doc.similarity || 0
  
  const docName = doc.metadata?.source || ''
  const docCounty = doc.metadata?.county || ''
  const content = doc.content.toLowerCase()
  const queryLower = query.toLowerCase()
  
  // Boost if it matches current county (already filtered, but good for ranking)
  if (docCounty === county) score *= COUNTY_MATCH_BOOST
  
  if (isCriticalDoc(docName, county)) score *= CRITICAL_DOC_BOOST
  
  score += getDocumentPriority(docName, county) * PRIORITY_SCORE_MULTIPLIER
  
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 3)
  const termMatches = queryTerms.filter(term => content.includes(term))
  score *= (1 + termMatches.length * TERM_MATCH_BOOST)
  
  return Math.min(score, MAX_RELEVANCE_SCORE)
}

export async function searchDocuments(query, county = 'washtenaw', topK = 25) {
  const { genAI: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) return []

  try {
    if (!query || query.trim().length === 0) return []

    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    // 1. Fetch a LARGE pool of documents (to ensure we have enough after filtering)
    const fetchCount = topK * FETCH_MULTIPLIER
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null 
    })
    
    if (error || !allDocuments) return []

    // 2. HARD FILTERING (The Fix)
    // We define the known counties. If a doc belongs to a different county, kill it.
    const KNOWN_COUNTIES = ['washtenaw', 'wayne', 'oakland']
    
    const filteredDocs = allDocuments.filter(doc => {
      const docCounty = doc.metadata?.county || 'general'
      
      // If document county matches selected county -> KEEP
      if (docCounty === county) return true;
      
      // If document is from a DIFFERENT known county -> DISCARD
      // (e.g. If user selected "wayne", and doc is "washtenaw", returns false)
      if (KNOWN_COUNTIES.includes(docCounty) && docCounty !== county) {
        return false; 
      }
      
      // If document is 'general', 'federal', 'state', or unknown -> KEEP (Fallback)
      return true;
    })

    // 3. Score and Sort the survivors
    const scoredResults = filteredDocs.map(doc => ({
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: calculateRelevanceScore(doc, query, county),
      county: doc.metadata?.county || 'general',
      isCritical: isCriticalDoc(doc.metadata?.source, county)
    }))

    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    return []
  }
}
