import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateEmbeddings() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing GEMINI_API_KEY');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const documentsDir = path.join(__dirname, '../public/documents');
  const outputDir = path.join(__dirname, '../public/documents'); 
  
  const counties = ['washtenaw', 'wayne', 'oakland'];
  
  console.log('🚀 Starting Embedding Build...');

  for (const county of counties) {
    const countyDir = path.join(documentsDir, county);
    
    if (!fs.existsSync(countyDir)) {
      console.log(`⚠️ Skipping ${county} (Directory not found)`);
      continue;
    }

    const files = fs.readdirSync(countyDir).filter(file => file.endsWith('.pdf'));
    console.log(`\n📂 Processing ${county}: ${files.length} files`);

    const countyEmbeddings = [];

    for (const file of files) {
      const filePath = path.join(countyDir, file);
      const dataBuffer = fs.readFileSync(filePath);

      try {
        const data = await pdf(dataBuffer);
        const text = data.text;
        const chunks = text.match(/[\s\S]{1,1000}/g) || [];
        
        console.log(`   📄 ${file}: ${chunks.length} chunks`);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i].replace(/\n/g, ' ');
          const result = await model.embedContent(chunk);
          const embedding = result.embedding.values;

          countyEmbeddings.push({
            content: chunk,
            embedding: embedding,
            metadata: {
              filename: file,
              county: county,
              page: i + 1 
            }
          });
        }
      } catch (err) {
        console.error(`   ❌ Error processing ${file}:`, err.message);
      }
    }

    const outputPath = path.join(outputDir, `${county}-embeddings.json`);
    fs.writeFileSync(outputPath, JSON.stringify(countyEmbeddings, null, 2));
    console.log(`✅ Saved ${countyEmbeddings.length} vectors to ${outputPath}`);
  }
}

generateEmbeddings();
