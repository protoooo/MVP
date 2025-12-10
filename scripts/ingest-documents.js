import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

dotenv.config({ path: '.env.local' })

// ENV VARS
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

console.log("🔍 Checking Environment Variables:")
console.log("SUPABASE_URL:", SUPABASE_URL ? "✔️ " + SUPABASE_URL.substring(0, 30) + "..." : "❌")
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY ? "✔️ (present)" : "❌")
console.log("OPENAI_API_KEY:", OPENAI_KEY ? "✔️ (present)" : "❌")

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error("\n❌ Missing required environment variables. Check .env.local")
  console.error("Run: cp .env.example .env.local and fill in values")
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// Utilities
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Chunk text into smaller pieces
function chunkText(text, size = 1200, overlap = 200) {
  const words = text.split(/\s+/)
  const chunks = []
  let i = 0
  
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(" ")
    if (chunk.length > 50) { // Only add substantial chunks
      chunks.push(chunk)
    }
    i += (size - overlap) // Move forward with overlap
  }
  
  return chunks
}

// Get embedding with exponential backoff
async function getEmbedding(text, retries = 0) {
  try {
    // Truncate very long text
    const truncated = text.substring(0, 8000)
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncated
    })
    
    return response.data[0].embedding
  } catch (err) {
    const statusCode = err.status || err.response?.status
    
    if (statusCode === 429 && retries < 5) {
      const waitTime = Math.pow(2, retries) * 1000 + Math.random() * 1000
      console.log(`\n⏳ Rate limit (429), waiting ${Math.round(waitTime/1000)}s...`)
      await sleep(waitTime)
      return getEmbedding(text, retries + 1)
    }
    
    if (retries < 3) {
      console.log(`\n⚠️ Error: ${err.message}, retry ${retries + 1}/3`)
      await sleep(2000)
      return getEmbedding(text, retries + 1)
    }
    
    throw err
  }
}

async function testSupabaseConnection() {
  console.log("\n🔌 Testing Supabase connection...")
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error("❌ Supabase connection failed:", error.message)
      console.error("   Check your SUPABASE_SERVICE_ROLE_KEY")
      return false
    }
    
    console.log("✅ Supabase connected successfully")
    return true
  } catch (err) {
    console.error("❌ Supabase connection error:", err.message)
    return false
  }
}

async function testOpenAI() {
  console.log("\n🤖 Testing OpenAI connection...")
  try {
    await getEmbedding("test")
    console.log("✅ OpenAI connected successfully")
    return true
  } catch (err) {
    console.error("❌ OpenAI connection failed:", err.message)
    console.error("   Check your OPENAI_API_KEY")
    return false
  }
}

async function processPDF(file, fullPath) {
  console.log(`\n📄 Processing ${file}`)
  
  try {
    const buffer = fs.readFileSync(fullPath)
    console.log(`   File size: ${(buffer.length / 1024).toFixed(2)} KB`)
    
    // Parse PDF
    const parsed = await pdf(buffer)
    
    // Clean text aggressively
    let clean = parsed.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    console.log(`   Extracted ${clean.length} characters`)
    
    if (!clean || clean.length < 100) {
      console.log(`   ⚠️ Insufficient text (${clean.length} chars), skipping`)
      return 0
    }

    // Create chunks with overlap
    const chunks = chunkText(clean, 1200, 200)
    console.log(`   📦 Created ${chunks.length} chunks`)

    let success = 0
    let failed = 0

    for (let i = 0; i < chunks.length; i++) {
      try {
        // Get embedding
        const embed = await getEmbedding(chunks[i])
        
        if (!embed || embed.length === 0) {
          console.error(`\n   ❌ Empty embedding for chunk ${i}`)
          failed++
          continue
        }
        
        // Insert into Supabase
        const { error } = await supabase.from("documents").insert({
          content: chunks[i],
          embedding: embed,
          metadata: {
            source: file,
            chunk_index: i,
            total_chunks: chunks.length,
            county: "washtenaw"
          }
        })

        if (error) {
          console.error(`\n   ❌ Insert failed for chunk ${i}:`, error.message)
          failed++
          continue
        }
        
        process.stdout.write("█")
        success++
        
        // Rate limiting: 3500 requests per minute for tier 1
        // That's ~58 per second, so wait 20ms between requests
        await sleep(20)
        
      } catch (err) {
        process.stdout.write("✗")
        console.error(`\n   ❌ Chunk ${i} error:`, err.message)
        failed++
      }
    }

    console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
    return success
    
  } catch (err) {
    console.error(`\n   ❌ Failed to process ${file}:`)
    console.error(`   Error: ${err.message}`)
    if (err.stack) console.error(`   Stack: ${err.stack.split('\n')[1]}`)
    return 0
  }
}

function findPDFDir() {
  const possiblePaths = [
    "public/documents/washtenaw",
    "public/documents",
    "documents/washtenaw",
    "documents",
    "."
  ]
  
  console.log("\n🔍 Searching for PDFs...")
  
  for (const p of possiblePaths) {
    const full = path.join(process.cwd(), p)
    console.log(`   Checking: ${full}`)
    
    if (!fs.existsSync(full)) {
      console.log(`      ❌ Directory doesn't exist`)
      continue
    }
    
    const files = fs.readdirSync(full)
    const pdfs = files.filter(f => f.toLowerCase().endsWith(".pdf"))
    
    if (pdfs.length > 0) {
      console.log(`      ✅ Found ${pdfs.length} PDFs`)
      return full
    } else {
      console.log(`      ⚠️ Directory exists but no PDFs found`)
    }
  }
  
  return null
}

async function run() {
  console.log("=" .repeat(60))
  console.log("🚀 protocolLM Document Ingestion")
  console.log("=" .repeat(60))
  console.log("📍 Working directory:", process.cwd())

  // Test connections
  const supabaseOk = await testSupabaseConnection()
  const openaiOk = await testOpenAI()
  
  if (!supabaseOk || !openaiOk) {
    console.error("\n❌ Connection tests failed. Fix configuration before proceeding.")
    process.exit(1)
  }

  // Find PDFs
  const dir = findPDFDir()
  if (!dir) {
    console.error("\n❌ No PDFs found in any expected location:")
    console.error("   - public/documents/washtenaw/")
    console.error("   - public/documents/")
    console.error("   - documents/washtenaw/")
    console.error("   - documents/")
    console.error("\nPlace your PDFs in one of these directories and try again.")
    process.exit(1)
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(".pdf"))
    .sort()
  
  console.log(`\n📚 Found ${files.length} PDFs to process`)
  console.log("=" .repeat(60))

  // Confirm before proceeding
  console.log("\n⚠️  This will insert data into your Supabase database.")
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n")
  await sleep(5000)

  let totalChunks = 0
  let processedFiles = 0
  const startTime = Date.now()

  for (let idx = 0; idx < files.length; idx++) {
    const f = files[idx]
    console.log(`\n[${idx + 1}/${files.length}] Processing ${f}`)
    
    const chunks = await processPDF(f, path.join(dir, f))
    totalChunks += chunks
    if (chunks > 0) processedFiles++
    
    // Small delay between files
    if (idx < files.length - 1) {
      await sleep(1000)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log("\n" + "=" .repeat(60))
  console.log("🎉 Ingestion Complete!")
  console.log("=" .repeat(60))
  console.log(`📊 Summary:`)
  console.log(`   - Files processed: ${processedFiles}/${files.length}`)
  console.log(`   - Total chunks inserted: ${totalChunks}`)
  console.log(`   - Duration: ${duration}s`)
  console.log(`   - Average: ${(totalChunks / parseFloat(duration)).toFixed(2)} chunks/sec`)
  console.log("=" .repeat(60))
}

run().catch(err => {
  console.error("\n💥 Fatal error:", err.message)
  console.error(err.stack)
  process.exit(1)
})
