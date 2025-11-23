// scripts/upload-to-supabase.js
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.local' });

if (!process.env.GEMINI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Please check .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  console.log('🚀 Starting document upload to Supabase...\n');
  
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
    console.log(`   Directory: ${countyDir}`);
    
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
          console.log(`      ⚠️  WARNING: Very little text extracted. Might be a scanned PDF.`);
          continue;
        }
      } catch (err) {
        console.error(`      ❌ Error reading file: ${err.message}`);
        continue;
      }

      const cleanText = rawText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (!cleanText) {
        console.log('      ❌ No text extracted. Skipping.');
        continue;
      }

      const textChunks = chunkText(cleanText);
      console.log(`      ✂️  Generated ${textChunks.length} chunks`);

      if (textChunks.length === 0) {
        console.log('      ⚠️  No chunks created. Skipping.');
        continue;
      }

      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      let fileUploadedCount = 0;

      for (let i = 0; i < textChunks.length; i++) {
        const chunkContent = textChunks[i];
        
        try {
          console.log(`      🔄 Processing chunk ${i + 1}/${textChunks.length}...`);
          
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
          
          // Rate limit - Gemini has limits
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (err) {
          console.error(`      ❌ Failed chunk ${i}: ${err.message}`);
        }
      }
      
      console.log(`      ✅ Uploaded ${fileUploadedCount}/${textChunks.length} chunks for ${file}`);
      totalChunks += fileUploadedCount;
    }
  }

  console.log(`\n\n🎉 UPLOAD COMPLETE!`);
  console.log(`📊 Total chunks uploaded: ${totalChunks}`);
  
  // Verify upload
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  console.log(`✅ Verified ${count} documents in database`);
}

uploadToSupabase().catch(console.error);
