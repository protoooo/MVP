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

    // --- STEP 1: AUTO-DETECT AVAILABLE MODELS ---
    // We ask Google: "What models does this user have access to?"
    const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const modelsResponse = await fetch(modelsUrl);
    const modelsData = await modelsResponse.json();

    if (!modelsResponse.ok) {
      throw new Error(`Failed to list models: ${modelsData.error?.message}`);
    }

    // Find the best available model that supports generating content
    // We prefer 1.5-flash, then 1.5-pro, then anything else.
    const availableModels = modelsData.models || [];
    const validModels = availableModels.filter(m => m.supportedGenerationMethods.includes("generateContent"));
    
    // Logic to pick the best one
    let selectedModel = validModels.find(m => m.name.includes("gemini-1.5-flash")) ||
                        validModels.find(m => m.name.includes("gemini-1.5-pro")) ||
                        validModels.find(m => m.name.includes("gemini-pro")) ||
                        validModels[0];

    if (!selectedModel) {
      throw new Error("No text-generation models found for this API Key.");
    }

    // Clean the model name (remove "models/" prefix if present)
    const modelName = selectedModel.name.replace("models/", "");
    console.log(`Using detected model: ${modelName}`);

    // --- STEP 2: LOAD FILES ---
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

    // --- STEP 3: GENERATE CONTENT ---
    const systemInstruction = `You are the Washtenaw County Food Service Compliance Assistant.
    Answer based ONLY on the provided Context Documents.
    Cite the document name if you find the answer.
    
    CONTEXT DOCUMENTS:
    ${contextData.slice(0, 60000) || "No documents found."}`;

    // Use the model we successfully found in Step 1
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const chatResponse = await fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: `${systemInstruction}\n\nUSER QUESTION: ${message}` }] 
        }]
      })
    });

    const chatData = await chatResponse.json();

    if (!chatResponse.ok) {
      throw new Error(chatData.error?.message || "Generation Failed");
    }

    const text = chatData.candidates[0].content.parts[0].text;
    
    // Return the answer (and log which model worked for your sanity)
    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Backend Error:", error);
    // This will print the specific error to your chat screen so we know what's wrong
    return NextResponse.json({ error: `System Error: ${error.message}` }, { status: 500 });
  }
}
