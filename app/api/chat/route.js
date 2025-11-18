import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { message } = await req.json();

    // We use the standard tag. Deleting package-lock.json enables this to work.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- LOAD FILES ---
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
    } catch (e) { console.warn("Context read error", e); }

    // --- PROMPT ---
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant. 
    
    INSTRUCTIONS:
    1. Answer based ONLY on the Context Documents below.
    2. Cite the document name when you find an answer.
    3. If the answer is missing from the documents, say "I couldn't find that in your official files," then use general knowledge.

    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`; 

    // --- GENERATE ---
    const result = await model.generateContent(`${systemInstruction}\n\nUSER QUESTION: ${message}`);
    const response = await result.response;
    
    return NextResponse.json({ response: response.text() });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "AI Error: " + error.message }, { status: 500 });
  }
}
