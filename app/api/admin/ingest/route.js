import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

export const runtime = "nodejs"; // make sure we are on Node, not edge

const CHUNK_SIZE = 6000; // characters per chunk, keeps us way under the 300k-token limit

export async function POST() {
  try {
    // --- Supabase client (server-side, use service role) ---
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // --- OpenAI client ---
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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

      let chunkIndex = 0;

      for (let start = 0; start < fullText.length; start += CHUNK_SIZE) {
        const chunk = fullText.slice(start, start + CHUNK_SIZE).trim();
        if (!chunk) continue;

        // --- Create embedding for this chunk ---
        const embedRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });

        const embedding = embedRes.data[0].embedding;

        // --- Store in Supabase ---
        const { error } = await supabase.from("documents").insert({
          filename: file,
          chunk_index: chunkIndex,
          content: chunk,
          embedding,
        });

        if (error) {
          console.error("Supabase insert error:", error);
          return NextResponse.json(
            {
              ok: false,
              step: "insert",
              file,
              chunkIndex,
              error: error.message,
            },
            { status: 500 }
          );
        }

        chunkIndex += 1;
        totalChunks += 1;
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
