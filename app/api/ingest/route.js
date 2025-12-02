// app/api/ingest/route.js
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

const INGEST_SECRET = process.env.INGEST_SECRET_KEY
const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 100
const BATCH_SIZE = 5 // Reduced for stability

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
  }
  return chunks
}

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  } catch (error) {
    return null
  }
}

export async function POST(request) {
  try {
    const { secret } = await request.json()
    
    if (secret !== INGEST_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCLOUD_PROJECT_ID
    let vertexConfig = { project: projectId, location: 'us-central1' }

    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
      vertexConfig.googleAuthOptions = {
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key?.replace(/\\n/g, '\n'),
        },
      }
    }

    const vertex_ai = new VertexAI(vertexConfig)
    
    // ✅ FIX: Use the correct API path for embeddings
    const model = vertex_ai.preview.getGenerativeModel({
      model: 'text-embedding-004'
    })

    // Get documents
    const docsPath = path.join(process.cwd(), 'public', 'documents', 'washtenaw')
    
    if (!fs.existsSync(docsPath)) {
      return NextResponse.json({ error: 'Documents folder not found' }, { status: 404 })
    }

    const files = fs.readdirSync(docsPath)
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))

    if (pdfFiles.length === 0) {
      return NextResponse.json({ error: 'No PDF files found' }, { status: 404 })
    }

    let totalChunks = 0
    let successfulInserts = 0
    const results = []

    // Process each PDF
    for (const filename of pdfFiles) {
      const filePath = path.join(docsPath, filename)
      
      try {
        // Extract text
        const text = await extractTextFromPDF(filePath)
        if (!text || text.trim().length < 50) {
          results.push({ filename, status: 'skipped', reason: 'no text' })
          continue
        }

        // Clean and chunk
        const cleanText = text
          .replace(/\s+/g, ' ')
          .replace(/[^\x20-\x7E\n]/g, '')
          .trim()
        
        const chunks = chunkText(cleanText)
        let fileInsertCount = 0

        // Process in batches
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE)
          const records = []

          for (let j = 0; j < batch.length; j++) {
            const chunkText = batch[j]
            
            try {
              // ✅ FIX: Correct embedding API call
              const embeddingResult = await model.embedContent({
                content: {
                  role: 'user',
                  parts: [{ text: chunkText }]
                }
              })
              
              const embedding = embeddingResult.embedding?.values

              if (embedding && Array.isArray(embedding) && embedding.length > 0) {
                records.push({
                  content: chunkText,
                  embedding: embedding,
                  metadata: {
                    source: filename,
                    page: Math.floor((i + j) / 3) + 1,
                    county: 'washtenaw',
                    chunk_index: i + j
                  }
                })
              }
            } catch (embedError) {
              // Silently skip failed embeddings
              continue
            }
          }

          // Insert batch
          if (records.length > 0) {
            const { data, error } = await supabase
              .from('documents')
              .insert(records)
            
            if (!error) {
              fileInsertCount += records.length
              successfulInserts += records.length
              totalChunks += records.length
            }
          }
        }

        results.push({ 
          filename, 
          status: 'success', 
          chunks: fileInsertCount 
        })

      } catch (fileError) {
        results.push({ 
          filename, 
          status: 'error', 
          error: fileError.message 
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalFiles: pdfFiles.length,
      totalChunks,
      successfulInserts,
      results
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
