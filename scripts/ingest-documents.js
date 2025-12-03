import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pdfParse from 'pdf-parse'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- CONFIGURATION ---
const WASHTENAW_DOCS_PATH = path.join(__dirname, '../public/documents/washtenaw')
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100
const BATCH_SIZE = 3 
const DELAY_BETWEEN_BATCHES = 2000
const MAX_RETRIES = 3

// --- INIT ---
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase Environment Variables.")
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
const vertexConfig = { project: projectId, location: 'us-central1' }

// Handle Google Credentials
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
    const privateKey = credentials.private_key?.replace(/\\n/g, '\n')
    vertexConfig.googleAuthOptions = {
      credentials: {
        client_email: credentials.client_email,
        private_key: privateKey,
      },
    }
  } catch (e) {
    console.error('❌ Failed to parse Google credentials:', e.message)
  }
}

const vertex_ai = new VertexAI(vertexConfig)

// --- HELPERS ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    console.error(`❌ Error reading PDF: ${error.message}`)
    return ''
  }
}

function chunkText(text) {
  if (!text) return []
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

async function getEmbedding(text) {
  try {
    // Note: Using 'preview' namespace which is often required for newer models
    const model = vertex_ai.preview.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] }
    })
    return result.embedding?.values || null
  } catch (error) {
    console.error(`   ⚠️ Embedding Error: ${error.message}`)
    return null
  }
}

// --- MAIN SCRIPT ---
async function run() {
  console.log('\n🚀 Starting Local Ingestion...')
  
  // 1. Check Files
  if (!fs.existsSync(WASHTENAW_DOCS_PATH)) {
    console.error(`❌ Folder not found: ${WASHTENAW_DOCS_PATH}`)
    return
  }
  
  const files = fs.readdirSync(WASHTENAW_DOCS_PATH).filter(f => f.toLowerCase().endsWith('.pdf'))
  console.log(`📚 Found ${files.length} PDFs to process.`)

  // 2. Process Files
  for (const file of files) {
    console.log(`\n📄 Processing: ${file}`)
    const filePath = path.join(WASHTENAW_DOCS_PATH, file)
    
    // Extract
    let text = await extractTextFromPDF(filePath)
    
    // Clean
    text = text.replace(/\s+/g, ' ').trim()
    
    if (text.length < 50) {
      console.warn(`   ⚠️ WARNING: Text is empty or too short. Is this a scanned image PDF?`)
      console.warn(`   ⚠️ SKIPPING ${file}`)
      continue
    }

    // Chunk
    const chunks = chunkText(text)
    console.log(`   ✂️ Generated ${chunks.length} chunks.`)

    // Embed & Upload in Batches
    let successCount = 0
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      
      const records = await Promise.all(batch.map(async (chunk, idx) => {
        const embedding = await getEmbedding(chunk)
        if (!embedding) return null
        
        return {
          content: chunk,
          embedding: embedding,
          metadata: {
            source: file,
            county: 'washtenaw',
            chunk_index: i + idx
          }
        }
      }))

      // Filter out failed embeddings
      const validRecords = records.filter(r => r !== null)

      if (validRecords.length > 0) {
        const { error } = await supabase.from('documents').insert(validRecords)
        if (error) {
          console.error(`   ❌ Supabase Insert Error: ${error.message}`)
        } else {
          successCount += validRecords.length
          process.stdout.write('.') // specific visual feedback
        }
      }
      
      // Rate limiting
      await sleep(DELAY_BETWEEN_BATCHES)
    }
    console.log(`\n   ✅ Finished ${file}: ${successCount}/${chunks.length} chunks inserted.`)
  }
  
  console.log('\n✨ Ingestion Complete!')
}

run()
