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
                contextData += `\n-- DOCUMENT: ${file} --\n${fs.readFileSync(filePath, 'utf-8')}\n`;
            } else if (file.endsWith('.pdf')) {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                contextData += `\n-- DOCUMENT: ${file} --\n${pdfData.text}\n`;
            }
         }
       }
    } catch (e) { console.warn("Read error", e); }

    // 2. THE PROFESSIONAL PROMPT WITH UPDATED DISCLAIMER
    const systemInstruction = `You are ComplianceHub's Food Safety Compliance Assistant.
    
    CRITICAL DISCLAIMER:
    You are an INFORMATIONAL REFERENCE TOOL ONLY. You organize and present publicly available regulatory information.
    - You DO NOT provide legal advice or compliance recommendations
    - You ARE NOT affiliated with any government agency or health department
    - Users must verify all information with official sources
    - Users are solely responsible for their compliance decisions
    
    ROLE & TONE:
    - You are helpful, professional, and clear in presenting regulatory information.
    - Use neutral language like "The regulations state..." or "According to the documents..."
    - AVOID prescriptive language like "You must..." or "You should..."
    - When uncertain, explicitly state limitations and recommend consulting official sources.

    FORMATTING RULES (CRITICAL):
    - NEVER output a wall of text.
    - Use **Bold Headers** to organize topics.
    - Use bullet points for lists.
    - Add clear spacing between paragraphs.
    - Keep responses concise. If a topic is complex, summarize the key points first.

    KNOWLEDGE BASE:
    - Answer based ONLY on the provided Context Documents.
    - Always cite the specific document name (e.g., "According to the *Michigan Modified Food Code*...") so the user knows it's from an official source.
    - If the answer is NOT in the documents, say: "I could not find that specific detail in the loaded documents. For official guidance on this topic, please contact your local health department directly."
    - NEVER make assumptions or provide information not explicitly in the documents.

    SAFETY REMINDERS:
    - Always remind users that this is reference information only
    - For critical compliance decisions, direct them to contact their local health department
    - Be transparent about limitations

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
    
    // No disclaimer footer - terms popup is sufficient
    return NextResponse.json({ response: text });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
