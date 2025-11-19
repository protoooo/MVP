import { NextResponse } from "next/server";
import { searchDocuments } from '@/lib/searchDocs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const { message, image } = await req.json();

    // 1. SEARCH FOR RELEVANT DOCUMENT CHUNKS
    // Only retrieve the 5 most relevant chunks instead of loading all documents
    const query = message || "food safety inspection compliance";
    const relevantChunks = await searchDocuments(query, 5);
    
    // Build context from only relevant chunks
    let contextData = "";
    if (relevantChunks.length > 0) {
      contextData = relevantChunks
        .map((chunk, idx) => 
          `--- RELEVANT EXCERPT ${idx + 1} (from ${chunk.source}, relevance: ${(chunk.score * 100).toFixed(1)}%) ---\n${chunk.text}`
        )
        .join('\n\n');
      
      console.log(`✅ Found ${relevantChunks.length} relevant chunks for query: "${query.substring(0, 50)}..."`);
    } else {
      console.warn('⚠️  No relevant chunks found. Using fallback.');
      contextData = "No specific document matches found. Provide general food safety guidance.";
    }

    // 2. BUILD PROMPT
    const systemInstruction = `You are Protocol, a food safety intelligence assistant.
    
CORE INSTRUCTIONS:
1. If an IMAGE is provided, analyze it for food safety violations based on the Context Documents. Look for: Cross-contamination, improper storage, dirty surfaces, or unsafe temperatures.
2. If NO violations are found in the image, say "This looks compliant based on visual inspection," but warn that you cannot measure temperature visually.
3. Cite your sources using the document names provided (e.g., "According to the Food Code..." or "Based on FDA guidelines...").
4. Use **Bold formatting** for key issues.
5. Be specific and reference the relevant regulations or standards.

RELEVANT CONTEXT DOCUMENTS:
${contextData}

USER QUESTION: ${message || "Analyze this image for food safety compliance."}`;

    // 3. CONSTRUCT PAYLOAD (With or Without Image)
    const parts = [{ text: systemInstruction }];
    
    if (image) {
      // Remove the "data:image/jpeg;base64," prefix if present
      const base64Data = image.includes(',') ? image.split(",")[1] : image;
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Data
        }
      });
    }

    // 4. API REQUEST (Gemini 2.0 Flash)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
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
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
