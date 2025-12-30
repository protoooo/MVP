// app/api/admin/ingest/route.js - Streaming document ingestion API

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'
import { CohereClient } from 'cohere-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for ingestion

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to send SSE messages
function createSSE(data) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(createSSE(data)))
      }

      const log = (message, level = 'info') => {
        send({ type: 'log', message, level })
      }

      try {
        // Parse request
        const { collection, wipe, dryRun } = await request.json()

        log(`Starting ingestion for collection: ${collection}`, 'info')
        if (wipe) log('⚠️ Wipe enabled', 'warning')
        if (dryRun) log('ℹ️ Dry run mode', 'info')

        // Initialize clients
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const cohere = new CohereClient({
          token: process.env.COHERE_API_KEY
        })

        const COHERE_MODEL = process.env.COHERE_EMBED_MODEL || 'embed-v4.0'
        const COHERE_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1024

        // Stats tracking
        const stats = {
          processedFiles: 0,
          successfulChunks: 0,
          failedChunks: 0,
          startTime: Date.now()
        }

        // Discover documents
        const documentsRoot = path.join(process.cwd(), 'public', 'documents')
        const collections = []

        const checkCollection = (name, dir) => {
          if (!fs.existsSync(dir)) return null
          const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'))
          return files.length > 0 ? { name, dir, files } : null
        }

        if (collection === 'michigan' || collection === 'all') {
          const michigan = checkCollection('michigan', path.join(documentsRoot, 'michigan'))
          if (michigan) collections.push(michigan)
        }

        if (collection === 'washtenaw' || collection === 'all') {
          const washtenaw = checkCollection('washtenaw', path.join(documentsRoot, 'washtenaw'))
          if (washtenaw) collections.push(washtenaw)
        }

        if (collections.length === 0) {
          const root = checkCollection('michigan', documentsRoot)
          if (root) collections.push(root)
        }

        if (collections.length === 0) {
          log('❌ No PDF files found', 'error')
          send({ type: 'error', message: 'No PDF files found' })
          controller.close()
          return
        }

        log(`Found ${collections.length} collection(s)`, 'info')
        collections.forEach(c => {
          log(`  - ${c.name}: ${c.files.length} files`, 'info')
        })

        // Wipe collections if requested
        if (wipe && !dryRun) {
          const collectionsToWipe = collection === 'all' 
            ? collections.map(c => c.name)
            : [collection]

          for (const name of collectionsToWipe) {
            log(`Wiping collection: ${name}`, 'warning')
            const { error } = await supabase
              .from('documents')
              .delete()
              .eq('metadata->>collection', name)

            if (error) {
              log(`❌ Wipe failed: ${error.message}`, 'error')
            } else {
              log(`✅ Wiped collection: ${name}`, 'success')
            }
          }
        }

        // Process each collection
        for (const coll of collections) {
          log(`\n📚 Processing collection: ${coll.name}`, 'info')

          for (let i = 0; i < coll.files.length; i++) {
            const file = coll.files[i]
            const fullPath = path.join(coll.dir, file)

            log(`\n[${i + 1}/${coll.files.length}] Processing: ${file}`, 'info')

            try {
              // Read PDF
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

              const coverage = Math.min(100, (text.length / (parsed.numpages * 2000)) * 100)
              log(`  Pages: ${parsed.numpages}, Chars: ${text.length}, Coverage: ${coverage.toFixed(0)}%`, 'info')

              if (text.length < 100) {
                log(`  ⚠️ Insufficient text, skipping`, 'warning')
                continue
              }

              // Create chunks
              const chunks = chunkText(text)
              log(`  Created ${chunks.length} chunks`, 'info')

              if (dryRun) {
                log(`  (dry-run) Skipping upload`, 'info')
                stats.processedFiles++
                stats.successfulChunks += chunks.length
                send({ type: 'stats', stats })
                continue
              }

              // Process in batches
              const BATCH_SIZE = 96
              for (let j = 0; j < chunks.length; j += BATCH_SIZE) {
                const batch = chunks.slice(j, Math.min(j + BATCH_SIZE, chunks.length))

                try {
                  // Get embeddings
                  const embedResponse = await cohere.embed({
                    texts: batch,
                    model: COHERE_MODEL,
                    inputType: 'search_document',
                    embeddingTypes: ['float'],
                    truncate: 'END',
                  })

                  const embeddings = embedResponse.embeddings.float

                  // Prepare records
                  const records = batch.map((chunk, idx) => ({
                    content: chunk,
                    embedding: embeddings[idx],
                    metadata: {
                      source: file,
                      source_path: `public/documents/${coll.name}/${file}`,
                      chunk_index: j + idx,
                      total_chunks: chunks.length,
                      collection: coll.name,
                      jurisdiction: coll.name === 'michigan' ? 'state' : 'county',
                      extraction_coverage: coverage.toFixed(0),
                      page_estimate: Math.floor(((j + idx) / chunks.length) * parsed.numpages) + 1,
                      ingested_at: new Date().toISOString(),
                    }
                  }))

                  // Insert batch
                  const { error } = await supabase.from('documents').insert(records)

                  if (error) {
                    log(`  ❌ Batch insert failed: ${error.message}`, 'error')
                    stats.failedChunks += batch.length
                  } else {
                    stats.successfulChunks += batch.length
                  }

                  // Update progress
                  send({ type: 'stats', stats })

                  // Rate limiting delay
                  await sleep(125)
                } catch (err) {
                  log(`  ❌ Batch error: ${err.message}`, 'error')
                  stats.failedChunks += batch.length
                }
              }

              stats.processedFiles++
              log(`  ✅ Completed: ${file}`, 'success')
              send({ type: 'stats', stats })

            } catch (err) {
              log(`  ❌ Failed to process: ${err.message}`, 'error')
            }

            // Delay between files
            if (i < coll.files.length - 1) {
              await sleep(500)
            }
          }
        }

        // Final stats
        stats.duration = ((Date.now() - stats.startTime) / 1000).toFixed(2)
        
        log('\n✅ Ingestion complete!', 'success')
        log(`Files: ${stats.processedFiles}`, 'info')
        log(`Chunks: ${stats.successfulChunks}`, 'info')
        log(`Failed: ${stats.failedChunks}`, 'info')
        log(`Duration: ${stats.duration}s`, 'info')

        send({ 
          type: 'complete',
          stats
        })

        controller.close()

      } catch (error) {
        log(`❌ Fatal error: ${error.message}`, 'error')
        send({ type: 'error', message: error.message })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

// Helper function to chunk text
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
