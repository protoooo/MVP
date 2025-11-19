// app/api/chat/route.js
// Updated to use RAG (Retrieval-Augmented Generation)
// This replaces your existing file

import { NextResponse } from "next/server";
import { searchDocuments } from "@/lib/searchDocs";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { message, image } = await req.json();

    // Search for relevant document chunks instead of loading everything
    let contextData = "";
    
    if (message && message.trim()) {
      try {
        // Adjust topK based on query complexity
        const topK = image ? 7 : 5; // More context if analyzing image
        const relevantChunks = await searchDocuments(message, topK);
        
        if (relevantChunks.length > 0) {
          contextData = "\n=== RELEVANT REGULATIONS ===\n";
          
          for (const chunk of relevantChunks) {
            contextData += `\n--- Source: ${chunk.source} ---\n`;
            contextData += `${chunk.text}\n`;
          }
          
          console.log(`📚 Using ${relevantChunks.length} relevant chunks (${contextData.length} chars, ~${Math.round(contextData.length / 4)} tokens)`);
        } else {
          console.warn('⚠️  No relevant chunks found');
        }
      } catch (err) {
        console.error("❌ Search failed:", err.message);
        contextData = "\n(Note: Document search unavailable - providing general guidance)\n";
      }
    }

    // Build system instruction
    const systemInstruction = `You are Protocol, a food safety intelligence assistant.
    
CORE INSTRUCTIONS:
1. If an IMAGE is provided, analyze it for food safety violations based on the Context Documents.
2. Look for: Cross-contamination, improper storage, dirty surfaces, temperature abuse, or unsafe practices.
3. If NO violations found, say "This looks compliant based on visual inspection," but note you cannot measure temperature visually.
4. ALWAYS cite your sources with specific document names (e.g., "According to FDA_FOOD_CODE_2022.pdf Section 3-501.16...").
5. Use **Bold** formatting for key issues and violations.
6. Be specific about what needs to be corrected and how.

${contextData || "No context documents found."}`;

    // Construct message parts
    const parts = [{ 
      text: `${systemInstruction}\n\nUSER QUESTION: ${message || "Analyze this image for food safety violations."}` 
    }];
    
    if (image) {
      const base64Data = image.includes(',') ? image.split(",")[1] : image;
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }

    // Make API request to Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more factual responses
          maxOutputTokens: 2048,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      throw new Error(data.error?.message || "Google API Error");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No response generated");
    }

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ 
      error: error.message || "An error occurred" 
    }, { status: 500 });
  }
}
