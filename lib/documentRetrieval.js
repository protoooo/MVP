/**
 * Document Retrieval Utilities
 * Retrieves relevant Michigan food safety documents from Supabase vector database
 */

import { CohereClient } from 'cohere-ai'
import { createClient } from '@supabase/supabase-js'

/**
 * Get Supabase client
 * @returns {Object} Supabase client
 */
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get Cohere client
 * @returns {Object} Cohere client
 */
function getCohereClient() {
  return new CohereClient({
    token: process.env.COHERE_API_KEY
  })
}

/**
 * Retrieve relevant compliance documents for a query
 * @param {string} query - The search query
 * @param {number} topN - Number of documents to return (default: 5)
 * @returns {Promise<Array<{chunk: string, source: string, similarity: number}>>}
 */
export async function retrieveComplianceDocuments(query, topN = 5) {
  try {
    const cohere = getCohereClient()
    const supabase = getSupabaseClient()

    // Create embedding for the query using Cohere Embed 4.0
    const embedResponse = await cohere.embed({
      texts: [query],
      model: process.env.COHERE_EMBED_MODEL || 'embed-english-v3.0',
      inputType: 'search_query',
    })

    const queryEmbedding = embedResponse.embeddings[0]

    // Search for relevant documents in Supabase
    const { data: documents, error: searchError } = await supabase.rpc(
      'match_compliance_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
      }
    )

    if (searchError) {
      console.error('Document search error:', searchError)
      return []
    }

    // If we have documents, use Rerank 4.0 to improve relevance
    let relevantDocs = documents || []
    
    if (relevantDocs.length > 0) {
      const rerankResponse = await cohere.rerank({
        model: process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0',
        query: query,
        documents: relevantDocs.map(doc => doc.chunk),
        topN: Math.min(topN, relevantDocs.length),
      })

      // Reorder documents based on rerank scores
      relevantDocs = rerankResponse.results.map(result => 
        relevantDocs[result.index]
      )
    }

    return relevantDocs.slice(0, topN)
  } catch (error) {
    console.error('Document retrieval error:', error)
    return []
  }
}

/**
 * Build a context string from compliance documents
 * @param {Array} documents - Array of document objects
 * @returns {string} Formatted context string
 */
export function buildDocumentContext(documents) {
  if (!documents || documents.length === 0) {
    return 'No specific compliance documents available for reference.'
  }

  return documents.map((doc, idx) => 
    `[${idx + 1}] ${doc.chunk}\n(Source: ${doc.source})`
  ).join('\n\n')
}

/**
 * Retrieve relevant documents for image/video analysis
 * Returns focused context for visual health code violation detection
 * @returns {Promise<string>} Document context for vision analysis
 */
export async function getVisionAnalysisContext() {
  try {
    // Retrieve documents related to visual inspection criteria
    const queries = [
      'food storage temperature refrigeration violations',
      'cross contamination raw meat preparation surfaces',
      'personal hygiene handwashing violations',
      'equipment cleanliness sanitation violations',
      'pest control violations inspection'
    ]

    // Get documents for each query
    const documentSets = await Promise.all(
      queries.map(query => retrieveComplianceDocuments(query, 2))
    )

    // Flatten and deduplicate
    const allDocs = documentSets.flat()
    const uniqueDocs = []
    const seen = new Set()

    for (const doc of allDocs) {
      const key = doc.chunk.substring(0, 100)
      if (!seen.has(key)) {
        seen.add(key)
        uniqueDocs.push(doc)
      }
    }

    // Build context string
    return buildDocumentContext(uniqueDocs.slice(0, 10))
  } catch (error) {
    console.error('Vision context retrieval error:', error)
    return 'Michigan food safety regulations will be referenced for violation detection.'
  }
}

/**
 * Extract citation references from compliance documents
 * @param {Array} documents - Array of document objects
 * @returns {Array<string>} List of unique citations
 */
export function extractCitations(documents) {
  const citations = new Set()
  
  for (const doc of documents) {
    if (doc.source) {
      citations.add(doc.source)
    }
    
    // Look for section references in the chunk text
    const sectionMatches = doc.chunk.match(/Section\s+\d+[-.\d]*/gi)
    if (sectionMatches) {
      sectionMatches.forEach(match => citations.add(match))
    }
  }

  return Array.from(citations)
}
