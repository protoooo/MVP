import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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

async function getEmbedding(openai, text, retries = 0) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000)
    })
    return response.data[0].embedding
  } catch (error) {
    if (error.status === 429 && retries < 3) {
      const wait = Math.pow(2, retries) * 1000
      await sleep(wait)
      return getEmbedding(openai, text, retries + 1)
    }
    throw error
  }
}

function sendLog(encoder, log) {
  return encoder.encode(`data: ${JSON.stringify({ log })}\n\n`)
}

function sendStatus(encoder, status) {
  return encoder.encode(`data: ${JSON.stringify({ status })}\n\n`)
}

export async function POST(request) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Initialize clients
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        
        controller.enqueue(sendLog(encoder, '🔌 Testing connections...'))
        
        // Test Supabase
        const { error: testError } = await supabase
          .from('documents')
          .select('id')
          .limit(1)
        
        if (testError) {
          controller.enqueue(sendLog(encoder, `❌ Supabase error: ${testError.message}`))
          controller.close()
          return
        }
        
        controller.enqueue(sendLog(encoder, '✅ Supabase connected'))
        
        // Find PDFs
        const pdfDir = path.join(process.cwd(), 'public/documents/washtenaw')
        
        if (!fs.existsSync(pdfDir)) {
          controller.enqueue(sendLog(encoder, `❌ Directory not found: ${pdfDir}`))
          controller.close()
          return
        }
        
        const files = fs.readdirSync(pdfDir)
          .filter(f => f.toLowerCase().endsWith('.pdf'))
        
        if (files.length === 0) {
          controller.enqueue(sendLog(encoder, '❌ No PDF files found'))
          controller.close()
          return
        }
        
        controller.enqueue(sendLog(encoder, `📚 Found ${files.length} PDFs`))
        
        let totalSuccess = 0
        let totalFailed = 0
        
        // Process each PDF
        for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
          const fileName = files[fileIdx]
          const filePath = path.join(pdfDir, fileName)
          
          controller.enqueue(sendLog(encoder, `\n📄 [${fileIdx + 1}/${files.length}] ${fileName}`))
          controller.enqueue(sendStatus(encoder, `Processing ${fileName}...`))
          
          try {
            const buffer = fs.readFileSync(filePath)
            const data = await pdf(buffer)
            
            let text = data.text
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .replace(/[^\x20-\x7E\n]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            
            controller.enqueue(sendLog(encoder, `   📊 ${data.numpages} pages, ${text.length.toLocaleString()} chars`))
            
            if (text.length < 100) {
              controller.enqueue(sendLog(encoder, '   ⚠️ Too little text, skipping'))
              continue
            }
            
            const chunks = chunkText(text, 1000, 150)
            controller.enqueue(sendLog(encoder, `   📦 Creating ${chunks.length} chunks...`))
            
            for (let i = 0; i < chunks.length; i++) {
              try {
                const embedding = await getEmbedding(openai, chunks[i])
                
                const { error } = await supabase.from('documents').insert({
                  content: chunks[i],
                  embedding: embedding,
                  metadata: {
                    source: fileName,
                    chunk_index: i,
                    total_chunks: chunks.length,
                    county: 'washtenaw',
                    page_estimate: Math.floor((i / chunks.length) * data.numpages) + 1
                  }
                })
                
                if (error) {
                  controller.enqueue(sendLog(encoder, `   ❌ Chunk ${i} failed: ${error.message}`))
                  totalFailed++
                } else {
                  totalSuccess++
                }
                
                await sleep(50)
                
              } catch (error) {
                controller.enqueue(sendLog(encoder, `   ❌ Chunk ${i} error: ${error.message}`))
                totalFailed++
              }
            }
            
            controller.enqueue(sendLog(encoder, `   ✅ Completed ${fileName}`))
            
          } catch (error) {
            controller.enqueue(sendLog(encoder, `   ❌ Failed: ${error.message}`))
          }
        }
        
        controller.enqueue(sendLog(encoder, `\n🎉 Ingestion Complete!`))
        controller.enqueue(sendLog(encoder, `   Files: ${files.length}`))
        controller.enqueue(sendLog(encoder, `   Success: ${totalSuccess}`))
        controller.enqueue(sendLog(encoder, `   Failed: ${totalFailed}`))
        controller.enqueue(sendStatus(encoder, 'Complete'))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ complete: true })}\n\n`))
        
      } catch (error) {
        controller.enqueue(sendLog(encoder, `💥 Fatal error: ${error.message}`))
      } finally {
        controller.close()
      }
    }
  })
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
