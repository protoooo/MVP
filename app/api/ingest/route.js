import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pdfParse from 'pdf-parse'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WASHTENAW_DOCS_PATH = path.join(__dirname, '../public/documents/washtenaw')
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100
const BATCH_SIZE = 3
const DELAY_BETWEEN_BATCHES = 3000
const DELAY_BETWEEN_EMBEDDINGS = 1000
const MAX_RETRIES = 3

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
      // THIS IS THE KEY FIX - Using getGenerativeModel directly
      const model = vertex_ai.getGenerativeModel({ 
        model: 'text-embedding-004'
      })
      
      const embeddingResult = await model.embedContent({
        content: {
          role: 'user',
          parts: [{ text: text }]
        }
      })
      
      const embedding = embeddingResult.embedding?.values
      
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
      
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`   ⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`)
      await sleep(waitTime)
    }
  }
  return null
}

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

async function ingestDocuments() {
  console.log('🚀 Starting Rate-Limited Document Ingestion\n')

  if (!fs.existsSync(WASHTENAW_DOCS_PATH)) {
    console.error(`\n❌ Directory not found: ${WASHTENAW_DOCS_PATH}`)
    process.exit(1)
  }

  const files = fs.readdirSync(WASHTENAW_DOCS_PATH)
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))

  if (pdfFiles.length === 0) {
    console.error('❌ No PDF files found')
    process.exit(1)
  }

  console.log(`\n📚 Found ${pdfFiles.length} PDF files`)
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n')
  
  await sleep(5000)

  const progress = new ProgressTracker(pdfFiles.length)

  for (const filename of pdfFiles) {
    const filePath = path.join(WASHTENAW_DOCS_PATH, filename)
    const text = await extractTextFromPDF(filePath)
    
    if (!text || text.trim().length < 50) {
      console.log(`\n⚠️ Skipping ${filename}`)
      continue
    }

    const cleanText = text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E\n]/g, '').trim()
    const chunks = chunkText(cleanText)
    progress.startFile(filename, chunks.length)

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const records = []

      for (let j = 0; j < batch.length; j++) {
        const embedding = await generateEmbeddingWithRetry(batch[j])

        if (embedding) {
          records.push({
            content: batch[j],
            embedding: embedding,
            metadata: {
              source: filename,
              page: Math.floor((i + j) / 3) + 1,
              county: 'washtenaw',
              chunk_index: i + j
            }
          })
        }

        if (j < batch.length - 1) await sleep(DELAY_BETWEEN_EMBEDDINGS)
        progress.logProgress(i + j + 1, chunks.length)
      }

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

      if (i + BATCH_SIZE < chunks.length) await sleep(DELAY_BETWEEN_BATCHES)
    }

    console.log(`\n   ✅ ${filename} complete`)
  }

  progress.summary()
}

ingestDocuments()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
