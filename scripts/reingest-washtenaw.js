// scripts/reingest-washtenaw.js - Complete re-ingestion with Cohere
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'
import { CohereClient } from 'cohere-ai'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const COHERE_KEY = process.env.COHERE_API_KEY

console.log("=" .repeat(80))
console.log("🏥 WASHTENAW COUNTY FOOD SAFETY DOCUMENT INGESTION (COHERE)")
console.log("=" .repeat(80))

// Verify environment
console.log("\n🔍 Environment Check:")
console.log("SUPABASE_URL:", SUPABASE_URL ? `✅ ${SUPABASE_URL.substring(0, 40)}...` : "❌ MISSING")
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY ? `✅ ${SUPABASE_KEY.substring(0, 20)}...` : "❌ MISSING")
console.log("COHERE_API_KEY:", COHERE_KEY ? `✅ ${COHERE_KEY.substring(0, 20)}...` : "❌ MISSING")

if (!SUPABASE_URL || !SUPABASE_KEY || !COHERE_KEY) {
  console.error("\n❌ Missing required environment variables!")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})
const cohere = new CohereClient({ token: COHERE_KEY })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Chunk text with overlap for better retrieval
function chunkText(text, size = 1000, overlap = 150) {
  const words = text.split(/\s+/)
  const chunks = []
  let i = 0
  
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(" ").trim()
    if (chunk.length > 50) {
      chunks.push(chunk)
    }
    i += (size - overlap)
  }
  
  return chunks
}

// Get embeddings with retry logic
async function getEmbeddings(texts, retries = 0) {
  try {
    const response = await cohere.embed({
      texts: texts,
      model: 'embed-english-v3.0',
      inputType: 'search_document',
      embeddingTypes: ['float']
    })
    
    return response.embeddings.float
  } catch (err) {
    if (err.status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000
      console.log(`\n⏳ Rate limit hit, waiting ${(wait/1000).toFixed(1)}s...`)
      await sleep(wait)
      return getEmbeddings(texts, retries + 1)
    }
    throw err
  }
}

// Estimate page number from chunk position
function estimatePage(chunkIndex, totalChunks, totalPages) {
  return Math.floor((chunkIndex / totalChunks) * totalPages) + 1
}

// Test database connection
async function testDatabase() {
  console.log("\n🔌 Testing Supabase connection...")
  
  try {
    // Test read
    const { error: readError } = await supabase
      .from('documents')
      .select('id')
      .limit(1)
    
    if (readError) {
      console.error("❌ Cannot read documents table:", readError.message)
      return false
    }
    console.log("✅ Read access confirmed")
    
    // Check current count
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Current documents in database: ${count || 0}`)
    
    // Ask about clearing
    if (count > 0) {
      console.log("\n⚠️  Database contains existing documents.")
      console.log("   Re-ingestion will ADD new documents (duplicates possible)")
      console.log("\n💡 To clear first, run: DELETE FROM documents WHERE metadata->>'county' = 'washtenaw';")
    }
    
    return true
  } catch (err) {
    console.error("❌ Database test failed:", err.message)
    return false
  }
}

// Test Cohere
async function testCohere() {
  console.log("\n🤖 Testing Cohere connection...")
  try {
    const response = await cohere.embed({
      texts: ["test connection"],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
      embeddingTypes: ['float']
    })
    
    const embedding = response.embeddings.float[0]
    console.log(`✅ Cohere connected (${embedding.length} dimensions)`)
    return true
  } catch (err) {
    console.error("❌ Cohere test failed:", err.message)
    return false
  }
}

// Process a single PDF with batch embeddings
async function processPDF(file, fullPath, fileIndex, totalFiles) {
  console.log(`\n[${fileIndex + 1}/${totalFiles}] 📄 ${file}`)
  
  try {
    const buffer = fs.readFileSync(fullPath)
    const parsed = await pdf(buffer)
    
    // Clean text
    let text = parsed.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`   📊 ${parsed.numpages} pages, ${text.length.toLocaleString()} characters`)
    
    if (text.length < 100) {
      console.log(`   ⚠️ Insufficient text, skipping`)
      return { success: 0, failed: 0 }
    }
    
    // Create chunks
    const chunks = chunkText(text, 1000, 150)
    console.log(`   📦 Created ${chunks.length} chunks`)
    
    let success = 0
    let failed = 0
    
    // Process in batches (Cohere max: 96 texts per request)
    const BATCH_SIZE = 96
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length))
      const batchStart = i
      
      try {
        // Get embeddings for entire batch
        const embeddings = await getEmbeddings(batch)
        
        // Prepare database records
        const records = batch.map((chunk, idx) => ({
          content: chunk,
          embedding: embeddings[idx],
          metadata: {
            source: file,
            chunk_index: batchStart + idx,
            total_chunks: chunks.length,
            county: "washtenaw",
            page_estimate: estimatePage(batchStart + idx, chunks.length, parsed.numpages)
          }
        }))
        
        // Insert batch
        const { error } = await supabase.from('documents').insert(records)
        
        if (error) {
          console.error(`\n   ❌ Batch insert failed:`, error.message)
          failed += batch.length
        } else {
          process.stdout.write('█')
          success += batch.length
        }
        
        // Rate limiting between batches
        await sleep(100)
        
      } catch (err) {
        console.error(`\n   ❌ Batch processing error:`, err.message)
        process.stdout.write('✗')
        failed += batch.length
      }
    }
    
    console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
    return { success, failed }
    
  } catch (err) {
    console.error(`   ❌ Failed to process PDF:`, err.message)
    return { success: 0, failed: 0 }
  }
}

// Main ingestion function
async function run() {
  // Pre-flight checks
  const dbOk = await testDatabase()
  const cohereOk = await testCohere()
  
  if (!dbOk || !cohereOk) {
    console.error("\n❌ Pre-flight checks failed. Cannot proceed.")
    process.exit(1)
  }
  
  // Find PDFs
  const docsPath = path.join(process.cwd(), "public/documents/washtenaw")
  
  if (!fs.existsSync(docsPath)) {
    console.error(`\n❌ Directory not found: ${docsPath}`)
    console.error("   Create it and add your PDFs: public/documents/washtenaw/")
    process.exit(1)
  }
  
  const files = fs.readdirSync(docsPath).filter(f => f.toLowerCase().endsWith('.pdf'))
  
  if (files.length === 0) {
    console.error(`\n❌ No PDFs found in ${docsPath}`)
    process.exit(1)
  }
  
  console.log(`\n📚 Found ${files.length} PDFs to process`)
  console.log("Files:", files.map(f => `\n  - ${f}`).join(''))
  console.log("\n" + "=" .repeat(80))
  
  console.log("\n⚠️  Ready to start ingestion")
  console.log("   This will take 10-15 minutes for 25 documents")
  console.log("   Press Ctrl+C to cancel, or wait 3 seconds...\n")
  await sleep(3000)
  
  const startTime = Date.now()
  let totalSuccess = 0
  let totalFailed = 0
  
  // Process each PDF
  for (let i = 0; i < files.length; i++) {
    const { success, failed } = await processPDF(
      files[i],
      path.join(docsPath, files[i]),
      i,
      files.length
    )
    totalSuccess += success
    totalFailed += failed
    
    // Pause between files
    if (i < files.length - 1) {
      await sleep(1000)
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  // Final summary
  console.log("\n" + "=" .repeat(80))
  console.log("🎉 INGESTION COMPLETE!")
  console.log("=" .repeat(80))
  console.log(`📁 Files processed: ${files.length}`)
  console.log(`✅ Chunks inserted: ${totalSuccess.toLocaleString()}`)
  console.log(`❌ Failed chunks: ${totalFailed}`)
  console.log(`⏱️  Duration: ${duration}s`)
  console.log(`📊 Rate: ${(totalSuccess / parseFloat(duration)).toFixed(2)} chunks/sec`)
  
  // Check final count
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>county', 'washtenaw')
  
  console.log(`\n📈 Total Washtenaw documents in database: ${count || 0}`)
  console.log("=" .repeat(80))
  console.log("\n✅ Your documents are ready for search!")
  console.log("   Test with: npm run test-search\n")
}

run().catch(err => {
  console.error("\n💥 Fatal error:", err)
  process.exit(1)
})
