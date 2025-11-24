// scripts/upload-to-supabase.js
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- HARDCODED KEYS FOR ONE-TIME UPLOAD ---
const GEMINI_KEY = "AIzaSyD334jKR0N9adJBOnY0mpACdS_H8I8ae_o";
const SUPABASE_URL = "https://ocpklqmfxescfdlsymuc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jcG1xbWZ4ZXNjZmRsc3ltdWMiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzMyMzkxMTQ5LCJleHAiOjIwNDc5NjcxNDl9.megVZy2ZkbHN5bxVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjM5MTE0OSwiZXhwIjoyMDQ3OTY3MTQ5fQ.fcm9sZSIsImlhdCI6MTczMjM5MTE0OSwiZXhwIjoyMDQ3OTY3MTQ5fQ.109LzolQpx5cV7BK9_mApBFiOoEtsG90VaZV0Nj1eNWU";
// ------------------------------------------

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COUNTIES = ['washtenaw', 'wayne', 'oakland'];

function chunkText(text, wordsPerChunk = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += (wordsPerChunk - overlap)) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
  }
  return chunks;
}

async function uploadToSupabase() {
  console.log('🚀 Starting document upload to Supabase (Hardcoded Mode)...\n');
  
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  
  if (!fs.existsSync(documentsDir)) {
    console.error('❌ Documents directory not found at:', documentsDir);
    process.exit(1);
  }

  console.log('📂 Documents directory:', documentsDir);
  console.log('🗑️  Clearing existing documents...');
  
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', 0);
  if (deleteError) {
    console.log('⚠️  Warning clearing DB:', deleteError.message);
  } else {
    console.log('✅ Database cleared\n');
  }

  let totalChunks = 0;

  for (const county of COUNTIES) {
    const countyDir = path.join(documentsDir, county);
    
    if (!fs.existsSync(countyDir)) {
      console.log(`⏩ Skipping ${county} (folder not found at ${countyDir})`);
      continue;
    }

    console.log(`\n📍 Processing ${county.toUpperCase()} COUNTY`);
    
    const files = fs.readdirSync(countyDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf') && !f.startsWith('.'));
    
    console.log(`   Found ${pdfFiles.length} PDF files`);

    for (const file of pdfFiles) {
      const filePath = path.join(countyDir, file);
      let rawText = '';

      console.log(`\n   📄 Processing: ${file}`);

      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        rawText = data.text;
        
        console.log(`      📊 Extracted ${rawText.length} characters`);
        
        if (rawText.length < 100) {
          console.log(`      ⚠️  WARNING: Very little text extracted.`);
          continue;
        }
      } catch (err) {
        console.error(`      ❌ Error reading file: ${err.message}`);
        continue;
      }

      const cleanText = rawText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      const textChunks = chunkText(cleanText);
      console.log(`      ✂️  Generated ${textChunks.length} chunks`);

      // NOTE: Using embedding-001 as confirmed by curl test, but usually text-embedding-004 is preferred
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      let fileUploadedCount = 0;

      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];
        
        try {
          const result = await model.embedContent(chunkContent);
          const embedding = result.embedding.values;

          const { error } = await supabase.from('documents').insert({
            content: chunkContent,
            metadata: {
              source: file.replace('.pdf', ''),
              county: county,
              chunk_index: i
            },
            embedding: embedding
          });

          if (error) {
            console.error(`      ❌ Upload error: ${error.message}`);
            continue;
          }
          fileUploadedCount++;
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
          
        } catch (err) {
          console.error(`      ❌ Failed chunk ${i}: ${err.message}`);
        }
      }
      console.log(`      ✅ Uploaded ${fileUploadedCount}/${textChunks.length} chunks`);
      totalChunks += fileUploadedCount;
    }
  }

  console.log(`\n\n🎉 UPLOAD COMPLETE! Total chunks: ${totalChunks}`);
}

uploadToSupabase().catch(console.error);
