// =============================
// LOAD ENVIRONMENT VARIABLES
// =============================
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// =============================
// IMPORTS
// =============================
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'

// =============================
// CONFIG
// =============================
const CHUNK_SIZE = 1500
const BATCH_DELAY = 1000 // 1 second per chunk to avoid rate limits
const RETRY_DELAY = 5000 // 5 seconds on 429
const MAX_RETRIES = 5

// =============================
// ENV VARIABLES
// =============================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

console.log('🔍 Environment Check:')
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`   SUPABASE_KEY: ${SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`   OPENAI_KEY: ${OPENAI_KEY ? `✅ Set (${OPENAI_KEY.substring(0, 8)}...)` : '❌ Missing'}`)

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('\n❌ Missing Required Environment Variables')
  console.error('Please check your .env.local contains:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('  - OPENAI_API_KEY')
  process.exit(1)
}

// =============================
// CLIENTS
// =============================
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// =============================
// HELPERS
// =============================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const chunkText = (text, chunkSize = CHUNK_SIZE) => {
  const words = text.split(/\s+/)
  const chunks = []
  let current = []
  let length = 0

  for (const word of words) {
    if (length + word.length > chunkSize && current.length > 0) {
      chunks.push(current.join(' '))
      current = [word]
      length = word.length
    } else {
      current.push(word)
      length += word.length + 1
    }
  }

  if (current.length > 0) chunks.push(current.join(' '))

  return chunks
}

async function testOpenAIConnection() {
  console.log('\n🧪 Testing OpenAI Connection...')
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "test connection",
    })
    console.log('✅ OpenAI Connection Successful')
    console.log(`   Model: ${response.model}`)
    console.log(`   Dimensions: ${response.data[0].embedding.length}`)
    return true
  } catch (error) {
    console.error('❌ OpenAI Connection Failed:', error.message)
    if (error.status) console.error(`Status: ${error.status}`)
    return false
  }
}

async function testSupabaseConnection() {
  console.log('\n🧪 Testing Supabase Connection...')
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('count')
      .limit(1)

    if (error) throw error

    console.log('✅ Supabase Connection Successful')
    return true
  } catch (err) {
    console.error('❌ Supabase Connection Failed:', err.message)
    return false
  }
}

async function getEmbedding(text, retry = 0) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    return response.data[0].embedding
  } catch (err) {
    if (err.status === 429 && retry < MAX_RETRIES) {
      const wait = RETRY_DELAY * (retry + 1)
      console.log(`⏳ Rate limited. Waiting ${wait / 1000}s before retry...`)
      await sleep(wait)
      return getEmbedding(text, retry + 1)
    }
    throw err
  }
}

async function findDocumentsFolder() {
  const paths = [
    path.join(process.cwd(), 'public/documents/washtenaw'),
    path.join(process.cwd(), 'public/washtenaw'),
    path.join(process.cwd(), 'public/documents'),
    path.join(process.cwd(), 'documents'),
  ]

  for (const dir of paths) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'))
      if (files.length > 0) return dir
    }
  }

  return null
}

async function processDocument(file, filePath) {
  console.log(`\n📄 Processing: ${file}`)

  try {
    const data = await pdf(fs.readFileSync(filePath))
    const text = data.text.replace(/\n/g, ' ').replace(/\s+/g, ' ')
    const chunks = chunkText(text)
    console.log(`   📊 Split into ${chunks.length} chunks`)

    let success = 0
    let failed = 0

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await getEmbedding(chunks[i])

        const { error } = await supabase.from('documents').insert({
          content: chunks[i],
          metadata: {
            source: file,
            chunk_index: i,
            county: 'washtenaw',
            total_chunks: chunks.length
          },
          embedding
        })

        if (error) throw error

        process.stdout.write('█')
        success++
        await sleep(BATCH_DELAY)
      } catch (err) {
        process.stdout.write('✗')
        failed++
        console.error(`\n   ❌ Error on chunk ${i}:`, err.message)
      }
    }

    console.log(`\n   ✅ Success: ${success}/${chunks.length}`)
    if (failed > 0) console.log(`   ⚠️ Failed: ${failed}`)

    return { success, failed }

  } catch (err) {
    console.error(`   ❌ Failed to process file:`, err.message)
    return { success: 0, failed: 1 }
  }
}

async function run() {
  console.log('\n🚀 Starting OpenAI Document Ingestion\n')
  console.log('='.repeat(50))

  // Test both services
  const openaiOk = await testOpenAIConnection()
  const supabaseOk = await testSupabaseConnection()

  if (!openaiOk || !supabaseOk) {
    console.error('\n❌ Connection tests failed. Fix above errors.')
    process.exit(1)
  }

  console.log('\n📂 Searching for PDFs...')
  const docsDir = await findDocumentsFolder()

  if (!docsDir) {
    console.error('❌ No PDF folder found.')
    process.exit(1)
  }

  console.log(`✅ Found folder: ${docsDir}`)

  const files = fs.readdirSync(docsDir).filter(f => f.toLowerCase().endsWith('.pdf'))
  console.log(`✅ Found ${files.length} PDF files`)

  if (files.length === 0) {
    console.error('❌ No PDFs found.')
    process.exit(1)
  }

  console.log('\n⏳ Ingesting (this will take time)...')
  console.log('='.repeat(50))

  let totalSuccess = 0
  let totalFailed = 0

  for (const file of files) {
    const filePath = path.join(docsDir, file)
    const result = await processDocument(file, filePath)
    totalSuccess += result.success
    totalFailed += result.failed
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 Ingestion Summary:')
  console.log(`   ✅ Successful: ${totalSuccess}`)
  console.log(`   ❌ Failed: ${totalFailed}`)

  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('⚠️ Could not verify final DB count:', error.message)
  } else {
    console.log(`📚 Total rows in DB: ${count}`)
  }

  console.log('\n✅ Ingestion Complete!\n')
}

// Run main
run().catch(err => {
  console.error('\n💥 Fatal Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})
