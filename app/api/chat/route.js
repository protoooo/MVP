import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 500 })
    }

    if (!profile?.is_subscribed) {
      return NextResponse.json({ 
        error: 'Active subscription required. Please visit the pricing page to subscribe.' 
      }, { status: 403 })
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', session.user.id)
      .single()

    const limits = subscription?.plan === 'enterprise' 
      ? { requests: 5000, images: 500 }
      : { requests: 500, images: 50 }

    const { messages, image, county } = await request.json()
    
    // Use county from request or fallback to profile
    const userCounty = county || profile.county || 'washtenaw'

    // Check request limit
    if (profile.requests_used >= limits.requests) {
      return NextResponse.json({ 
        error: `Monthly limit of ${limits.requests} queries reached. Resets on your next billing date.` 
      }, { status: 429 })
    }

    // Check image limit if image is included
    if (image && profile.images_used >= limits.images) {
      return NextResponse.json({ 
        error: `Monthly limit of ${limits.images} image analyses reached. Resets on your next billing date.` 
      }, { status: 429 })
    }
    
    if (!process.env.GEMINI_API_KEY) {
       throw new Error("GEMINI_API_KEY is missing")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" })

    const lastUserMessage = messages[messages.length - 1].content

    let contextText = ""
    let usedDocs = []

    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      const embeddingResult = await embeddingModel.embedContent(lastUserMessage)
      const embedding = embeddingResult.embedding.values

      // Search documents filtered by county
      const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      })

      if (searchError) {
        console.error('Vector Search Error:', searchError)
      }

      if (documents && documents.length > 0) {
        // Filter documents by county (if metadata contains county info)
        const countyDocs = documents.filter(doc => {
          // If document has county metadata, filter by it
          // Otherwise, include it (for shared documents like FDA Food Code)
          if (doc.metadata?.county) {
            return doc.metadata.county === userCounty
          }
          return true // Include documents without county metadata (shared docs)
        })

        contextText = countyDocs.map(doc => {
          if (doc.metadata?.source && !usedDocs.includes(doc.metadata.source)) {
            usedDocs.push(doc.metadata.source)
          }
          return `SOURCE: ${doc.metadata?.source || 'Unknown Doc'}\nCONTENT: ${doc.content}`
        }).join("\n\n---\n\n")
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    const systemPrompt = `
      You are the compliance assistant for protocol LM, helping ${countyName} restaurants maintain food safety compliance.
      
      INSTRUCTIONS:
      1. You have access to official FDA, Michigan, and ${countyName} regulations.
      2. Answer questions based on this context and general food safety knowledge specific to ${countyName}.
      3. If the context contains the answer, CITE the source document name in **bold**.
      4. If the user uploads an image, analyze it for violations.
      5. Never mention that you are an AI or language model. You are a compliance assistant.
      6. Always prioritize county-specific regulations over general guidelines when they differ.
      
      RETRIEVED CONTEXT (${countyName}):
      ${contextText || "No specific document matches found. Rely on general food safety knowledge."}
    `

    let promptParts = [systemPrompt]
    
    messages.slice(0, -1).forEach(m => promptParts.push(`${m.role}: ${m.content}`))
    promptParts.push(`user: ${lastUserMessage}`)
    
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

    const result = await chatModel.generateContent(promptParts)
    const response = await result.response
    const text = response.text()

    // Update counters
    const updates = { 
      requests_used: profile.requests_used + 1 
    }
    
    if (image) {
      updates.images_used = (profile.images_used || 0) + 1
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Failed to update counters:', updateError)
    }

    return NextResponse.json({ message: text })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ 
      error: `Error: ${error.message}` 
    }, { status: 500 })
  }
}
