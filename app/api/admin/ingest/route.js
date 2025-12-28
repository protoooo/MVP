// app/api/admin/ingest/route.js - FOOD SAFETY INGEST (COHERE)
// ProtocolLM - Admin ingestion endpoint (deployment bundle PDFs -> Supabase rows)
// NOTE: Only supports food_safety sector

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import pdfParse from "pdf-parse"
import { CohereClient } from "cohere-ai"
import { SECTORS, SECTOR_DOCUMENT_FOLDERS, LEGACY_COLLECTIONS_TO_SECTOR } from "@/lib/sectors"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 150
const BATCH_SIZE = 96

// Cohere Embed v4 (support legacy env value)
const rawModel = process.env.COHERE_EMBED_MODEL || "embed-v4.0"
const COHERE_EMBED_MODEL = rawModel === "embed-english-v4.0" ? "embed-v4.0" : rawModel

// IMPORTANT: This MUST match your Supabase vector dimension for `documents.embedding`
// If you don’t know, set COHERE_EMBED_DIMS to whatever Cohere actually returns (we validate).
const COHERE_EMBED_DIMS = Number(process.env.COHERE_EMBED_DIMS) || 1024

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function chunkText(fullText) {
  const words = (fullText || "").split(/\s+/)
  const chunks = []
  let cursor = 0

  while (cursor < words.length) {
    const chunk = words.slice(cursor, cursor + CHUNK_SIZE).join(" ").trim()
    if (chunk.length > 50) chunks.push(chunk)
    cursor += (CHUNK_SIZE - CHUNK_OVERLAP)
  }

  return chunks
}

function resolveTargets({ collection, sector }) {
  // Support legacy collection-based approach for backward compatibility
  // sector: "food_safety" only - other sectors have been removed
  
  const base = path.join(process.cwd(), "public", "documents")
  const targets = []

  const addTargetIfExistsAndHasPDFs = (dir, name, sectorId) => {
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))
    if (files.length > 0) {
      targets.push({ 
        dir, 
        files, 
        collection: name, 
        sector: sectorId 
      })
    }
  }

  // ✅ FOOD SAFETY ONLY: Only process food_safety documents
  const sectorId = SECTORS.FOOD_SAFETY
  const folderName = SECTOR_DOCUMENT_FOLDERS[sectorId]
  
  addTargetIfExistsAndHasPDFs(
    path.join(base, folderName), 
    folderName, 
    sectorId
  )
  
  return targets
}

function buildMetadata({ file, collection, chunkIndex, totalChunks, pageEstimate, sector }) {
  const metadata = {
    source: file,
    source_path: `public/documents/${collection}/${file}`,
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    collection, // legacy: "michigan" | "washtenaw" | folder name
    jurisdiction: collection === "michigan" ? "state" : "county",
    sector: sector || SECTORS.FOOD_SAFETY, // Add sector field
  }

  // Legacy county field for backward compatibility
  if (collection === "washtenaw") metadata.county = "washtenaw"
  
  if (Number.isFinite(pageEstimate)) metadata.page_estimate = pageEstimate

  return metadata
}

// Cohere embed with retry/backoff on 429
async function embedWithRetry(cohere, batch, retries = 0) {
  try {
    const embedRes = await cohere.embed({
      model: COHERE_EMBED_MODEL,
      texts: batch,
      inputType: "search_document",
      embeddingTypes: ["float"],
      truncate: "END",
    })
    return embedRes
  } catch (err) {
    // cohere-ai SDK errors may have statusCode or status
    const status = err?.statusCode || err?.status
    if (status === 429 && retries < 5) {
      const wait = Math.pow(2, retries) * 1000 + Math.floor(Math.random() * 500)
      console.log(`⏳ Cohere rate limit. Waiting ${wait}ms then retrying...`)
      await sleep(wait)
      return embedWithRetry(cohere, batch, retries + 1)
    }
    throw err
  }
}

async function wipeCollection(supabase, collection, sector) {
  // Safe scoped delete: only rows tagged with this collection or sector
  if (sector) {
    // Delete by sector (preferred for new multi-sector approach)
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("metadata->>sector", sector)
    
    if (error) throw new Error(`Wipe failed for sector ${sector}: ${error.message}`)
  } else if (collection) {
    // Delete by collection (legacy approach)
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("metadata->>collection", collection)

    if (error) throw new Error(`Wipe failed for collection ${collection}: ${error.message}`)
  }
}

export async function POST(req) {
  try {
    // -----------------------
    // Parse request body (optional)
    // -----------------------
    let body = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    // Support both legacy 'collection' and new 'sector' parameters
    const collection = body.collection ? body.collection.toString().toLowerCase() : null
    const sector = body.sector ? body.sector.toString().toLowerCase() : null
    const wipe = Boolean(body.wipe)

    // Validate inputs
    const allowedCollections = new Set(["washtenaw", "michigan", "all"])
    const allowedSectors = new Set([
      SECTORS.FOOD_SAFETY, 
      SECTORS.FIRE_LIFE_SAFETY, 
      SECTORS.RENTAL_HOUSING, 
      "all"
    ])
    
    if (sector && !allowedSectors.has(sector)) {
      return NextResponse.json(
        { 
          ok: false, 
          error: `Invalid sector "${sector}". Use: ${Array.from(allowedSectors).join(" | ")}` 
        },
        { status: 400 }
      )
    }
    
    if (!sector && collection && !allowedCollections.has(collection)) {
      return NextResponse.json(
        { ok: false, error: `Invalid collection "${collection}". Use washtenaw | michigan | all.` },
        { status: 400 }
      )
    }
    
    // Default to food_safety sector if neither specified
    const effectiveSector = sector
    const effectiveCollection = collection || (sector ? null : "michigan")

    // -----------------------
    // Clients
    // -----------------------
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const cohere = new CohereClient({ token: process.env.COHERE_API_KEY })

    // -----------------------
    // Find PDFs
    // -----------------------
    const targets = resolveTargets({ collection: effectiveCollection, sector: effectiveSector })

    if (!targets || targets.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No PDFs found. Put files in public/documents/{sector_folder} (e.g., food_safety, fire_life_safety, rental_housing).",
        },
        { status: 404 }
      )
    }

    console.log("Ingest targets:", targets.map(t => ({
      collection: t.collection,
      sector: t.sector,
      dir: t.dir,
      pdfs: t.files.length
    })))

    // -----------------------
    // Optional wipe (scoped)
    // -----------------------
    if (wipe) {
      if (effectiveSector) {
        // Wipe by sector (preferred)
        const wipeTargets =
          effectiveSector === "all"
            ? Array.from(new Set(targets.map((t) => t.sector)))
            : [effectiveSector]

        console.log("🧹 Wiping sectors:", wipeTargets)
        for (const s of wipeTargets) {
          await wipeCollection(supabase, null, s)
        }
        console.log("✅ Wipe complete")
      } else {
        // Legacy collection-based wipe
        const wipeTargets =
          effectiveCollection === "all"
            ? Array.from(new Set(targets.map((t) => t.collection)))
            : [effectiveCollection]

        console.log("🧹 Wiping collections:", wipeTargets)
        for (const c of wipeTargets) {
          await wipeCollection(supabase, c, null)
        }
        console.log("✅ Wipe complete")
      }
    }

    // -----------------------
    // Ingest
    // -----------------------
    let totalChunks = 0
    let totalFiles = 0
    const processedFiles = []

    for (const target of targets) {
      const { dir, files, collection: targetCollection, sector: targetSector } = target

      for (const file of files) {
        totalFiles += 1
        console.log(`Processing: ${targetSector || targetCollection}/${file}`)

        const pdfBuffer = fs.readFileSync(path.join(dir, file))
        const parsed = await pdfParse(pdfBuffer)

        const fullText = (parsed.text || "").trim()
        if (!fullText) {
          console.log("Skipping empty PDF:", file)
          continue
        }

        const chunks = chunkText(fullText)
        if (chunks.length === 0) {
          console.log("Skipping (no valid chunks):", file)
          continue
        }

        // Batch embed + insert
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE)

          const embedRes = await embedWithRetry(cohere, batch)
          const embeddings = embedRes?.embeddings?.float || []

          const actualDims = embeddings?.[0]?.length || 0
          if (actualDims !== COHERE_EMBED_DIMS) {
            const msg =
              `Embedding dimension mismatch (got ${actualDims}, expected ${COHERE_EMBED_DIMS}). ` +
              `Fix COHERE_EMBED_DIMS to ${actualDims} OR resize your Supabase vector column to ${actualDims}.`
            console.error(msg, { model: COHERE_EMBED_MODEL })
            return NextResponse.json({ ok: false, error: msg }, { status: 500 })
          }

          const records = batch.map((text, idx) => {
            const embeddingVec = embeddings[idx]
            const pageEstimate =
              Math.floor(((i + idx) / chunks.length) * (parsed.numpages || 1)) + 1

            const row = {
              content: text,
              embedding: embeddingVec,
              metadata: buildMetadata({
                file,
                collection: targetCollection,
                chunkIndex: i + idx,
                totalChunks: chunks.length,
                pageEstimate,
                sector: targetSector, // Add sector to metadata
              }),
            }

            // Only set embedding_v4 if your schema has it; otherwise this can error.
            // If you *do* have embedding_v4 and want to keep it filled, set env ENABLE_EMBEDDING_V4_COLUMN=true
            if (process.env.ENABLE_EMBEDDING_V4_COLUMN === "true") {
              row.embedding_v4 = embeddingVec
            }

            return row
          })

          const { error } = await supabase.from("documents").insert(records)

          if (error) {
            console.error("Supabase insert error:", error)
            return NextResponse.json(
              { ok: false, error: error.message },
              { status: 500 }
            )
          }

          totalChunks += batch.length

          // Light pacing to reduce burstiness (retry/backoff handles real 429s)
          await sleep(150)
        }

        processedFiles.push(`${targetCollection}/${file}`)
        console.log(`Finished ${targetCollection}/${file}`)
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Ingestion complete",
      collection_requested: collection,
      wiped: wipe,
      files: totalFiles,
      chunks: totalChunks,
      processed_files: processedFiles,
      embed_model: COHERE_EMBED_MODEL,
      embed_dims: COHERE_EMBED_DIMS,
      enable_embedding_v4_column: process.env.ENABLE_EMBEDDING_V4_COLUMN === "true",
    })
  } catch (err) {
    console.error("Ingestion error:", err)
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    )
  }
}
