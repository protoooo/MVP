import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { message } = await req.json();

    // 1. THE MODEL
    // Since your package.json is v0.17.1, this is the correct model name.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. LOAD THE FILES
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

    // 3. THE PROMPT (THE BRAIN)
    // *********************************************************
    // EDIT THIS SECTION TO CHANGE THE BOT'S PERSONALITY
    // *********************************************************
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant.
    
    INSTRUCTIONS:
    1. Answer the user's question based on the provided Context Documents.
    2. Be friendly, professional, and concise.
    3. IMPORTANT: If the answer is found in the documents, cite the source (e.g. "According to the Food Code...").
    4. If the answer is NOT in the documents, say: "I couldn't find that in your official documents," and then provide a general answer.

    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`; 
    // *********************************************************

    // 4. GENERATE
    const result = await model.generateContent(`${systemInstruction}\n\nUSER QUESTION: ${message}`);
    const response = await result.response;
    
    return NextResponse.json({ response: response.text() });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: "AI Error: " + error.message }, { status: 500 });
  }
}
