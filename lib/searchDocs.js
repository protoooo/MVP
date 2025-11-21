// lib/searchDocs.js - Optimized with pre-computed embeddings
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let embeddingsCache = null;

// Load pre-computed embeddings from JSON file
function loadEmbeddings() {
  if (embeddingsCache) {
    return embeddingsCache;
  }

  const embeddingsPath = path.join(process.cwd(), 'public', 'embeddings.json');
  
  if (!fs.existsSync(embeddingsPath)) {
    console.error('❌ embeddings.json not found. Run: npm run build-embeddings');
    return [];
  }

  try {
    const data = fs.readFileSync(embeddingsPath, 'utf-8');
    embeddingsCache = JSON.parse(data);
    console.log(`✅ Loaded ${embeddingsCache.length} pre-computed embeddings`);
    return embeddingsCache;
  } catch (err) {
    console.error('❌ Failed to load embeddings:', err.message);
    return [];
  }
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchDocuments(query, topK = 20, county = 'washtenaw') {
  try {
    const allEmbeddings = loadEmbeddings();
    
    if (allEmbeddings.length === 0) {
      console.error('❌ No embeddings available');
      return [];
    }

    // Filter by county
    const countyDocs = allEmbeddings.filter(doc => doc.county === county);
    
    if (countyDocs.length === 0) {
      console.error(`❌ No embeddings found for ${county}`);
      return [];
    }

    console.log(`🔍 Searching ${countyDocs.length} ${county} documents...`);

    // Generate embedding for query (ONLY ONE API CALL)
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    // Calculate similarity for all docs (FAST - no API calls)
    const scored = countyDocs.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort and return top matches
    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topK);
    
    console.log(`✅ Found ${results.length} matches (avg score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(3)})`);
    
    return results.map(doc => ({
      text: doc.text,
      source: doc.source,
      page: doc.chunkIndex + 1, // Convert chunk index to page number
      county: doc.county,
      score: doc.score
    }));

  } catch (err) {
    console.error('❌ Search failed:', err.message);
    return [];
  }
}

export function clearCache() {
  embeddingsCache = null;
}
