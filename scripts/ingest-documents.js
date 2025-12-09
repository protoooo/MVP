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
  console.error("❌ Missing required environment variables. Fix .env.local.")
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
    if (len + w.length > size) {
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
      input: text
    })
    return r.data[0].embedding
  } catch (err) {
    if (retries < 3) {
      console.log("⏳ Rate limit, retrying...")
      await sleep(2000)
      return getEmbedding(text, retries + 1)
    }
    throw err
  }
}

async function processPDF(file, fullPath) {
  console.log(`\n📄 Processing ${file}`)
  const buffer = fs.readFileSync(fullPath)
  const parsed = await pdf(buffer)
  const clean = parsed.text.replace(/\s+/g, " ")
  const chunks = chunkText(clean)

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

      if (error) throw error
      process.stdout.write("█")
      success++
      await sleep(500)
    } catch (err) {
      process.stdout.write("✗")
      console.error(`\nChunk ${i} failed:`, err.message)
    }
  }

  console.log(`\n✔️ Completed: ${success}/${chunks.length}`)
}

function findPDFDir() {
  const paths = [
    "public/documents/washtenaw",
    "public/washtenaw",
    "public/documents",
    "documents"
  ]
  for (const p of paths) {
    const full = path.join(process.cwd(), p)
    if (fs.existsSync(full)) {
      const pdfs = fs.readdirSync(full).filter(f => f.toLowerCase().endsWith(".pdf"))
      if (pdfs.length) return full
    }
  }
  return null
}

async function run() {
  console.log("🚀 Starting ingestion...")

  const dir = findPDFDir()
  if (!dir) {
    console.error("❌ No PDF directory found.")
    process.exit(1)
  }

  console.log("📂 PDF folder:", dir)

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf"))
  console.log(`Found ${files.length} PDFs`)

  for (const f of files) {
    await processPDF(f, path.join(dir, f))
  }

  console.log("\n🎉 Ingestion Complete!")
}

run().catch(err => {
  console.error("\n💥 Fatal error:", err)
  process.exit(1)
})
