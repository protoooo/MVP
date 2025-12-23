// scripts/ingest-documents.js - COHERE VERSION
// Updated: supports michigan + washtenaw collections, optional wipe, and correct metadata tagging
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'
import { CohereClient } from 'cohere-ai'

dotenv.config({ path: '.env.local' })

// ----------------------------
// ENV
// ----------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const COHERE_KEY = process.env.COHERE_API_KEY

const rawModel = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
// normalize old naming people sometimes use
const COHERE_EMBED_MODEL = rawModel === 'embed-english-v4.0' ? 'embed-v4.0' : rawModel

// IMPORTANT: set this to match your Supabase `documents.embedding` vector dimension
// Cohere embed-v4.0 commonly returns 1024 dims, but your env controls expected dims.
// Keep this aligned with your DB column vector dimension.
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1024

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})
const cohere = new CohereClient({ token: COHERE_KEY })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

console.log('='.repeat(70))
console.log('📚 protocolLM Document Ingestion (Cohere)')
console.log('='.repeat(70))

// ----------------------------
// CLI ARGS
// ----------------------------
// Examples:
// node scripts/ingest-documents.js --collection michigan --wipe
// node scripts/ingest-documents.js --collection washtenaw
// node scripts/ingest-documents.js --collection all --wipe
// node scripts/ingest-documents.js --dry-run
const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(name)
  if (idx === -1) return null
  return args[idx + 1] || true
}

const collectionArg = (getArg('--collection') || 'all').toString().toLowerCase()
const shouldWipe = args.includes('--wipe')
const dryRun = args.includes('--dry-run')

// Allowed collections
const allowedCollections = new Set(['michigan', 'washtenaw', 'all'])
if (!allowedCollections.has(collectionArg)) {
  console.error(`\n❌ Invalid --collection "${collectionArg}". Use michigan | washtenaw | all`)
  process.exit(1)
}

// ----------------------------
// ENV CHECK
// ----------------------------
console.log('\n🔍 Environment Check:')
console.log('SUPABASE_URL:', SUPABASE_URL ? `✅ ${SUPABASE_URL.substring(0, 40)}...` : '❌ MISSING')
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? `✅ ${SUPABASE_KEY.substring(0, 20)}...` : '❌ MISSING')
console.log('COHERE_API_KEY:', COHERE_KEY ? `✅ ${COHERE_KEY.substring(0, 20)}...` : '❌ MISSING')
console.log('COHERE_EMBED_MODEL:', `✅ ${COHERE_EMBED_MODEL}`)
console.log('COHERE_EMBED_DIMS:', `✅ ${COHERE_EMBED_DIMS}`)
console.log('MODE:', dryRun ? '✅ DRY RUN (no DB writes)' : '✅ LIVE')
console.log('COLLECTION:', `✅ ${collectionArg}`)
console.log('WIPE:', shouldWipe ? '✅ YES (collection-scoped)' : '❌ NO')

if (!SUPABASE_URL || !SUPABASE_KEY || !COHERE_KEY) {
  console.error('\n❌ Missing required environment variables!')
  console.error('Make sure .env.local contains:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY (not anon key!)')
  console.error('  COHERE_API_KEY')
  process.exit(1)
}

// ----------------------------
// HELPERS
// ----------------------------
const lowCoveragePDFs = []

function chunkText(text, size = 1000, overlap = 150) {
  const words = text.split(/\s+/)
  const chunks = []
  let i = 0
  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(' ').trim()
    if (chunk.length > 50) chunks.push(chunk)
    i += (size - overlap)
  }
  return chunks
}

async function getEmbeddings(texts, retries = 0) {
  try {
    const response = await cohere.embed({
      texts,
      model: COHERE_EMBED_MODEL,
      inputType: 'search_document',
      embeddingTypes: ['float'],
      truncate: 'END',
    })

    const embeddings = response.embeddings.float
    const dims = embeddings?.[0]?.length || 0
    if (dims !== COHERE_EMBED_DIMS) {
      throw new Error(
        `Embedding dimension mismatch (got ${dims}, expected ${COHERE_EMBED_DIMS}). ` +
        `Fix COHERE_EMBED_DIMS to ${dims} OR resize your Supabase vector column to ${dims}.`
      )
    }

    return embeddings
  } catch (err) {
    if (err?.status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000
      console.log(`\n⏳ Rate limit, waiting ${(wait / 1000).toFixed(1)}s...`)
      await sleep(wait)
      return getEmbeddings(texts, retries + 1)
    }
    throw err
  }
}

async function testSupabase() {
  console.log('\n🔌 Testing Supabase...')
  try {
    const { error: readError } = await supabase
      .from('documents')
      .select('id')
      .limit(1)

    if (readError) {
      console.error('❌ Cannot read from documents table:', readError.message)
      return false
    }
    console.log('✅ Read access confirmed')
    return true
  } catch (err) {
    console.error('❌ Supabase test failed:', err.message)
    return false
  }
}

async function testCohere() {
  console.log('\n🤖 Testing Cohere...')
  try {
    const response = await cohere.embed({
      texts: ['test connection'],
      model: COHERE_EMBED_MODEL,
      inputType: 'search_document',
      embeddingTypes: ['float'],
      truncate: 'END',
    })
    const embedding = response.embeddings.float[0]
    console.log(`✅ Cohere connected (${embedding.length} dimensions)`)
    return true
  } catch (err) {
    console.error('❌ Cohere test failed:', err.message)
    if (err?.status === 401) console.error('   Invalid API key')
    if (err?.status === 429) console.error('   Rate limit or quota exceeded')
    return false
  }
}

// Resolve doc directories by collection
function resolveDocDirs() {
  const root = path.join(process.cwd(), 'public', 'documents')
  const michiganDir = path.join(root, 'michigan')
  const washtenawDir = path.join(root, 'washtenaw')

  // If you *only* have root PDFs and no subfolders, we treat root as michigan by default.
  // This avoids your "Documents folder not found" style issues.
  const dirs = []

  const addIfHasPDFs = (dir, collectionName) => {
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'))
    if (files.length > 0) dirs.push({ dir, files, collection: collectionName })
  }

  if (collectionArg === 'michigan' || collectionArg === 'all') addIfHasPDFs(michiganDir, 'michigan')
  if (collectionArg === 'washtenaw' || collectionArg === 'all') addIfHasPDFs(washtenawDir, 'washtenaw')

  // fallback: root PDFs
  if (dirs.length === 0) {
    addIfHasPDFs(root, 'michigan')
  }

  return dirs
}

// Wipe rows for a specific collection (safe scoped delete)
async function wipeCollection(collectionName) {
  console.log(`\n🧹 Wiping existing rows for collection: ${collectionName}`)
  if (dryRun) {
    console.log('   (dry-run) skipping delete')
    return
  }

  // Your table uses a `metadata` json/jsonb field. We delete using json path.
  // This is safe and won’t delete other collections.
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('metadata->>collection', collectionName)

  if (error) {
    console.error('❌ Wipe failed:', error.message)
    throw error
  }
  console.log('✅ Wipe complete')
}

function buildMetadata({ file, collection, chunkIndex, totalChunks, pageEstimate, coverage }) {
  const base = {
    source: file,
    source_path: `public/documents/${collection}/${file}`,
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    extraction_coverage: String(coverage),
    collection,                 // "michigan" | "washtenaw"
    jurisdiction: collection === 'michigan' ? 'state' : 'county',
  }

  if (collection === 'washtenaw') {
    base.county = 'washtenaw'
  }

  if (Number.isFinite(pageEstimate)) {
    base.page_estimate = pageEstimate
  }

  return base
}

async function processPDF({ file, fullPath, fileIndex, totalFiles, collection }) {
  console.log(`\n[${fileIndex + 1}/${totalFiles}] 📄 ${file}  (${collection})`)

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

    const avgCharsPerPage = text.length / Math.max(1, parsed.numpages)
    const expectedCharsPerPage = 2000
    const coverage = Math.min(100, (avgCharsPerPage / expectedCharsPerPage) * 100)
    console.log(`   📈 Estimated text extraction: ${coverage.toFixed(0)}%`)

    if (coverage < 70) {
      lowCoveragePDFs.push({
        file,
        collection,
        pages: parsed.numpages,
        chars: text.length,
        coverage: coverage.toFixed(0)
      })
    }

    if (text.length < 100) {
      console.log('   ⚠️ Too little text, skipping')
      return { success: 0, failed: 0 }
    }

    const chunks = chunkText(text, 1000, 150)
    console.log(`   📦 ${chunks.length} chunks created`)

    if (dryRun) {
      console.log('   (dry-run) skipping embeddings + inserts')
      return { success: 0, failed: 0 }
    }

    let success = 0
    let failed = 0
    const BATCH_SIZE = 96

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length))
      const batchStart = i

      try {
        const embeddings = await getEmbeddings(batch)

        const records = batch.map((chunk, idx) => ({
          content: chunk,
          embedding: embeddings[idx],
          metadata: buildMetadata({
            file,
            collection,
            chunkIndex: batchStart + idx,
            totalChunks: chunks.length,
            pageEstimate: Math.floor(((batchStart + idx) / chunks.length) * parsed.numpages) + 1,
            coverage: coverage.toFixed(0),
          }),
        }))

        const { error } = await supabase.from('documents').insert(records)

        if (error) {
          console.error(`\n   ❌ Batch insert failed:`, error.message)
          failed += batch.length
        } else {
          process.stdout.write('█'.repeat(batch.length))
          success += batch.length
        }

        await sleep(125)
      } catch (err) {
        console.error(`\n   ❌ Batch error:`, err.message)
        process.stdout.write('✗'.repeat(batch.length))
        failed += batch.length
      }
    }

    console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
    return { success, failed }
  } catch (err) {
    console.error('   ❌ Failed to process:', err.message)
    return { success: 0, failed: 0 }
  }
}

// ----------------------------
// MAIN
// ----------------------------
async function run() {
  const supabaseOk = await testSupabase()
  const cohereOk = await testCohere()

  if (!supabaseOk || !cohereOk) {
    console.error('\n❌ Connection tests failed. Cannot proceed.')
    process.exit(1)
  }

  const targets = resolveDocDirs()

  if (!targets || targets.length === 0) {
    console.error('\n❌ No PDFs found!')
    console.error('Put PDFs in one of:')
    console.error('  public/documents/michigan/')
    console.error('  public/documents/washtenaw/')
    console.error('  public/documents/   (fallback treated as michigan)')
    process.exit(1)
  }

  console.log('\n📁 Targets:')
  for (const t of targets) {
    console.log(`   ✅ ${t.collection}: ${t.files.length} PDFs in ${t.dir}`)
  }

  // optional wipe
  if (shouldWipe) {
    const toWipe = collectionArg === 'all'
      ? Array.from(new Set(targets.map(t => t.collection)))
      : [collectionArg]

    for (const c of toWipe) {
      await wipeCollection(c)
    }
  }

  if (!dryRun) {
    console.log('\n⚠️  Ready to upload to Supabase')
    console.log('Press Ctrl+C to cancel, or wait 3 seconds...\n')
    await sleep(3000)
  }

  const startTime = Date.now()
  let totalSuccess = 0
  let totalFailed = 0
  let totalFiles = 0

  for (const target of targets) {
    const { dir, files, collection } = target
    totalFiles += files.length

    console.log('\n' + '='.repeat(70))
    console.log(`📚 Processing collection: ${collection}`)
    console.log('='.repeat(70))

    for (let i = 0; i < files.length; i++) {
      const { success, failed } = await processPDF({
        file: files[i],
        fullPath: path.join(dir, files[i]),
        fileIndex: i,
        totalFiles: files.length,
        collection,
      })

      totalSuccess += success
      totalFailed += failed

      if (i < files.length - 1) await sleep(750)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log('\n' + '='.repeat(70))
  console.log('🎉 Ingestion Complete!')
  console.log('='.repeat(70))
  console.log(`Collections: ${collectionArg}`)
  console.log(`Files scanned: ${totalFiles}`)
  console.log(`Chunks inserted: ${totalSuccess}`)
  console.log(`Failed chunks: ${totalFailed}`)
  console.log(`Duration: ${duration}s`)

  if (lowCoveragePDFs.length > 0) {
    console.log('\n' + '='.repeat(70))
    console.log('⚠️  LOW COVERAGE PDFs - May Need OCR / better source')
    console.log('='.repeat(70))
    lowCoveragePDFs.forEach(p => {
      console.log(`   ${p.collection}/${p.file}`)
      console.log(`      Pages: ${p.pages}, Chars: ${p.chars.toLocaleString()}, Coverage: ${p.coverage}%`)
    })
  }

  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Total rows in documents table: ${count}`)
  console.log('='.repeat(70))
}

run().catch(err => {
  console.error('\n💥 Fatal error:', err)
  process.exit(1)
})
