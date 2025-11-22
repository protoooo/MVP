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

function getVertexCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const cleanJson = process.env.GOOGLE_CREDENTIALS_JSON
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
      return JSON.parse(cleanJson)
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON', e)
    }
  }
  return null
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

    const credentials = getVertexCredentials()
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID || credentials?.project_id
    
    if (!credentials || !project) {
      throw new Error('System configuration error: Google Cloud Credentials missing.')
    }

    const vertex_ai = new VertexAI({
      project: project,
      location: 'us-central1',
      googleAuthOptions: { credentials }
    })

    const model = 'gemini-1.5-flash' 
    
    const lastUserMessage = messages[messages.length - 1].content
    let contextText = ""
    let usedDocs = []

    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      try {
        let searchQuery = lastUserMessage
        // Improve search query for images to find relevant sanitation codes
        if (image) searchQuery = `food safety violations equipment cleanliness sanitation ${lastUserMessage}`.trim()

        const results = await searchDocuments(searchQuery, 20, userCounty)
        
        if (results && results.length > 0) {
          contextText = results.map((doc, idx) => `[DOCUMENT ${idx + 1}]
SOURCE: ${doc.source || 'Unknown'}
PAGE: ${doc.page || 'N/A'}
COUNTY: ${COUNTY_NAMES[userCounty]}
CONTENT: ${doc.text}`).join("\n---\n\n")
          
          usedDocs = results.map(r => ({ document: r.source, pages: r.page }))
        }
      } catch (searchErr) {
        console.error("Search failed:", searchErr)
      }
    }

    const countyName = COUNTY_NAMES[userCounty] || userCounty
    
    // --- UPDATED STRICT DOCUMENT-ONLY MODE ---
    // Changed instructions to allow application of general rules to specific scenarios
    const systemInstructionText = `You are ProtocolLM, a strictly regulated compliance assistant for ${countyName}.

STRICT OPERATING RULES:
1. ANSWER ONLY using the information provided in the "RETRIEVED CONTEXT" below.
2. DO NOT use outside knowledge or general food safety principles unless they are explicitly confirmed by the text below.
3. If the user asks about a specific scenario (e.g., "cracked pipe") that is not mentioned word-for-word, YOU MUST apply the general regulations found in the text (e.g., "Plumbing must be maintained in good repair") to answer the question.
4. If absolutely NO relevant regulations are found in the context, state: "I cannot find this specific information in the official ${countyName} documents provided."
5. You must CITE every single regulatory claim using this exact format: **[Document Name, Page X]**

RETRIEVED CONTEXT (${countyName}):
${contextText || 'No matching documents found.'}
`
    // --- END STRICT MODE ---

    const generativeModel = vertex_ai.getGenerativeModel({
      model: model,
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      }
    })

    let userMessageParts = []
    
    if (messages.length > 1) {
      const historyText = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n')
      userMessageParts.push({ text: `CHAT HISTORY:\n${historyText}\n\n` })
    }

    userMessageParts.push({ text: `USER QUESTION: ${lastUserMessage}` })

    if (image && image.includes('base64,')) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      
      userMessageParts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      })
      userMessageParts.push({ text: "Analyze this image for food safety compliance using ONLY the provided context." })
    }

    const requestPayload = {
      contents: [{ role: 'user', parts: userMessageParts }]
    }

    const result = await generativeModel.generateContent(requestPayload)
    const response = await result.response
    const text = response.candidates[0].content.parts[0].text

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
    console.error('Vertex AI Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Service error occurred.' 
    }, { status: 500 })
  }
}
