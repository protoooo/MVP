// app/api/admin/ingest/route.js - COHERE v4 INGEST (CORRECTED)

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
const BATCH_SIZE = 96 // Cohere max batch size

// ✅ Cohere Embed v4 (support legacy env value)
const rawModel = process.env.COHERE_EMBED_MODEL || "embed-v4.0"
const COHERE_EMBED_MODEL = rawModel === "embed-english-v4.0" ? "embed-v4.0" : rawModel

// ✅ Correct dimension for v4 (defaults to 1536 to match current embeddings)
const COHERE_EMBED_DIMS =
  Number(process.env.COHERE_EMBED_DIMS) || 1536

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    })

    const docsPath = path.join(
      process.cwd(),
      "public/documents/washtenaw"
    )

    if (!fs.existsSync(docsPath)) {
      return NextResponse.json(
        { ok: false, error: "Documents folder not found" },
        { status: 404 }
      )
    }

    const files = fs
      .readdirSync(docsPath)
      .filter((f) => f.endsWith(".pdf"))

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

      const pdfBuffer = fs.readFileSync(
        path.join(docsPath, file)
      )

      const parsed = await pdfParse(pdfBuffer)
      const fullText = parsed.text || ""

      if (!fullText.trim()) {
        console.log("Skipping empty PDF:", file)
        continue
      }

      // ---------------------------
      // Chunking
      // ---------------------------
      const chunks = []
      const words = fullText.split(/\s+/)
      let cursor = 0

      while (cursor < words.length) {
        const chunk = words
          .slice(cursor, cursor + CHUNK_SIZE)
          .join(" ")
          .trim()

        if (chunk.length > 50) {
          chunks.push(chunk)
        }

        cursor += CHUNK_SIZE - CHUNK_OVERLAP
      }

      // ---------------------------
      // Embed + Insert (batched)
      // ---------------------------
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)

        const embedRes = await cohere.embed({
          model: COHERE_EMBED_MODEL,
          texts: batch,
          inputType: "search_document",
          embeddingTypes: ["float"],
          truncate: "END",
        })

        const embeddings = embedRes.embeddings.float

        // Guard against DB vector dimension mismatch before insert
        const actualDims = embeddings?.[0]?.length || 0
        if (actualDims !== COHERE_EMBED_DIMS) {
          const message = `Embedding dimension mismatch (got ${actualDims}, expected ${COHERE_EMBED_DIMS}). Check COHERE_EMBED_MODEL/COHERE_EMBED_DIMS env vars and the documents.embedding column dimension.`
          console.error(message, {
            model: COHERE_EMBED_MODEL,
          })
          return NextResponse.json(
            { ok: false, error: message },
            { status: 500 }
          )
        }

        const records = batch.map((text, idx) => ({
          content: text,

          // ✅ Write to both legacy and v4 columns to satisfy NOT NULL constraint
          embedding: embeddings[idx],
          embedding_v4: embeddings[idx],

          metadata: {
            source: file,
            chunk_index: i + idx,
            total_chunks: chunks.length,
            county: "washtenaw",
            page_estimate:
              Math.floor(
                ((i + idx) / chunks.length) *
                  parsed.numpages
              ) + 1,
          },
        }))

        const { error } = await supabase
          .from("documents")
          .insert(records)

        if (error) {
          console.error("Supabase insert error:", error)
          return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
          )
        }

        totalChunks += batch.length

        // 🐢 Rate-limit protection for Cohere trial
        await new Promise((resolve) =>
          setTimeout(resolve, 30000)
        )
      }

      console.log(`Finished ${file}`)
    }

    return NextResponse.json({
      ok: true,
      message: "Ingestion complete",
      files: files.length,
      chunks: totalChunks,
      embed_model: COHERE_EMBED_MODEL,
      embed_dims: COHERE_EMBED_DIMS,
    })
  } catch (err) {
    console.error("Ingestion error:", err)
    return NextResponse.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    )
  }
}
