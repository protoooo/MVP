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

    // 1. SELECT THE MODEL
    // We use "gemini-1.5-flash" because it is the current stable standard.
    // If this 404s, it means your package.json dependency is too old.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. LOAD THE FILES (The Memory)
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

    // 3. THE BRAIN (The Prompt & Instructions)
    // ---------------------------------------------------------
    // EDIT THE TEXT BELOW TO CHANGE HOW THE BOT ACTS
    // ---------------------------------------------------------
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant. 
    
    YOUR INSTRUCTIONS:
    1. You are talking to a restaurant owner. Be professional, helpful, and concise.
    2. Answer the user's question based ONLY on the provided Context Documents below.
    3. If the answer is found in the documents, you MUST cite the document name (e.g. "According to the Michigan Food Law...").
    4. If the answer is NOT in the documents, state clearly: "I couldn't find that specific detail in your official documents," and then provide a general answer based on standard food safety rules.
    
    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`; 
    // ---------------------------------------------------------

    // 4. GENERATE RESPONSE
    const result = await model.generateContent(`${systemInstruction}\n\nUSER QUESTION: ${message}`);
    const response = await result.response;
    
    return NextResponse.json({ response: response.text() });

  } catch (error) {
    console.error("Gemini Error:", error);
    // If this errors, check the Railway logs for the exact message
    return NextResponse.json({ error: "AI Error: " + error.message }, { status: 500 });
  }
}
