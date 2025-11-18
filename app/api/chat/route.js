import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Allow the function to run for up to 60 seconds (prevents timeouts)
export const maxDuration = 60;

// Prevent caching so the bot always sees the latest files
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    // 1. Check for API Key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    // 2. Get the user's message
    const { message } = await req.json();

    // 3. Define the model
    // FIXED: Changed to "gemini-1.5-flash" to fix the 404 error
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Define the path to your GitHub uploaded files
    // This looks inside the "public/documents" folder you created
    const documentsDir = path.join(process.cwd(), "public", "documents");
    
    let contextData = "";

    // 5. Read and Parse Files (PDFs and Text)
    try {
       if (fs.existsSync(documentsDir)) {
         const files = fs.readdirSync(documentsDir);
         
         for (const file of files) {
            const filePath = path.join(documentsDir, file);
            const fileName = file.toLowerCase();

            // Skip the placeholder file
            if (fileName === 'keep.txt') continue;

            try {
                // Handle .txt files
                if (fileName.endsWith('.txt')) {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    contextData += `\n--- SOURCE: ${file} ---\n${content}\n`;
                    console.log(`Loaded text file: ${file}`);
                }
                // Handle .pdf files
                else if (fileName.endsWith('.pdf')) {
                    const dataBuffer = fs.readFileSync(filePath);
                    // Convert PDF binary to text
                    const pdfData = await pdf(dataBuffer);
                    contextData += `\n--- SOURCE: ${file} ---\n${pdfData.text}\n`;
                    console.log(`Loaded PDF file: ${file}`);
                }
            } catch (err) {
                console.error(`Error parsing file ${file}:`, err);
            }
         }
       } else {
         console.warn("Documents directory not found at:", documentsDir);
       }
    } catch (dirError) {
       console.warn("Could not access documents directory:", dirError);
    }

    // 6. Construct the System Prompt
    // We verify if context was actually loaded
    const hasContext = contextData.length > 0;
    
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant. 
    
    Your goal is to help restaurant owners understand local regulations based on the provided context.
    
    INSTRUCTIONS:
    1. Use the CONTEXT provided below to answer questions.
    2. If you find the answer in the context, cite the document name (e.g. "According to the Michigan Food Law...").
    3. If the answer is NOT in the context, you may use your general knowledge, but you must start your sentence with: "I couldn't find specific details in your uploaded documents, but generally..."
    
    CONTEXT DOCUMENTS:
    ${hasContext ? contextData.slice(0, 60000) : "No documents loaded."}
    `; 

    const finalPrompt = `${systemInstruction}\n\nUSER QUESTION: ${message}`;

    // 7. Generate Response
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Chat error:", error);
    // Return the actual error message so we can debug if it happens again
    return NextResponse.json(
      { error: "Failed to process request: " + error.message },
      { status: 500 }
    );
  }
}
