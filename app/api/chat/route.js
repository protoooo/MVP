import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const { message } = await req.json();

    // 1. LOAD FILES
    const documentsDir = path.join(process.cwd(), "public", "documents");
    let contextData = "";

    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            if (file === 'keep.txt') continue;

            if (file.endsWith('.txt')) {
                contextData += `\n-- DOC: ${file} --\n${fs.readFileSync(filePath, 'utf-8')}\n`;
            } else if (file.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                contextData += `\n-- DOC: ${file} --\n${pdfData.text}\n`;
            }
         }
       }
    } catch (e) { console.warn("Read error", e); }

    // 2. PROMPT
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant.
    Answer based ONLY on the provided Context Documents.
    Cite the document name if you find the answer.
    If the answer is NOT in the documents, say "I couldn't find that in your official files," then provide a general answer.
    
    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`;

    // 3. MANUAL API REQUEST (Using gemini-1.5-flash specifically for Free Tier)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `${systemInstruction}\n\nUSER QUESTION: ${message}` }] 
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google Error:", data);
      throw new Error(data.error?.message || "Google API Error");
    }

    const text = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ response: text });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
