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

// CRITICAL: These documents MUST appear for county-specific queries
const COUNTY_CRITICAL_DOCS = {
  washtenaw: [
    'Enforcement Action',
    'Food Service Inspection Program',
    'washtenaw'
  ],
  wayne: [
    'Enforcement',
    'Inspection',
    'wayne'
  ],
  oakland: [
    'Enforcement',
    'Inspection',
    'oakland'
  ]
}

// Enhanced document priority system
const DOCUMENT_PRIORITY = {
  // TIER 1: County-Specific Enforcement (HIGHEST PRIORITY)
  'Enforcement Action': 100,
  'Food Service Inspection Program': 95,
  'Food Service Inspection': 90,
  'Food Allergy Information': 85,
  
  // TIER 2: State/Federal Core Code
  'FDA_FOOD_CODE_2022': 50,
  'MI_MODIFIED_FOOD_CODE': 48,
  'mcl_act_92_of_2000': 45,
  'PROCEDURES_FOR_THE_ADMINISTRATION': 42,
  
  // TIER 3: Specific Compliance Topics
  'NorovirusEnvironCleaning': 30,
  'Cooling Foods': 28,
  'Cross contamination': 28,
  'cook_temps': 26,
  'hold_temps': 26,
  'calibrate_thermometer': 24,
  'clean_sanitizing': 24,
  '3comp_sink': 22,
  'Food borne illness': 22,
  
  // TIER 4: Supporting Documents
  '5keys_to_safer_food': 15,
  'consumer_advisory': 12,
  'Summary Chart': 10
}

function getDocumentPriority(docName, county) {
  if (!docName) return 1
  
  const docNameLower = docName.toLowerCase()
  
  // MASSIVE boost for county-specific documents
  if (docNameLower.includes(county)) {
    return 150
  }
  
  // Check against priority list
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) {
    if (docNameLower.includes(key.toLowerCase())) {
      return priority
    }
  }
  
  return 5
}

function isCountyCriticalDoc(docName, county) {
  if (!docName) return false
  
  const docNameLower = docName.toLowerCase()
  const criticalKeywords = COUNTY_CRITICAL_DOCS[county] || []
  
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
  
  // ============================================
  // CRITICAL: County-specific documents get MASSIVE boost
  // ============================================
  if (docCounty === county) {
    score += 0.5 // Add 50% to score immediately
  }
  
  // If this is a critical county document, boost even more
  if (isCountyCriticalDoc(docName, county)) {
    score += 0.3 // Additional 30% boost
  }
  
  // Priority boost based on document type
  const priorityBoost = getDocumentPriority(docName, county) * 0.003
  score += priorityBoost
  
  // ============================================
  // Term matching with weighted importance
  // ============================================
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 3)
  const criticalTerms = [
    'violation', 'priority', 'foundation', 'core',
    'enforcement', 'inspection', 'risk', 'fine'
  ]
  
  let termMatchScore = 0
  let criticalTermMatches = 0
  
  for (const term of queryTerms) {
    if (content.includes(term)) {
      termMatchScore += 0.02
      
      if (criticalTerms.includes(term)) {
        criticalTermMatches += 1
        termMatchScore += 0.03 // Extra boost for critical terms
      }
    }
  }
  
  score += termMatchScore
  score += (criticalTermMatches * 0.05)
  
  // ============================================
  // Regulatory keyword presence
  // ============================================
  const regulatoryKeywords = [
    'shall', 'must', 'required', 'prohibited', 
    'violation', 'temperature', 'approved', 'certified',
    'priority foundation', 'priority', 'core item'
  ]
  
  const regKeywordCount = regulatoryKeywords.filter(kw => 
    content.includes(kw)
  ).length
  
  score += (regKeywordCount * 0.015)
  
  // ============================================
  // Penalty for documents from wrong county
  // ============================================
  if (docCounty && docCounty !== county && docCounty !== 'general') {
    score *= 0.3 // Reduce score by 70%
  }
  
  return Math.min(score, 2.0) // Allow scores above 1.0 for critical docs
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
    console.log('[SearchDocs] Requesting:', topK, 'results')
    
    // ============================================
    // PHASE 1: Generate query embedding
    // ============================================
    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    console.log('[SearchDocs] Embedding generated:', queryEmbedding.length)

    // ============================================
    // PHASE 2: Fetch MORE documents than needed
    // We'll do aggressive filtering after
    // ============================================
    const fetchCount = topK * 3 // Fetch 3x to ensure county docs appear
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null // Don't filter in DB, we'll do it in JS
    })
    
    if (error) {
      console.error('[SearchDocs] Match error:', error)
      return []
    }
    
    console.log('[SearchDocs] Retrieved', allDocuments?.length || 0, 'raw documents')
    
    if (!allDocuments || allDocuments.length === 0) {
      console.warn('[SearchDocs] No documents found')
      return []
    }

    // ============================================
    // PHASE 3: Separate county-specific from general
    // ============================================
    const countyDocs = []
    const generalDocs = []
    const otherCountyDocs = []
    
    for (const doc of allDocuments) {
      const docCounty = doc.metadata?.county || 'general'
      
      if (docCounty === county) {
        countyDocs.push(doc)
      } else if (docCounty === 'general' || !docCounty) {
        generalDocs.push(doc)
      } else {
        otherCountyDocs.push(doc)
      }
    }
    
    console.log('[SearchDocs] County-specific:', countyDocs.length)
    console.log('[SearchDocs] General:', generalDocs.length)
    console.log('[SearchDocs] Other counties:', otherCountyDocs.length)

    // ============================================
    // PHASE 4: Score all documents
    // ============================================
    const scoredResults = []
    
    // Score county docs (with boost)
    for (const doc of countyDocs) {
      scoredResults.push({
        source: doc.metadata?.source || 'Unknown',
        page: doc.metadata?.page || doc.metadata?.chunk_index || 'N/A',
        text: doc.content,
        score: calculateRelevanceScore(doc, query, county),
        county: county,
        isCritical: isCountyCriticalDoc(doc.metadata?.source, county)
      })
    }
    
    // Score general docs (normal)
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
    
    // Score other county docs (penalized)
    for (const doc of otherCountyDocs) {
      scoredResults.push({
        source: doc.metadata?.source || 'Unknown',
        page: doc.metadata?.page || doc.metadata?.chunk_index || 'N/A',
        text: doc.content,
        score: calculateRelevanceScore(doc, query, county) * 0.2,
        county: doc.metadata?.county || 'other',
        isCritical: false
      })
    }

    // ============================================
    // PHASE 5: Ensure critical county docs appear
    // ============================================
    const criticalCountyDocs = scoredResults
      .filter(r => r.county === county && r.isCritical)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Take top 5 critical docs
    
    const otherDocs = scoredResults
      .filter(r => !(r.county === county && r.isCritical))
      .sort((a, b) => b.score - a.score)
    
    // Combine: critical docs first, then others
    const finalResults = [
      ...criticalCountyDocs,
      ...otherDocs
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
