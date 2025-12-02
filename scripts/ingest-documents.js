import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pdfParse from 'pdf-parse'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==========================================
// CONFIGURATION
// ==========================================
const WASHTENAW_DOCS_PATH = path.join(__dirname, '../public/documents/washtenaw')
const CHUNK_SIZE = 800 // characters per chunk
const CHUNK_OVERLAP = 100
const BATCH_SIZE = 10 // embeddings per batch

// ==========================================
// INITIALIZE CLIENTS
// ==========================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
let vertexConfig = { project: projectId, location: 'us-central1' }

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
    console.error('❌ Failed to parse credentials:', e.message)
  }
}

const vertex_ai = new VertexAI(vertexConfig)
const embeddingModel = vertex_ai.getGenerativeModel({ model: "text-embedding-004" })

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
  }
  
  return chunks
}

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    console.error(`   ❌ PDF parse error: ${error.message}`)
    return null
  }
}

async function generateEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text)
    return result.embedding?.values || null
  } catch (error) {
    console.error(`   ❌ Embedding error: ${error.message}`)
    return null
  }
}

// ==========================================
// MAIN INGESTION LOGIC
// ==========================================
async function ingestDocuments() {
  console.log('🚀 Starting Document Ingestion for Washtenaw County...\n')

  // Check if directory exists
  if (!fs.existsSync(WASHTENAW_DOCS_PATH)) {
    console.error(`❌ Directory not found: ${WASHTENAW_DOCS_PATH}`)
    console.error('Make sure your documents are in: /public/documents/washtenaw/')
    process.exit(1)
  }

  const files = fs.readdirSync(WASHTENAW_DOCS_PATH)
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))

  if (pdfFiles.length === 0) {
    console.error('❌ No PDF files found in Washtenaw directory')
    process.exit(1)
  }

  console.log(`📚 Found ${pdfFiles.length} PDF files\n`)

  let totalChunks = 0
  let successfulInserts = 0

  for (const filename of pdfFiles) {
    const filePath = path.join(WASHTENAW_DOCS_PATH, filename)
    console.log(`\n📄 Processing: ${filename}`)

    // Extract text
    const text = await extractTextFromPDF(filePath)
    if (!text) {
      console.log('   ⚠️ Skipped (no text extracted)')
      continue
    }

    // Clean and chunk
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim()
    
    const chunks = chunkText(cleanText)
    console.log(`   ✂️ Split into ${chunks.length} chunks`)

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const records = []

      for (let j = 0; j < batch.length; j++) {
        const chunkText = batch[j]
        const embedding = await generateEmbedding(chunkText)

        if (embedding) {
          records.push({
            content: chunkText,
            embedding: embedding,
            metadata: {
              source: filename,
              page: Math.floor((i + j) / 3) + 1,
              county: 'washtenaw',
              chunk_index: i + j
            }
          })
        }

        // Progress indicator
        process.stdout.write('.')
      }

      // Insert batch
      if (records.length > 0) {
        const { error } = await supabase.from('documents').insert(records)
        
        if (error) {
          console.error(`\n   ❌ Insert error: ${error.message}`)
        } else {
          successfulInserts += records.length
          totalChunks += records.length
        }
      }
    }

    console.log(`\n   ✅ ${filename} complete`)
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Ingestion Complete!`)
  console.log(`   Total Chunks: ${totalChunks}`)
  console.log(`   Successfully Inserted: ${successfulInserts}`)
  console.log('='.repeat(50))
}

// ==========================================
// RUN
// ==========================================
ingestDocuments().catch(console.error)
