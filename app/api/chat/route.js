import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Allow the function to run for up to 60 seconds
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // 1. Check API Key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const { message } = await req.json();

    // *** CRITICAL FIX: Use "gemini-1.5-flash-latest" ***
    // This is the specific tag that works best with the v1beta free tier
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // 2. Load Context from your Public Folder
    const documentsDir = path.join(process.cwd(), "public", "documents");
    let contextData = "";

    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            const fileName = file.toLowerCase();

            // Skip the placeholder
            if (fileName === 'keep.txt') continue;

            try {
                // Read Text Files
                if (fileName.endsWith('.txt')) {
                    contextData += `\n--- SOURCE: ${file} ---\n${fs.readFileSync(filePath, 'utf-8')}\n`;
                } 
                // Read PDF Files
                else if (fileName.endsWith('.pdf')) {
                    const dataBuffer = fs.readFileSync(filePath);
                    const pdfData = await pdf(dataBuffer);
                    contextData += `\n--- SOURCE: ${file} ---\n${pdfData.text}\n`;
                }
            } catch (err) {
                console.error(`Error reading ${file}:`, err);
            }
         }
       }
    } catch (e) {
       console.warn("Context load error:", e);
    }

    // 3. Construct the Prompt
    const hasContext = contextData.length > 0;
    
    const systemInstruction = `You are the Washtenaw County Compliance Assistant.
    
    Use the context below to answer the user's question.
    - Cite your sources if the answer is in the documents (e.g., "According to the Food Code...").
    - If the answer is NOT in the documents, explicitly say: "I couldn't find this in your uploaded documents, but generally..." and then answer based on general food safety knowledge.
    
    CONTEXT DOCUMENTS:
    ${hasContext ? contextData.slice(0, 60000) : "No documents loaded."}
    `; 

    // 4. Generate Response
    const result = await model.generateContent(`${systemInstruction}\n\nUSER QUESTION: ${message}`);
    const response = await result.response;
    
    return NextResponse.json({ response: response.text() });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json(
      { error: "AI Error: " + error.message },
      { status: 500 }
    );
  }
}
