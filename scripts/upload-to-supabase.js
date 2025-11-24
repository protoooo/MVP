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

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config(); // Also look for standard .env

// Check for keys
if (!process.env.GEMINI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables.');
  console.error('   Make sure GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

const COUNTIES = ['washtenaw', 'wayne', 'oakland'];

function chunkText(text, wordsPerChunk = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += (wordsPerChunk - overlap)) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.length > 50) chunks.push(chunk);
  }
  return chunks;
}

async function uploadToSupabase() {
  console.log('🚀 Starting Smart Upload (Smallest Files First)...\n');
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  
  if (!fs.existsSync(documentsDir)) {
    console.error('❌ Documents directory not found');
    process.exit(1);
  }

  console.log('🗑️  Clearing database...');
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', 0);
  if (deleteError) console.log('⚠️  Delete warning:', deleteError.message);
  else console.log('✅ Database cleared');

  let totalChunks = 0;

  for (const county of COUNTIES) {
    const countyDir = path.join(documentsDir, county);
    if (!fs.existsSync(countyDir)) continue;

    console.log(`\n📍 Processing ${county.toUpperCase()}`);
    
    // SORT FILES BY SIZE (Small -> Large)
    const files = fs.readdirSync(countyDir)
      .filter(f => f.endsWith('.pdf'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(countyDir, a));
        const statB = fs.statSync(path.join(countyDir, b));
        return statA.size - statB.size;
      });
    
    for (const file of files) {
      console.log(`   📄 ${file}`);
      try {
        const dataBuffer = fs.readFileSync(path.join(countyDir, file));
        const data = await pdf(dataBuffer);
        const text = data.text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!text || text.length < 50) continue;

        const chunks = chunkText(text);
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        
        console.log(`      ✂️  ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          try {
            const result = await model.embedContent(chunks[i]);
            await supabase.from('documents').insert({
              content: chunks[i],
              metadata: { source: file.replace('.pdf', ''), county, chunk_index: i },
              embedding: result.embedding.values
            });
            await new Promise(r => setTimeout(r, 150)); // Rate limit
          } catch (err) {
            console.error(`      ❌ Chunk ${i} failed: ${err.message}`);
          }
        }
        console.log(`      ✅ Done`);
        totalChunks += chunks.length;
      } catch (e) {
        console.error(`      ❌ File error: ${e.message}`);
      }
    }
  }
  console.log(`\n🎉 DONE! Total: ${totalChunks}`);
}

uploadToSupabase().catch(console.error);
