if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'

const FETCH_MULTIPLIER = 4
const COUNTY_MATCH_BOOST = 2.0
const STATE_DOC_PENALTY = 0.7
const FEDERAL_DOC_PENALTY = 0.5

let vertexAI = null
let supabase = null

function initializeClients() {
  if (vertexAI && supabase) return { vertexAI, supabase }
  
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID || 'food-safety-production'
    const location = 'us-central1'
    
    if (!vertexAI) {
      let vertexConfig = { project: projectId, location: location }

      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
          const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
          const privateKey = credentials.private_key 
            ? credentials.private_key.replace(/\\n/g, '\n')
            : undefined

          vertexConfig.googleAuthOptions = {
            credentials: {
              client_email: credentials.client_email,
              private_key: privateKey,
            }
          }
        } catch (e) {
          console.error("Failed to parse GOOGLE_CREDENTIALS_JSON", e)
        }
      }
      
      vertexAI = new VertexAI(vertexConfig)
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
  
  return { vertexAI, supabase }
}

const DOCUMENT_PRIORITY = {
  'enforcement': 150,
  'inspection': 140,
  'violation': 130,
  'sanitary code': 120,
  'health division': 110,
  'michigan': 60,
  'mi_modified': 55,
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
  const { vertexAI: ai, supabase: db } = initializeClients()
  
  if (!ai || !db) {
    console.error('[SearchDocs] Failed to initialize clients')
    return []
  }

  try {
    if (!query || query.trim().length === 0) return []

    console.log('[SearchDocs] Generating embedding for query:', query.substring(0, 50))

    // ✅ UPDATED: Use text-embedding-004 (still stable, or upgrade to 005 if available)
    const embeddingModel = ai.getGenerativeModel({ 
      model: "text-embedding-004"
    })
    
    // Call embedContent as a method on the model
    const embeddingResult = await embeddingModel.embedContent(query)
    
    // Extract the embedding values
    const queryEmbedding = embeddingResult.embedding?.values

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.error("[SearchDocs] Vertex AI returned invalid embedding format:", embeddingResult)
      return []
    }

    console.log('[SearchDocs] Embedding generated, length:', queryEmbedding.length)

    const fetchCount = topK * FETCH_MULTIPLIER
    
    console.log('[SearchDocs] Querying Supabase for county:', county)
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null 
    })
    
    if (error) {
      console.error('[SearchDocs] Supabase RPC error:', error)
      return []
    }
    
    if (!allDocuments || allDocuments.length === 0) {
      console.log('[SearchDocs] No documents returned from Supabase')
      return []
    }

    console.log('[SearchDocs] Documents retrieved:', allDocuments.length)

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

    const finalResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    console.log('[SearchDocs] Returning', finalResults.length, 'results')
    if (finalResults.length > 0) {
      console.log('[SearchDocs] Top result source:', finalResults[0]?.source)
    }
    
    return finalResults
      
  } catch (error) {
    console.error('[SearchDocs] System error:', error)
    console.error('[SearchDocs] Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    })
    return []
  }
}
