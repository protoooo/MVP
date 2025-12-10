import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

export const runtime = 'nodejs' // REQUIRED for fs access in Next.js

// ---- CHUNKING FUNCTION ----
function chunkText(text, size = 8000) {
  const chunks = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        send({ log: "Initializing ingestion..." })

        // Connect to Supabase
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        // Connect to OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })

        // Find PDFs inside public/documents/washtenaw/
        const docsPath = path.join(process.cwd(), "public", "documents", "washtenaw")
        const files = fs.readdirSync(docsPath).filter(f => f.endsWith(".pdf"))

        send({ log: `Found ${files.length} PDFs.` })

        for (const file of files) {
          send({ log: `Processing ${file}...` })

          const pdfBuffer = fs.readFileSync(path.join(docsPath, file))
          const pdfData = await pdfParse(pdfBuffer)
          const text = pdfData.text

          if (!text || text.length < 10) {
            send({ log: `⚠️ Skipping empty PDF: ${file}` })
            continue
          }

          // ---- CHUNKING ----
          const chunks = chunkText(text)
          send({ log: `Document has ${chunks.length} chunks.` })

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            send({ log: `Generating embedding for chunk ${i + 1}/${chunks.length}...` })

            // Create embedding for this chunk
            const embeddingRes = await openai.embeddings.create({
              model: "text-embedding-3-large",
              input: chunk
            })

            const vector = embeddingRes.data[0].embedding

            // Save chunk row into Supabase
            await supabase.from("documents").insert({
              filename: file,
              chunk_index: i,
              content: chunk,
              embedding: vector
            })

            send({ log: `Chunk ${i + 1}/${chunks.length} stored.` })
          }

          send({ log: `✅ Completed ${file}` })
        }

        send({ log: "🎉 All documents processed successfully." })
        send({ complete: true })
        controller.close()

      } catch (err) {
        send({ log: `❌ ERROR: ${err.message}` })
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  })
}
