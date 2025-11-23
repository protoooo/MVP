// lib/searchDocs.js
if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// CONFIGURATION CONSTANTS
const FETCH_MULTIPLIER = 3 // Fetch 3x documents to ensure county docs appear
const COUNTY_MATCH_BOOST = 1.5 // 50% boost for county-specific docs
const CRITICAL_DOC_BOOST = 1.3 // 30% boost for critical enforcement docs
const PRIORITY_SCORE_MULTIPLIER = 0.003 // Convert priority score to relevance boost
const TERM_MATCH_BOOST = 0.1 // 10% boost per matching query term
const WRONG_COUNTY_PENALTY = 0.3 // 70% reduction for wrong county docs
const MAX_RELEVANCE_SCORE = 2.0 // Cap relevance scores

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

const CRITICAL_DOCS = {
  washtenaw: ['Enforcement Action', 'Food Service Inspection Program'],
  wayne: ['Enforcement', 'Inspection'],
  oakland: ['Enforcement', 'Inspection']
}

const DOCUMENT_PRIORITY = {
  'Enforcement Action': 100,
  'Food Service Inspection Program': 95,
  'Food Service Inspection': 90,
  'Food Allergy Information': 85,
  'FDA_FOOD_CODE_2022': 50,
  'MI_MODIFIED_FOOD_CODE': 48,
  'NorovirusEnvironCleaning': 30,
  'Cooling Foods': 28,
  'Cross contamination': 28,
  'cook_temps': 26,
  'calibrate_thermometer': 24,
  'clean_sanitizing': 24,
  '3comp_sink': 22,
  '5keys_to_safer_food': 15,
  'consumer_advisory': 12,
  'Summary Chart': 10
}

function getDocumentPriority(docName, county) {
  if (!docName) return 1
  
  const docNameLower = docName.toLowerCase()
  
  if (docNameLower.includes(county)) {
    return 150
  }
  
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
  let score = doc.similarity || 0
  
  const docName = doc.metadata?.source || ''
  const docCounty = doc.metadata?.county || ''
  const content = doc.content.toLowerCase()
  const queryLower = query.toLowerCase()
  
  if (docCounty === county) {
    score *= COUNTY_MATCH_BOOST
  }
  
  if (isCriticalDoc(docName, county)) {
    score *= CRITICAL_DOC_BOOST
  }
  
  const priorityBoost = getDocumentPriority(docName, county) * PRIORITY_SCORE_MULTIPLIER
  score += priorityBoost
  
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 3)
  const termMatches = queryTerms.filter(term => content.includes(term))
  score *= (1 + termMatches.length * TERM_MATCH_BOOST)
  
  if (docCounty && docCounty !== county && docCounty !== 'general') {
    score *= WRONG_COUNTY_PENALTY
  }
  
  return Math.min(score, MAX_RELEVANCE_SCORE)
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
    
    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    console.log('[SearchDocs] Embedding generated:', queryEmbedding.length)

    const fetchCount = topK * FETCH_MULTIPLIER
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null
    })
    
    if (error) {
      console.error('[SearchDocs] Match error:', error)
      return []
    }
    
    console.log('[SearchDocs] Retrieved', allDocuments?.length || 0, 'documents')
    
    if (!allDocuments || allDocuments.length === 0) {
      return []
    }

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

    const criticalCountyDocs = scoredResults
      .filter(r => r.county === county && r.isCritical)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    
    const otherScoredDocs = scoredResults
      .filter(r => !(r.county === county && r.isCritical))
      .sort((a, b) => b.score - a.score)
    
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
