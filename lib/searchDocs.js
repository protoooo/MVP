// lib/searchDocs.js
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let cachedEmbeddings = null;

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchDocuments(query, topK = 5) {
  // Load embeddings (cached in memory)
  if (!cachedEmbeddings) {
    const embeddingsPath = path.join(process.cwd(), 'public', 'embeddings.json');
    
    if (!fs.existsSync(embeddingsPath)) {
      console.error('❌ Embeddings not found! Run: npm run build-embeddings');
      console.error('   Expected path:', embeddingsPath);
      return [];
    }
    
    try {
      const fileContent = fs.readFileSync(embeddingsPath, 'utf-8');
      cachedEmbeddings = JSON.parse(fileContent);
      console.log(`✅ Loaded ${cachedEmbeddings.length} document chunks into memory`);
    } catch (err) {
      console.error('❌ Failed to load embeddings:', err.message);
      return [];
    }
  }
  
  // Validate we have embeddings
  if (!cachedEmbeddings || cachedEmbeddings.length === 0) {
    console.error('❌ No embeddings available');
    return [];
  }
  
  // Generate query embedding
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(query);
    const queryEmbedding = result.embedding.values;
    
    // Calculate similarities
    const scored = cachedEmbeddings.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by relevance and return top K
    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topK);
    
    // Log search quality for debugging
    if (results.length > 0) {
      console.log(`🔍 Search: "${query.substring(0, 40)}..." → Top: ${(results[0].score * 100).toFixed(1)}%, Lowest: ${(results[results.length - 1].score * 100).toFixed(1)}%`);
    }
    
    return results;
  } catch (err) {
    console.error('❌ Search failed:', err.message);
    return [];
  }
}

// Clear cache (useful for hot reload in development)
export function clearCache() {
  cachedEmbeddings = null;
  console.log('🔄 Embeddings cache cleared');
}
