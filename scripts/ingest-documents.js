// scripts/ingest-documents-fixed.js
// Improved version with better error handling and verification

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

console.log("=" .repeat(70))
console.log("📚 protocolLM Document Ingestion (Fixed)")
console.log("=" .repeat(70))

// Verify environment
console.log("\n🔍 Environment Check:")
console.log("SUPABASE_URL:", SUPABASE_URL ? `✅ ${SUPABASE_URL.substring(0, 40)}...` : "❌ MISSING")
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY ? `✅ ${SUPABASE_KEY.substring(0, 20)}...` : "❌ MISSING")
console.log("OPENAI_API_KEY:", OPENAI_KEY ? `✅ sk-${OPENAI_KEY.substring(3, 20)}...` : "❌ MISSING")

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error("\n❌ Missing required environment variables!")
  console.error("Make sure .env.local contains:")
  console.error("  NEXT_PUBLIC_SUPABASE_URL")
  console.error("  SUPABASE_SERVICE_ROLE_KEY (not anon key!)")
  console.error("  OPENAI_API_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})
const openai = new OpenAI({ apiKey: OPENAI_KEY })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Chunk text with overlap
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

// Get embedding with retry
async function getEmbedding(text, retries = 0) {
  try {
    const truncated = text.substring(0, 8000)
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncated
    })
    return response.data[0].embedding
  } catch (err) {
    if (err.status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000
      console.log(`\n⏳ Rate limit, waiting ${(wait/1000).toFixed(1)}s...`)
      await sleep(wait)
      return getEmbedding(text, retries + 1)
    }
    throw err
  }
}

// Test Supabase connection AND permissions
async function testSupabase() {
  console.log("\n🔌 Testing Supabase...")
  
  try {
    // Test 1: Can we read?
    const { data: readTest, error: readError } = await supabase
      .from('documents')
      .select('id')
      .limit(1)
    
    if (readError) {
      console.error("❌ Cannot read from documents table:", readError.message)
      return false
    }
    console.log("✅ Read access confirmed")
    
    // Test 2: Can we insert?
    const testDoc = {
      content: "TEST_DOCUMENT_DELETE_ME",
      embedding: new Array(1536).fill(0),
      metadata: { test: true }
    }
    
    const { data: insertTest, error: insertError } = await supabase
      .from('documents')
      .insert(testDoc)
      .select()
    
    if (insertError) {
      console.error("❌ Cannot insert into documents table:", insertError.message)
      console.error("   This usually means:")
      console.error("   1. Wrong API key (use service_role, not anon)")
      console.error("   2. RLS is blocking (run: ALTER TABLE documents DISABLE ROW LEVEL SECURITY;)")
      console.error("   3. Table doesn't exist or has wrong schema")
      return false
    }
    
    console.log("✅ Insert access confirmed")
    
    // Test 3: Can we delete?
    if (insertTest && insertTest[0]) {
      await supabase.from('documents').delete().eq('id', insertTest[0].id)
      console.log("✅ Delete access confirmed")
    }
    
    // Show current count
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Current documents in table: ${count || 0}`)
    
    return true
  } catch (err) {
    console.error("❌ Supabase test failed:", err.message)
    return false
  }
}

// Test OpenAI
async function testOpenAI() {
  console.log("\n🤖 Testing OpenAI...")
  try {
    const embedding = await getEmbedding("test connection")
    console.log(`✅ OpenAI connected (${embedding.length} dimensions)`)
    return true
  } catch (err) {
    console.error("❌ OpenAI test failed:", err.message)
    if (err.status === 401) {
      console.error("   Invalid API key")
    } else if (err.status === 429) {
      console.error("   Rate limit or quota exceeded")
    }
    return false
  }
}

// Find PDF directory
function findPDFs() {
  const paths = [
    "public/documents/washtenaw",
    "public/documents",
    "documents/washtenaw",
    "documents"
  ]
  
  console.log("\n📁 Searching for PDFs...")
  
  for (const p of paths) {
    const full = path.join(process.cwd(), p)
    console.log(`   Checking: ${full}`)
    
    if (!fs.existsSync(full)) {
      console.log(`      ❌ Doesn't exist`)
      continue
    }
    
    const files = fs.readdirSync(full)
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    
    if (pdfs.length > 0) {
      console.log(`      ✅ Found ${pdfs.length} PDFs`)
      return { dir: full, files: pdfs }
    } else {
      console.log(`      ⚠️ Empty`)
    }
  }
  
  return null
}

// Process one PDF
async function processPDF(file, fullPath, fileIndex, totalFiles) {
  console.log(`\n[${ fileIndex + 1}/${totalFiles}] 📄 ${file}`)
  
  try {
    const buffer = fs.readFileSync(fullPath)
    const parsed = await pdf(buffer)
    
    let text = parsed.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`   📊 ${parsed.numpages} pages, ${text.length.toLocaleString()} characters`)
    
    if (text.length < 100) {
      console.log(`   ⚠️ Too little text, skipping`)
      return { success: 0, failed: 0 }
    }
    
    const chunks = chunkText(text, 1000, 150)
    console.log(`   📦 ${chunks.length} chunks created`)
    console.log(`   Progress: `, '')
    
    let success = 0
    let failed = 0
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        // Get embedding
        const embedding = await getEmbedding(chunks[i])
        
        // Insert to Supabase
        const { error } = await supabase.from('documents').insert({
          content: chunks[i],
          embedding: embedding,
          metadata: {
            source: file,
            chunk_index: i,
            total_chunks: chunks.length,
            county: "washtenaw",
            page_estimate: Math.floor((i / chunks.length) * parsed.numpages) + 1
          }
        })
        
        if (error) {
          console.error(`\n   ❌ Insert failed for chunk ${i}:`, error.message)
          failed++
        } else {
          process.stdout.write('█')
          success++
        }
        
        // Rate limiting
        await sleep(20)
        
      } catch (err) {
        console.error(`\n   ❌ Chunk ${i} error:`, err.message)
        process.stdout.write('✗')
        failed++
      }
    }
    
    console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
    return { success, failed }
    
  } catch (err) {
    console.error(`   ❌ Failed to process:`, err.message)
    return { success: 0, failed: 0 }
  }
}

// Main function
async function run() {
  // Test connections
  const supabaseOk = await testSupabase()
  const openaiOk = await testOpenAI()
  
  if (!supabaseOk || !openaiOk) {
    console.error("\n❌ Connection tests failed. Cannot proceed.")
    console.error("\nTroubleshooting:")
    console.error("1. Run the SQL script to create/fix the documents table")
    console.error("2. Verify SUPABASE_SERVICE_ROLE_KEY (not anon key)")
    console.error("3. Check OpenAI API key and quota")
    process.exit(1)
  }
  
  // Find PDFs
  const result = findPDFs()
  if (!result) {
    console.error("\n❌ No PDFs found!")
    console.error("\nPlace PDFs in: public/documents/washtenaw/")
    console.error("Then run: npm run ingest")
    process.exit(1)
  }
  
  const { dir, files } = result
  console.log(`\n📚 Will process ${files.length} files from ${dir}`)
  console.log("=" .repeat(70))
  
  // Confirm
  console.log("\n⚠️  Ready to upload to Supabase")
  console.log("Press Ctrl+C to cancel, or wait 3 seconds...\n")
  await sleep(3000)
  
  const startTime = Date.now()
  let totalSuccess = 0
  let totalFailed = 0
  
  for (let i = 0; i < files.length; i++) {
    const { success, failed } = await processPDF(
      files[i],
      path.join(dir, files[i]),
      i,
      files.length
    )
    totalSuccess += success
    totalFailed += failed
    
    if (i < files.length - 1) {
      await sleep(1000)
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  console.log("\n" + "=" .repeat(70))
  console.log("🎉 Ingestion Complete!")
  console.log("=" .repeat(70))
  console.log(`Files: ${files.length}`)
  console.log(`Chunks inserted: ${totalSuccess}`)
  console.log(`Failed chunks: ${totalFailed}`)
  console.log(`Duration: ${duration}s`)
  console.log(`Rate: ${(totalSuccess / parseFloat(duration)).toFixed(2)} chunks/sec`)
  
  // Verify final count
  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 Total documents in database: ${count}`)
  console.log("=" .repeat(70))
}

run().catch(err => {
  console.error("\n💥 Fatal error:", err)
  process.exit(1)
})
