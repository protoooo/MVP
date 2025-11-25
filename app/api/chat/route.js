import { VertexAI } from '@google-cloud/vertexai'
import { NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/searchDocs'
// import { checkRateLimit } from '@/lib/rateLimit' // TEMPORARILY DISABLED
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

export const maxDuration = 60

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

function initVertexAI() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON
  
  console.log('Step 1: Init Vertex AI')

  if (!projectId) {
    console.error('❌ Missing GOOGLE_CLOUD_PROJECT_ID')
    throw new Error('Missing Project ID')
  }
  
  if (credentialsJson) {
    const tempFile = path.join('/tmp', 'google-credentials.json')
    try {
      fs.writeFileSync(tempFile, credentialsJson)
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempFile
      console.log('✅ Credentials file created')
    } catch (err) {
      console.error('❌ Error writing credentials:', err)
    }
  } else {
    console.warn('⚠️ No GOOGLE_CREDENTIALS_JSON found')
  }

  return new VertexAI({ project: projectId, location: 'us-central1' })
}

export async function POST(req) {
  console.log('=== DEBUG CHAT STARTED ===')

  try {
    // 1. Vertex Init
    const vertex = initVertexAI()
    const model = vertex.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 2. Supabase Init
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

    // 3. Auth
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      console.error('❌ Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log(`Step 2: User authenticated (${session.user.email})`)

    // 4. Rate Limit - BYPASSED FOR DEBUGGING
    console.log('Step 3: Rate limit check BYPASSED')
    /*
    try {
      const { success, limitReached } = await checkRateLimit(session.user.id)
      if (!success) {
        console.error('❌ Rate limit hit')
        return NextResponse.json({ error: limitReached ? 'Monthly request limit reached.' : 'Rate limit exceeded.' }, { status: 429 })
      }
    } catch (err) { console.error('Rate Limit Warning:', err) }
    */

    const body = await req.json()
    const { messages, image, county } = body
    const lastMessage = messages[messages.length - 1]

    let context = ''
    let citations = []

    // 5. Search
    if (lastMessage.content && !image) {
      try {
        console.log(`Step 4: Searching documents for ${county}...`)
        const searchResults = await searchDocuments(lastMessage.content, county || 'washtenaw')
        
        if (searchResults && searchResults.length > 0) {
           console.log(`✅ Found ${searchResults.length} docs`)
           context = searchResults.map(doc => 
            `[Source: ${doc.metadata.filename}, Page ${doc.metadata.page}]\nContent: ${doc.pageContent}`
          ).join('\n\n')
          
          citations = searchResults.map(doc => ({
            document: doc.metadata.filename.replace('.pdf', ''),
            pages: [doc.metadata.page]
          }))
        } else {
          console.log('⚠️ No docs found')
        }
      } catch (err) {
        console.error('❌ Search Error:', err)
        context = "Notice: Local database search unavailable."
      }
    }

    // 6. Vertex Request
    console.log('Step 5: Preparing Vertex request')
    const request = {
      contents: [
        { 
          role: 'user', 
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `CONTEXT:\n${context}` },
            { text: `QUERY:\n${lastMessage.content}` }
          ] 
        }
      ]
    }

    if (image) {
      console.log('Step 5b: Adding image')
      const base64Data = image.split(',')[1]
      request.contents[0].parts.push({
        inlineData: { mimeType: 'image/jpeg', data: base64Data }
      })
    }

    console.log('Step 6: Sending to Gemini 2.0...')
    const streamingResp = await model.generateContentStream(request)
    const response = await streamingResp.response
    const text = response.candidates[0].content.parts[0].text
    console.log('✅ SUCCESS: Response received')

    // 7. Update Stats
    supabase.rpc('increment_usage', { user_id: session.user.id, is_image: !!image })

    return NextResponse.json({ message: text, citations: citations })

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error)
    // Return the ACTUAL error so you can see it in the UI
    return NextResponse.json({ error: `Debug Error: ${error.message}` }, { status: 500 })
  }
}
