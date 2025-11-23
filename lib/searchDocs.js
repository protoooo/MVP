// lib/searchDocs.js
// CRITICAL: This file must NEVER be imported on the client side

if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

let genAI = null
let supabase = null

function initializeClients() {
  if (genAI && supabase) return { genAI, supabase }
  
  try {
    if (process.env.GEMINI_API_KEY && !genAI) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
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
  'FDA_FOOD_CODE_2022': 10,
  'FDA': 10,
  'USDA': 9,
  'MI_MODIFIED_FOOD_CODE': 8,
  'mcl_act_92_of_2000': 8,
  'PROCEDURES_FOR_THE_ADMINISTRATION': 7,
  'Enforcement Action': 6,
  'Violation Types': 6,
  'Food Service Inspection': 6,
  'Food Allergy Information': 5,
  'NorovirusEnvironCleaning': 5,
  'Cooling Foods': 5,
  'Cross contamination': 5,
  'cook_temps': 5,
  'hold_temps': 5,
  'cooling': 5,
  'calibrate_thermometer': 4,
  'clean_sanitizing': 4,
  '3comp_sink': 4,
  '5keys_to_safer_food': 4,
  'employeehealthposter': 4,
  'gloves_usda': 4,
  'date_marking': 4,
  'contamination': 4,
  'raw_meat_storage': 4,
  'time_as_a_public_health_control': 4,
  'consumer_advisory': 3,
  'foodallergeninformation': 3,
  'general_noro_fact_sheet': 3,
  'Food borne illness guide': 3,
  'retail_food_establishments_emergency': 2,
  'Summary Chart': 2
}

function getDocumentPriority(docName) {
  if (!docName) return 1
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (docName.toUpperCase().includes(key.toUpperCase())) return priority
  }
  return 1
}

function calculateRelevanceScore(doc, query) {
  let score = doc.similarity || 0
  
  // Priority boost based on document type
  const priorityBoost = getDocumentPriority(doc.metadata?.source || '') * 0.04
  score += priorityBoost
  
  // Term matching boost
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3)
  const content = doc.content.toLowerCase()
  const termMatches = queryTerms.filter(term => content.includes(term)).length
  const termBoost = (termMatches / Math.max(queryTerms.length, 1)) * 0.15
  score += termBoost
  
  // Regulatory keyword boost
  const regulatoryKeywords = ['shall', 'must', 'required', 'prohibited', 'violation', 'temperature', 'approved', 'certified', 'minimum', 'maximum']
  const regKeywordCount = regulatoryKeywords.filter(kw => content.includes(kw)).length
  score += (regKeywordCount * 0.02)
  
  return Math.min(score, 1.0)
}

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  const { genAI: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) {
    console.error('[SearchDocs] Clients not initialized')
    console.error('[SearchDocs] GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY)
    console.error('[SearchDocs] SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.error('[SearchDocs] SUPABASE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return []
  }

  try {
    if (!query || query.trim().length === 0) {
      console.warn('[SearchDocs] Empty query')
      return []
    }

    console.log('[SearchDocs] Searching for:', query)
    console.log('[SearchDocs] County:', county)
    
    // Generate embedding for the query
    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    console.log('[SearchDocs] Generated embedding, length:', queryEmbedding.length)

    // Search documents using the match_documents function
    const { data: documents, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_county: county
    })
    
    if (error) {
      console.error('[SearchDocs] Match error:', error)
      return []
    }
    
    console.log('[SearchDocs] Found', documents?.length || 0, 'documents')
    
    if (!documents || documents.length === 0) {
      console.warn('[SearchDocs] No documents found for query')
      return []
    }

    // Process and score the results
    const scoredResults = documents.map(doc => ({
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: calculateRelevanceScore(doc, query)
    }))

    // Sort by score and return top results
    const topResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    console.log('[SearchDocs] Returning', topResults.length, 'results')
    console.log('[SearchDocs] Top result score:', topResults[0]?.score)

    return topResults
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    console.error('[SearchDocs] Error stack:', error.stack)
    return []
  }
}
