import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'

export const runtime = 'nodejs' // IMPORTANT for fs access

export async function POST() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        send({ log: 'Initializing ingestion...' })

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })

        // Folder of PDFs in public/documents/washtenaw/
        const docsPath = path.join(process.cwd(), 'public', 'documents', 'washtenaw')
        const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.pdf'))

        send({ log: `Found ${files.length} PDFs.` })

        for (const file of files) {
          send({ log: `Processing ${file}...` })

          const pdfBuffer = fs.readFileSync(path.join(docsPath, file))
          const pdfData = await pdfParse(pdfBuffer)

          const text = pdfData.text
          if (!text || text.length < 5) {
            send({ log: `⚠️ Skipping empty PDF: ${file}` })
            continue
          }

          send({ log: `Generating embedding for ${file}...` })

          const embedding = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: text
          })

          const vector = embedding.data[0].embedding

          await supabase
            .from('documents')
            .insert({
              filename: file,
              content: text,
              embedding: vector
            })

          send({ log: `✅ ${file} stored in Supabase.` })
        }

        send({ log: '🎉 All documents processed.' })
        send({ status: 'complete', complete: true })
        controller.close()

      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ log: `❌ ERROR: ${err.message}` })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}
