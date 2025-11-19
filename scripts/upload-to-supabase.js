// scripts/upload-to-supabase.js
// This script processes PDFs and uploads embeddings to Supabase
// Run: node scripts/upload-to-supabase.js

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

async function uploadToSupabase() {
  console.log('🚀 Starting document upload to Supabase...\n');
  
  const documentsDir = path.join(process.cwd(), 'public', 'documents');
  
  if (!fs.existsSync(documentsDir)) {
    console.error('❌ Documents directory not found:', documentsDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(documentsDir);
  let totalChunks = 0;
  let uploadedChunks = 0;
  
  // First, clear existing documents (optional - comment out if you want to keep them)
  console.log('🗑️  Clearing existing documents...');
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', 0);
  if (deleteError) {
    console.log('⚠️  Could not clear existing documents:', deleteError.message);
  } else {
    console.log('✅ Cleared existing documents\n');
  }
  
  for (const file of files) {
    if (file === 'keep.txt' || file.startsWith('.')) continue;
    
    console.log(`📄 Processing: ${file}`);
    const filePath = path.join(documentsDir, file);
    let text = '';
    
    // Extract text
    try {
      if (file.endsWith('.txt')) {
        text = fs.readFileSync(filePath, 'utf-8');
      } else if (file.endsWith('.pdf')) {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        text = pdfData.text;
      }
    } catch (err) {
      console.error(`   ⚠️  Failed to read ${file}:`, err.message);
      continue;
    }
    
    // Split into chunks (500 words each)
    const words = text.split(/\s+/);
    const fileChunks = [];
    
    for (let i = 0; i < words.length; i += 500) {
      const chunk = words.slice(i, i + 500).join(' ');
      if (chunk.trim().length < 100) continue; // Skip tiny chunks
      
      fileChunks.push({
        source: file,
        text: chunk.trim(),
        chunkIndex: Math.floor(i / 500),
        wordCount: Math.min(500, words.length - i)
      });
    }
    
    console.log(`   📊 Created ${fileChunks.length} chunks`);
    totalChunks += fileChunks.length;
    
    // Generate embeddings and upload to Supabase
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    for (let i = 0; i < fileChunks.length; i++) {
      const chunk = fileChunks[i];
      
      try {
        // Generate embedding
        const result = await model.embedContent(chunk.text);
        const embedding = result.embedding.values;
        
        // Upload to Supabase
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            content: chunk.text,
            metadata: {
              source: chunk.source,
              chunk_index: chunk.chunkIndex,
              word_count: chunk.wordCount
            },
            embedding: embedding
          });
        
        if (insertError) {
          console.error(`   ❌ Failed to upload chunk ${i}:`, insertError.message);
        } else {
          uploadedChunks++;
        }
        
        // Progress indicator
        if ((i + 1) % 5 === 0) {
          console.log(`   ⏳ Progress: ${i + 1}/${fileChunks.length} chunks uploaded`);
        }
        
        // Rate limiting - avoid API throttling
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error(`   ❌ Error on chunk ${i}:`, err.message);
      }
    }
    
    console.log(`   ✅ Completed ${file}\n`);
  }
  
  console.log('\n🎉 Upload complete!');
  console.log(`📊 Total chunks processed: ${totalChunks}`);
  console.log(`✅ Successfully uploaded: ${uploadedChunks}`);
  console.log(`❌ Failed: ${totalChunks - uploadedChunks}`);
  
  // Verify upload
  const { count, error: countError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`\n📚 Documents in database: ${count}`);
  }
}

uploadToSupabase().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
