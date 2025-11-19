import { NextResponse } from "next/server";
import { searchDocuments } from '../../../lib/searchDocs.js';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

function checkRateLimit(identifier) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(identifier) || [];
  
  // Filter out requests outside the current window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  // Add current request and update map
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);
  
  // Cleanup old entries periodically (prevent memory leak)
  if (Math.random() < 0.01) { // 1% chance to cleanup
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const active = timestamps.filter(t => t > cutoff);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
  }
  
  return true;
}

export async function POST(req) {
  try {
    // Rate limiting - use IP address as identifier
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        error: "Rate limit exceeded. Please wait a moment before trying again." 
      }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const { message, image } = await req.json();

    // 1. SEARCH FOR RELEVANT DOCUMENT CHUNKS
    // Only retrieve the 5 most relevant chunks instead of loading all documents
    const query = message || "food safety inspection compliance";
    const relevantChunks = await searchDocuments(query, 5);
    
    // Calculate confidence based on top match score and score consistency
    let confidence = null;
    if (relevantChunks && relevantChunks.length > 0) {
      const topScore = relevantChunks[0].score;
      const avgTopThree = relevantChunks.slice(0, Math.min(3, relevantChunks.length))
        .reduce((sum, chunk) => sum + chunk.score, 0) / Math.min(3, relevantChunks.length);
      
      // Confidence factors:
      // - High top score (>0.7 = very relevant)
      // - Consistent scores among top results (indicates clear match)
      const scoreQuality = topScore;
      const scoreConsistency = avgTopThree / topScore; // Closer to 1 = more consistent
      
      // Combined confidence (0-100%)
      confidence = Math.round(scoreQuality * scoreConsistency * 100);
      
      // Only show confidence if we have good matches (>50%)
      if (confidence < 50) {
        confidence = null;
      }
    }
    
    // Build context from only relevant chunks
    let contextData = "";
    if (relevantChunks && relevantChunks.length > 0) {
      contextData = relevantChunks
        .map((chunk, idx) => 
          `--- RELEVANT EXCERPT ${idx + 1} (from ${chunk.source}, relevance: ${(chunk.score * 100).toFixed(1)}%) ---\n${chunk.text}`
        )
        .join('\n\n');
      
      console.log(`✅ Found ${relevantChunks.length} relevant chunks for query: "${query.substring(0, 50)}..." (confidence: ${confidence || 'low'}%)`);
    } else {
      console.warn('⚠️  No relevant chunks found. Using fallback.');
      contextData = "No specific document matches found. Provide general food safety guidance based on standard FDA and local health department regulations.";
    }

    // 2. BUILD PROMPT
    const systemInstruction = `You are Protocol, a food safety intelligence assistant.
    
CORE INSTRUCTIONS:
1. If an IMAGE is provided, analyze it for food safety violations based on the Context Documents. Look for: Cross-contamination, improper storage, dirty surfaces, unsafe temperatures, or improper food handling.
2. If NO violations are found in the image, say "This looks compliant based on visual inspection," but warn that you cannot measure temperature visually or verify all safety factors.
3. Cite your sources using the document names provided (e.g., "According to the Food Code..." or "Based on FDA_FOOD_CODE_2022.pdf...").
4. Use **Bold formatting** for key issues and violations.
5. Be specific and reference the relevant regulations or standards from the context.
6. If asked about specific regulations, temperatures, or procedures, reference the exact document and section when available.

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

    // 4. API REQUEST (Gemini 2.5 Flash - Latest Stable Model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", data);
      throw new Error(data.error?.message || "Google API Error");
    }

    // Extract response text
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No response text from API");
    }

    return NextResponse.json({ 
      response: text,
      confidence: confidence // Include confidence in response
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ 
      error: error.message || "An error occurred processing your request" 
    }, { status: 500 });
  }
}
