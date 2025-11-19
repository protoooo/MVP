import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic'

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { messages, image } = await request.json()
    
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY is missing")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // ✅ FIXED: Use gemini-2.0-flash (stable, production-ready model)
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })

    const lastUserMessage = messages[messages.length - 1].content

    let contextText = ""
    let usedDocs = []

    // 2. RAG LOGIC (Only run text search if there is text input)
    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      
      // A. Generate Embedding for the user's question
      const embeddingResult = await embeddingModel.embedContent(lastUserMessage)
      const embedding = embeddingResult.embedding.values

      // B. Search Supabase (The "Brain")
      const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5, // Only decent matches
        match_count: 5        // Top 5 chunks
      })

      if (searchError) {
        console.error('Vector Search Error:', searchError)
      }

      // C. Build Context from matches
      if (documents && documents.length > 0) {
        contextText = documents.map(doc => {
          // Track unique titles for citation
          if (doc.metadata?.source && !usedDocs.includes(doc.metadata.source)) {
            usedDocs.push(doc.metadata.source)
          }
          return `SOURCE: ${doc.metadata?.source || 'Unknown Doc'}\nCONTENT: ${doc.content}`
        }).join("\n\n---\n\n")
      }
    }

    // 3. Construct System Prompt
    const systemPrompt = `
      You are "Protocol", the Washtenaw County Food Safety Assistant.
      
      INSTRUCTIONS:
      1. You have access to the following retrieved context from the official regulations.
      2. Answer the user's question strictly based on this context and general FDA/Michigan Food Code knowledge.
      3. If the context contains the answer, CITE the source document name in **bold**.
      4. If the user uploads an image, analyze it for violations.
      
      RETRIEVED CONTEXT:
      ${contextText || "No specific document matches found. Rely on general Washtenaw County/FDA code knowledge."}
    `

    // 4. Build Conversation for Gemini
    let promptParts = [systemPrompt]
    
    // Add History
    messages.slice(0, -1).forEach(m => promptParts.push(`${m.role}: ${m.content}`))
    
    // Add Current User Input
    promptParts.push(`user: ${lastUserMessage}`)
    
    // 5. Handle Image (Vision)
    if (image) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      })
      promptParts.push("Analyze this image for food safety violations.")
    }

    // 6. Generate Response
    const result = await chatModel.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ 
      error: `AI Error: ${error.message}` 
    }, { status: 500 })
  }
}
