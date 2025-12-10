import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const docsPath = path.join(process.cwd(), "public/documents/washtenaw");
  const files = fs.readdirSync(docsPath).filter(f => f.endsWith(".pdf"));

  for (const file of files) {
    const pdfBuffer = fs.readFileSync(path.join(docsPath, file));
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text;

    // split into chunks
    const chunkSize = 2000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    // embed each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk
      });

      await supabase.from("documents").insert({
        filename: file,
        chunk_index: i,
        content: chunk,
        embedding: embedding.data[0].embedding
      });
    }
  }

  return NextResponse.json({ status: "complete" });
}
