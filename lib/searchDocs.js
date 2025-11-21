// lib/searchDocs.js - Direct PDF reading with on-demand embeddings
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let documentCache = null;

async function loadDocuments(county = 'washtenaw') {
  if (documentCache && documentCache.county === county) {
    return documentCache.docs;
  }

  const documentsDir = path.join(process.cwd(), 'public', 'documents', county);
  
  if (!fs.existsSync(documentsDir)) {
    console.error(`❌ Directory not found: ${documentsDir}`);
    return [];
  }

  const files = fs.readdirSync(documentsDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
  const docs = [];

  for (const file of files) {
    const filePath = path.join(documentsDir, file);
    let text = '';

    try {
      if (file.endsWith('.txt')) {
        text = fs.readFileSync(filePath, 'utf-8');
      } else if (file.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        text = pdfData.text;
      }

      // Split into 500-word chunks
      const words = text.split(/\s+/);
      for (let i = 0; i < words.length; i += 500) {
        const chunk = words.slice(i, i + 500).join(' ');
        if (chunk.trim().length > 100) {
          docs.push({
            text: chunk.trim(),
            source: file.replace('.pdf', '').replace('.txt', ''),
            page: Math.floor(i / 500) + 1,
            county: county
          });
        }
      }
    } catch (err) {
      console.error(`Failed to read ${file}:`, err.message);
    }
  }

  documentCache = { county, docs };
  console.log(`✅ Loaded ${docs.length} chunks from ${county}`);
  return docs;
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
    const docs = await loadDocuments(county);
    
    if (docs.length === 0) {
      console.error('❌ No documents loaded');
      return [];
    }

    // Generate embeddings
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    // Calculate similarity for each doc
    const scored = [];
    for (const doc of docs.slice(0, 50)) { // Limit to 50 for performance
      const docResult = await model.embedContent(doc.text);
      const docEmbedding = docResult.embedding.values;
      const score = cosineSimilarity(queryEmbedding, docEmbedding);
      scored.push({ ...doc, score });
      
      // Rate limit
      await new Promise(r => setTimeout(r, 50));
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topK);
    
    console.log(`✅ Found ${results.length} matches`);
    return results;

  } catch (err) {
    console.error('❌ Search failed:', err.message);
    return [];
  }
}

export function clearCache() {
  documentCache = null;
}
