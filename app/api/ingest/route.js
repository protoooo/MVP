import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import { VertexAI } from '@google-cloud/vertexai'
import { createClient } from '@supabase/supabase-js'

// Force this route to run on the server (not static)
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('🚀 Starting One-Click Ingestion...')

    // 1. SETUP CLIENTS (Uses Railway Env Vars automatically)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Critical for writing data
    )

    const vertex_ai = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: 'us-central1'
    })
    
    // Use the embedding model
    const model = vertex_ai.getGenerativeModel({ model: 'text-embedding-004' })

    // 2. FIND DOCUMENTS
    // This looks inside the folder on the Railway server
    const directoryPath = path.join(process.cwd(), 'public', 'documents', 'washtenaw')
    
    if (!fs.existsSync(directoryPath)) {
      return NextResponse.json({ error: 'Docs folder not found on server' }, { status: 404 })
    }

    const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.pdf'))
    let stats = { processed: 0, chunks: 0, errors: [] }

    // 3. PROCESS EACH PDF
    for (const file of files) {
      const filePath = path.join(directoryPath, file)
      const dataBuffer = fs.readFileSync(filePath)
      
      try {
        // Read PDF
        const data = await pdf(dataBuffer)
        const text = data.text.replace(/\n+/g, ' ').trim() // Clean text
        
        // Chunk Text (Split into pieces of ~1000 chars)
        const chunks = text.match(/.{1,1000}/g) || []
        
        console.log(`Processing ${file}: ${chunks.length} chunks`)

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          
          // Get Embedding from Google
          const embeddingResult = await model.embedContent(chunk)
          const embedding = embeddingResult.embedding.values

          // Save to Supabase
          await supabase.from('documents').insert({
            content: chunk,
            metadata: { 
              source: file, 
              county: 'washtenaw',
              page: i + 1 
            },
            embedding: embedding
          })
        }
        
        stats.processed++
        stats.chunks += chunks.length

      } catch (err) {
        console.error(`Failed ${file}:`, err)
        stats.errors.push(file)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database populated successfully', 
      stats 
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
