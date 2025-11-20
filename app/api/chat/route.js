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
    let searchQuery = lastUserMessage

    // CRITICAL FIX: For image analysis, use a comprehensive search query
    if (image) {
      searchQuery = `food safety violations equipment cleanliness sanitation surfaces grease buildup 
                     temperature control storage cross contamination pest control proper maintenance 
                     cleaning procedures facility requirements non-food contact surfaces food contact surfaces
                     cooling procedures holding temperatures cooking temperatures equipment design
                     ${lastUserMessage}`.trim()
      
      console.log('🔍 IMAGE ANALYSIS - Enhanced search query:', searchQuery.substring(0, 100) + '...')
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const embeddingResult = await embeddingModel.embedContent(searchQuery)
      const embedding = embeddingResult.embedding.values

      console.log('📊 Embedding generated, searching documents...')

      // First, check if we have ANY documents for this county
      const { count: totalDocs, error: countError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .filter('metadata->>county', 'eq', userCounty)

      if (countError) {
        console.error('❌ Error checking document count:', countError)
      } else {
        console.log(`📚 Total documents for ${userCounty}:`, totalDocs)
      }

      // Search with very low threshold for image analysis
      const { data: documents, error: searchError } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: image ? 0.3 : 0.5, // Much lower for images
        match_count: image ? 25 : 15
      })

      if (searchError) {
        console.error('❌ Vector Search Error:', searchError)
        console.error('Error details:', JSON.stringify(searchError, null, 2))
      }

      console.log(`🔎 Vector search returned ${documents?.length || 0} documents`)

      if (documents && documents.length > 0) {
        // Filter documents by county
        const countyDocs = documents.filter(doc => {
          const docCounty = doc.metadata?.county
          if (!docCounty) return false
          return docCounty === userCounty
        })

        console.log(`📍 Filtered to ${countyDocs.length} ${userCounty} documents`)

        if (countyDocs.length === 0) {
          console.error('⚠️  NO DOCUMENTS FOUND FOR COUNTY:', userCounty)
          console.log('Sample doc metadata:', documents[0]?.metadata)
        }

        // Use more documents for image analysis
        const docCount = image ? 15 : 5
        const topCountyDocs = countyDocs.slice(0, docCount)

        console.log(`✅ Using ${topCountyDocs.length} documents for context`)

        contextText = topCountyDocs.map((doc, idx) => {
          const source = doc.metadata?.source || 'Unknown Doc'
          const page = doc.metadata?.page
          
          // Track unique documents
          const docKey = `${source}-${page}`
          if (!usedDocs.some(d => `${d.source}-${d.page}` === docKey)) {
            usedDocs.push({ source, page })
          }
          
          return `[DOCUMENT ${idx + 1}]
SOURCE: ${source}
PAGE: ${page || 'N/A'}
COUNTY: ${COUNTY_NAMES[userCounty]}
CONTENT: ${doc.content}

`
        }).join("\n---\n\n")

        console.log('📋 Documents being used:', usedDocs.map(d => `${d.source} (p.${d.page})`).join(', '))
      } else {
        console.error('⚠️  Vector search returned no documents at all!')
      }
    }

    // If we have no context and it's an image, return a helpful error
    if (image && !contextText) {
      console.error('🚨 CRITICAL: No documents retrieved for image analysis!')
      
      return NextResponse.json({
        message: `⚠️ **Unable to analyze image**

I couldn't retrieve any ${COUNTY_NAMES[userCounty]} regulatory documents from the database. This might mean:

1. Documents haven't been uploaded to Supabase yet
2. The vector search function isn't working correctly
3. No documents exist for ${userCounty} in the database

**To fix this, you need to:**
1. Run: \`npm run upload-embeddings\` to upload documents to Supabase
2. Verify the \`match_documents\` function exists in Supabase
3. Check that documents exist in the \`documents\` table with county="${userCounty}"

Please contact support if this persists.`,
        county: userCounty,
        citations: [],
        documentsSearched: 0,
        debugInfo: {
          searchQueryUsed: searchQuery.substring(0, 100),
          documentsRetrieved: 0,
          countyFilter: userCounty
        }
      })
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    const systemPrompt = `You are the compliance assistant for protocolLM, helping ${countyName} restaurants maintain food safety compliance.

CRITICAL CITATION RULES - READ CAREFULLY:
1. You have access ONLY to ${countyName} documents shown in RETRIEVED CONTEXT below
2. You MUST cite every single regulatory statement using: **[Document Name, Page X]**
3. NEVER provide information without a citation from RETRIEVED CONTEXT
4. If RETRIEVED CONTEXT is empty or doesn't cover the topic, say: "I don't have specific ${countyName} documents for this issue."
5. DO NOT use general food safety knowledge - ONLY cite from RETRIEVED CONTEXT

RETRIEVED CONTEXT (${countyName} REGULATIONS):
${contextText || `⚠️ NO DOCUMENTS RETRIEVED - Cannot provide regulatory guidance without document citations.`}

${contextText ? `
AVAILABLE DOCUMENTS:
${usedDocs.map(d => `- ${d.source} (Page ${d.page})`).join('\n')}

You MUST cite from these documents using **[Document Name, Page X]** format.
` : ''}

RESPONSE FORMAT:
- Always use bold citations: **[Document Name, Page X]**
- Never provide advice without citations
- If you can't find a citation, explicitly state it
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
      
      if (!contextText) {
        promptParts.push(`ERROR: No regulatory documents were retrieved for ${countyName}. 
You CANNOT analyze this image without access to county-specific regulations.
Respond with the error message explaining that documents are missing.`)
      } else {
        promptParts.push(`ANALYZE THIS IMAGE FOR FOOD SAFETY VIOLATIONS

MANDATORY REQUIREMENTS:
1. Look at the image carefully and identify ANY potential food safety issues
2. For EVERY issue, cite the specific document and page from RETRIEVED CONTEXT above
3. Format: **[Document Name, Page X]**
4. If you see an issue but can't find it in RETRIEVED CONTEXT, state: "I observed [issue] but don't have a ${countyName} citation in the current documents."
5. DO NOT provide generic advice - ONLY cite from the ${usedDocs.length} documents listed above

EXAMPLE RESPONSE FORMAT:
"I observed grease buildup on the stovetop. Equipment food-contact surfaces and utensils must be clean to sight and touch **[MI Modified Food Code, Page 15]**. Non-food-contact surfaces should be kept free of accumulation of dust, dirt, and food residue **[Cross Contamination, Page 4]**."

If documents don't cover what you see: "I observed [specific issue] but the current ${countyName} documents don't specifically address this violation."`)
      }
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

    // Extract citations from response
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

    console.log(`✅ Response generated with ${citations.length} citations from ${usedDocs.length} documents`)

    return NextResponse.json({ 
      message: text,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length
    })

  } catch (error) {
    console.error('❌ Gemini API Error:', error)
    return NextResponse.json({ 
      error: `Error: ${error.message}` 
    }, { status: 500 })
  }
}
