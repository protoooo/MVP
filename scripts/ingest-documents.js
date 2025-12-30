// scripts/ingest-documents-ocr.js - Enhanced with OCR support
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { CohereClient } from 'cohere-ai'
import { extractPDFText } from '../lib/pdfProcessorOCR.js'

dotenv.config({ path: '.env.local' })

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const COHERE_KEY = process.env.COHERE_API_KEY
const COHERE_EMBED_MODEL = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1024

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const cohere = new CohereClient({ token: COHERE_KEY })

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// CLI arguments
const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(name)
  if (idx === -1) return null
  return args[idx + 1] || true
}

const collectionArg = (getArg('--collection') || 'michigan').toString().toLowerCase()
const shouldWipe = args.includes('--wipe')
const dryRun = args.includes('--dry-run')
const forceOCR = args.includes('--force-ocr')
const ocrOnly = args.includes('--ocr-only')  // Only process files that need OCR

console.log('='.repeat(70))
console.log('📚 MI Health Inspection - Document Ingestion with OCR')
console.log('='.repeat(70))
console.log('\n🔍 Configuration:')
console.log('Collection:', collectionArg)
console.log('Wipe existing:', shouldWipe ? 'YES' : 'NO')
console.log('Dry run:', dryRun ? 'YES' : 'NO')
console.log('Force OCR:', forceOCR ? 'YES' : 'NO')
console.log('OCR only mode:', ocrOnly ? 'YES' : 'NO')
console.log('Cohere model:', COHERE_EMBED_MODEL)
console.log('Embedding dims:', COHERE_EMBED_DIMS)

// Statistics
const stats = {
  processedFiles: 0,
  successfulChunks: 0,
  failedChunks: 0,
  nativeExtractions: 0,
  ocrExtractions: 0,
  lowCoverageFiles: [],
  startTime: Date.now()
}

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
      throw new Error(`Dimension mismatch: got ${dims}, expected ${COHERE_EMBED_DIMS}`)
    }

    return embeddings
  } catch (err) {
    if (err?.status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000
      console.log(`⏳ Rate limit, waiting ${(wait / 1000).toFixed(1)}s...`)
      await sleep(wait)
      return getEmbeddings(texts, retries + 1)
    }
    throw err
  }
}

async function wipeCollection(collectionName) {
  console.log(`\n🧹 Wiping collection: ${collectionName}`)
  if (dryRun) {
    console.log('(dry-run) skipping delete')
    return
  }

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

function buildMetadata({ file, collection, chunkIndex, totalChunks, pageEstimate, coverage, extractionMethod }) {
  const base = {
    source: file,
    source_path: `public/documents/${collection}/${file}`,
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    extraction_coverage: String(coverage),
    extraction_method: extractionMethod,
    collection,
    jurisdiction: collection === 'michigan' ? 'state' : 'county',
    ingested_at: new Date().toISOString()
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
  console.log(`\n[${ fileIndex + 1}/${totalFiles}] 📄 ${file} (${collection})`)

  try {
    // Check if we should process this file in OCR-only mode
    if (ocrOnly) {
      // Check if file already has good coverage in DB
      const { data: existing } = await supabase
        .from('documents')
        .select('metadata')
        .eq('metadata->>source', file)
        .eq('metadata->>collection', collection)
        .limit(1)
        .single()

      if (existing && parseFloat(existing.metadata.extraction_coverage) >= 70) {
        console.log('   ⏭️  Skipping - already has good coverage')
        return { success: 0, failed: 0 }
      }
    }

    // Extract text with OCR support
    const extraction = await extractPDFText(fullPath, forceOCR)

    if (!extraction.success) {
      console.log('   ❌ Extraction failed')
      return { success: 0, failed: 0 }
    }

    console.log(`   📊 Pages: ${extraction.pageCount}, Chars: ${extraction.text.length.toLocaleString()}`)
    console.log(`   📈 Coverage: ${extraction.coverage.toFixed(0)}% (${extraction.method})`)

    // Track statistics
    if (extraction.method === 'native') {
      stats.nativeExtractions++
    } else {
      stats.ocrExtractions++
    }

    if (extraction.coverage < 70) {
      stats.lowCoverageFiles.push({
        file,
        collection,
        pages: extraction.pageCount,
        chars: extraction.text.length,
        coverage: extraction.coverage.toFixed(0),
        method: extraction.method
      })
    }

    if (extraction.text.length < 100) {
      console.log('   ⚠️  Too little text, skipping')
      return { success: 0, failed: 0 }
    }

    // Create chunks
    const chunks = chunkText(extraction.text, 1000, 150)
    console.log(`   📦 ${chunks.length} chunks created`)

    if (dryRun) {
      console.log('   (dry-run) skipping upload')
      return { success: 0, failed: 0 }
    }

    let success = 0
    let failed = 0
    const BATCH_SIZE = 96

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length))

      try {
        // Get embeddings
        const embeddings = await getEmbeddings(batch)

        // Prepare records
        const records = batch.map((chunk, idx) => ({
          content: chunk,
          embedding: embeddings[idx],
          metadata: buildMetadata({
            file,
            collection,
            chunkIndex: i + idx,
            totalChunks: chunks.length,
            pageEstimate: Math.floor(((i + idx) / chunks.length) * extraction.pageCount) + 1,
            coverage: extraction.coverage.toFixed(0),
            extractionMethod: extraction.method
          })
        }))

        // Insert batch
        const { error } = await supabase.from('documents').insert(records)

        if (error) {
          console.error(`\n   ❌ Batch insert failed: ${error.message}`)
          failed += batch.length
        } else {
          process.stdout.write('█'.repeat(batch.length))
          success += batch.length
        }

        await sleep(125)
      } catch (err) {
        console.error(`\n   ❌ Batch error: ${err.message}`)
        process.stdout.write('✗'.repeat(batch.length))
        failed += batch.length
      }
    }

    console.log(`\n   ✅ Success: ${success}, Failed: ${failed}`)
    stats.processedFiles++
    stats.successfulChunks += success
    stats.failedChunks += failed

    return { success, failed }
  } catch (err) {
    console.error('   ❌ Failed to process:', err.message)
    return { success: 0, failed: 0 }
  }
}

async function run() {
  // Discover documents
  const root = path.join(process.cwd(), 'public', 'documents')
  const collectionDirs = {
    michigan: path.join(root, 'michigan'),
    washtenaw: path.join(root, 'washtenaw')
  }

  const collections = []

  if (collectionArg === 'all' || collectionArg === 'michigan') {
    const dir = collectionDirs.michigan
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'))
      if (files.length > 0) {
        collections.push({ name: 'michigan', dir, files })
      }
    }
  }

  if (collectionArg === 'all' || collectionArg === 'washtenaw') {
    const dir = collectionDirs.washtenaw
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'))
      if (files.length > 0) {
        collections.push({ name: 'washtenaw', dir, files })
      }
    }
  }

  if (collections.length === 0) {
    console.error('\n❌ No PDFs found in public/documents/michigan/ or public/documents/washtenaw/')
    process.exit(1)
  }

  console.log('\n📁 Collections found:')
  collections.forEach(c => {
    console.log(`   ✅ ${c.name}: ${c.files.length} files`)
  })

  // Optional wipe
  if (shouldWipe) {
    for (const c of collections) {
      await wipeCollection(c.name)
    }
  }

  if (!dryRun) {
    console.log('\n⚠️  Starting ingestion in 3 seconds...')
    console.log('Press Ctrl+C to cancel\n')
    await sleep(3000)
  }

  // Process each collection
  for (const collection of collections) {
    console.log('\n' + '='.repeat(70))
    console.log(`📚 Processing: ${collection.name}`)
    console.log('='.repeat(70))

    for (let i = 0; i < collection.files.length; i++) {
      await processPDF({
        file: collection.files[i],
        fullPath: path.join(collection.dir, collection.files[i]),
        fileIndex: i,
        totalFiles: collection.files.length,
        collection: collection.name
      })

      if (i < collection.files.length - 1) {
        await sleep(500)
      }
    }
  }

  // Final statistics
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2)

  console.log('\n' + '='.repeat(70))
  console.log('🎉 Ingestion Complete!')
  console.log('='.repeat(70))
  console.log(`Files processed: ${stats.processedFiles}`)
  console.log(`Chunks inserted: ${stats.successfulChunks}`)
  console.log(`Failed chunks: ${stats.failedChunks}`)
  console.log(`Native extractions: ${stats.nativeExtractions}`)
  console.log(`OCR extractions: ${stats.ocrExtractions}`)
  console.log(`Duration: ${duration}s`)

  if (stats.lowCoverageFiles.length > 0) {
    console.log('\n' + '='.repeat(70))
    console.log('⚠️  Files with <70% Coverage')
    console.log('='.repeat(70))
    stats.lowCoverageFiles.forEach(f => {
      console.log(`\n   ${f.collection}/${f.file}`)
      console.log(`   Pages: ${f.pages}, Chars: ${f.chars.toLocaleString()}`)
      console.log(`   Coverage: ${f.coverage}%, Method: ${f.method}`)
      console.log(`   💡 Suggestion: Run with --force-ocr for this file`)
    })
  }

  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  console.log(`\n📊 Total documents in database: ${count}`)
  console.log('='.repeat(70))
}

run().catch(err => {
  console.error('\n💥 Fatal error:', err)
  process.exit(1)
})
