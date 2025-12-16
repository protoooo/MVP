// app/api/admin/ingest/route.js - COHERE VERSION
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import pdfParse from "pdf-parse"
import { CohereClient } from "cohere-ai"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes for ingestion

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 150
const BATCH_SIZE = 96 // Cohere's max batch size

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    })

    const docsPath = path.join(process.cwd(), "public/documents/washtenaw")
    
    if (!fs.existsSync(docsPath)) {
      return NextResponse.json(
        { ok: false, error: "Documents folder not found" },
        { status: 404 }
      )
    }
    
    const files = fs.readdirSync(docsPath).filter((f) => f.endsWith(".pdf"))

    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No PDFs found in documents/washtenaw" },
        { status: 404 }
      )
    }

    console.log("Found PDFs:", files)

    let totalChunks = 0

    for (const file of files) {
      console.log("Processing:", file)

      const pdfBuffer = fs.readFileSync(path.join(docsPath, file))
      const parsed = await pdfParse(pdfBuffer)
      const fullText = parsed.text || ""

      if (!fullText.trim()) {
        console.log("Skipping empty PDF:", file)
        continue
      }

      // Create chunks with overlap
      const chunks = []
      const words = fullText.split(/\s+/)
      let i = 0
      
      while (i < words.length) {
        const chunk = words.slice(i, i + CHUNK_SIZE).join(" ").trim()
        if (chunk.length > 50) {
          chunks.push(chunk)
        }
        i += (CHUNK_SIZE - CHUNK_OVERLAP)
      }

      // Process in batches of 96 (Cohere limit)
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        
        // Get embeddings for entire batch
        const embedRes = await cohere.embed({
          texts: batch,
          model: "embed-english-v3.0",
          inputType: "search_document",
          embeddingTypes: ["float"],
        })

        const embeddings = embedRes.embeddings.float

        // Prepare records for insertion
        const records = batch.map((text, idx) => ({
          content: text,
          embedding: embeddings[idx],
          metadata: {
            source: file,
            chunk_index: i + idx,
            total_chunks: chunks.length,
            county: "washtenaw",
            page_estimate: Math.floor(((i + idx) / chunks.length) * parsed.numpages) + 1,
          },
        }))

        // Insert batch
        const { error } = await supabase.from("documents").insert(records)

        if (error) {
          console.error("Supabase insert error:", error)
          return NextResponse.json(
            {
              ok: false,
              error: error.message,
            },
            { status: 500 }
          )
        }

        totalChunks += batch.length
        
        // Longer delay to avoid Cohere rate limits (trial tier)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      console.log(`Finished ${file}`)
    }

    return NextResponse.json({
      ok: true,
      message: "Ingestion complete",
      files: files.length,
      chunks: totalChunks,
    })
  } catch (err) {
    console.error("Ingestion error:", err)
    return NextResponse.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    )
  }
}
