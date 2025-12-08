import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// --- ENV CHECKS ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS_JSON;

if (!SUPABASE_URL || !SUPABASE_KEY || !PROJECT_ID || !CREDENTIALS_JSON) {
  console.error('❌ Missing Env Vars. Check .env.local');
  process.exit(1);
}

// --- SETUP CLIENTS ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const auth = new GoogleAuth({
  credentials: JSON.parse(CREDENTIALS_JSON),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getEmbedding(text) {
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  const token = accessToken.token;

  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ content: text }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    // If rate limited, throw specific error to handle retry
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(`Google API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.predictions[0].embeddings.values;
}

const chunkText = (text, chunkSize = 1500) => { // Increased chunk size to reduce total requests
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;
  for (const word of words) {
    if (currentLength + word.length > chunkSize) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      currentLength = word.length;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join(' '));
  return chunks;
};

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 Starting "Slow & Steady" Ingestion...');
  
  let docsDir = path.join(process.cwd(), 'public/documents');
  if (!fs.existsSync(docsDir)) {
     if (fs.existsSync(path.join(process.cwd(), 'public/washtenaw'))) {
       docsDir = path.join(process.cwd(), 'public/washtenaw');
     } else {
       console.error('❌ Cannot find PDF folder');
       process.exit(1);
     }
  }

  const files = fs.readdirSync(docsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`📂 Found ${files.length} PDFs. This will take time to avoid rate limits.`);

  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`);
    const filePath = path.join(docsDir, file);
    
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        const text = data.text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        const chunks = chunkText(text);
        console.log(`   👉 Split into ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          let retries = 0;
          let success = false;
          
          while (!success && retries < 5) {
            try {
              const embedding = await getEmbedding(chunks[i]);
              
              await supabase.from('documents').insert({
                content: chunks[i],
                metadata: { source: file, chunk_index: i },
                embedding: embedding
              });

              process.stdout.write('█');
              success = true;
              
              // ⚠️ CRITICAL: 1.5 second pause between EVERY request to satisfy Google Quota
              await sleep(1500); 

            } catch (err) {
              if (err.message === 'RATE_LIMIT') {
                process.stdout.write('⏳'); // Wait symbol
                await sleep(5000 * (retries + 1)); // Exponential backoff (5s, 10s, 15s...)
                retries++;
              } else {
                console.error(`\n   ❌ Error chunk ${i}:`, err.message);
                break; // Skip chunk on fatal error
              }
            }
          }
        }
    } catch (fileErr) {
        console.error(`   ❌ Failed to read file:`, fileErr.message);
    }
  }
  console.log('\n\n✅ Ingestion Complete!');
}

run();
