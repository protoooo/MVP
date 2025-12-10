import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const docsPath = path.join(process.cwd(), "public/documents/washtenaw");
    const files = fs.readdirSync(docsPath).filter(f => f.endsWith(".pdf"));

    for (const file of files) {
      console.log("Processing:", file);

      const pdfBuffer = fs.readFileSync(path.join(docsPath, file));
      const parsed = await pdfParse(pdfBuffer);
      const fullText = parsed.text;

      // Chunk PDF text
      const chunkSize = 2000;
      const chunks = [];
      for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.slice(i, i + chunkSize));
      }

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];

        const embedding = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunkText,
        });

        await supabase.from("documents").insert({
          filename: file,
          chunk_index: i,
          content: chunkText,
          embedding: embedding.data[0].embedding,
        });
      }
    }

    return NextResponse.json({ status: "complete" });

  } catch (error) {
    console.error("Ingestion failed:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
