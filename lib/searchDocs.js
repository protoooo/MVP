// lib/searchDocs.js - Supabase Vector Search
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function searchDocuments(query, topK = 20) {
  try {
    // Generate query embedding
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(query);
    const queryEmbedding = result.embedding.values;
    
    // Search Supabase using RPC function
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: topK
    });
    
    if (error) {
      console.error('❌ Supabase search error:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No documents found for query');
      return [];
    }
    
    // Transform results to expected format
    const results = data.map(doc => ({
      text: doc.content,
      source: doc.metadata?.source || 'Unknown',
      page: doc.metadata?.page || doc.metadata?.chunk_index || 'N/A',
      county: doc.metadata?.county || 'washtenaw',
      score: doc.similarity
    }));
    
    console.log(`✅ Found ${results.length} documents`);
    return results;
    
  } catch (err) {
    console.error('❌ Search failed:', err.message);
    return [];
  }
}

export function clearCache() {
  // No-op for Supabase version
  console.log('🔄 Using Supabase (no local cache)');
}
