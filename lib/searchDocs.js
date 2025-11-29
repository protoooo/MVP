if (typeof window !== 'undefined') {
  throw new Error('[SearchDocs] This module cannot run in the browser')
}

// 1. Change Import to Vertex AI
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
    // 2. Initialize Vertex AI with Project ID
    // Ensure GCLOUD_PROJECT_ID is in your .env (e.g. food-safety-production)
    const projectId = process.env.GCLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const location = 'us-central1'
    
    if (projectId && !vertexAI) {
      vertexAI = new VertexAI({ project: projectId, location: location })
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
    console.error('[SearchDocs] Clients not initialized')
    return []
  }

  try {
    if (!query || query.trim().length === 0) return []

    // 3. Use Vertex AI Model for Embeddings
    // Note: Vertex AI separates generative models from embedding models in instantiation
    const model = ai.preview.getGenerativeModel({ model: "text-embedding-004" })
    
    // 4. Generate Embedding (Vertex AI SDK format)
    const result = await model.embedContent(query)
    
    // Vertex AI SDK usually returns embeddings in result.embeddings[0].values
    // But text-embedding-004 via this SDK might match the GenerativeAI response structure.
    // We handle both safely:
    const queryEmbedding = result.embedding?.values || result.embeddings?.[0]?.values

    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding from Vertex AI')
    }

    const fetchCount = topK * FETCH_MULTIPLIER
    
    const { data: allDocuments, error } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: fetchCount,
      filter_county: null 
    })
    
    if (error) {
      console.error('[SearchDocs] Supabase RPC error:', error)
      return []
    }
    if (!allDocuments) return []

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
