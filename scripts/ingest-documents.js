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
// CONFIGURATION - RATE LIMIT FRIENDLY
// ==========================================
const WASHTENAW_DOCS_PATH = path.join(__dirname, '../public/documents/washtenaw')
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100
const BATCH_SIZE = 3 // Reduced even more for stability
const DELAY_BETWEEN_BATCHES = 3000 // 3 seconds between batches
const DELAY_BETWEEN_EMBEDDINGS = 1000 // 1 second between embeddings
const MAX_RETRIES = 3

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

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

async function generateEmbeddingWithRetry(text, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use the generativeModel approach (matches your API code)
      const model = vertex_ai.getGenerativeModel({ 
        model: "text-embedding-004"
      })
      
      const result = await model.embedContent({
        content: {
          role: 'user',
          parts: [{ text: text }]
        }
      })
      
      const embedding = result.embedding?.values
      
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        return embedding
      } else {
        throw new Error('Invalid embedding format')
      }
    } catch (error) {
      console.error(`   ⚠️ Attempt ${attempt} failed: ${error.message}`)
      
      if (attempt === retries) {
        console.error(`   ❌ Embedding failed after ${retries} attempts`)
        return null
      }
      
      // Exponential backoff
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`   ⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`)
      await sleep(waitTime)
    }
  }
  return null
}

// ==========================================
// PROGRESS TRACKER
// ==========================================
class ProgressTracker {
  constructor(totalFiles) {
    this.totalFiles = totalFiles
    this.currentFile = 0
    this.totalChunks = 0
    this.successfulInserts = 0
    this.failedChunks = 0
  }

  startFile(filename, chunkCount) {
    this.currentFile++
    console.log(`\n[${this.currentFile}/${this.totalFiles}] 📄 Processing: ${filename}`)
    console.log(`   ✂️ ${chunkCount} chunks to process`)
  }

  logProgress(current, total) {
    const percent = Math.round((current / total) * 100)
    process.stdout.write(`\r   Progress: ${current}/${total} (${percent}%)`)
  }

  recordSuccess(count) {
    this.successfulInserts += count
    this.totalChunks += count
  }

  recordFailure(count) {
    this.failedChunks += count
    this.totalChunks += count
  }

  summary() {
    console.log('\n' + '='.repeat(60))
    console.log('✅ INGESTION COMPLETE')
    console.log('='.repeat(60))
    console.log(`📊 Summary:`)
    console.log(`   Files Processed: ${this.currentFile}`)
    console.log(`   Total Chunks: ${this.totalChunks}`)
    console.log(`   Successful: ${this.successfulInserts}`)
    console.log(`   Failed: ${this.failedChunks}`)
    if (this.totalChunks > 0) {
      console.log(`   Success Rate: ${Math.round((this.successfulInserts / this.totalChunks) * 100)}%`)
    }
    console.log('='.repeat(60))
  }
}

// ==========================================
// MAIN INGESTION LOGIC
// ==========================================
async function ingestDocuments() {
  console.log('🚀 Starting Rate-Limited Document Ingestion\n')
  console.log('⚙️ Configuration:')
  console.log(`   Batch Size: ${BATCH_SIZE}`)
  console.log(`   Delay Between Batches: ${DELAY_BETWEEN_BATCHES}ms`)
  console.log(`   Delay Between Embeddings: ${DELAY_BETWEEN_EMBEDDINGS}ms`)
  console.log(`   Max Retries: ${MAX_RETRIES}`)

  // Check directory
  if (!fs.existsSync(WASHTENAW_DOCS_PATH)) {
    console.error(`\n❌ Directory not found: ${WASHTENAW_DOCS_PATH}`)
    console.error('Make sure your documents are in: /public/documents/washtenaw/')
    process.exit(1)
  }

  const files = fs.readdirSync(WASHTENAW_DOCS_PATH)
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))

  if (pdfFiles.length === 0) {
    console.error('❌ No PDF files found in Washtenaw directory')
    process.exit(1)
  }

  console.log(`\n📚 Found ${pdfFiles.length} PDF files`)
  
  // Prompt for confirmation
  console.log('\nEstimated processing time:')
  const estimatedMinutes = Math.ceil((pdfFiles.length * 50 * DELAY_BETWEEN_EMBEDDINGS) / 60000)
  console.log(`   ~${estimatedMinutes} minutes (depending on document size)`)
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n')
  
  await sleep(5000)

  const progress = new ProgressTracker(pdfFiles.length)

  for (const filename of pdfFiles) {
    const filePath = path.join(WASHTENAW_DOCS_PATH, filename)

    // Extract text
    const text = await extractTextFromPDF(filePath)
    if (!text || text.trim().length < 50) {
      console.log(`\n⚠️ Skipping ${filename} (insufficient text)`)
      continue
    }

    // Clean and chunk
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .trim()
    
    const chunks = chunkText(cleanText)
    progress.startFile(filename, chunks.length)

    // Process chunks with rate limiting
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const records = []

      // Generate embeddings for batch with delays
      for (let j = 0; j < batch.length; j++) {
        const chunkText = batch[j]
        const embedding = await generateEmbeddingWithRetry(chunkText)

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

        // Delay between embedding requests
        if (j < batch.length - 1) {
          await sleep(DELAY_BETWEEN_EMBEDDINGS)
        }

        progress.logProgress(i + j + 1, chunks.length)
      }

      // Insert batch to Supabase
      if (records.length > 0) {
        const { error } = await supabase.from('documents').insert(records)
        
        if (error) {
          console.error(`\n   ❌ Insert error: ${error.message}`)
          progress.recordFailure(records.length)
        } else {
          progress.recordSuccess(records.length)
        }
      } else {
        progress.recordFailure(batch.length)
      }

      // Delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    console.log(`\n   ✅ ${filename} complete`)
  }

  progress.summary()
}

// ==========================================
// RUN WITH ERROR HANDLING
// ==========================================
ingestDocuments()
  .then(() => {
    console.log('\n✨ All done! You can now close this terminal.')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
