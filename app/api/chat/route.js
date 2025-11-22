import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { VertexAI } from '@google-cloud/vertexai'
import { searchDocuments } from '@/lib/searchDocs'

export const dynamic = 'force-dynamic'

const COUNTY_NAMES = {
  washtenaw: 'Washtenaw County',
  wayne: 'Wayne County',
  oakland: 'Oakland County'
}

const VALID_COUNTIES = ['washtenaw', 'wayne', 'oakland']

// Initialize Vertex AI with credentials from environment variable
function getVertexAI() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}')
    
    return new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID,
      location: 'us-central1',
      googleAuthOptions: {
        credentials: credentials
      }
    });
  } catch (error) {
    console.error('Failed to initialize Vertex AI:', error)
    throw new Error('Vertex AI initialization failed. Check GOOGLE_CREDENTIALS_JSON environment variable.')
  }
}

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_subscribed, requests_used, images_used, county')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_subscribed) {
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
    }

    const { messages, image, county } = await request.json()
    const userCounty = VALID_COUNTIES.includes(county || profile.county) ? (county || profile.county) : 'washtenaw'

    const vertexAI = getVertexAI()
    const chatModel = vertexAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });

    const lastUserMessage = messages[messages.length - 1].content
    let contextText = ""
    let usedDocs = []

    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      try {
        let searchQuery = lastUserMessage
        if (image) searchQuery = `food safety violations equipment cleanliness sanitation ${lastUserMessage}`.trim()

        const results = await searchDocuments(searchQuery, 20, userCounty)
        
        if (results && results.length > 0) {
          contextText = results.map((doc, idx) => {
            const source = doc.source || 'Unknown Doc'
            const page = doc.page || 'N/A'
            const docKey = `${source}-${page}`
            if (!usedDocs.some(d => `${d.source}-${d.page}` === docKey)) {
              usedDocs.push({ source, page })
            }
            return `[DOCUMENT ${idx + 1}]
SOURCE: ${source}
PAGE: ${page}
COUNTY: ${COUNTY_NAMES[userCounty]}
CONTENT: ${doc.text}`
          }).join("\n---\n\n")
        }
      } catch (searchErr) {
        console.error("Search failed (using general knowledge):", searchErr)
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty

    const systemPrompt = `You are protocolLM compliance assistant for ${countyName}.

CRITICAL: Cite every regulatory statement using: **[Document Name, Page X]**

RETRIEVED CONTEXT (${countyName}):
${contextText || 'No specific documents found (Answer based on general food safety knowledge).'}

${contextText ? `AVAILABLE DOCUMENTS:\n${usedDocs.map(d => `- ${d.source} (Page ${d.page})`).join('\n')}` : ''}

Always cite from documents using **[Document Name, Page X]** format.`

    // Build the correct format for Vertex AI
    const contents = []
    
    // Add conversation history
    messages.slice(0, -1).forEach(m => {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })
    })

    // Add current user message with system prompt
    const userParts = [{ text: `${systemPrompt}\n\nUser question: ${lastUserMessage}` }]
    
    // Add image if present
    if (image) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      userParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      })
    }

    contents.push({
      role: 'user',
      parts: userParts
    })

    // Generate content with proper structure
    const result = await chatModel.generateContent({
      contents: contents
    })

    // Extract text from Vertex AI response correctly
    const response = result.response
    const candidates = response.candidates || []
    
    let text = ''
    if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
      text = candidates[0].content.parts.map(part => part.text || '').join('')
    }
    
    if (!text) {
      throw new Error('No response generated from Vertex AI')
    }

    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (image) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    const citations = []
    const citationRegex = /\*\*\[(.*?),\s*Page[s]?\s*([\d\-, ]+)\]\*\*/g
    let match
    while ((match = citationRegex.exec(text)) !== null) {
      citations.push({ document: match[1], pages: match[2], county: userCounty })
    }

    return NextResponse.json({ 
      message: text,
      county: userCounty,
      citations: citations,
      documentsSearched: usedDocs.length
    })

  } catch (error) {
    console.error('Detailed Backend Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Service error occurred.' 
    }, { status: 500 })
  }
}
