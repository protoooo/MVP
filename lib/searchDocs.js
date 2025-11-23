// lib/searchDocs.js
// COMPLETE REWRITE with proper county filtering

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

// CRITICAL COUNTY DOCUMENTS - Must appear in results
const CRITICAL_DOCS = {
  washtenaw: ['Enforcement Action', 'Food Service Inspection Program'],
  wayne: ['Enforcement', 'Inspection'],
  oakland: ['Enforcement', 'Inspection']
}

// Document priority scoring
const DOCUMENT_PRIORITY = {
  // County-specific enforcement (HIGHEST)
  'Enforcement Action': 100,
  'Food Service Inspection Program': 95,
  'Food Service Inspection': 90,
  'Food Allergy Information': 85,
  
  // Core code
  'FDA_FOOD_CODE_2022': 50,
  'MI_MODIFIED_FOOD_CODE': 48,
  
  // Specific topics
  'NorovirusEnvironCleaning': 30,
  'Cooling Foods': 28,
  'Cross contamination': 28,
  'cook_temps': 26,
  'calibrate_thermometer': 24,
  'clean_sanitizing': 24,
  '3comp_sink': 22,
  
  // Supporting
  '5keys_to_safer_food': 15,
  'consumer_advisory': 12,
  'Summary Chart': 10
}

function getDocumentPriority(docName, county) {
  if (!docName) return 1
  
  const docNameLower = docName.toLowerCase()
  
  // MASSIVE boost for county match
  if (docNameLower.includes(county)) {
    return 150
  }
  
  // Check priority list
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (docNameLower.includes(key.toLowerCase())) {
      return priority
    }
  }
  
  return 5
}

function isCriticalDoc(docName, county) {
  if (!docName) return false
  
  const docNameLower = docName.toLowerCase()
  const criticalKeywords = CRITICAL_DOCS[county] || []
  
  return criticalKeywords.some(keyword => 
    docNameLower.includes(keyword.toLowerCase())
  )
}

function calculateRelevanceScore(doc, query, county) {
  // Start with base similarity
  let score = doc.similarity || 0
  
  const docName = doc.metadata?.source || ''
  const docCounty = doc.metadata?.county || ''
  const content = doc.content.toLowerCase()
  const queryLower = query.toLowerCase()
  
  // Rule 1: County match = +50%
  if (docCounty === county) {
    score *= 1.5
  }
  
  // Rule 2: Critical doc = +30%
  if (isCriticalDoc(docName, county)) {
    score *= 1.3
  }
  
  // Rule 3: Document priority boost
  const priorityBoost = getDocumentPriority(docName, county) * 0.003
  score += priorityBoost
  
  // Rule 4: Term matching
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 3)
  const termMatches = queryTerms.filter(term => content.includes(term))
  score *= (1 + termMatches.length * 0.1)
  
  // Rule 5: Penalize wrong county
  if (docCounty && docCounty !== county && docCounty !== 'general') {
    score *= 0.3
  }
  
  return Math.min(score, 2.0)
}

export async function searchDocuments(query, topK = 25, county = 'washtenaw') {
  const { genAI: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) {
    console.error('[SearchDocs] Clients not initialized')
    return []
  }

  try {
    if (!query || query.trim().length === 0) {
      console.warn('[SearchDocs] Empty query')
      return []
    }

    console.log('[SearchDocs] Query:', query)
    console.log('[SearchDocs] County:', county)
    
    // Generate embedding
    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    console.log('[SearchDocs] Embedding generated:', queryEmbedding.length)

    // Fetch 3x documents to ensure county docs appear
    const fetchCount = topK * 3
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null // Fetch all, filter in JS
    })
    
    if (error) {
      console.error('[SearchDocs] Match error:', error)
      return []
    }
    
    console.log('[SearchDocs] Retrieved', allDocuments?.length || 0, 'documents')
    
    if (!allDocuments || allDocuments.length === 0) {
      return []
    }

    // Separate by county
    const countyDocs = []
    const generalDocs = []
    const otherDocs = []
    
    for (const doc of allDocuments) {
      const docCounty = doc.metadata?.county || 'general'
      
      if (docCounty === county) {
        countyDocs.push(doc)
      } else if (docCounty === 'general' || !docCounty) {
        generalDocs.push(doc)
      } else {
        otherDocs.push(doc)
      }
    }
    
    console.log('[SearchDocs] County-specific:', countyDocs.length)
    console.log('[SearchDocs] General:', generalDocs.length)
    console.log('[SearchDocs] Other counties:', otherDocs.length)

    // Score all documents
    const scoredResults = []
    
    for (const doc of countyDocs) {
      scoredResults.push({
        source: doc.metadata?.source || 'Unknown',
        page: doc.metadata?.page || doc.metadata?.chunk_index || 'N/A',
        text: doc.content,
        score: calculateRelevanceScore(doc, query, county),
        county: county,
        isCritical: isCriticalDoc(doc.metadata?.source, county)
      })
    }
    
    for (const doc of generalDocs) {
      scoredResults.push({
        source: doc.metadata?.source || 'Unknown',
        page: doc.metadata?.page || doc.metadata?.chunk_index || 'N/A',
        text: doc.content,
        score: calculateRelevanceScore(doc, query, county),
        county: 'general',
        isCritical: false
      })
    }
    
    for (const doc of otherDocs) {
      scoredResults.push({
        source: doc.metadata?.source || 'Unknown',
        page: doc.metadata?.page || doc.metadata?.chunk_index || 'N/A',
        text: doc.content,
        score: calculateRelevanceScore(doc, query, county) * 0.2,
        county: doc.metadata?.county || 'other',
        isCritical: false
      })
    }

    // Ensure critical county docs appear
    const criticalCountyDocs = scoredResults
      .filter(r => r.county === county && r.isCritical)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    
    const otherScoredDocs = scoredResults
      .filter(r => !(r.county === county && r.isCritical))
      .sort((a, b) => b.score - a.score)
    
    // Combine: critical first, then others
    const finalResults = [
      ...criticalCountyDocs,
      ...otherScoredDocs
    ].slice(0, topK)

    console.log('[SearchDocs] Final results:', finalResults.length)
    console.log('[SearchDocs] Critical docs included:', criticalCountyDocs.length)
    
    if (finalResults.length > 0) {
      console.log('[SearchDocs] Top result:', {
        source: finalResults[0].source,
        score: finalResults[0].score.toFixed(3),
        critical: finalResults[0].isCritical
      })
    }

    return finalResults
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    console.error('[SearchDocs] Stack:', error.stack)
    return []
  }
}
