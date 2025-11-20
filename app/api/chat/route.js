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
        match_count: 15
      })

      if (searchError) {
        console.error('Vector Search Error:', searchError)
      }

      if (documents && documents.length > 0) {
        // Filter documents by county
        const countyDocs = documents.filter(doc => {
          const docCounty = doc.metadata?.county
          if (!docCounty) return false
          return docCounty === userCounty
        })

        console.log(`🔍 Query for ${userCounty}: Found ${documents.length} total, filtered to ${countyDocs.length} county-specific`)

        // Use top 5 most relevant county-specific documents
        const topCountyDocs = countyDocs.slice(0, 5)

        contextText = topCountyDocs.map((doc, idx) => {
          const source = doc.metadata?.source || 'Unknown Doc'
          const page = doc.metadata?.page
          
          if (source && !usedDocs.some(d => d.source === source)) {
            usedDocs.push({ source, page })
          }
          
          return `[DOCUMENT ${idx + 1}]
SOURCE: ${source}
PAGE: ${page || 'N/A'}
COUNTY: ${COUNTY_NAMES[userCounty]}
CONTENT: ${doc.content}

`
        }).join("\n---\n\n")
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    const systemPrompt = `You are the compliance assistant for protocolLM, helping ${countyName} restaurants maintain food safety compliance.

CRITICAL CITATION RULES:
1. You have access ONLY to ${countyName} regulations and documents.
2. NEVER reference other counties unless they are the selected county.
3. ALWAYS cite your sources using this exact format: **[Document Name, Page X]**
4. When you reference ANY information from the documents, immediately follow it with a citation.
5. Multiple citations for the same document should use: **[Document Name, Pages X, Y, Z]**
6. If you don't have specific ${countyName} information, say so and suggest checking official ${countyName} health department resources.

CITATION EXAMPLES:
- "Chicken must reach an internal temperature of 165°F (74°C) **[Cooking Temps, Page 3]**"
- "Raw meat should be stored on the bottom shelf **[Cross Contamination, Page 2]** to prevent dripping onto other foods."
- "According to ${countyName} enforcement guidelines **[Enforcement Action Guide, Pages 5-7]**, violations are classified into three categories..."

RETRIEVED CONTEXT (${countyName} ONLY):
${contextText || `No specific ${countyName} document matches found. Use general food safety knowledge for ${countyName}, but clearly state when information is general vs. county-specific.`}

RESPONSE FORMAT:
- Be conversational but professional
- Always cite sources when referencing specific requirements
- Use bold citations: **[Document Name, Page X]**
- If analyzing an image, cite relevant violations with document references
- Group related information from the same document together
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
      promptParts.push(`Analyze this image for food safety violations based on ${countyName} regulations. Cite specific documents and pages for each violation you identify.`)
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

    // Extract citations from response for the frontend
    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(text)) !== null) {
      citations.push({
        document: match[1],
        pages: match[2],
        county: userCounty
      })
    }

    return NextResponse.json({ 
      message: text,
      county: userCounty,
      citations: citations
    })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json({ 
      error: `Error: ${error.message}` 
    }, { status: 500 })
  }
}
