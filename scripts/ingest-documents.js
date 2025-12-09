import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// --- CONFIGURATION ---
const CHUNK_SIZE = 1500
const BATCH_DELAY = 1000 // 1 second between API calls
const RETRY_DELAY = 5000 // 5 seconds on rate limit
const MAX_RETRIES = 5

// --- ENV VALIDATION ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

console.log('🔍 Environment Check:')
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`   SUPABASE_KEY: ${SUPABASE_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`   OPENAI_KEY: ${OPENAI_KEY ? `✅ Set (${OPENAI_KEY.substring(0, 8)}...)` : '❌ Missing'}`)

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('\n❌ Missing Required Environment Variables')
  console.error('Please check your .env.local file contains:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('  - OPENAI_API_KEY')
  process.exit(1)
}

// --- SETUP CLIENTS ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// --- HELPER FUNCTIONS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const chunkText = (text, chunkSize = CHUNK_SIZE) => {
  const words = text.split(/\s+/)
  const chunks = []
  let currentChunk = []
  let currentLength = 0
  
  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))
      currentChunk = [word]
      currentLength = word.length
    } else {
      currentChunk.push(word)
      currentLength += word.length + 1
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }
  
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
    if (error.status) console.error(`   Status Code: ${error.status}`)
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
  } catch (error) {
    console.error('❌ Supabase Connection Failed:', error.message)
    return false
  }
}

async function getEmbedding(text, retryCount = 0) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    if (error.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * (retryCount + 1)
      console.log(`\n   ⏳ Rate limited. Waiting ${delay/1000}s before retry...`)
      await sleep(delay)
      return getEmbedding(text, retryCount + 1)
    }
    throw error
  }
}

async function findDocumentsFolder() {
  const possiblePaths = [
    path.join(process.cwd(), 'public/documents/washtenaw'),
    path.join(process.cwd(), 'public/washtenaw'),
    path.join(process.cwd(), 'public/documents'),
    path.join(process.cwd(), 'documents'),
  ]
  
  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'))
      if (files.length > 0) {
        return dir
      }
    }
  }
  
  return null
}

async function processDocument(file, filePath) {
  console.log(`\n📄 Processing: ${file}`)
  
  try {
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdf(dataBuffer)
    const text = data.text.replace(/\n/g, ' ').replace(/\s+/g, ' ')
    
    // Split into chunks
    const chunks = chunkText(text)
    console.log(`   📊 Split into ${chunks.length} chunks`)
    
    let successCount = 0
    let errorCount = 0
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      try {
        // Get embedding from OpenAI
        const embedding = await getEmbedding(chunks[i])
        
        // Insert into Supabase
        const { error } = await supabase.from('documents').insert({
          content: chunks[i],
          metadata: { 
            source: file, 
            chunk_index: i,
            county: 'washtenaw',
            total_chunks: chunks.length
          },
          embedding: embedding
        })

        if (error) throw error
        
        process.stdout.write('█')
        successCount++
        
        // Pause to avoid rate limits
        await sleep(BATCH_DELAY)

      } catch (err) {
        process.stdout.write('✗')
        errorCount++
        console.error(`\n   ❌ Error on chunk ${i}:`, err.message)
      }
    }
    
    console.log(`\n   ✅ Success: ${successCount}/${chunks.length} chunks`)
    if (errorCount > 0) {
      console.log(`   ⚠️  Failed: ${errorCount} chunks`)
    }
    
    return { success: successCount, failed: errorCount }
    
  } catch (fileErr) {
    console.error(`   ❌ Failed to process file:`, fileErr.message)
    return { success: 0, failed: 1 }
  }
}

async function run() {
  console.log('\n🚀 Starting OpenAI Document Ingestion\n')
  console.log('=' .repeat(50))
  
  // Test connections first
  const openaiOk = await testOpenAIConnection()
  const supabaseOk = await testSupabaseConnection()
  
  if (!openaiOk || !supabaseOk) {
    console.error('\n❌ Connection tests failed. Please fix the errors above.')
    process.exit(1)
  }
  
  // Find documents folder
  console.log('\n📂 Searching for PDFs...')
  const docsDir = await findDocumentsFolder()
  
  if (!docsDir) {
    console.error('❌ Cannot find PDF folder. Please ensure PDFs are in one of:')
    console.error('  - public/documents/washtenaw/')
    console.error('  - public/washtenaw/')
    console.error('  - public/documents/')
    console.error('  - documents/')
    process.exit(1)
  }
  
  console.log(`✅ Found folder: ${docsDir}`)
  
  const files = fs.readdirSync(docsDir).filter(f => f.toLowerCase().endsWith('.pdf'))
  console.log(`✅ Found ${files.length} PDF files`)
  
  if (files.length === 0) {
    console.error('❌ No PDF files found in directory')
    process.exit(1)
  }
  
  console.log('\n⏳ This will take time to avoid rate limits')
  console.log('=' .repeat(50))
  
  // Process each file
  let totalSuccess = 0
  let totalFailed = 0
  
  for (const file of files) {
    const filePath = path.join(docsDir, file)
    const result = await processDocument(file, filePath)
    totalSuccess += result.success
    totalFailed += result.failed
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Ingestion Summary:')
  console.log(`   ✅ Successful chunks: ${totalSuccess}`)
  console.log(`   ❌ Failed chunks: ${totalFailed}`)
  
  // Verify database
  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('   ⚠️  Could not verify database:', error.message)
  } else {
    console.log(`   📚 Total documents in database: ${count}`)
  }
  
  console.log('=' .repeat(50))
  console.log('\n✅ Ingestion Complete!\n')
}

// Run with error handling
run().catch(err => {
  console.error('\n💥 Fatal Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})
