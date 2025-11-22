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

    // Using Pro model for reasoning
    const model = 'gemini-1.5-pro' 
    
    const lastUserMessage = messages[messages.length - 1].content || ""
    let contextText = ""
    let usedDocs = []

    // --- CRITICAL FIX ---
    // We now search if there is text OR if there is an image.
    if (lastUserMessage.trim().length > 0 || image) {
      try {
        let searchQuery = lastUserMessage
        
        // If an image is uploaded, we MUST fetch general sanitation rules
        // even if the user didn't type specific words.
        if (image) {
             searchQuery = `food safety violations equipment cleanliness sanitation plumbing physical facilities ${lastUserMessage}`.trim()
        }

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
    
    const systemInstructionText = `You are ProtocolLM, an expert Food Safety Compliance Officer for ${countyName}.

YOUR AUTHORITY:
You have access to specific County, State (Michigan), and Federal (FDA/USDA) documents in the "RETRIEVED CONTEXT". 

CORE OBJECTIVE:
Answer the user's question using ONLY the provided documents, but apply *logical deduction* to connect general regulations to specific scenarios.

RULES OF ENGAGEMENT:
1. **No Hallucinations:** Do not invent regulations.
2. **Logical Inference (The "Inspector" Rule):** 
   - Users will ask about specific scenarios (e.g., "cracked pipe", "broken tile", "dirty handle").
   - The documents might not say "cracked pipe." They might say "Plumbing must be maintained in good repair."
   - **YOU MUST** bridge this gap. State the general rule found in the document and explain how it applies to the user's specific situation.
   - *Example:* "While the code does not explicitly mention 'cracked PVC,' [Document A, Page 10] states that 'plumbing systems shall be maintained in good repair.' Therefore, a cracked pipe is likely a violation."
3. **Citation Requirement:** You must support every claim with a citation in this format: **[Document Name, Page X]**.
4. **Unknowns:** If the context contains absolutely NO principles relevant to the situation (e.g., nothing about plumbing, maintenance, or sanitation), state: "I cannot find specific regulations regarding this in the provided ${countyName} documents."

RETRIEVED CONTEXT:
${contextText || 'No matching documents found.'}
`

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
      userMessageParts.push({ text: "Analyze this image. Identify any issues based on the general sanitation, equipment maintenance, and physical facility standards found in the RETRIEVED CONTEXT." })
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
