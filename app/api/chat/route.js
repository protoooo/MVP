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
    // 1. Check API Key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const { message } = await req.json();

    // FIXED: Use the "latest" tag which is more stable on the v1beta API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // 2. Load Context from GitHub/Public folder
    const documentsDir = path.join(process.cwd(), "public", "documents");
    let contextData = "";

    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            const fileName = file.toLowerCase();
            if (fileName === 'keep.txt') continue;

            try {
                if (fileName.endsWith('.txt')) {
                    contextData += `\n--- SOURCE: ${file} ---\n${fs.readFileSync(filePath, 'utf-8')}\n`;
                } else if (fileName.endsWith('.pdf')) {
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

    // 3. Construct Prompt
    const systemInstruction = `You are the Washtenaw County Compliance Assistant.
    
    Use the context below to answer. If the answer isn't in the documents, use general food safety knowledge but explicitly state: "I couldn't find this in your specific documents, but generally..."
    
    CONTEXT:
    ${contextData.slice(0, 60000)}`; 

    // 4. Generate
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
