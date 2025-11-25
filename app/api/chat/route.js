import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
import { checkRateLimit } from '@/lib/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

export const maxDuration = 60

// Helper to handle JSON credentials from Railway Variable
function getVertexClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON

  if (!projectId) throw new Error('GOOGLE_CLOUD_PROJECT_ID is missing')
  
  // If we have the JSON string in Railway, use it
  if (credentialsJson) {
    // Write to a temporary file securely
    const tempFilePath = path.join('/tmp', 'google-credentials.json')
    fs.writeFileSync(tempFilePath, credentialsJson)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFilePath
  }

  return new VertexAI({
    project: projectId,
    location: 'us-central1'
  })
}

const SYSTEM_PROMPT = `You are ProtocolLM, a specialized regulatory intelligence engine for food safety compliance. 
Your role is to act as a strict, code-based consultant for restaurant owners and health inspectors.

CORE DIRECTIVES:
1.  **Strict Compliance:** Base all answers *only* on the provided context (FDA Food Code, Local County Ordinances). If the context doesn't cover it, state general FDA guidelines but mention it's a general rule.
2.  **Citations are Mandatory:** You MUST cite specific code sections (e.g., "FDA 3-501.16") for every claim. 
3.  **Priority Designation:** Always classify violations as Priority (P), Priority Foundation (Pf), or Core (C) if applicable.
4.  **No Fluff:** Be concise, professional, and direct. No "I hope this helps" or "Great question."
5.  **Mock Audits:** If asked for a mock audit, provide a structured checklist with specific "Look For" items and "Correction" actions.
6.  **Staff Memos:** If asked for a memo, use a formal "TO/FROM/DATE/SUBJECT" format and professional language suitable for posting.

FORMATTING:
- Use Markdown.
- When citing documents provided in context, use the format: [Document Name, Page X].
- Bold key terms and code numbers.`

export async function POST(req) {
  try {
    // 1. Initialize Vertex AI
    const vertex_ai = getVertexClient()
    const model = vertex_ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 2. Initialize Supabase
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
        },
      }
    )

    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 3. Rate Limit
    try {
      const { success, limitReached } = await checkRateLimit(session.user.id)
      if (!success) return NextResponse.json({ error: limitReached ? 'Monthly request limit reached.' : 'Rate limit exceeded.' }, { status: 429 })
    } catch (err) { console.error('Rate Limit Warning:', err) }

    const body = await req.json()
    const { messages, image, county } = body
    const lastMessage = messages[messages.length - 1]

    let context = ''
    let citations = []

    // 4. Search Documents
    if (lastMessage.content && !image) {
      try {
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        if (searchResults?.length > 0) {
           context = searchResults.map(doc => 
            `[Source: ${doc.metadata.filename}, Page ${doc.metadata.page}]\nContent: ${doc.pageContent}`
          ).join('\n\n')
          citations = searchResults.map(doc => ({
            document: doc.metadata.filename.replace('.pdf', ''),
            pages: [doc.metadata.page]
          }))
        }
      } catch (err) {
        console.error('Search Failed:', err)
        context = "Notice: Local database search unavailable."
      }
    }

    // 5. Construct Prompt for Vertex
    const textPrompt = `${SYSTEM_PROMPT}\n\nCONTEXT FROM REGULATORY DATABASE:\n${context}\n\nUSER INQUIRY:\n${lastMessage.content}`
    
    // Construct Request Object for Vertex
    const request = {
      contents: [{ role: 'user', parts: [{ text: textPrompt }] }]
    }

    // Add History
    const history = messages.slice(0, -1).slice(-5)
    if (history.length > 0) {
       // Vertex format is slightly different, usually best to just include as context in single shot or simplistic history
       // For stability, we stick to the main prompt injection above for now
    }

    // Add Image if present
    if (image) {
      const base64Data = image.split(',')[1]
      request.contents[0].parts.push({
        inlineData: { mimeType: 'image/jpeg', data: base64Data }
      })
    }

    const result = await model.generateContent(request)
    const response = await result.response
    const text = response.candidates[0].content.parts[0].text

    // 6. Update Stats
    supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('Vertex AI Error:', error)
    return NextResponse.json({ error: `System processing error: ${error.message}` }, { status: 500 })
  }
}
