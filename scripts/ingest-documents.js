// scripts/ingest-documents.js - COHERE VERSION
// UPDATED with PDF coverage verification per Claude's recommendations
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

console.log("=" .repeat(70))
console.log("📚 protocolLM Document Ingestion (Cohere)")
console.log("=" .repeat(70))

// Verify environment
console.log("\n🔍 Environment Check:")
console.log("SUPABASE_URL:", SUPABASE_URL ? `✅ ${SUPABASE_URL.substring(0, 40)}...` : "❌ MISSING")
console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY ? `✅ ${SUPABASE_KEY.substring(0, 20)}...` : "❌ MISSING")
console.log("COHERE_API_KEY:", COHERE_KEY ? `✅ ${COHERE_KEY.substring(0, 20)}...` : "❌ MISSING")

if (!SUPABASE_URL || !SUPABASE_KEY || !COHERE_KEY) {
  console.error("\n❌ Missing required environment variables!")
  console.error("Make sure .env.local contains:")
  console.error("  NEXT_PUBLIC_SUPABASE_URL")
  console.error("  SUPABASE_SERVICE_ROLE_KEY (not anon key!)")
  console.error("  COHERE_API_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})
const cohere = new CohereClient({ token: COHERE_KEY })
const rawModel = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_EMBED_MODEL = rawModel === 'embed-english-v4.0' ? 'embed-v4.0' : rawModel
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1024

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Track low coverage PDFs for final summary
const lowCoveragePDFs = []

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

// Get embeddings with retry (batch processing)
async function getEmbeddings(texts, retries = 0) {
  try {
    const response = await cohere.embed({
      texts: texts,
      model: COHERE_EMBED_MODEL,
      inputType: 'search_document',
      embeddingTypes: ['float'],
      truncate: 'END',
    })

    const embeddings = response.embeddings.float
    const dims = embeddings?.[0]?.length || 0

    if (dims !== COHERE_EMBED_DIMS) {
      throw new Error(`Embedding dimension mismatch (got ${dims}, expected ${COHERE_EMBED_DIMS}). Update COHERE_EMBED_MODEL/COHERE_EMBED_DIMS or align the documents table vector dimension.`)
    }

    return embeddings
  } catch (err) {
    if (err.status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000
      console.log(`\n⏳ Rate limit, waiting ${(wait/1000).toFixed(1)}s...`)
      await sleep(wait)
      return getEmbeddings(texts, retries + 1)
    }
    throw err
  }
}

// Test Supabase connection
async function testSupabase() {
  console.log("\n🔌 Testing Supabase...")
  
  try {
    const { data: readTest, error: readError } = await supabase
      .from('documents')
      .select('id')
      .limit(1)
    
    if (readError) {
      console.error("❌ Cannot read from documents table:", readError.message)
      return false
    }
    console.log("✅ Read access confirmed")
    
    const testDoc = {
      content: "TEST_DOCUMENT_DELETE_ME",
      embedding: new Array(COHERE_EMBED_DIMS).fill(0), // Cohere embedding dimensions from env
      metadata: { test: true }
    }
    
    const { data: insertTest, error: insertError } = await supabase
      .from('documents')
      .insert(testDoc)
      .select()
    
    if (insertError) {
      console.error("❌ Cannot insert into documents table:", insertError.message)
      return false
    }
    
    console.log("✅ Insert access confirmed")
    
    if (insertTest && insertTest[0]) {
      await supabase.from('documents').delete().eq('id', insertTest[0].id)
      console.log("✅ Delete access confirmed")
    }
    
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

// Test Cohere
async function testCohere() {
  console.log("\n🤖 Testing Cohere...")
  try {
    const response = await cohere.embed({
      texts: ["test connection"],
      model: COHERE_EMBED_MODEL,
      inputType: 'search_document',
      embeddingTypes: ['float'],
      truncate: 'END',
    })
    
    const embedding = response.embeddings.float[0]
    console.log(`✅ Cohere connected (${embedding.length} dimensions)`)
    return true
  } catch (err) {
    console.error("❌ Cohere test failed:", err.message)
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

// Process one PDF with batch embedding
// UPDATED with coverage verification per Claude's recommendations
async function processPDF(file, fullPath, fileIndex, totalFiles) {
  console.log(`\n[${fileIndex + 1}/${totalFiles}] 📄 ${file}`)
  
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
    
    // NEW: Estimate coverage per Claude's recommendations
    const avgCharsPerPage = text.length / parsed.numpages
    const expectedCharsPerPage = 2000 // Typical for text-heavy PDF
    const coverage = Math.min(100, (avgCharsPerPage / expectedCharsPerPage) * 100)
    
    console.log(`   📈 Estimated text extraction: ${coverage.toFixed(0)}%`)
    
    if (coverage < 50) {
      console.log(`   ⚠️  WARNING: Low text extraction - might be image-based PDF or have complex formatting`)
      lowCoveragePDFs.push({
        file,
        pages: parsed.numpages,
        chars: text.length,
        coverage: coverage.toFixed(0)
      })
    } else if (coverage < 70) {
      console.log(`   ⚠️  NOTICE: Below average text extraction - some content may be missed`)
      lowCoveragePDFs.push({
        file,
        pages: parsed.numpages,
        chars: text.length,
        coverage: coverage.toFixed(0)
      })
    }
    
    if (text.length < 100) {
      console.log(`   ⚠️ Too little text, skipping`)
      return { success: 0, failed: 0 }
    }
    
    const chunks = chunkText(text, 1000, 150)
    console.log(`   📦 ${chunks.length} chunks created`)
    
    let success = 0
    let failed = 0
    
    // Process in batches of 96 (Cohere's max batch size)
    const BATCH_SIZE = 96
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length))
      const batchStart = i
      
      try {
        // Get embeddings for entire batch
        const embeddings = await getEmbeddings(batch)
        
        // Insert all chunks with their embeddings
        const records = batch.map((chunk, idx) => ({
          content: chunk,
          embedding: embeddings[idx],
          metadata: {
            source: file,
            chunk_index: batchStart + idx,
            total_chunks: chunks.length,
            county: "washtenaw",
            page_estimate: Math.floor(((batchStart + idx) / chunks.length) * parsed.numpages) + 1,
            extraction_coverage: coverage.toFixed(0) // NEW: Track coverage in metadata
          }
        }))
        
        const { error } = await supabase.from('documents').insert(records)
        
        if (error) {
          console.error(`\n   ❌ Batch insert failed:`, error.message)
          failed += batch.length
        } else {
          process.stdout.write('█'.repeat(batch.length))
          success += batch.length
        }
        
        // Rate limiting between batches
        await sleep(100)
        
      } catch (err) {
        console.error(`\n   ❌ Batch error:`, err.message)
        process.stdout.write('✗'.repeat(batch.length))
        failed += batch.length
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
  const supabaseOk = await testSupabase()
  const cohereOk = await testCohere()
  
  if (!supabaseOk || !cohereOk) {
    console.error("\n❌ Connection tests failed. Cannot proceed.")
    process.exit(1)
  }
  
  const result = findPDFs()
  if (!result) {
    console.error("\n❌ No PDFs found!")
    console.error("\nPlace PDFs in: public/documents/washtenaw/")
    process.exit(1)
  }
  
  const { dir, files } = result
  console.log(`\n📚 Will process ${files.length} files from ${dir}`)
  console.log("=" .repeat(70))
  
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
  
  // NEW: Report low coverage PDFs per Claude's recommendations
  if (lowCoveragePDFs.length > 0) {
    console.log("\n" + "=" .repeat(70))
    console.log("⚠️  LOW COVERAGE PDFs - May Need OCR or Re-sourcing")
    console.log("=" .repeat(70))
    lowCoveragePDFs.forEach(pdf => {
      console.log(`   ${pdf.file}`)
      console.log(`      Pages: ${pdf.pages}, Chars: ${pdf.chars.toLocaleString()}, Coverage: ${pdf.coverage}%`)
    })
    console.log("\nThese PDFs may be image-based or have complex formatting.")
    console.log("Consider using OCR tools or obtaining text-based versions.")
  }
  
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
