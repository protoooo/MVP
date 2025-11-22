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

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Subscription Check
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

    // 2. Initialize Vertex AI (with robust JSON parsing)
    let credentials
    try {
      // Handle cases where the JSON might be double-stringified or contain smart quotes
      const rawJson = process.env.GOOGLE_CREDENTIALS_JSON
      if (!rawJson) throw new Error("GOOGLE_CREDENTIALS_JSON is missing in Railway variables")
      
      // Clean potential smart quotes from iPad copy/paste
      const cleanJson = rawJson
        .replace(/[\u201C\u201D]/g, '"') // Replace curly double quotes
        .replace(/[\u2018\u2019]/g, "'") // Replace curly single quotes
      
      credentials = JSON.parse(cleanJson)
    } catch (e) {
      console.error("JSON Parsing Error:", e)
      throw new Error(`Failed to parse Google Credentials. Check Railway Variables format. Error: ${e.message}`)
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id
    console.log(`Connecting to Vertex AI Project: ${projectId}`) // Debug log

    const vertex_ai = new VertexAI({
      project: projectId,
      location: 'us-central1',
      googleAuthOptions: {
        credentials
      }
    })

    // Use the Smart Model
    const model = 'gemini-1.5-pro-002'
    const generativeModel = vertex_ai.getGenerativeModel({ model: model })

    // 3. Search Logic
    const lastUserMessage = messages[messages.length - 1].content
    let contextText = ""
    let usedDocs = []

    if (lastUserMessage && lastUserMessage.trim().length > 0) {
      try {
        let searchQuery = lastUserMessage
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

    // 4. Build Vertex Payload
    const countyName = COUNTY_NAMES[userCounty] || userCounty
    const systemInstruction = `You are protocolLM compliance assistant for ${countyName}.

CRITICAL: Cite every regulatory statement using: **[Document Name, Page X]**

RETRIEVED CONTEXT (${countyName}):
${contextText || 'No specific documents found (Answer based on general food safety knowledge).'}

ALWAYS cite from documents using **[Document Name, Page X]** format.`

    // Construct message history
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    // Add System Instruction to the User's last message (Vertex Pattern)
    // OR use systemInstruction if SDK supports it (v1.7.0+ does)
    // We will wrap the last user message with context to be safe.
    const lastMsgIndex = contents.length - 1
    contents[lastMsgIndex].parts[0].text = `${systemInstruction}\n\nUSER QUESTION: ${contents[lastMsgIndex].parts[0].text}`

    // Handle Image
    if (image && image.includes('base64,')) {
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      contents[lastMsgIndex].parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      })
    }

    const result = await generativeModel.generateContent({ contents })
    const response = await result.response
    const text = response.candidates[0].content.parts[0].text

    // 5. Update Usage
    const updates = { requests_used: (profile.requests_used || 0) + 1 }
    if (image) updates.images_used = (profile.images_used || 0) + 1
    await supabase.from('user_profiles').update(updates).eq('id', session.user.id)

    // 6. Extract Citations
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
    // Ensure we send a JSON response even on error
    return NextResponse.json({ 
      error: error.message || 'Service error occurred.' 
    }, { status: 500 })
  }
}
