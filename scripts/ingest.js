const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse'); // You need to install this
const { createClient } = require('@supabase/supabase-js');
const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config({ path: '.env.local' }); // Load env vars

// CONFIG
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use Service Role!
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const DIRECTORY = './public/documents/washtenaw';

// INIT CLIENTS
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const vertex_ai = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });
const model = vertex_ai.getGenerativeModel({ model: 'text-embedding-004' });

async function getEmbedding(text) {
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function processPDFs() {
  console.log('🚀 Starting Ingestion...');
  
  const files = fs.readdirSync(DIRECTORY).filter(file => file.endsWith('.pdf'));

  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`);
    const filePath = path.join(DIRECTORY, file);
    const dataBuffer = fs.readFileSync(filePath);
    
    try {
      const data = await pdf(dataBuffer);
      const text = data.text;
      
      // Split text into chunks (~1000 chars)
      const chunks = text.match(/[\s\S]{1,1000}/g) || [];
      
      console.log(`   -> Found ${chunks.length} chunks. Uploading...`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].replace(/\n/g, ' '); // Clean newlines
        
        // 1. Get Embedding from Google
        const embedding = await getEmbedding(chunk);
        
        // 2. Save to Supabase
        const { error } = await supabase.from('documents').insert({
          content: chunk,
          metadata: { 
            source: file, 
            county: 'washtenaw',
            page: i + 1 
          },
          embedding: embedding
        });

        if (error) console.error('Error inserting chunk:', error);
      }
      console.log(`   ✅ Done with ${file}`);
      
    } catch (err) {
      console.error(`❌ Failed to parse ${file}:`, err);
    }
  }
  console.log('\n🎉 All documents ingested successfully!');
}

processPDFs();
