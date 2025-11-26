import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadEmbeddings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase Credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const documentsDir = path.join(__dirname, '../public/documents');
  const counties = ['washtenaw', 'wayne', 'oakland'];

  console.log('🚀 Starting Upload to Supabase...');

  for (const county of counties) {
    const filePath = path.join(documentsDir, `${county}-embeddings.json`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Skipping ${county} (No JSON file found)`);
      continue;
    }

    const rawData = fs.readFileSync(filePath);
    const documents = JSON.parse(rawData);
    
    console.log(`\n📂 Uploading ${county}: ${documents.length} records`);

    // Batch upload to avoid timeouts
    const BATCH_SIZE = 50;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase.from('documents').insert(batch);

      if (error) {
        console.error(`   ❌ Error uploading batch ${i}:`, error.message);
      } else {
        process.stdout.write('.'); // Progress dot
      }
    }
    console.log(`\n✅ ${county} Complete`);
  }
}

uploadEmbeddings();
