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

    const { message, image } = await req.json();

    // 1. LOAD DOCUMENTS
    const documentsDir = path.join(process.cwd(), "public", "documents");
    let contextData = "";

    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            if (file === 'keep.txt' || file.startsWith('.')) continue;

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

    // 2. BUILD PROMPT
    const systemInstruction = `You are Protocol, a food safety intelligence assistant.
    
    CORE INSTRUCTIONS:
    1. If an IMAGE is provided, analyze it for food safety violations based on the Context Documents. Look for: Cross-contamination, improper storage, dirty surfaces, or unsafe temperatures.
    2. If NO violations are found in the image, say "This looks compliant based on visual inspection," but warn that you cannot measure temperature visually.
    3. Cite your sources (e.g., "According to the Food Code...").
    4. Use Bold formatting for key issues.

    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`;

    // 3. CONSTRUCT PAYLOAD (With or Without Image)
    const parts = [{ text: `${systemInstruction}\n\nUSER QUESTION: ${message || "Analyze this image for safety."}` }];
    
    if (image) {
      // Remove the "data:image/jpeg;base64," prefix if present
      const base64Data = image.split(",")[1];
      parts.push({
        inline_data: {
          mime_type: "image/jpeg", // Assuming jpeg/png from camera
          data: base64Data
        }
      });
    }

    // 4. API REQUEST (Gemini 2.5 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
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
