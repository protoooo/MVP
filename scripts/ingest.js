// scripts/ingest.js
// Simple document ingestion script with minimal dependencies

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pdfParse from 'pdf-parse'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  pdfDir: path.join(__dirname, '../public/documents/washtenaw'),
  chunkSize: 1000,
  chunkOverlap: 150,
  requestDelay: 50, // ms between requests
}

// Initialize clients
const supabase = createClient(config.supabaseUrl, config.supabaseKey)
const openai = new OpenAI({ apiKey: config.openaiKey })

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Utilities
function chunkText(text, size = 1000, overlap = 150) {
  const words = text.split(/\s+/)
  const chunks = []
  let i = 0
  
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(' ').trim()
    if (chunk.length > 50) {
      chunks.push(chunk)
    }
    i += (size - overlap)
  }
  
  return chunks
}

async function getEmbedding(text, retries = 0) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000)
    })
    return response.data[0].embedding
  } catch (error) {
    if (error.status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000
      console.log(`\n   ⏳ Rate limit, waiting ${(wait/1000).toFixed(1)}s...`)
      await sleep(wait)
      return getEmbedding(text, retries + 1)
    }
    throw error
  }
}

// Tests
async function testConnections() {
  console.log('🔌 Testing connections...\n')
  
  // Test Supabase
  try {
    // Try to select from documents
    const { error: readError } = await supabase
      .from('documents')
      .select('id')
      .limit(1)
    
    if (readError) {
      console.error('❌ Supabase read failed:', readError.message)
      return false
    }
    
    // Try to insert a test document
    const testDoc = {
      content: 'TEST_DELETE_ME',
      embedding: new Array(1536).fill(0),
      metadata: { test: true }
    }
    
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert(testDoc)
      .select()
    
    if (insertError) {
      console.error('❌ Supabase insert failed:', insertError.message)
      console.error('\nPossible causes:')
      console.error('1. Wrong API key (need service_role, not anon)')
      console.error('2. RLS blocking (run SQL to disable)')
      console.error('3. Vector extension not enabled')
      return false
    }
    
    // Clean up test document
    if (data?.[0]) {
      await supabase.from('documents').delete().eq('id', data[0].id)
    }
    
    console.log('✅ Supabase connected')
    
    // Show current count
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
    console.log(`   Current documents: ${count || 0}`)
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error.message)
    return false
  }
  
  // Test OpenAI
  try {
    const embedding = await getEmbedding('test')
    console.log('✅ OpenAI connected')
    console.log(`   Embedding dimensions: ${embedding.length}`)
  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message)
    return false
  }
  
  return true
}

async function processPDF(filePath, fileName) {
  console.log(`\n📄 ${fileName}`)
  
  try {
    const buffer = fs.readFileSync(filePath)
    const data = await pdfParse(buffer)
    
    // Clean text
    let text = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`   Pages: ${data.numpages}, Chars: ${text.length.toLocaleString()}`)
    
    if (text.length < 100) {
      console.log('   ⚠️ Too little text, skipping')
      return { success: 0, failed: 0 }
    }
    
    // Create chunks
    const chunks = chunkText(text, config.chunkSize, config.chunkOverlap)
    console.log(`   Chunks: ${chunks.length}`)
    console.log(`   Progress: `)
    
    let success = 0
    let failed = 0
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await getEmbedding(chunks[i])
        
        const { error } = await supabase.from('documents').insert({
          content: chunks[i],
          embedding: embedding,
          metadata: {
            source: fileName,
            chunk_index: i,
            total_chunks: chunks.length,
            county: 'washtenaw',
            page_estimate: Math.floor((i / chunks.length) * data.numpages) + 1
          }
        })
        
        if (error) {
          console.error(`\n   ❌ Insert error chunk ${i}:`, error.message)
          failed++
        } else {
          process.stdout.write('█')
          success++
        }
        
        await sleep(config.requestDelay)
        
      } catch (error) {
        console.error(`\n   ❌ Chunk ${i} error:`, error.message)
        failed++
      }
    }
    
    console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
    return { success, failed }
    
  } catch (error) {
    console.error(`   ❌ Failed to process:`, error.message)
    return { success: 0, failed: 0 }
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('📚 protocolLM Document Ingestion')
  console.log('=' .repeat(70))
  console.log()
  
  // Validate config
  if (!config.supabaseUrl || !config.supabaseKey || !config.openaiKey) {
    console.error('❌ Missing environment variables!')
    console.error('Required in .env.local:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    console.error('  - OPENAI_API_KEY')
    process.exit(1)
  }
  
  // Test connections
  const connectionsOk = await testConnections()
  if (!connectionsOk) {
    console.error('\n❌ Connection tests failed. Please fix the issues above.')
    process.exit(1)
  }
  
  // Check for PDFs
  console.log(`\n📁 PDF Directory: ${config.pdfDir}`)
  
  if (!fs.existsSync(config.pdfDir)) {
    console.error('❌ Directory does not exist!')
    console.error(`Create it: mkdir -p ${config.pdfDir}`)
    process.exit(1)
  }
  
  const files = fs.readdirSync(config.pdfDir)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort()
  
  if (files.length === 0) {
    console.error('❌ No PDF files found!')
    console.error(`Add PDFs to: ${config.pdfDir}`)
    process.exit(1)
  }
  
  console.log(`✅ Found ${files.length} PDFs`)
  files.forEach((f, i) => {
    const filePath = path.join(config.pdfDir, f)
    const stats = fs.statSync(filePath)
    console.log(`   ${i + 1}. ${f} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
  })
  
  console.log('\n⚠️  Starting ingestion in 3 seconds...')
  await sleep(3000)
  
  // Process files
  const startTime = Date.now()
  let totalSuccess = 0
  let totalFailed = 0
  
  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(config.pdfDir, files[i])
    const { success, failed } = await processPDF(filePath, files[i])
    totalSuccess += success
    totalFailed += failed
    
    if (i < files.length - 1) {
      await sleep(1000)
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  // Final report
  console.log('\n' + '=' .repeat(70))
  console.log('🎉 Ingestion Complete!')
  console.log('=' .repeat(70))
  console.log(`Files processed: ${files.length}`)
  console.log(`Chunks inserted: ${totalSuccess}`)
  console.log(`Failed chunks: ${totalFailed}`)
  console.log(`Duration: ${duration}s`)
  console.log(`Rate: ${(totalSuccess / parseFloat(duration)).toFixed(2)} chunks/sec`)
  
  // Verify final count
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 Total documents in database: ${count}`)
  console.log('=' .repeat(70))
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
