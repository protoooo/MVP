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

// Environment variable validation
const requiredEnvVars = ['GEMINI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
  }
});

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

      // Search documents across all counties
      const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 15 // Get more results before filtering
      })

      if (searchError) {
        console.error('Vector Search Error:', searchError)
      }

      if (documents && documents.length > 0) {
        // CRITICAL: Filter documents STRICTLY by county
        // Only include documents that EXACTLY match the user's county
        const countyDocs = documents.filter(doc => {
          const docCounty = doc.metadata?.county
          
          // If document has no county metadata, skip it entirely for safety
          if (!docCounty) {
            return false
          }
          
          // Only include if it EXACTLY matches the user's county
          return docCounty === userCounty
        })

        console.log(`🔍 Query for ${userCounty}: Found ${documents.length} total, filtered to ${countyDocs.length} county-specific`)

        // Only use the top 5 most relevant county-specific documents
        const topCountyDocs = countyDocs.slice(0, 5)

        contextText = topCountyDocs.map(doc => {
          if (doc.metadata?.source && !usedDocs.includes(doc.metadata.source)) {
            usedDocs.push(doc.metadata.source)
          }
          return `SOURCE: ${doc.metadata?.source || 'Unknown Doc'} (${COUNTY_NAMES[userCounty]})\nCONTENT: ${doc.content}`
        }).join("\n\n---\n\n")
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    const systemPrompt = `
You are the compliance assistant for protocolLM, helping ${countyName} restaurants maintain food safety compliance.

CRITICAL INSTRUCTIONS:
1. You have access ONLY to ${countyName} regulations and documents.
2. NEVER reference or mention other counties (Washtenaw, Wayne, or Oakland) unless they are the selected county.
3. All your responses must be specific to ${countyName}.
4. If the context contains the answer, CITE the source document name in **bold**.
5. If the user uploads an image, analyze it for violations based on ${countyName} standards.
6. Never mention that you are an AI or language model. You are a compliance assistant.
7. If you don't have ${countyName}-specific information, say so clearly and suggest checking official ${countyName} health department resources.

IMPORTANT: Users can switch counties using the dropdown menu. When they do, you will have access to that county's documents instead.

RETRIEVED CONTEXT (${countyName} ONLY):
${contextText || `No specific ${countyName} document matches found. Rely on general food safety knowledge for ${countyName}.`}
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
      promptParts.push(`Analyze this image for food safety violations based on ${countyName} regulations.`)
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

    return NextResponse.json({ 
      message: text,
      county: userCounty // Include county in response
    })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ 
      error: `Error: ${error.message}` 
    }, { status: 500 })
  }
}
