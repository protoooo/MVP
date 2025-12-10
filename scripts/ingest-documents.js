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
console.log("SUPABASE_URL:", SUPABASE_URL ? "✔️" : "❌")
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY ? "✔️" : "❌")
console.log("OPENAI_API_KEY:", OPENAI_KEY ? "✔️" : "❌")

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error("❌ Missing required environment variables. Check .env.local")
  process.exit(1)
}

// Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// Utilities
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Chunk text
function chunkText(text, size = 1500) {
  const words = text.split(/\s+/)
  const chunks = []
  let current = []
  let len = 0

  for (const w of words) {
    if (len + w.length > size && current.length > 0) {
      chunks.push(current.join(" "))
      current = [w]
      len = w.length
    } else {
      current.push(w)
      len += w.length + 1
    }
  }
  if (current.length) chunks.push(current.join(" "))
  return chunks
}

// Get embedding with retry
async function getEmbedding(text, retries = 0) {
  try {
    const r = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.substring(0, 8000) // Limit input length
    })
    return r.data[0].embedding
  } catch (err) {
    if (err.status === 429 && retries < 5) {
      const waitTime = Math.pow(2, retries) * 2000 // Exponential backoff
      console.log(`⏳ Rate limit hit, waiting ${waitTime}ms...`)
      await sleep(waitTime)
      return getEmbedding(text, retries + 1)
    }
    if (retries < 3) {
      console.log(`⚠️ Error: ${err.message}, retrying...`)
      await sleep(2000)
      return getEmbedding(text, retries + 1)
    }
    throw err
  }
}

async function processPDF(file, fullPath) {
  console.log(`\n📄 Processing ${file}`)
  
  try {
    const buffer = fs.readFileSync(fullPath)
    
    // FIXED: Suppress font warnings with custom options
    const parsed = await pdf(buffer, {
      max: 0, // No page limit
      version: 'v2.0.550' // Use stable version
    })
    
    const clean = parsed.text
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\n]/g, "") // Remove non-printable chars
      .trim()
    
    if (!clean || clean.length < 100) {
      console.log(`⚠️ Skipping ${file} - insufficient text content`)
      return 0
    }

    const chunks = chunkText(clean)
    console.log(`📦 Created ${chunks.length} chunks`)

    let success = 0

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embed = await getEmbedding(chunks[i])
        
        const { error } = await supabase.from("documents").insert({
          content: chunks[i],
          embedding: embed,
          metadata: {
            file,
            chunk_index: i,
            total_chunks: chunks.length,
            county: "washtenaw"
          }
        })

        if (error) {
          console.error(`\n❌ Insert failed for chunk ${i}:`, error.message)
          continue
        }
        
        process.stdout.write("█")
        success++
        
        // Throttle to avoid rate limits
        await sleep(1000)
      } catch (err) {
        process.stdout.write("✗")
        console.error(`\n❌ Chunk ${i} failed:`, err.message)
      }
    }

    console.log(`\n✅ Completed: ${success}/${chunks.length} chunks inserted`)
    return success
    
  } catch (err) {
    console.error(`\n❌ Failed to process ${file}:`, err.message)
    return 0
  }
}

function findPDFDir() {
  const paths = [
    "public/documents/washtenaw",
    "public/washtenaw",
    "public/documents",
    "documents/washtenaw",
    "documents"
  ]
  
  for (const p of paths) {
    const full = path.join(process.cwd(), p)
    if (fs.existsSync(full)) {
      const pdfs = fs.readdirSync(full).filter(f => f.toLowerCase().endsWith(".pdf"))
      if (pdfs.length) {
        console.log(`✅ Found ${pdfs.length} PDFs in ${full}`)
        return full
      }
    }
  }
  return null
}

async function run() {
  console.log("🚀 Starting ingestion...")
  console.log("📍 Current directory:", process.cwd())

  const dir = findPDFDir()
  if (!dir) {
    console.error("❌ No PDF directory found. Checked:")
    console.error("  - public/documents/washtenaw")
    console.error("  - public/washtenaw")
    console.error("  - public/documents")
    console.error("  - documents/washtenaw")
    console.error("  - documents")
    process.exit(1)
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(".pdf"))
    .sort()
  
  console.log(`📚 Found ${files.length} PDFs to process\n`)

  let totalChunks = 0
  let processedFiles = 0

  for (const f of files) {
    const chunks = await processPDF(f, path.join(dir, f))
    totalChunks += chunks
    if (chunks > 0) processedFiles++
  }

  console.log("\n" + "=".repeat(60))
  console.log("🎉 Ingestion Complete!")
  console.log(`📊 Stats:`)
  console.log(`   - Files processed: ${processedFiles}/${files.length}`)
  console.log(`   - Total chunks inserted: ${totalChunks}`)
  console.log("=".repeat(60))
}

run().catch(err => {
  console.error("\n💥 Fatal error:", err.message)
  console.error(err.stack)
  process.exit(1)
})
