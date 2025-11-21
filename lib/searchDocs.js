import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Create a private Supabase client for the server side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  try {
    // 1. Generate embedding for the user's question
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" })
    const result = await model.embedContent(query)
    const queryEmbedding = result.embedding.values

    // 2. Search Supabase using the 'match_documents' function
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_county: county
    })

    if (error) {
      console.error('Supabase RPC Error:', error)
      return []
    }

    // 3. Format the results for the Chatbot
    return documents.map(doc => ({
      source: doc.metadata?.source || 'Unknown Doc',
      page: doc.metadata?.page || 'N/A',
      text: doc.content,
      score: doc.similarity
    }))

  } catch (error) {
    console.error('Search Error:', error)
    return []
  }
}
