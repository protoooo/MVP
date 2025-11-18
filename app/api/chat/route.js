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

    // 2. CLEAN PROMPT (No Forced Disclaimer in Output)
    const systemInstruction = `You are ComplianceHub, a helpful food safety reference assistant.
    
    RULES:
    - Answer based ONLY on the provided Context Documents.
    - Cite the document name (e.g. "According to the Food Code...") when you find the answer.
    - If the answer is NOT in the documents, say: "I couldn't find that specific detail in the loaded reference documents," and then provide a general best-practice answer, clearly labeling it as general guidance.
    - Use a professional, helpful tone.
    - Use Markdown formatting (bolding, lists) for readability.

    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`;

    // 3. API REQUEST (Gemini 2.5 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
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
