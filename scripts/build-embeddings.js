// scripts/build-embeddings.js
// Reads PDFs and saves them to local JSON files (The "Old Way")

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const COUNTIES = ['washtenaw', 'wayne', 'oakland'];

// Robust chunking function
function chunkText(text, wordsPerChunk = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += (wordsPerChunk - overlap)) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.length > 50) chunks.push(chunk);
  }
  return chunks;
}

async function buildEmbeddings() {
  console.log('🚀 Starting Local Embeddings Build...\n');
  const documentsDir = path.join(process.cwd(), 'public', 'documents');

  for (const county of COUNTIES) {
    const countyDir = path.join(documentsDir, county);
    if (!fs.existsSync(countyDir)) {
      console.log(`⏩ Skipping ${county} (folder not found)`);
      continue;
    }

    console.log(`\n📍 Processing ${county.toUpperCase()}...`);
    const files = fs.readdirSync(countyDir);
    const countyDocs = [];

    for (const file of files) {
      if (file.startsWith('.') || file.endsWith('.json') || file === 'keep.txt') continue;
      
      const filePath = path.join(countyDir, file);
      let rawText = '';

      console.log(`   📄 Reading: ${file}`);
      try {
        if (file.endsWith('.pdf')) {
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdf(dataBuffer);
          rawText = data.text;
        } else if (file.endsWith('.txt')) {
          rawText = fs.readFileSync(filePath, 'utf-8');
        }
      } catch (err) {
        console.error(`      ❌ Error reading: ${err.message}`);
        continue;
      }

      const cleanText = rawText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanText) {
        console.log('      ⚠️  Empty text (scanned PDF?). Skipping.');
        continue;
      }

      const textChunks = chunkText(cleanText);
      console.log(`      ✂️  Generated ${textChunks.length} chunks`);

      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

      for (let i = 0; i < textChunks.length; i++) {
        try {
          const result = await model.embedContent(textChunks[i]);
          countyDocs.push({
            text: textChunks[i],
            source: file,
            page: 'N/A', // Simplified for robustness
            embedding: result.embedding.values
          });
          // Rate limit pause
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          console.error(`      ❌ Embedding failed for chunk ${i}`);
        }
      }
    }

    // SAVE THE FILE LOCALLY
    if (countyDocs.length > 0) {
      const outputPath = path.join(countyDir, 'embeddings.json');
      fs.writeFileSync(outputPath, JSON.stringify(countyDocs, null, 2));
      console.log(`   ✅ Saved ${countyDocs.length} chunks to embeddings.json`);
    }
  }
  console.log('\n🎉 All Done!');
}

buildEmbeddings();
