import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { CohereClient } from "cohere-ai";

export const runtime = "nodejs";

const CHUNK_SIZE = 1000;

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const cohere = new CohereClient({
      token: process.env.COHERE_API_KEY,
    });

    const docsPath = path.join(process.cwd(), "public/documents/washtenaw");
    const files = fs.readdirSync(docsPath).filter((f) => f.endsWith(".pdf"));

    console.log("Found PDFs:", files);

    let totalChunks = 0;

    for (const file of files) {
      console.log("Processing:", file);

      const pdfBuffer = fs.readFileSync(path.join(docsPath, file));
      const parsed = await pdfParse(pdfBuffer);
      const fullText = parsed.text || "";

      if (!fullText.trim()) {
        console.log("Skipping empty PDF:", file);
        continue;
      }

      const chunks = [];
      for (let start = 0; start < fullText.length; start += CHUNK_SIZE) {
        const chunk = fullText.slice(start, start + CHUNK_SIZE).trim();
        if (chunk) chunks.push(chunk);
      }

      // Batch embed with Cohere (max 96 texts at once)
      const BATCH_SIZE = 96;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        
        const embedRes = await cohere.embed({
          texts: batch,
          model: "embed-english-v3.0",
          inputType: "search_document",
          embeddingTypes: ["float"],
        });

        const embeddings = embedRes.embeddings.float;

        const records = batch.map((text, idx) => ({
          content: text,
          embedding: embeddings[idx],
          metadata: {
            source: file,
            chunk_index: i + idx,
            county: "washtenaw",
          },
        }));

        const { error } = await supabase.from("documents").insert(records);

        if (error) {
          console.error("Supabase insert error:", error);
          return NextResponse.json(
            {
              ok: false,
              error: error.message,
            },
            { status: 500 }
          );
        }

        totalChunks += batch.length;
      }

      console.log(`Finished ${file}`);
    }

    return NextResponse.json({
      ok: true,
      message: "Ingestion complete",
      files: files.length,
      chunks: totalChunks,
    });
  } catch (err) {
    console.error("Ingestion error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
