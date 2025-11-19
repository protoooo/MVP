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
    const systemInstruction = `You are Protocol, a food safety intelligence assistant for Washtenaw County, Michigan restaurants.

CORE INSTRUCTIONS:
${image ? `
IMAGE ANALYSIS MODE:
- Analyze the provided image for food safety violations based on the Context Documents
- Look for: Cross-contamination, improper storage, dirty surfaces, unsafe temperatures, or improper food handling
- If NO violations are found, say "This looks compliant based on visual inspection," but note you cannot measure temperature or verify all factors
` : `
TEXT CHAT MODE:
- Answer food safety questions based on the Context Documents
- Be conversational and helpful
- If the user is just greeting you or making small talk, respond naturally and offer to help with food safety questions
`}
- Cite your sources using document names (e.g., "According to FDA_FOOD_CODE_2022.pdf..." or "Based on Washtenaw County guidelines...")
- Use **Bold formatting** for key violations or critical information
- Be specific and reference relevant regulations from the context when available

RELEVANT CONTEXT DOCUMENTS:
${contextData}

USER ${image ? 'QUESTION' : 'MESSAGE'}: ${message || (image ? "Analyze this image for food safety compliance." : "Hello")}`;

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

    // 4. API REQUEST WITH RETRY LOGIC (Gemini 2.5 Flash - Latest Stable Model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    let response;
    let data;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        response = await fetch(url, {
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

        data = await response.json();

        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        // Check if it's a retryable error (503 Service Unavailable, 429 Too Many Requests, or overloaded)
        const errorMessage = data.error?.message || '';
        const isRetryable = response.status === 503 || 
                           response.status === 429 || 
                           errorMessage.includes('overloaded') ||
                           errorMessage.includes('quota');
        
        if (!isRetryable || attempt === maxRetries - 1) {
          throw new Error(errorMessage || "Google API Error");
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (err) {
        lastError = err;
        if (attempt === maxRetries - 1) {
          throw err;
        }
      }
    }

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
    
    // Provide user-friendly error messages
    let userMessage = error.message;
    if (error.message.includes('overloaded') || error.message.includes('quota')) {
      userMessage = "The AI service is currently experiencing high demand. Please try again in a moment.";
    } else if (error.message.includes('API Key')) {
      userMessage = "Configuration error. Please contact support.";
    }
    
    return NextResponse.json({ 
      error: userMessage
    }, { status: 500 });
  }
}
