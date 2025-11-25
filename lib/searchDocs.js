if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const FETCH_MULTIPLIER = 3 
const COUNTY_MATCH_BOOST = 1.5 
const CRITICAL_DOC_BOOST = 1.3 
const PRIORITY_SCORE_MULTIPLIER = 0.003 
const TERM_MATCH_BOOST = 0.1 
const WRONG_COUNTY_PENALTY = 0.3 
const MAX_RELEVANCE_SCORE = 2.0 

let vertex_ai = null
let supabase = null

function initializeClients() {
  if (vertex_ai && supabase) return { vertex_ai, supabase }
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON

    if (projectId) {
      if (credentialsJson && !vertex_ai) {
        const tempFile = path.join('/tmp', 'search-creds.json')
        try {
          fs.writeFileSync(tempFile, credentialsJson)
          process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFile
        } catch(e) {}
      }
      
      if (!vertex_ai) {
        vertex_ai = new VertexAI({ project: projectId, location: 'us-central1' })
      }
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
  
  return { vertex_ai, supabase }
}

// ... Priorities helper functions ...
const CRITICAL_DOCS = { washtenaw: ['Enforcement Action', 'Food Service Inspection Program'], wayne: ['Enforcement', 'Inspection'], oakland: ['Enforcement', 'Inspection'] }
const DOCUMENT_PRIORITY = { 'Enforcement Action': 100, 'Food Service Inspection Program': 95, 'Food Service Inspection': 90, 'Food Allergy Information': 85, 'FDA_FOOD_CODE_2022': 50, 'MI_MODIFIED_FOOD_CODE': 48, 'NorovirusEnvironCleaning': 30, 'Cooling Foods': 28, 'Cross contamination': 28, 'cook_temps': 26, 'calibrate_thermometer': 24, 'clean_sanitizing': 24, '3comp_sink': 22, '5keys_to_safer_food': 15, 'consumer_advisory': 12, 'Summary Chart': 10 }

function getDocumentPriority(docName, county) {
  if (!docName) return 1
  const docNameLower = docName.toLowerCase()
  if (docNameLower.includes(county)) return 150
  for (const [key, priority] of Object.entries(DOCUMENT_PRIORITY)) { if (docNameLower.includes(key.toLowerCase())) return priority }
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
  if (docCounty === county) score *= COUNTY_MATCH_BOOST
  if (isCriticalDoc(docName, county)) score *= CRITICAL_DOC_BOOST
  score += getDocumentPriority(docName, county) * PRIORITY_SCORE_MULTIPLIER
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 3)
  const termMatches = queryTerms.filter(term => content.includes(term))
  score *= (1 + termMatches.length * TERM_MATCH_BOOST)
  if (docCounty && docCounty !== county && docCounty !== 'general') score *= WRONG_COUNTY_PENALTY
  return Math.min(score, MAX_RELEVANCE_SCORE)
}

export async function searchDocuments(query, county = 'washtenaw', topK = 25) {
  const { vertex_ai: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) return []

  try {
    if (!query || query.trim().length === 0) return []

    // Use Vertex AI Embedding Model
    const model = ai.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    
    // Handle Vertex AI response structure
    const embeddings = result.embeddings
    const queryEmbedding = embeddings && embeddings[0] ? embeddings[0].values : null

    if (!queryEmbedding) return []

    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: topK * FETCH_MULTIPLIER,
      filter_county: null
    })
    
    if (error || !allDocuments) return []

    const countyDocs = [], generalDocs = [], otherDocs = []
    for (const doc of allDocuments) {
      const docCounty = doc.metadata?.county || 'general'
      if (docCounty === county) countyDocs.push(doc)
      else if (docCounty === 'general' || !docCounty) generalDocs.push(doc)
      else otherDocs.push(doc)
    }

    const scoredResults = []
    const processDocs = (docs, isTargetCounty) => {
      for (const doc of docs) {
        scoredResults.push({
          source: doc.metadata?.source || 'Unknown',
          page: doc.metadata?.page || 'N/A',
          text: doc.content,
          score: calculateRelevanceScore(doc, query, county) * (isTargetCounty ? 1 : (doc.metadata?.county === 'general' ? 1 : 0.2)),
          county: doc.metadata?.county || 'general',
          isCritical: isCriticalDoc(doc.metadata?.source, county)
        })
      }
    }

    processDocs(countyDocs, true)
    processDocs(generalDocs, false)
    processDocs(otherDocs, false)

    return scoredResults.sort((a, b) => b.score - a.score).slice(0, topK)
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    return []
  }
}
