// scripts/build-embeddings.js - FIXED VERSION
// Run: npm run build-embeddings

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const COUNTIES = ['washtenaw', 'wayne', 'oakland'];

async function buildEmbeddings() {
  console.log('🔨 Building embeddings (this will take 5-10 minutes)...\n');
  
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  const outputPath = path.join(process.cwd(), 'public', 'embeddings.json');
  
  const chunks = [];
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  for (const county of COUNTIES) {
    const countyDir = path.join(documentsDir, county);
    if (!fs.existsSync(countyDir)) continue;
    
    console.log(`\n📍 ${county.toUpperCase()}`);
    const files = fs.readdirSync(countyDir).filter(f => 
      (f.endsWith('.pdf') || f.endsWith('.txt')) && !f.startsWith('.')
    );
    
    for (const file of files) {
      console.log(`📄 ${file}`);
      const filePath = path.join(countyDir, file);
      let text = '';
      
      try {
        if (file.endsWith('.txt')) {
          text = fs.readFileSync(filePath, 'utf-8');
        } else {
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdf(dataBuffer);
          text = pdfData.text;
        }
      } catch (err) {
        console.error(`   ⚠️  Failed: ${err.message}`);
        continue;
      }
      
      // Split into 500-word chunks
      const words = text.split(/\s+/);
      let processedChunks = 0;
      
      for (let i = 0; i < words.length; i += 500) {
        const chunk = words.slice(i, i + 500).join(' ').trim();
        if (chunk.length < 100) continue;
        
        try {
          // Generate embedding immediately
          const result = await model.embedContent(chunk);
          
          chunks.push({
            source: file.replace('.pdf', '').replace('.txt', ''),
            county: county,
            text: chunk,
            chunkIndex: Math.floor(i / 500),
            embedding: result.embedding.values
          });
          
          processedChunks++;
          
          // Rate limit
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.error(`   ⚠️  Chunk failed: ${err.message}`);
        }
      }
      
      console.log(`   ✅ ${processedChunks} chunks`);
    }
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2));
  console.log(`\n✅ Saved ${chunks.length} embeddings`);
  console.log(`💾 Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  const breakdown = {};
  chunks.forEach(c => {
    breakdown[c.county] = (breakdown[c.county] || 0) + 1;
  });
  console.log('\n📊 Breakdown:');
  Object.entries(breakdown).forEach(([county, count]) => {
    console.log(`   ${county}: ${count}`);
  });
}

buildEmbeddings().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
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
