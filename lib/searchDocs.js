import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_county: county
    });

    if (error) {
      console.error('Supabase search error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(doc => ({
      text: doc.content,
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || doc.metadata?.chunk_index + 1 || 'N/A',
      county: doc.metadata?.county || county,
      score: doc.similarity
    }));

  } catch (err) {
    console.error('Search failed:', err.message);
    return [];
  }
}

export function clearCache() {
  // Not needed for Supabase approach
}
